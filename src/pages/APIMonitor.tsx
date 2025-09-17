import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  TrendingUp,
  Shield,
  RefreshCw,
  Settings,
  Server
} from "lucide-react";

interface AgentHealth {
  id: string;
  name: string;
  status: "ok" | "warn" | "fail";
  responseTime: number;
  successRate: number;
  lastPing: Date;
  uptime: number;
  requests24h: number;
  endpoint: string;
}

const mockAgentHealth: AgentHealth[] = [
  {
    id: "1",
    name: "GPT-4o Scout",
    status: "ok",
    responseTime: 1200,
    successRate: 99.2,
    lastPing: new Date(Date.now() - 2 * 60 * 1000),
    uptime: 99.8,
    requests24h: 342,
    endpoint: "api.openai.com"
  },
  {
    id: "2",
    name: "Claude Editorial",
    status: "warn",
    responseTime: 2100,
    successRate: 96.8,
    lastPing: new Date(Date.now() - 5 * 60 * 1000),
    uptime: 98.2,
    requests24h: 189,
    endpoint: "api.anthropic.com"
  },
  {
    id: "3",
    name: "Gemini Analyst",
    status: "fail",
    responseTime: 0,
    successRate: 0,
    lastPing: new Date(Date.now() - 2 * 60 * 60 * 1000),
    uptime: 45.2,
    requests24h: 0,
    endpoint: "generativelanguage.googleapis.com"
  },
  {
    id: "4",
    name: "Llama Fallback",
    status: "ok",
    responseTime: 890,
    successRate: 97.5,
    lastPing: new Date(Date.now() - 1 * 60 * 1000),
    uptime: 99.1,
    requests24h: 45,
    endpoint: "api.together.ai"
  }
];

const alertHistory = [
  {
    id: "1",
    type: "error" as const,
    message: "Gemini Analyst failed to respond",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resolved: false
  },
  {
    id: "2",
    type: "warning" as const,
    message: "Claude Editorial response time increased",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    resolved: false
  },
  {
    id: "3",
    type: "info" as const,
    message: "Failover activated: GPT-4o → Claude",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    resolved: true
  }
];

const getStatusIcon = (status: AgentHealth["status"]) => {
  switch (status) {
    case "ok":
      return <CheckCircle className="h-5 w-5 text-success" />;
    case "warn":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "fail":
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
};

const getStatusBadge = (status: AgentHealth["status"]) => {
  switch (status) {
    case "ok":
      return <Badge className="bg-success/10 text-success border-success/20">Healthy</Badge>;
    case "warn":
      return <Badge className="bg-warning/10 text-warning border-warning/20">Warning</Badge>;
    case "fail":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
  }
};

const APIMonitor = () => {
  const [agents, setAgents] = useState<AgentHealth[]>(mockAgentHealth);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        responseTime: agent.status === "ok" ? 
          Math.floor(Math.random() * 500) + 800 : 
          agent.responseTime,
        lastPing: agent.status !== "fail" ? new Date() : agent.lastPing
      })));
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const activeAgents = agents.filter(a => a.status === "ok").length;
  const avgResponseTime = Math.floor(
    agents.filter(a => a.status === "ok").reduce((sum, a) => sum + a.responseTime, 0) / 
    agents.filter(a => a.status === "ok").length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Activity className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">API Monitor</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Real-time health monitoring and failover management
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-success/10 border-success/20" : ""}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active Agents</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{activeAgents}</div>
            <p className="text-sm text-success mt-1">of {agents.length} total</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Avg Response</CardTitle>
            <Zap className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{avgResponseTime}ms</div>
            <p className="text-sm text-muted-foreground mt-1">Last 24h</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Success Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">98.1%</div>
            <p className="text-sm text-success mt-1">System wide</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Requests</CardTitle>
            <Activity className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">576</div>
            <p className="text-sm text-muted-foreground mt-1">Last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Health Cards */}
      <div className="grid gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-gradient-card border border-border shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(agent.status)}
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>{agent.endpoint}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(agent.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Response Time</div>
                  <div className="text-lg font-semibold">
                    {agent.responseTime > 0 ? `${agent.responseTime}ms` : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-lg font-semibold text-success">
                    {agent.successRate}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{agent.uptime}%</div>
                    <Progress value={agent.uptime} className="h-2" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Requests (24h)</div>
                  <div className="text-lg font-semibold">{agent.requests24h}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Ping</div>
                  <div className="text-lg font-semibold">
                    {formatTime(agent.lastPing)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default APIMonitor;