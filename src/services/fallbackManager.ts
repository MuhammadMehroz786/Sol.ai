import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/types/agents";

export interface FallbackConfiguration {
  role: string;
  priorityStack: Agent[];
  fallbackEnabled: boolean;
  currentActive: Agent | null;
}

export interface FallbackEvent {
  id: string;
  trigger_type: 'manual' | 'automatic' | 'health_check';
  failed_agent_id?: string;
  fallback_agent_id?: string;
  agent_role: string;
  failure_reason?: string;
  consecutive_failures?: number;
  triggered_at: string;
  resolved_at?: string;
}

class FallbackManager {
  private readonly FAILURE_THRESHOLD = 3;
  private readonly FAILURE_WINDOW_MINUTES = 5;

  /**
   * Get fallback configuration for all roles
   */
  async getFallbackConfigurations(): Promise<FallbackConfiguration[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        return [];
      }

      if (!agents) return [];

      // Group agents by role
      const roleGroups = agents.reduce((groups: Record<string, Agent[]>, agent) => {
        if (!groups[agent.role]) {
          groups[agent.role] = [];
        }
        groups[agent.role].push(agent);
        return groups;
      }, {});

      // Create fallback configurations
      return Object.entries(roleGroups).map(([role, roleAgents]) => ({
        role,
        priorityStack: roleAgents.sort((a, b) => (a.priority || 50) - (b.priority || 50)),
        fallbackEnabled: roleAgents.some(agent => agent.is_fallback_enabled),
        currentActive: roleAgents.find(agent => agent.status === 'active') || null
      }));

    } catch (error) {
      return [];
    }
  }

  /**
   * Get the best available agent for a role
   */
  async getBestAvailableAgent(role: string): Promise<Agent | null> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('role', role)
        .eq('status', 'active')
        .in('health_status', ['ok', 'warn'])
        .order('priority', { ascending: true })
        .limit(1);

      if (error) {
        return null;
      }

      return agents && agents.length > 0 ? agents[0] : null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get fallback agent for a failed agent
   */
  async getFallbackAgent(failedAgentId: string): Promise<Agent | null> {
    try {
      // Get the failed agent details
      const { data: failedAgent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', failedAgentId)
        .single();

      if (agentError || !failedAgent) {
        return null;
      }

      // Find fallback agents with same role and higher priority (lower number)
      const { data: fallbackAgents, error: fallbackError } = await supabase
        .from('agents')
        .select('*')
        .eq('role', failedAgent.role)
        .eq('status', 'active')
        .eq('is_fallback_enabled', true)
        .neq('id', failedAgentId)
        .not('health_status', 'eq', 'fail')
        .order('priority', { ascending: true });

      if (fallbackError) {
        return null;
      }

      // Return the highest priority available fallback
      return fallbackAgents && fallbackAgents.length > 0 ? fallbackAgents[0] : null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Manually trigger fallback to specific agent
   */
  async triggerManualFallback(
    fromAgentId: string,
    toAgentId: string,
    userId?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Verify both agents exist and have the same role
      const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .in('id', [fromAgentId, toAgentId]);

      if (agentError || !agents || agents.length !== 2) {
        return false;
      }

      const fromAgent = agents.find(a => a.id === fromAgentId);
      const toAgent = agents.find(a => a.id === toAgentId);

      if (!fromAgent || !toAgent || fromAgent.role !== toAgent.role) {
        return false;
      }

      // Deactivate the from agent
      await supabase
        .from('agents')
        .update({ status: 'inactive' })
        .eq('id', fromAgentId);

      // Activate the to agent (if not already active)
      await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', toAgentId);

      // Log the fallback event
      const { error: eventError } = await supabase
        .from('agent_fallback_events')
        .insert({
          trigger_type: 'manual',
          failed_agent_id: fromAgentId,
          fallback_agent_id: toAgentId,
          agent_role: fromAgent.role,
          failure_reason: reason || 'Manual fallback triggered',
          triggered_by_user_id: userId
        });

      if (eventError) {
      }

      // Create alert
      await this.createAlert({
        alert_type: 'agent_down',
        severity: 'medium',
        title: 'Manual fallback executed',
        message: `Switched from ${fromAgent.name} to ${toAgent.name} for ${fromAgent.role}`,
        user_id: userId
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if automatic fallback should be triggered with time-window validation
   */
  async checkAutomaticFallback(agentId: string): Promise<boolean> {
    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        return false;
      }

      // Check if fallback is enabled for this agent
      if (!agent.is_fallback_enabled) {
        return false;
      }

      // Validate failures occurred within the time window
      const failuresInWindow = await this.getRecentFailureCount(agentId, this.FAILURE_WINDOW_MINUTES);

      if (failuresInWindow >= this.FAILURE_THRESHOLD) {

        const fallbackAgent = await this.getFallbackAgent(agentId);

        if (fallbackAgent) {
          return await this.executeAutomaticFallback(agent, fallbackAgent);
        } else {
          // No fallback available - check for category-level failure
          await this.checkCategoryFailure(agent.role);

          await this.createAlert({
            alert_type: 'category_failure',
            severity: 'critical',
            title: `No fallback available for ${agent.role}`,
            message: `Agent ${agent.name} has failed and no fallback is available`,
            agent_id: agentId
          });
        }
      }

      return false;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get count of failures within specified time window
   */
  private async getRecentFailureCount(agentId: string, windowMinutes: number): Promise<number> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('agent_health_checks')
        .select('success')
        .eq('agent_id', agentId)
        .eq('success', false)
        .gte('checked_at', windowStart)
        .order('checked_at', { ascending: false });

      if (error) {
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Execute automatic fallback
   */
  private async executeAutomaticFallback(failedAgent: Agent, fallbackAgent: Agent): Promise<boolean> {
    try {
      // Update agent statuses
      await supabase
        .from('agents')
        .update({ status: 'inactive' })
        .eq('id', failedAgent.id);

      await supabase
        .from('agents')
        .update({ status: 'active' })
        .eq('id', fallbackAgent.id);

      // Log fallback event
      await supabase
        .from('agent_fallback_events')
        .insert({
          trigger_type: 'automatic',
          failed_agent_id: failedAgent.id,
          fallback_agent_id: fallbackAgent.id,
          agent_role: failedAgent.role,
          failure_reason: `Automatic fallback after ${failedAgent.consecutive_failures} consecutive failures`,
          consecutive_failures: failedAgent.consecutive_failures
        });

      // Create alert
      await this.createAlert({
        alert_type: 'agent_down',
        severity: 'high',
        title: 'Automatic fallback triggered',
        message: `${failedAgent.name} failed, automatically switched to ${fallbackAgent.name}`,
        agent_id: failedAgent.id
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Toggle fallback enabled status for an agent
   */
  async toggleFallbackEnabled(agentId: string, enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_fallback_enabled: enabled })
        .eq('id', agentId);

      if (error) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Update agent priority for fallback ordering
   */
  async updateAgentPriority(agentId: string, priority: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ priority })
        .eq('id', agentId);

      if (error) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get fallback history
   */
  async getFallbackHistory(limit: number = 50): Promise<FallbackEvent[]> {
    try {
      const { data, error } = await supabase
        .from('agent_fallback_events')
        .select(`
          *,
          failed_agent:failed_agent_id (name),
          fallback_agent:fallback_agent_id (name)
        `)
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];

    } catch (error) {
      return [];
    }
  }

  /**
   * Check if all agents in a role have failed
   */
  async checkRoleFailure(role: string): Promise<boolean> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('role', role)
        .eq('status', 'active');

      if (error) {
        return false;
      }

      if (!agents || agents.length === 0) {
        await this.createAlert({
          alert_type: 'all_agents_down',
          severity: 'critical',
          title: `No active agents for ${role}`,
          message: `Critical: No active agents available for role ${role}`,
        });
        return true; // No active agents
      }

      // Check if all active agents are in fail state
      const allFailed = agents.every(agent => agent.health_status === 'fail');

      if (allFailed) {
        // Create critical alert for complete role failure
        await this.createAlert({
          alert_type: 'all_agents_down',
          severity: 'critical',
          title: `All ${role} agents have failed`,
          message: `Critical: All agents for role ${role} are currently failing`,
        });
      }

      return allFailed;

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if all agents in a role/category have failed with enhanced alerting
   */
  async checkCategoryFailure(roleOrCategory: string): Promise<boolean> {
    try {
      // First check by role (the current agent's role)
      const { data: roleAgents, error: roleError } = await supabase
        .from('agents')
        .select('*')
        .eq('role', roleOrCategory)
        .eq('status', 'active');

      if (roleError) {
        return false;
      }

      // Calculate failure stats for the role
      const roleFailureStats = await this.calculateCategoryFailureStats(roleAgents || [], roleOrCategory, 'role');

      // Also check by function/category grouping
      const categories = this.getRoleCategoryMapping();
      const categoryForRole = categories[roleOrCategory];

      if (categoryForRole) {
        const categoryRoles = Object.keys(categories).filter(role => categories[role] === categoryForRole);
        const { data: categoryAgents, error: categoryError } = await supabase
          .from('agents')
          .select('*')
          .in('role', categoryRoles)
          .eq('status', 'active');

        if (!categoryError && categoryAgents) {
          await this.calculateCategoryFailureStats(categoryAgents, categoryForRole, 'category');
        }
      }

      return roleFailureStats.allFailed;

    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate failure statistics and create appropriate alerts
   */
  private async calculateCategoryFailureStats(
    agents: any[],
    name: string,
    type: 'role' | 'category'
  ): Promise<{ allFailed: boolean; failureRate: number }> {
    if (!agents || agents.length === 0) {
      await this.createAlert({
        alert_type: 'category_failure',
        severity: 'high',
        title: `No active ${type} agents`,
        message: `No active agents available for ${type}: ${name}`,
      });
      return { allFailed: true, failureRate: 100 };
    }

    const failedCount = agents.filter(agent => agent.health_status === 'fail').length;
    const totalCount = agents.length;
    const failureRate = (failedCount / totalCount) * 100;
    const allFailed = failedCount === totalCount;

    // Create alerts based on failure rate
    if (allFailed) {
      await this.createAlert({
        alert_type: 'category_failure',
        severity: 'critical',
        title: `All ${name} ${type} agents failed`,
        message: `Critical: All ${totalCount} agents in ${type} "${name}" are currently failing`,
      });
    } else if (failureRate >= 75) {
      await this.createAlert({
        alert_type: 'category_failure',
        severity: 'high',
        title: `${name} ${type} degraded`,
        message: `Warning: ${failedCount}/${totalCount} agents in ${type} "${name}" are failing (${failureRate.toFixed(1)}%)`,
      });
    } else if (failureRate >= 50) {
      await this.createAlert({
        alert_type: 'category_failure',
        severity: 'medium',
        title: `${name} ${type} issues`,
        message: `Notice: ${failedCount}/${totalCount} agents in ${type} "${name}" are failing (${failureRate.toFixed(1)}%)`,
      });
    }

    return { allFailed, failureRate };
  }

  /**
   * Get role to category mapping
   */
  private getRoleCategoryMapping(): Record<string, string> {
    return {
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
  }

  /**
   * Comprehensive system health check with category-based monitoring
   */
  async performSystemHealthCheck(): Promise<void> {
    try {
      // Get all active agents
      const { data: allAgents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active');

      if (error) {
        return;
      }

      if (!allAgents || allAgents.length === 0) {
        await this.createAlert({
          alert_type: 'all_agents_down',
          severity: 'critical',
          title: 'No active agents',
          message: 'Critical: No active agents found in the system.',
        });
        return;
      }

      // Check each role individually
      const roles = [...new Set(allAgents.map(agent => agent.role))];
      for (const role of roles) {
        await this.checkCategoryFailure(role);
      }

      // Check category-level health
      const categories = this.getRoleCategoryMapping();
      const uniqueCategories = [...new Set(Object.values(categories))];

      for (const category of uniqueCategories) {
        const categoryRoles = Object.keys(categories).filter(role => categories[role] === category);
        const categoryAgents = allAgents.filter(agent => categoryRoles.includes(agent.role));

        if (categoryAgents.length > 0) {
          await this.calculateCategoryFailureStats(categoryAgents, category, 'category');
        }
      }

      // Check if entire system is down (all agents failed)
      const healthyAgents = allAgents.filter(agent =>
        agent.health_status === 'ok' || agent.health_status === 'warn'
      );

      if (healthyAgents.length === 0) {
        await this.createAlert({
          alert_type: 'all_agents_down',
          severity: 'critical',
          title: 'System-wide agent failure',
          message: `Critical: All ${allAgents.length} agents across all categories are failing. Immediate attention required.`,
        });
      } else if (healthyAgents.length / allAgents.length < 0.25) {
        // Less than 25% of agents are healthy
        await this.createAlert({
          alert_type: 'all_agents_down',
          severity: 'high',
          title: 'System degradation',
          message: `Warning: Only ${healthyAgents.length}/${allAgents.length} agents are healthy (${(healthyAgents.length/allAgents.length*100).toFixed(1)}%). System performance severely degraded.`,
        });
      }


    } catch (error) {
    }
  }

  /**
   * Restore agent from fallback
   */
  async restoreAgent(agentId: string, userId?: string): Promise<boolean> {
    try {
      // Reactivate the agent
      const { error } = await supabase
        .from('agents')
        .update({
          status: 'active',
          consecutive_failures: 0,
          health_status: 'unknown'
        })
        .eq('id', agentId);

      if (error) {
        return false;
      }

      // Log restoration event
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agent) {
        await supabase
          .from('agent_fallback_events')
          .insert({
            trigger_type: 'manual',
            fallback_agent_id: agentId,
            agent_role: agent.role,
            failure_reason: 'Agent restored from fallback',
            triggered_by_user_id: userId
          });
      }

      return true;

    } catch (error) {
      return false;
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
   * Get agent priority recommendations based on performance
   */
  async getPerformanceBasedPriorities(role: string): Promise<{ agent_id: string; recommended_priority: number }[]> {
    try {
      // Get recent performance stats for agents in this role
      const { data: agents, error } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          priority,
          success_rate,
          avg_response_time,
          uptime_percentage
        `)
        .eq('role', role)
        .order('success_rate', { ascending: false });

      if (error || !agents) {
        return [];
      }

      // Calculate recommended priorities based on performance
      return agents.map((agent, index) => ({
        agent_id: agent.id,
        recommended_priority: (index + 1) * 10 // 10, 20, 30, etc.
      }));

    } catch (error) {
      return [];
    }
  }
}

// Export singleton instance
export const fallbackManager = new FallbackManager();