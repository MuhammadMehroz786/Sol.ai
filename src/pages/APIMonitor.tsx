import React from 'react';
import AgentMonitoringDashboard from '@/components/monitoring/AgentMonitoringDashboard';
import { Activity } from "lucide-react";

const APIMonitor = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Activity className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">API Monitoring</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Monitor agent health, performance, and automatic fallback system
            </p>
          </div>
        </div>
      </div>

      {/* Agent Monitoring Dashboard */}
      <AgentMonitoringDashboard />
    </div>
  );
};

export default APIMonitor;