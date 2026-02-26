import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agents";
import { fallbackManager } from "./fallbackManager";

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

// AI provider domains that block direct browser requests (CORS) and require
// a server-side proxy to avoid exposing API keys in network traffic.
const AI_PROVIDER_DOMAINS = [
  'openai.com',
  'anthropic.com',
  'googleapis.com',
  'api.cohere.ai',
  'api.mistral.ai',
  'api.together.xyz',
  'api.perplexity.ai',
];

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
      return;
    }

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
  }

  /**
   * Run health checks for the current user's active agents
   */
  private async runHealthChecks(): Promise<void> {
    try {

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        return;
      }

      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active')
        .eq('user_id', authData.user.id);

      if (error) {
        return;
      }

      if (!agents || agents.length === 0) {
        return;
      }

      // Run health checks in parallel
      const healthCheckPromises = agents.map(agent =>
        this.performHealthCheck(agent).catch(error => {
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
      await this.checkFallbackTriggers(authData.user.id);

      // Perform comprehensive system health check
      await fallbackManager.performSystemHealthCheck();


    } catch (error) {
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
   * Ping an agent endpoint.
   *
   * AI provider endpoints (OpenAI, Anthropic, Google, etc.) cannot be called
   * directly from the browser due to CORS restrictions, and doing so would
   * also expose API keys in network traffic. These are routed through a
   * server-side proxy configured via VITE_HEALTH_CHECK_PROXY.
   *
   * Custom/webhook endpoints are pinged with a lightweight HEAD (or GET)
   * request to avoid triggering business logic or incurring billing.
   */
  private async pingAgent(agent: Agent): Promise<{
    success: boolean;
    status_code: number;
    error_message?: string;
    error_type?: 'network' | 'timeout' | 'auth' | 'server' | 'client';
    request_payload?: any;
    response_payload?: any;
  }> {
    if (this.isAiProviderEndpoint(agent.endpoint)) {
      return this.pingViaProxy(agent);
    }
    return this.pingCustomEndpoint(agent);
  }

  /**
   * Returns true if the endpoint belongs to a known AI provider whose API
   * cannot be called directly from a browser (CORS + key exposure).
   */
  private isAiProviderEndpoint(endpoint: string): boolean {
    return AI_PROVIDER_DOMAINS.some(domain => endpoint.includes(domain));
  }

  /**
   * Route an AI-provider health check through a server-side proxy.
   *
   * The proxy (e.g. a Supabase Edge Function or n8n workflow) receives the
   * agent_id, looks up the credentials server-side, and returns a normalised
   * { success, status_code } response.  API keys never travel through the
   * browser network layer.
   *
   * Configure the proxy URL with VITE_HEALTH_CHECK_PROXY in your .env file.
   */
  private async pingViaProxy(agent: Agent): Promise<{
    success: boolean;
    status_code: number;
    error_message?: string;
    error_type?: 'network' | 'timeout' | 'auth' | 'server' | 'client';
    response_payload?: any;
  }> {
    const proxyUrl = import.meta.env.VITE_HEALTH_CHECK_PROXY as string | undefined;

    if (!proxyUrl) {
      return {
        success: false,
        status_code: 0,
        error_message:
          'AI provider health checks require a server-side proxy. ' +
          'Set VITE_HEALTH_CHECK_PROXY in your .env file pointing to a ' +
          'Supabase Edge Function or n8n workflow that performs the check ' +
          'server-side so API keys are never exposed in browser network traffic.',
        error_type: 'network',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      // Only send the agent_id — the proxy retrieves credentials server-side
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, endpoint: agent.endpoint }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: responseData.success ?? true,
          status_code: responseData.status_code ?? response.status,
          response_payload: responseData,
        };
      } else {
        return {
          success: false,
          status_code: response.status,
          error_message: `Proxy returned HTTP ${response.status}: ${response.statusText}`,
          error_type: response.status >= 500 ? 'server' : 'client',
          response_payload: responseData,
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { success: false, status_code: 0, error_message: 'Request timeout', error_type: 'timeout' };
      }
      return { success: false, status_code: 0, error_message: error.message, error_type: 'network' };
    }
  }

  /**
   * Ping a custom/webhook endpoint directly using HEAD (falling back to GET).
   * No business-logic body is sent so no actions are triggered and no billing
   * is incurred on the remote side.
   */
  private async pingCustomEndpoint(agent: Agent): Promise<{
    success: boolean;
    status_code: number;
    error_message?: string;
    error_type?: 'network' | 'timeout' | 'auth' | 'server' | 'client';
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    const headers: Record<string, string> = {
      ...(agent.api_headers as Record<string, string> || {}),
    };

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

    try {
      let response: Response;

      // Try HEAD first — no body payload, zero billing risk
      try {
        response = await fetch(agent.endpoint, {
          method: 'HEAD',
          headers,
          signal: controller.signal,
        });
      } catch {
        // Some servers reject HEAD; fall back to GET
        response = await fetch(agent.endpoint, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, status_code: response.status };
      }

      return {
        success: false,
        status_code: response.status,
        error_message: `HTTP ${response.status}: ${response.statusText}`,
        error_type: response.status >= 500 ? 'server' : response.status === 401 || response.status === 403 ? 'auth' : 'client',
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { success: false, status_code: 0, error_message: 'Request timeout', error_type: 'timeout' };
      }
      return { success: false, status_code: 0, error_message: error.message, error_type: 'network' };
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
    }
  }

  /**
   * Check for fallback triggers with time-window validation
   */
  private async checkFallbackTriggers(userId: string): Promise<void> {
    try {
      const { data: activeAgents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active')
        .eq('user_id', userId);

      if (error) {
        return;
      }

      if (activeAgents && activeAgents.length > 0) {

        for (const agent of activeAgents) {
          const recentFailures = await this.getRecentFailuresCount(agent.id, 5); // 5 minutes

          if (recentFailures >= 3) {
            await this.triggerAutomaticFallback(agent);
          }
        }
      }

    } catch (error) {
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
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Trigger automatic fallback for an agent
   */
  private async triggerAutomaticFallback(failedAgent: Agent): Promise<void> {
    try {
      const success = await fallbackManager.checkAutomaticFallback(failedAgent.id);

      if (success) {
      } else {
      }

    } catch (error) {
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
      return [];
    }

    return data || [];
  }

  /**
   * Get current health status for the current user's agents
   */
  async getAgentsHealth(): Promise<Agent[]> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return [];

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('priority', { ascending: true });

    if (error) {
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
        return null;
      }

      const result = await this.performHealthCheck(agent);
      await this.storeHealthCheckResults([result]);
      await this.updateAgentHealthStatus(agentId);

      return result;

    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const agentMonitoringService = new AgentMonitoringService();

// Auto-start monitoring when imported (can be disabled if needed)
// agentMonitoringService.startMonitoring();
