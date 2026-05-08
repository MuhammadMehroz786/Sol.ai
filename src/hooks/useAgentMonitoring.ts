import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Agent } from '@/types/agents';
import { agentMonitoringService } from '@/services/agentMonitoring';
import { fallbackManager } from '@/services/fallbackManager';

export interface AgentHealthStatus {
  agent: Agent;
  healthStatus: 'ok' | 'warn' | 'fail' | 'unknown';
  responseTime: number;
  successRate: number;
  uptime: number;
  lastChecked: string | null;
  isOnline: boolean;
}

export interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  agent_id?: string;
  created_at: string;
  is_acknowledged: boolean;
}

export interface CategoryStats {
  category: string;
  totalAgents: number;
  healthyAgents: number;
  failedAgents: number;
  healthRate: number;
  avgResponseTime: number;
}

export const useAgentMonitoring = () => {
  const [agents, setAgents] = useState<AgentHealthStatus[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all agents with their health status
  const fetchAgentsHealth = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('priority', { ascending: true });

      if (agentError) throw agentError;

      if (agentData) {
        const healthStatuses = await Promise.all(
          agentData.map(async (agent) => {
            try {
              // Get recent health check
              const { data: healthCheck, error: hcError } = await supabase
                .from('agent_health_checks')
                .select('*')
                .eq('agent_id', agent.id)
                .order('checked_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              // Calculate stats from recent checks
              const { data: recentChecks, error: rcError } = await supabase
                .from('agent_health_checks')
                .select('success, response_time, checked_at')
                .eq('agent_id', agent.id)
                .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

              if (hcError || rcError) {
                // query errors for individual agents — skip this agent's health data
              }

              const checks = recentChecks || [];
              const successfulChecks = checks.filter(check => check.success).length;
              const totalChecks = checks.length;
              const avgResponseTime = checks.length
                ? checks.reduce((sum, check) => sum + (check.response_time || 0), 0) / checks.length
                : 0;

              return {
                agent,
                healthStatus: agent.health_status || 'unknown',
                responseTime: Math.round(avgResponseTime),
                successRate: totalChecks > 0 ? Math.round((successfulChecks / totalChecks) * 100) : 0,
                uptime: agent.uptime_percentage || 0,
                lastChecked: healthCheck?.checked_at || null,
                isOnline: agent.status === 'active' && (agent.health_status === 'ok' || agent.health_status === 'warn')
              } as AgentHealthStatus;
            } catch {
              return {
                agent,
                healthStatus: 'unknown',
                responseTime: 0,
                successRate: 0,
                uptime: 0,
                lastChecked: null,
                isOnline: false
              } as AgentHealthStatus;
            }
          })
        );

        setAgents(healthStatuses);

        // Calculate category statistics
        await calculateCategoryStats(healthStatuses);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Calculate category statistics
  const calculateCategoryStats = async (agentStatuses: AgentHealthStatus[]) => {
    try {
      // Group agents by role and map to categories
      const roleMapping = {
        'admin': 'management',
        'editor': 'content',
        'viewer': 'monitoring',
        'moderator': 'moderation',
        'content_discovery': 'content',
        'content_refinement': 'content',
        'data_analysis': 'analytics',
        'fallback_processing': 'system',
        'custom': 'custom'
      };

      const categoryGroups: Record<string, AgentHealthStatus[]> = {};

      agentStatuses.forEach(agentStatus => {
        const category = roleMapping[agentStatus.agent.role as keyof typeof roleMapping] || 'unknown';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(agentStatus);
      });

      const stats: CategoryStats[] = Object.entries(categoryGroups).map(([category, agents]) => {
        const totalAgents = agents.length;
        const healthyAgents = agents.filter(a => a.healthStatus === 'ok' || a.healthStatus === 'warn').length;
        const failedAgents = agents.filter(a => a.healthStatus === 'fail').length;
        const healthRate = totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 0;
        const avgResponseTime = agents.length > 0
          ? agents.reduce((sum, a) => sum + a.responseTime, 0) / agents.length
          : 0;

        return {
          category,
          totalAgents,
          healthyAgents,
          failedAgents,
          healthRate,
          avgResponseTime
        };
      });

      setCategoryStats(stats);
    } catch {
      // non-fatal
    }
  };

  // Fetch system alerts
  const fetchAlerts = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch {
      // non-fatal
    }
  };

  // Manual health check for specific agent
  const runHealthCheck = async (agentId: string) => {
    try {
      setError(null);
      const result = await agentMonitoringService.runManualHealthCheck(agentId);
      if (result) {
        await fetchAgentsHealth();
        return result;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    return null;
  };

  // Toggle agent status
  const toggleAgentStatus = async (agentId: string, status: 'active' | 'inactive') => {
    try {
      setError(null);
      const { error } = await supabase
        .from('agents')
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;
      await fetchAgentsHealth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Manual fallback
  const triggerFallback = async (fromAgentId: string, toAgentId: string, reason?: string) => {
    try {
      setError(null);
      const success = await fallbackManager.triggerManualFallback(fromAgentId, toAgentId, undefined, reason);
      if (success) {
        await fetchAgentsHealth();
        await fetchAlerts();
      }
      return success;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch {
      // non-fatal
    }
  };

  // Update agent priority
  const updatePriority = async (agentId: string, priority: number) => {
    try {
      setError(null);
      const success = await fallbackManager.updateAgentPriority(agentId, priority);
      if (success) {
        await fetchAgentsHealth();
      }
      return success;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Toggle fallback enabled
  const toggleFallback = async (agentId: string, enabled: boolean) => {
    try {
      setError(null);
      const success = await fallbackManager.toggleFallbackEnabled(agentId, enabled);
      if (success) {
        await fetchAgentsHealth();
      }
      return success;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Start monitoring service
  const startMonitoring = () => {
    agentMonitoringService.startMonitoring();
  };

  // Stop monitoring service
  const stopMonitoring = () => {
    agentMonitoringService.stopMonitoring();
  };

  // Real-time subscriptions
  useEffect(() => {
    setLoading(true);
    fetchAgentsHealth().then(() => fetchAlerts()).finally(() => setLoading(false));

    const agentsChannel = supabase
      .channel('agents_monitoring')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        fetchAgentsHealth();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_health_checks' }, () => {
        fetchAgentsHealth();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgentsHealth();
      fetchAlerts();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    agents,
    alerts,
    categoryStats,
    loading,
    error,
    runHealthCheck,
    toggleAgentStatus,
    triggerFallback,
    acknowledgeAlert,
    updatePriority,
    toggleFallback,
    startMonitoring,
    stopMonitoring,
    refresh: fetchAgentsHealth
  };
};