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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agent Registry</h1>
          <p className="text-muted-foreground">
            Manage AI agents, their configurations, and monitor their performance.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Agent Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
          <CardDescription>
            {filteredAgents.length} agents configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>{agent.role}</TableCell>
                  <TableCell>{agent.function}</TableCell>
                  <TableCell className="font-mono text-sm">{agent.endpoint}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{agent.auth}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={agent.status === "Active" ? "default" : "secondary"}
                      className={
                        agent.status === "Active" 
                          ? "bg-success/10 text-success border-success/20" 
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {agent.status === "Active" ? (
                        <Power className="h-3 w-3 mr-1" />
                      ) : (
                        <PowerOff className="h-3 w-3 mr-1" />
                      )}
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{agent.lastUsed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentRegistry;