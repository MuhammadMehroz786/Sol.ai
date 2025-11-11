import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agents";

export interface HealthCheckResult {
  agent_id: string;
  success: boolean;
  response_time: number;
  status_code: number;
  error_message?: string;
  error_type?: 'network' | 'timeout' | 'auth' | 'server' | 'client';
  health_status: 'ok' | 'warn' | 'fail' | 'unknown';
  request_payload?: any;
  response_payload?: any;
}

export interface MonitoringStats {
  agent_id: string;
  window_start: string;
  window_end: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  success_rate: number;
  uptime_percentage: number;
  health_status: 'ok' | 'warn' | 'fail' | 'unknown';
}

class AgentMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private readonly MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 2;

  /**
   * Start the monitoring service
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Agent monitoring is already running');
      return;
    }

    console.log('Starting agent monitoring service...');
    this.isMonitoring = true;

    // Run initial health check
    this.runHealthChecks();

    // Set up interval for continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.runHealthChecks();
    }, this.MONITORING_INTERVAL);
  }

  /**
   * Stop the monitoring service
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Agent monitoring service stopped');
  }

  /**
   * Run health checks for all active agents
   */
  private async runHealthChecks(): Promise<void> {
    try {
      console.log('Running scheduled health checks...');

      // Get all active agents
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching agents for health check:', error);
        return;
      }

      if (!agents || agents.length === 0) {
        console.log('No active agents to monitor');
        return;
      }

      // Run health checks in parallel
      const healthCheckPromises = agents.map(agent =>
        this.performHealthCheck(agent).catch(error => {
          console.error(`Health check failed for agent ${agent.name}:`, error);
          return {
            agent_id: agent.id,
            success: false,
            response_time: 0,
            status_code: 0,
            error_message: error.message,
            error_type: 'network' as const,
            health_status: 'fail' as const
          };
        })
      );

      const results = await Promise.allSettled(healthCheckPromises);
      const healthCheckResults = results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean) as HealthCheckResult[];

      // Store results in database
      await this.storeHealthCheckResults(healthCheckResults);

      // Update agent health status
      await Promise.all(
        healthCheckResults.map(result => this.updateAgentHealthStatus(result.agent_id))
      );

      // Check for fallback triggers
      await this.checkFallbackTriggers();

      // Perform comprehensive system health check
      const { fallbackManager } = await import('./fallbackManager');
      await fallbackManager.performSystemHealthCheck();

      console.log(`Health checks completed for ${healthCheckResults.length} agents`);

    } catch (error) {
      console.error('Error running health checks:', error);
    }
  }

  /**
   * Perform health check for a single agent
   */
  private async performHealthCheck(agent: Agent): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let retries = 0;

    while (retries <= this.MAX_RETRIES) {
      try {
        const result = await this.pingAgent(agent);
        const response_time = Date.now() - startTime;

        return {
          agent_id: agent.id,
          success: result.success,
          response_time,
          status_code: result.status_code,
          error_message: result.error_message,
          error_type: result.error_type,
          health_status: this.calculateHealthStatus(result.success, response_time, result.status_code),
          request_payload: result.request_payload,
          response_payload: result.response_payload
        };

      } catch (error) {
        retries++;
        if (retries > this.MAX_RETRIES) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    // This shouldn't be reached, but TypeScript needs it
    throw new Error('Max retries exceeded');
  }

  /**
   * Ping an agent endpoint
   */
  private async pingAgent(agent: Agent): Promise<{
    success: boolean;
    status_code: number;
    error_message?: string;
    error_type?: 'network' | 'timeout' | 'auth' | 'server' | 'client';
    request_payload?: any;
    response_payload?: any;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SOLE-Agent-Monitor/1.0',
        ...(agent.api_headers as Record<string, string> || {})
      };

      // Add authentication
      if (agent.api_key_encrypted) {
        switch (agent.auth_method) {
          case 'bearer_token':
            headers['Authorization'] = `Bearer ${agent.api_key_encrypted}`;
            break;
          case 'api_key':
            headers['X-API-Key'] = agent.api_key_encrypted;
            break;
          case 'basic_auth':
            headers['Authorization'] = `Basic ${btoa(agent.api_key_encrypted)}`;
            break;
        }
      }

      // Prepare test payload based on agent type
      const testPayload = this.getTestPayload(agent);

      const response = await fetch(agent.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (response.ok) {
        return {
          success: true,
          status_code: response.status,
          request_payload: testPayload,
          response_payload: responseData
        };
      } else {
        return {
          success: false,
          status_code: response.status,
          error_message: `HTTP ${response.status}: ${response.statusText}`,
          error_type: response.status >= 500 ? 'server' : 'client',
          request_payload: testPayload,
          response_payload: responseData
        };
      }

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          success: false,
          status_code: 0,
          error_message: 'Request timeout',
          error_type: 'timeout'
        };
      }

      return {
        success: false,
        status_code: 0,
        error_message: error.message,
        error_type: 'network'
      };
    }
  }

  /**
   * Get test payload for different agent types
   */
  private getTestPayload(agent: Agent): any {
    // Simple health check payloads for different providers
    if (agent.endpoint.includes('openai.com')) {
      return {
        model: "gpt-3.5-turbo",
        messages: [{"role": "user", "content": "Hello, this is a health check."}],
        max_tokens: 5
      };
    } else if (agent.endpoint.includes('anthropic.com')) {
      return {
        model: "claude-3-haiku-20240307",
        max_tokens: 5,
        messages: [{"role": "user", "content": "Hello, this is a health check."}]
      };
    } else if (agent.endpoint.includes('googleapis.com')) {
      return {
        contents: [{
          parts: [{"text": "Hello, this is a health check."}]
        }]
      };
    } else {
      // Generic test payload
      return {
        message: "Health check",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate health status based on response
   */
  private calculateHealthStatus(
    success: boolean,
    response_time: number,
    status_code: number
  ): 'ok' | 'warn' | 'fail' | 'unknown' {
    if (!success || status_code >= 500) {
      return 'fail';
    } else if (status_code >= 400 || response_time > 5000) {
      return 'warn';
    } else if (response_time <= 2000) {
      return 'ok';
    } else {
      return 'warn';
    }
  }

  /**
   * Store health check results in database
   */
  private async storeHealthCheckResults(results: HealthCheckResult[]): Promise<void> {
    if (results.length === 0) return;

    const { error } = await supabase
      .from('agent_health_checks')
      .insert(results.map(result => ({
        agent_id: result.agent_id,
        success: result.success,
        response_time: result.response_time,
        status_code: result.status_code,
        error_message: result.error_message,
        error_type: result.error_type,
        health_status: result.health_status,
        request_payload: result.request_payload,
        response_payload: result.response_payload
      })));

    if (error) {
      console.error('Error storing health check results:', error);
    }
  }

  /**
   * Update agent health status using database function
   */
  private async updateAgentHealthStatus(agentId: string): Promise<void> {
    const { error } = await supabase.rpc('update_agent_health_status', {
      p_agent_id: agentId
    });

    if (error) {
      console.error(`Error updating health status for agent ${agentId}:`, error);
    }
  }

  /**
   * Check for fallback triggers with time-window validation
   */
  private async checkFallbackTriggers(): Promise<void> {
    try {
      // Get all active agents
      const { data: activeAgents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error checking fallback triggers:', error);
        return;
      }

      if (activeAgents && activeAgents.length > 0) {
        console.log(`Checking ${activeAgents.length} active agents for fallback triggers`);

        for (const agent of activeAgents) {
          // Check if this agent has recent failures within the time window
          const recentFailures = await this.getRecentFailuresCount(agent.id, 5); // 5 minutes

          if (recentFailures >= 3) {
            console.log(`Agent ${agent.name} has ${recentFailures} failures in the last 5 minutes - triggering fallback check`);
            await this.triggerAutomaticFallback(agent);
          }
        }
      }

    } catch (error) {
      console.error('Error in fallback trigger check:', error);
    }
  }

  /**
   * Get recent failures count within time window
   */
  private async getRecentFailuresCount(agentId: string, windowMinutes: number): Promise<number> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('agent_health_checks')
        .select('success')
        .eq('agent_id', agentId)
        .eq('success', false)
        .gte('checked_at', windowStart);

      if (error) {
        console.error('Error fetching recent failures:', error);
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      console.error('Error in getRecentFailuresCount:', error);
      return 0;
    }
  }

  /**
   * Trigger automatic fallback for an agent
   */
  private async triggerAutomaticFallback(failedAgent: Agent): Promise<void> {
    try {
      // Use fallback manager to handle the complete fallback logic
      const { fallbackManager } = await import('./fallbackManager');
      const success = await fallbackManager.checkAutomaticFallback(failedAgent.id);

      if (success) {
        console.log(`Automatic fallback executed for ${failedAgent.name}`);
      } else {
        console.log(`No automatic fallback available for ${failedAgent.name}`);
      }

    } catch (error) {
      console.error('Error triggering automatic fallback:', error);
    }
  }

  /**
   * Create system alert
   */
  private async createAlert(alert: {
    alert_type: 'agent_down' | 'high_latency' | 'category_failure' | 'all_agents_down';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    agent_id?: string;
    user_id?: string;
  }): Promise<void> {
    const { error } = await supabase.from('system_alerts').insert(alert);

    if (error) {
      console.error('Error creating alert:', error);
    }
  }

  /**
   * Get monitoring stats for an agent
   */
  async getMonitoringStats(agentId: string, hours: number = 24): Promise<MonitoringStats[]> {
    const { data, error } = await supabase
      .from('agent_monitoring_stats')
      .select('*')
      .eq('agent_id', agentId)
      .gte('window_start', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('window_start', { ascending: false });

    if (error) {
      console.error('Error fetching monitoring stats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get current health status for all agents
   */
  async getAgentsHealth(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching agents health:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Manual health check for specific agent
   */
  async runManualHealthCheck(agentId: string): Promise<HealthCheckResult | null> {
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        console.error('Agent not found:', error);
        return null;
      }

      const result = await this.performHealthCheck(agent);
      await this.storeHealthCheckResults([result]);
      await this.updateAgentHealthStatus(agentId);

      return result;

    } catch (error) {
      console.error('Error in manual health check:', error);
      return null;
    }
  }
}

// Export singleton instance
export const agentMonitoringService = new AgentMonitoringService();

// Auto-start monitoring when imported (can be disabled if needed)
// agentMonitoringService.startMonitoring();