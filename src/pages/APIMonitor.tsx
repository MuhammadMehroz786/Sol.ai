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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/15 to-primary/5 p-4 rounded-2xl border-2 border-primary/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-dark">API Monitor</h1>
            <p className="text-sm text-brand-dark/70 mt-1 font-medium">
              Monitor API performance and track agent health
            </p>
          </div>
          <div className="flex space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36 bg-white border-2 border-primary/30 text-sm h-10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="1h" className="text-xs">Last Hour</SelectItem>
                <SelectItem value="24h" className="text-xs">Last 24 Hours</SelectItem>
                <SelectItem value="7d" className="text-xs">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-xs">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10 px-4 text-sm border-2 border-primary/30 rounded-lg hover:bg-primary hover:text-white transition-all">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-accent/30 shadow-lg">
        <h2 className="text-lg font-bold text-brand-dark mb-4">System Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-success/5 to-success/15 border-2 border-success/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success text-white shadow-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">98.7%</p>
                  <p className="text-sm text-success/80 font-medium">Overall Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/5 to-primary/15 border-2 border-primary/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
                  <Timer className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">847ms</p>
                  <p className="text-sm text-primary/80 font-medium">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent/5 to-accent/15 border-2 border-accent/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-brand-dark shadow-lg">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-foreground">2,889</p>
                  <p className="text-sm text-accent-foreground/80 font-medium">Requests Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/5 to-warning/15 border-2 border-warning/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning text-warning-foreground shadow-lg">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning-foreground">13</p>
                  <p className="text-sm text-warning-foreground/80 font-medium">Errors Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-gradient-to-br from-brand-cream/40 to-accent/10 p-4 rounded-2xl border-2 border-primary/20 shadow-lg">
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-primary/30 shadow-elegant rounded-xl">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center space-x-3 text-lg text-brand-dark">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                <Server className="h-5 w-5" />
              </div>
              <span>Endpoint Performance</span>
            </CardTitle>
            <CardDescription className="text-sm text-brand-dark/70 mt-2">Monitor individual API endpoint health and metrics</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {endpointData.map((endpoint, index) => (
                <div key={index} className="bg-gradient-to-r from-white to-accent/5 border-2 border-accent/30 rounded-xl p-4 hover:shadow-elevated hover:border-primary/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md">
                        <Network className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-brand-dark">{endpoint.name}</h4>
                        <p className="text-xs text-brand-dark/70 font-medium">{endpoint.requests.toLocaleString()} requests</p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success border-2 border-success/40 text-xs px-3 py-1 rounded-lg font-semibold">
                      {endpoint.uptime}% uptime
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                      <p className="text-primary font-semibold mb-1">Avg Response</p>
                      <p className="text-lg font-bold text-brand-dark">{endpoint.avgResponse}ms</p>
                    </div>
                    <div className="bg-accent/5 p-3 rounded-lg border border-accent/20">
                      <p className="text-accent-foreground font-semibold mb-1">Errors</p>
                      <p className="text-lg font-bold text-brand-dark">{endpoint.errors}</p>
                    </div>
                    <div className="bg-success/5 p-3 rounded-lg border border-success/20">
                      <p className="text-success font-semibold mb-1">Success Rate</p>
                      <p className="text-lg font-bold text-brand-dark">{(100 - (endpoint.errors / endpoint.requests * 100)).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default APIMonitor;