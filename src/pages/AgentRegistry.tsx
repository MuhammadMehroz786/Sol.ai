import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  Plus, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Zap,
  Shield,
  Trash2
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive" | "planned";
  endpoint: string;
  authMethod: string;
  inputFormat: string;
  outputFormat: string;
  lastPing: string;
  responseTime: number;
  function: string;
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "GPT-4o Scout",
    role: "Content Discovery",
    function: "Signal Detection & Analysis",
    status: "active",
    endpoint: "https://api.openai.com/v1/chat/completions",
    authMethod: "Bearer Token",
    inputFormat: "JSON",
    outputFormat: "JSON",
    lastPing: "2 minutes ago",
    responseTime: 1200
  },
  {
    id: "2",
    name: "Claude Editorial",
    role: "Content Refinement",
    function: "Article & Tweet Generation",
    status: "active",
    endpoint: "https://api.anthropic.com/v1/messages",
    authMethod: "x-api-key",
    inputFormat: "JSON",
    outputFormat: "JSON",
    lastPing: "5 minutes ago",
    responseTime: 890
  },
  {
    id: "3",
    name: "Gemini Analyst",
    role: "Data Analysis",
    function: "Trend Analysis & Insights",
    status: "inactive",
    endpoint: "https://generativelanguage.googleapis.com/v1/models",
    authMethod: "API Key",
    inputFormat: "JSON",
    outputFormat: "JSON", 
    lastPing: "2 hours ago",
    responseTime: 1500
  },
  {
    id: "4",
    name: "Llama Fallback",
    role: "Fallback Processing",
    function: "Emergency Content Generation",
    status: "planned",
    endpoint: "https://api.together.ai/inference",
    authMethod: "Bearer Token",
    inputFormat: "JSON",
    outputFormat: "JSON",
    lastPing: "Never",
    responseTime: 0
  }
];

const AgentRegistry = () => {
  const [agents] = useState<Agent[]>(mockAgents);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const getStatusBadge = (status: Agent["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "inactive":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      case "planned":
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Planned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesFilter = filter === "all" || agent.status === filter;
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Bot className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Agent Registry</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Manage your AI agents and orchestration workflow
            </p>
          </div>
        </div>
      </div>

      {/* Agent Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Agents</CardTitle>
            <Bot className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{agents.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Registered</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {agents.filter(a => a.status === "active").length}
            </div>
            <p className="text-sm text-success mt-1">Online</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Response Time</CardTitle>
            <Zap className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">1.1s</div>
            <p className="text-sm text-muted-foreground mt-1">Average</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Success Rate</CardTitle>
            <Shield className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">98.5%</div>
            <p className="text-sm text-success mt-1">Uptime</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls and Filters */}
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Agents</CardTitle>
              <CardDescription>Configure and monitor your AI agent network</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Agent</DialogTitle>
                  <DialogDescription>
                    Register a new AI agent to your orchestration network
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input id="agent-name" placeholder="e.g., GPT-4 Content Generator" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-role">Role</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content-discovery">Content Discovery</SelectItem>
                        <SelectItem value="content-refinement">Content Refinement</SelectItem>
                        <SelectItem value="data-analysis">Data Analysis</SelectItem>
                        <SelectItem value="fallback">Fallback Processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">API Endpoint</Label>
                    <Input id="endpoint" placeholder="https://api.example.com/v1/..." />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(false)}>
                      Add Agent
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Auth Method</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Last Ping</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">{agent.role}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell className="font-mono text-sm max-w-xs truncate">
                      {agent.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.authMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      {agent.responseTime > 0 ? `${agent.responseTime}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {agent.lastPing}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentRegistry;