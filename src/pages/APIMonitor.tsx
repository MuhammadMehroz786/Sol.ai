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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/15 to-primary/5 p-8 rounded-3xl border-2 border-primary/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-brand-dark">API Monitor</h1>
            <p className="text-lg text-brand-dark/70 mt-3 font-medium">
              Monitor API performance, track agent health, and analyze request patterns
            </p>
          </div>
          <div className="flex space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-44 bg-white border-2 border-primary/30 text-base h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="1h" className="text-sm">Last Hour</SelectItem>
                <SelectItem value="24h" className="text-sm">Last 24 Hours</SelectItem>
                <SelectItem value="7d" className="text-sm">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-sm">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-12 px-6 text-base border-2 border-primary/30 rounded-xl hover:bg-primary hover:text-white transition-all">
              <RefreshCw className="h-5 w-5 mr-3" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-accent/30 shadow-lg">
        <h2 className="text-xl font-bold text-brand-dark mb-6">System Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <Card className="bg-gradient-to-br from-success/5 to-success/15 border-2 border-success/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success text-white shadow-lg">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-success">98.7%</p>
                  <p className="text-base text-success/80 font-medium mt-1">Overall Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/5 to-primary/15 border-2 border-primary/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
                  <Timer className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">847ms</p>
                  <p className="text-base text-primary/80 font-medium mt-1">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent/5 to-accent/15 border-2 border-accent/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-brand-dark shadow-lg">
                  <Target className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent-foreground">2,889</p>
                  <p className="text-base text-accent-foreground/80 font-medium mt-1">Requests Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/5 to-warning/15 border-2 border-warning/40 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning text-warning-foreground shadow-lg">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-warning-foreground">13</p>
                  <p className="text-base text-warning-foreground/80 font-medium mt-1">Errors Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-gradient-to-br from-brand-cream/40 to-accent/10 p-8 rounded-3xl border-2 border-primary/20 shadow-lg">
        <Card className="bg-white/90 backdrop-blur-sm border-2 border-primary/30 shadow-elegant rounded-2xl">
          <CardHeader className="p-8">
            <CardTitle className="flex items-center space-x-3 text-xl text-brand-dark">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <Server className="h-6 w-6" />
              </div>
              <span>Endpoint Performance</span>
            </CardTitle>
            <CardDescription className="text-base text-brand-dark/70 mt-3">Monitor individual API endpoint health and metrics</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {endpointData.map((endpoint, index) => (
                <div key={index} className="bg-gradient-to-r from-white to-accent/5 border-2 border-accent/30 rounded-2xl p-6 hover:shadow-elevated hover:border-primary/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md">
                        <Network className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-brand-dark">{endpoint.name}</h4>
                        <p className="text-sm text-brand-dark/70 font-medium">{endpoint.requests.toLocaleString()} requests</p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success border-2 border-success/40 text-sm px-4 py-2 rounded-xl font-semibold">
                      {endpoint.uptime}% uptime
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <p className="text-primary font-semibold mb-1">Avg Response</p>
                      <p className="text-xl font-bold text-brand-dark">{endpoint.avgResponse}ms</p>
                    </div>
                    <div className="bg-accent/5 p-4 rounded-xl border border-accent/20">
                      <p className="text-accent-foreground font-semibold mb-1">Errors</p>
                      <p className="text-xl font-bold text-brand-dark">{endpoint.errors}</p>
                    </div>
                    <div className="bg-success/5 p-4 rounded-xl border border-success/20">
                      <p className="text-success font-semibold mb-1">Success Rate</p>
                      <p className="text-xl font-bold text-brand-dark">{(100 - (endpoint.errors / endpoint.requests * 100)).toFixed(1)}%</p>
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