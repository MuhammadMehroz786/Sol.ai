import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Server, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw 
} from "lucide-react";

const mockProviders = [
  {
    name: "OpenAI GPT-4",
    status: "OK",
    latency: "245ms",
    uptime: "99.9%",
    lastCheck: "30 seconds ago",
    requests: "1,234"
  },
  {
    name: "Anthropic Claude",
    status: "OK", 
    latency: "312ms",
    uptime: "99.8%",
    lastCheck: "45 seconds ago",
    requests: "892"
  },
  {
    name: "Google Search API",
    status: "Warn",
    latency: "1,200ms",
    uptime: "98.2%",
    lastCheck: "2 minutes ago",
    requests: "456"
  },
  {
    name: "News Aggregator",
    status: "Fail",
    latency: "Timeout",
    uptime: "85.1%",
    lastCheck: "5 minutes ago",
    requests: "23"
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "OK":
      return <CheckCircle className="h-4 w-4 text-success" />;
    case "Warn":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "Fail":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "OK":
      return <Badge className="bg-success/10 text-success border-success/20">{status}</Badge>;
    case "Warn":
      return <Badge className="bg-warning/10 text-warning border-warning/20">{status}</Badge>;
    case "Fail":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const APIMonitor = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">API Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of external API providers and system health.
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">2 healthy, 1 warning, 1 failed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342ms</div>
            <p className="text-xs text-muted-foreground">+12ms from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,605</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-muted-foreground">30-day average</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockProviders.map((provider, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(provider.status)}
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                </div>
                {getStatusBadge(provider.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Latency</p>
                  <p className="text-lg font-semibold">{provider.latency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-lg font-semibold">{provider.uptime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requests (24h)</p>
                  <p className="text-lg font-semibold">{provider.requests}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Check</p>
                  <p className="text-sm text-muted-foreground">{provider.lastCheck}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default APIMonitor;