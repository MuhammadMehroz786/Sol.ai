import React, { useState } from 'react';
import { useAgentMonitoring } from '@/hooks/useAgentMonitoring';
import { StatusBadge } from './StatusBadge';
import { Agent } from '@/types/agents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AgentMonitoringDashboard: React.FC = () => {
  const {
    agents,
    alerts,
    loading,
    error,
    runHealthCheck,
    toggleAgentStatus,
    triggerFallback,
    acknowledgeAlert,
    updatePriority,
    toggleFallback,
    startMonitoring,
    stopMonitoring
  } = useAgentMonitoring();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackConfig, setFallbackConfig] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const handleHealthCheck = async (agentId: string) => {
    await runHealthCheck(agentId);
  };

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await toggleAgentStatus(agentId, newStatus);
  };

  const handleFallback = async () => {
    if (fallbackConfig.from && fallbackConfig.to) {
      const success = await triggerFallback(fallbackConfig.from, fallbackConfig.to, 'Manual fallback triggered');
      if (success) {
        setShowFallbackModal(false);
        setFallbackConfig({ from: '', to: '' });
      }
    }
  };

  const getStatusSummary = () => {
    const summary = agents.reduce((acc, agent) => {
      acc[agent.healthStatus] = (acc[agent.healthStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return summary;
  };

  const getCriticalAlerts = () => {
    return alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
  };

  const formatResponseTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusSummary = getStatusSummary();
  const criticalAlerts = getCriticalAlerts();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">System Health Overview</CardTitle>
              <CardDescription className="mt-1">Monitor agent performance and automatic fallback systems</CardDescription>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={startMonitoring}
                variant="outline"
                className="bg-gradient-primary hover:shadow-glow font-semibold"
              >
                Start Monitoring
              </Button>
              <Button
                onClick={stopMonitoring}
                variant="outline"
                className="font-semibold"
              >
                Stop Monitoring
              </Button>
              <Button
                onClick={() => setShowFallbackModal(true)}
                variant="outline"
                className="font-semibold"
              >
                Manual Fallback
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Healthy</CardTitle>
                <StatusBadge status="ok" showText={false} size="lg" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-success">{statusSummary.ok || 0}</div>
                <p className="text-base text-success mt-1 font-semibold">Online</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Warning</CardTitle>
                <StatusBadge status="warn" showText={false} size="lg" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-500">{statusSummary.warn || 0}</div>
                <p className="text-base text-orange-500 mt-1 font-semibold">Degraded</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Failed</CardTitle>
                <StatusBadge status="fail" showText={false} size="lg" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-destructive">{statusSummary.fail || 0}</div>
                <p className="text-base text-destructive mt-1 font-semibold">Offline</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Unknown</CardTitle>
                <StatusBadge status="unknown" showText={false} size="lg" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-muted-foreground">{statusSummary.unknown || 0}</div>
                <p className="text-base text-muted-foreground mt-1 font-semibold">Pending</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="bg-gradient-card border border-destructive/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-destructive">Critical Alerts</CardTitle>
            <CardDescription>Immediate attention required</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalAlerts.map(alert => (
                <Card key={alert.id} className="bg-gradient-card border border-destructive/10 shadow-elegant">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground">{alert.title}</h4>
                        <p className="text-muted-foreground text-sm mt-1">{alert.message}</p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => acknowledgeAlert(alert.id)}
                        variant="outline"
                        size="sm"
                        className="ml-4 font-semibold"
                      >
                        Acknowledge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent List */}
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Agent Status Monitor</CardTitle>
          <CardDescription>Real-time agent health and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map(agentStatus => (
              <Card key={agentStatus.agent.id} className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <StatusBadge status={agentStatus.healthStatus} />
                      <div>
                        <h4 className="font-bold text-foreground text-lg">{agentStatus.agent.name}</h4>
                        <Badge variant="outline" className="mt-1 capitalize">{agentStatus.agent.role}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{formatResponseTime(agentStatus.responseTime)}</p>
                        <p className="text-sm font-semibold text-muted-foreground">Response Time</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{agentStatus.successRate}%</p>
                        <p className="text-sm font-semibold text-muted-foreground">Success Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{agentStatus.uptime.toFixed(1)}%</p>
                        <p className="text-sm font-semibold text-muted-foreground">Uptime</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-muted-foreground">{formatLastChecked(agentStatus.lastChecked)}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Last Check</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleHealthCheck(agentStatus.agent.id)}
                          variant="outline"
                          size="sm"
                          className="font-semibold"
                        >
                          Test
                        </Button>
                        <Button
                          onClick={() => handleToggleStatus(agentStatus.agent.id, agentStatus.agent.status)}
                          variant={agentStatus.agent.status === 'active' ? "destructive" : "default"}
                          size="sm"
                          className="font-semibold"
                        >
                          {agentStatus.agent.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Fallback Modal */}
      {showFallbackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-gradient-card border border-border shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Manual Fallback</CardTitle>
              <CardDescription>Switch agent operations to a backup system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">From Agent</label>
                <select
                  value={fallbackConfig.from}
                  onChange={(e) => setFallbackConfig(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="">Select agent to disable</option>
                  {agents.filter(a => a.agent.status === 'active').map(agentStatus => (
                    <option key={agentStatus.agent.id} value={agentStatus.agent.id}>
                      {agentStatus.agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">To Agent</label>
                <select
                  value={fallbackConfig.to}
                  onChange={(e) => setFallbackConfig(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="">Select fallback agent</option>
                  {agents
                    .filter(a => a.agent.id !== fallbackConfig.from && a.agent.is_fallback_enabled)
                    .map(agentStatus => (
                      <option key={agentStatus.agent.id} value={agentStatus.agent.id}>
                        {agentStatus.agent.name} (Priority: {agentStatus.agent.priority})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleFallback}
                  disabled={!fallbackConfig.from || !fallbackConfig.to}
                  className="flex-1 bg-gradient-primary hover:shadow-glow font-semibold"
                >
                  Execute Fallback
                </Button>
                <Button
                  onClick={() => {
                    setShowFallbackModal(false);
                    setFallbackConfig({ from: '', to: '' });
                  }}
                  variant="outline"
                  className="flex-1 font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="bg-gradient-card border border-destructive/20 shadow-elegant">
          <CardContent className="p-4">
            <p className="text-destructive font-semibold">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentMonitoringDashboard;