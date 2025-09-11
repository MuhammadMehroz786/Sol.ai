import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Settings, Trash2, Power, PowerOff } from "lucide-react";

const mockAgents = [
  {
    id: "1",
    name: "Malcolm Scanner",
    role: "Content Analyst",
    function: "Signal Detection & Analysis",
    endpoint: "/api/scout",
    status: "Active",
    lastUsed: "2 minutes ago",
    auth: "API Key"
  },
  {
    id: "2", 
    name: "Ana Editorial",
    role: "Content Generator",
    function: "Article & Tweet Generation",
    endpoint: "/api/editorial",
    status: "Active",
    lastUsed: "5 minutes ago",
    auth: "OAuth"
  },
  {
    id: "3",
    name: "Winston Analyst",
    role: "Data Processor",
    function: "Trend Analysis & Insights",
    endpoint: "/api/analytics",
    status: "Inactive",
    lastUsed: "2 hours ago",
    auth: "Bearer Token"
  }
];

const AgentRegistry = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredAgents = mockAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Settings className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Agent Registry</h1>
              <p className="text-lg text-muted-foreground mt-1">
                Configure and manage your AI agent ecosystem
              </p>
            </div>
          </div>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-elegant">
          <Plus className="mr-2 h-4 w-4" />
          Add New Agent
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, role, or function..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-surface-elevated border-0 shadow-elegant"
            />
          </div>
        </div>
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{filteredAgents.length}</div>
            <p className="text-sm text-muted-foreground">Total Agents</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{filteredAgents.filter(a => a.status === 'Active').length}</div>
            <p className="text-sm text-muted-foreground">Active Now</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Table */}
      <Card className="bg-gradient-card border-0 shadow-elevated">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-foreground">Agent Configuration</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Manage endpoints, authentication, and agent capabilities
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {filteredAgents.length} agents configured
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-lg bg-surface-elevated">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground pl-6">Agent Details</TableHead>
                  <TableHead className="font-semibold text-foreground">Function</TableHead>
                  <TableHead className="font-semibold text-foreground">Endpoint</TableHead>
                  <TableHead className="font-semibold text-foreground">Authentication</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Last Activity</TableHead>
                  <TableHead className="text-right font-semibold text-foreground pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent, index) => (
                  <TableRow key={agent.id} className="border-border/30 hover:bg-surface-overlay/50 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center space-x-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          agent.status === 'Active' ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'
                        }`}>
                          <Settings className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">{agent.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground max-w-xs">{agent.function}</div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-md bg-muted/50 px-2 py-1 text-xs font-mono text-foreground">
                        {agent.endpoint}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border/50">
                        {agent.auth}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={agent.status === 'Active' ? 'default' : 'secondary'}
                        className={agent.status === 'Active' ? 'bg-success/20 text-success border-success/30' : ''}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agent.lastUsed}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end space-x-1">
                        <Button variant="ghost" size="sm" className="h-9 w-9 hover:bg-surface-overlay">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
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