import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap, 
  RefreshCw,
  Search,
  Eye,
  BarChart3,
  Server,
  Network,
  Timer,
  Target
} from "lucide-react";

const APIMonitor = () => {
  const [timeRange, setTimeRange] = useState("24h");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const endpointData = [
    { name: '/api/scout', requests: 1240, avgResponse: 450, errors: 3, uptime: 99.8 },
    { name: '/api/editorial', requests: 892, avgResponse: 1200, errors: 1, uptime: 99.9 },
    { name: '/api/analytics', requests: 456, avgResponse: 320, errors: 0, uptime: 100 },
    { name: '/api/predictor', requests: 67, avgResponse: 2400, errors: 12, uptime: 85.2 },
  ];

  const recentRequests = [
    {
      id: 1,
      endpoint: '/api/scout',
      method: 'POST',
      status: 200,
      responseTime: 423,
      timestamp: '2 minutes ago',
      agent: 'Scout GPT'
    },
    {
      id: 2,
      endpoint: '/api/editorial',
      method: 'POST',
      status: 200,
      responseTime: 1156,
      timestamp: '3 minutes ago',
      agent: 'Editorial GPT'
    }
  ];

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-success/10 text-success border-success/20">Success</Badge>;
    } else if (status >= 400 && status < 500) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Client Error</Badge>;
    } else if (status >= 500) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Server Error</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">API Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Monitor API performance, track agent health, and analyze request patterns
          </p>
        </div>
        <div className="flex space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">98.7%</p>
                <p className="text-sm text-muted-foreground">Overall Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">847ms</p>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/20">
                <Target className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2,889</p>
                <p className="text-sm text-muted-foreground">Requests Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">13</p>
                <p className="text-sm text-muted-foreground">Errors Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints */}
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Endpoint Performance</span>
          </CardTitle>
          <CardDescription>Monitor individual API endpoint health and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpointData.map((endpoint, index) => (
              <div key={index} className="border border-border rounded-lg p-4 hover:shadow-elevated transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Network className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{endpoint.name}</h4>
                      <p className="text-sm text-muted-foreground">{endpoint.requests.toLocaleString()} requests</p>
                    </div>
                  </div>
                  <Badge className="bg-success/10 text-success border-success/20">
                    {endpoint.uptime}% uptime
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Avg Response</p>
                    <p className="font-semibold text-foreground">{endpoint.avgResponse}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Errors</p>
                    <p className="font-semibold text-foreground">{endpoint.errors}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="font-semibold text-foreground">{(100 - (endpoint.errors / endpoint.requests * 100)).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIMonitor;