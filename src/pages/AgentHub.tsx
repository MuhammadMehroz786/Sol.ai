import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAgentMonitoring, AgentHealthStatus, SystemAlert } from "@/hooks/useAgentMonitoring";
import { StatusBadge } from "@/components/monitoring/StatusBadge";
import {
  Agent, AgentInsert, AgentWithStats, AGENT_TEMPLATES, validateEndpoint,
} from "@/types/agents";
import { agentMonitoringService } from "@/services/agentMonitoring";
import {
  Settings, Plus, Search, CheckCircle, XCircle, Clock, Bot, Zap, Shield,
  Trash2, AlertTriangle, Play, Save, X, MoreHorizontal, Activity,
  Heart, Radio, Bell, ArrowRightLeft, RefreshCw, Power, PowerOff,
  Wifi, WifiOff, Timer, TrendingUp, Eye, ChevronRight, Sparkles,
  CircleDot, AlertOctagon, BarChart3
} from "lucide-react";

// ─── Animated counter component ───
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current * 10) / 10);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{typeof value === "number" && value % 1 !== 0 ? display.toFixed(1) : Math.round(display)}{suffix}</>;
};

// ─── Pulse dot component ───
const PulseDot = ({ color }: { color: string }) => (
  <span className="relative flex h-3 w-3">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
  </span>
);

const AgentHub = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ─── Registry state ───
  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isTestingAgent, setIsTestingAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("registry");
  const [formData, setFormData] = useState<Partial<AgentInsert>>({
    name: '', role: 'custom', function: '', endpoint: '',
    auth_method: 'api_key', api_key_encrypted: '',
    api_headers: {}, input_schema: null, output_schema: null, status: 'planned'
  });

  // ─── Monitoring hook ───
  const {
    agents: monitoringAgents, alerts, loading: monitoringLoading, error: monitoringError,
    runHealthCheck, toggleAgentStatus: monitoringToggleStatus,
    triggerFallback, acknowledgeAlert, startMonitoring, stopMonitoring,
  } = useAgentMonitoring();

  // ─── Fallback modal state ───
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackConfig, setFallbackConfig] = useState<{ from: string; to: string }>({ from: '', to: '' });

  // ─── Fetch agents ───
  const fetchAgents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast({ title: "Error fetching agents", description: error.message, variant: "destructive" });
      } else {
        const agentsWithStats: AgentWithStats[] = (data || []).map(agent => ({
          ...agent,
          success_rate: agent.success_rate ?? null,
          total_requests: agent.total_requests || 0,
          uptime_percentage: agent.total_requests > 0 ? (agent.success_rate || 0) : 0,
          avg_response_time: agent.response_time || 0,
          is_healthy: agent.status === 'active' && (agent.success_rate || 0) > 80,
        }));
        setAgents(agentsWithStats);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // ─── CRUD handlers ───
  const handleAddAgent = async () => {
    if (!user || !formData.name || !formData.endpoint) {
      toast({ title: "Validation Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    if (!validateEndpoint(formData.endpoint)) {
      toast({ title: "Invalid Endpoint", description: "Please enter a valid HTTPS URL", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from('agents').insert({ ...formData, user_id: user.id });
      if (error) {
        toast({ title: "Error adding agent", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Agent added successfully", description: `${formData.name} has been registered` });
        setIsAddDialogOpen(false);
        resetForm();
        fetchAgents();
      }
    } catch (err) { console.error('Error adding agent:', err); }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent || !formData.name || !formData.endpoint) return;
    try {
      const { error } = await supabase.from('agents').update(formData).eq('id', selectedAgent.id);
      if (error) {
        toast({ title: "Error updating agent", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Agent updated", description: `${formData.name} has been updated` });
        setIsEditDialogOpen(false);
        resetForm();
        fetchAgents();
      }
    } catch (err) { console.error('Error updating agent:', err); }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) {
        toast({ title: "Error deleting agent", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Agent deleted", description: `${name} has been removed` });
        fetchAgents();
      }
    } catch (err) { console.error('Error deleting agent:', err); }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('agents').update({ status: newStatus }).eq('id', agent.id);
      if (error) {
        toast({ title: "Error updating status", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Status updated", description: `${agent.name} is now ${newStatus}` });
        fetchAgents();
      }
    } catch (err) { console.error('Error updating status:', err); }
  };

  const handleTestAgent = async (agent: Agent) => {
    setIsTestingAgent(agent.id);
    try {
      const result = await agentMonitoringService.runManualHealthCheck(agent.id);
      if (result) {
        // Update agent record with real health check data
        const newTotalRequests = (agent.total_requests || 0) + 1;
        const currentSuccessful = Math.round(((agent.success_rate || 0) / 100) * (agent.total_requests || 0));
        const newSuccessful = result.success ? currentSuccessful + 1 : currentSuccessful;
        const newSuccessRate = newTotalRequests > 0 ? (newSuccessful / newTotalRequests) * 100 : 0;

        await supabase.from('agents').update({
          last_ping: new Date().toISOString(),
          response_time: result.response_time,
          total_requests: newTotalRequests,
          success_rate: Math.round(newSuccessRate * 100) / 100,
        }).eq('id', agent.id);

        toast({
          title: result.success ? "Test successful" : "Test failed",
          description: result.success
            ? `${agent.name} responded in ${result.response_time}ms (${result.health_status})`
            : `${agent.name} — ${result.error_message || 'No response'}`,
          variant: result.success ? "default" : "destructive",
        });
      } else {
        toast({ title: "Test failed", description: `Could not reach ${agent.name}`, variant: "destructive" });
      }
      fetchAgents();
    } catch (err) {
      console.error('Error testing agent:', err);
      toast({ title: "Test error", description: "Failed to test agent connection", variant: "destructive" });
    } finally {
      setIsTestingAgent(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', role: 'custom', function: '', endpoint: '',
      auth_method: 'api_key', api_key_encrypted: '',
      api_headers: {}, input_schema: null, output_schema: null, status: 'planned'
    });
    setSelectedAgent(null);
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name, role: agent.role, function: agent.function,
      endpoint: agent.endpoint, auth_method: agent.auth_method,
      api_key_encrypted: agent.api_key_encrypted || '',
      api_headers: agent.api_headers || {},
      input_schema: agent.input_schema, output_schema: agent.output_schema, status: agent.status
    });
    setIsEditDialogOpen(true);
  };

  // ─── Monitoring helpers ───
  const handleHealthCheck = async (agentId: string) => { await runHealthCheck(agentId); };
  const handleMonitoringToggle = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await monitoringToggleStatus(agentId, newStatus as 'active' | 'inactive');
  };
  const handleFallback = async () => {
    if (fallbackConfig.from && fallbackConfig.to) {
      const success = await triggerFallback(fallbackConfig.from, fallbackConfig.to, 'Manual fallback triggered');
      if (success) { setShowFallbackModal(false); setFallbackConfig({ from: '', to: '' }); }
    }
  };

  const getStatusSummary = () => {
    return monitoringAgents.reduce((acc, agent) => {
      acc[agent.healthStatus] = (acc[agent.healthStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getCriticalAlerts = () => alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  const formatResponseTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

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

  // ─── Init ───
  useEffect(() => {
    if (user) fetchAgents();
  }, [user, fetchAgents]);

  const getStatusBadge = (status: Agent["status"]) => {
    const configs: Record<string, { className: string; icon: typeof CheckCircle; label: string }> = {
      active: { className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle, label: "Active" },
      inactive: { className: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle, label: "Inactive" },
      planned: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock, label: "Planned" },
      error: { className: "bg-red-600/10 text-red-600 border-red-600/20", icon: AlertTriangle, label: "Error" },
    };
    const config = configs[status] || { className: "bg-gray-100 text-gray-500 border-gray-200", icon: CircleDot, label: "Unknown" };
    const Icon = config.icon;
    return <Badge className={`${config.className} font-semibold`}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>;
  };

  const filteredAgents = agents.filter(agent => {
    const matchesFilter = filter === "all" || agent.status === filter;
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusSummary = getStatusSummary();
  const criticalAlerts = getCriticalAlerts();

  const activeCount = agents.filter(a => a.status === "active").length;
  const avgResponse = agents.length > 0
    ? agents.reduce((sum, a) => sum + (a.response_time || 0), 0) / agents.length / 1000
    : 0;
  const avgSuccess = (() => {
    const withData = agents.filter(a => a.total_requests && a.total_requests > 0);
    return withData.length > 0 ? withData.reduce((s, a) => s + (a.success_rate || 0), 0) / withData.length : 0;
  })();

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(21,58%,48%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,40%)] p-8 shadow-[0_16px_64px_rgba(208,126,59,0.35)]">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(226,161,118,0.2)_0%,transparent_40%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Animated icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl animate-pulse-slow" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <Bot className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              {/* Status indicator */}
              <div className="absolute -top-1 -right-1">
                <PulseDot color="bg-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg">
                Agent Hub
              </h1>
              <p className="text-lg text-white/70 mt-1 font-medium">
                Configure, deploy, and monitor your AI agent network
              </p>
            </div>
          </div>

          {/* Quick stats pills */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/15">
              <Wifi className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-bold text-white"><AnimatedNumber value={activeCount} /> Active</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/15">
              <Bot className="h-4 w-4 text-white/70" />
              <span className="text-sm font-bold text-white"><AnimatedNumber value={agents.length} /> Total</span>
            </div>
            {criticalAlerts.length > 0 && (
              <div className="flex items-center space-x-2 bg-red-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-red-400/30 animate-pulse">
                <Bell className="h-4 w-4 text-red-300" />
                <span className="text-sm font-bold text-red-200">{criticalAlerts.length} Alert{criticalAlerts.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Summary stats strip ─── */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Total Agents", value: agents.length, suffix: "", icon: Bot, color: "text-white" },
            { label: "Active", value: activeCount, suffix: "", icon: CheckCircle, color: "text-emerald-300" },
            { label: "Avg Response", value: avgResponse, suffix: "s", icon: Zap, color: "text-amber-300" },
            { label: "Success Rate", value: avgSuccess, suffix: "%", icon: Shield, color: "text-emerald-300" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group relative bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-3xl font-black mt-1 ${stat.color}`}>
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </p>
                </div>
                <stat.icon className="h-8 w-8 text-white/20 group-hover:text-white/30 transition-colors duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          TABBED INTERFACE
          ═══════════════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          {/* Tab bar container */}
          <TabsList className="relative w-full h-auto p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.1)] grid grid-cols-3">
            {[
              { value: "registry", icon: Settings, label: "Registry", desc: "Setup & Config" },
              { value: "monitoring", icon: Activity, label: "Monitoring", desc: "Live Health" },
              { value: "alerts", icon: Bell, label: "Alerts & Fallbacks", desc: "Notifications" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-[hsl(26,47%,60%)] data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-[0_4px_20px_rgba(208,126,59,0.35)] data-[state=inactive]:text-[hsl(15,48%,35%)] data-[state=inactive]:hover:bg-primary/8"
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.value === "alerts" && criticalAlerts.length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce-in">
                    {criticalAlerts.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ─────────────────────────────────────────────────
            TAB 1: REGISTRY
            ───────────────────────────────────────────────── */}
        <TabsContent value="registry" className="animate-fade-in space-y-6">
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Registered Agents</CardTitle>
                    <CardDescription className="font-medium">Configure and manage your AI agent network</CardDescription>
                  </div>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold shadow-[0_4px_16px_rgba(208,126,59,0.3)] hover:shadow-[0_8px_32px_rgba(208,126,59,0.45)] hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-5">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.25)] rounded-2xl">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Add New Agent</DialogTitle>
                      <DialogDescription>Register a new AI agent to your orchestration network</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent-name" className="font-semibold">Agent Name</Label>
                        <Input id="agent-name" placeholder="e.g., GPT-4 Content Generator" value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl border-primary/20 focus:border-primary/40" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-semibold">Role</Label>
                          <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as any }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold">Auth Method</Label>
                          <Select value={formData.auth_method} onValueChange={(v) => setFormData(prev => ({ ...prev, auth_method: v as any }))}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="api_key">API Key</SelectItem>
                              <SelectItem value="bearer_token">Bearer Token</SelectItem>
                              <SelectItem value="basic_auth">Basic Auth</SelectItem>
                              <SelectItem value="oauth">OAuth</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Agent Purpose</Label>
                        <Input placeholder="e.g., Content generation, Data analysis" value={formData.function || ''} onChange={(e) => setFormData(prev => ({ ...prev, function: e.target.value }))} className="rounded-xl border-primary/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">API Endpoint</Label>
                        <Input placeholder="https://api.example.com/v1/..." value={formData.endpoint || ''} onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))} className="rounded-xl border-primary/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">API Key/Token</Label>
                        <Input type="password" placeholder="Enter your API key or token" value={formData.api_key_encrypted || ''} onChange={(e) => setFormData(prev => ({ ...prev, api_key_encrypted: e.target.value }))} className="rounded-xl border-primary/20" />
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl font-semibold">Cancel</Button>
                        <Button onClick={handleAddAgent} className="bg-gradient-to-r from-primary to-[hsl(26,47%,60%)] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(208,126,59,0.25)]">Add Agent</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="sm:max-w-lg border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.25)] rounded-2xl">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Edit Agent</DialogTitle>
                      <DialogDescription>Update your agent configuration</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Agent Name</Label>
                        <Input value={formData.name || ''} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="rounded-xl border-primary/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Role</Label>
                        <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as any }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="font-semibold">API Endpoint</Label>
                        <Input value={formData.endpoint || ''} onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))} className="rounded-xl border-primary/20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Auth Method</Label>
                        <Select value={formData.auth_method} onValueChange={(v) => setFormData(prev => ({ ...prev, auth_method: v as any }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="bearer_token">Bearer Token</SelectItem>
                            <SelectItem value="basic_auth">Basic Auth</SelectItem>
                            <SelectItem value="oauth">OAuth</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-semibold">Cancel</Button>
                      <Button onClick={handleUpdateAgent} className="bg-gradient-to-r from-primary to-[hsl(26,47%,60%)] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(208,126,59,0.25)]">Update Agent</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {/* Search & filter bar */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents by name or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border-primary/15 focus:border-primary/30 bg-white/60"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-44 rounded-xl border-primary/15">
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

              {/* Agent table */}
              <div className="rounded-xl border border-primary/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/5 via-accent/3 to-primary/5 hover:bg-primary/5">
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Agent Name</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Role</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Purpose</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Status</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Endpoint</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Auth</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Response</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Last Ping</TableHead>
                      <TableHead className="font-bold text-[hsl(15,48%,25%)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-3">
                            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-muted-foreground font-medium">Loading agents...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                              <Bot className="h-6 w-6 text-primary/50" />
                            </div>
                            <p className="text-muted-foreground font-medium">
                              {searchTerm || filter !== 'all' ? 'No agents match your filters' : 'No agents registered yet. Add your first agent to get started.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAgents.map((agent, index) => (
                      <TableRow
                        key={agent.id}
                        className="group hover:bg-gradient-to-r hover:from-primary/3 hover:to-accent/3 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : agent.status === 'error' ? 'bg-red-500' : 'bg-gray-300'}`} />
                            <span className="font-semibold text-foreground">{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize font-semibold rounded-lg">{agent.role}</Badge></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{agent.function || '-'}</span></TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[180px] truncate text-muted-foreground">{agent.endpoint}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs font-semibold rounded-lg">{agent.auth_method}</Badge></TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${agent.response_time && agent.response_time > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {agent.response_time && agent.response_time > 0 ? `${agent.response_time}ms` : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {agent.last_ping ? new Date(agent.last_ping).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-primary/20 shadow-[0_8px_32px_rgba(208,126,59,0.15)]">
                              <DropdownMenuItem onClick={() => handleTestAgent(agent)} disabled={isTestingAgent === agent.id} className="rounded-lg font-semibold">
                                {isTestingAgent === agent.id ? (
                                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                                ) : (
                                  <><Play className="h-4 w-4 mr-2 text-primary" />Test Agent</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(agent)} className="rounded-lg font-semibold">
                                {agent.status === 'active' ? (
                                  <><PowerOff className="h-4 w-4 mr-2 text-red-500" />Deactivate</>
                                ) : (
                                  <><Power className="h-4 w-4 mr-2 text-emerald-500" />Activate</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(agent)} className="rounded-lg font-semibold">
                                <Settings className="h-4 w-4 mr-2 text-primary" />Edit Agent
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteAgent(agent.id, agent.name)} className="text-destructive focus:text-destructive rounded-lg font-semibold">
                                <Trash2 className="h-4 w-4 mr-2" />Delete Agent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────
            TAB 2: MONITORING
            ───────────────────────────────────────────────── */}
        <TabsContent value="monitoring" className="animate-fade-in space-y-6">
          {/* Controls bar */}
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                    <Heart className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">System Health Overview</CardTitle>
                    <CardDescription className="font-medium">Real-time agent performance and automatic fallback systems</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={startMonitoring} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_32px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all duration-300 text-sm px-4">
                    <Radio className="h-4 w-4 mr-2" />Start
                  </Button>
                  <Button onClick={stopMonitoring} variant="outline" className="font-bold rounded-xl border-primary/20 text-sm px-4">
                    <PowerOff className="h-4 w-4 mr-2" />Stop
                  </Button>
                  <Button onClick={() => { setActiveTab("alerts"); setShowFallbackModal(true); }} variant="outline" className="font-bold rounded-xl border-primary/20 text-sm px-4">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />Fallback
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Health status grid */}
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Healthy", count: statusSummary.ok || 0, sub: "Online", status: "ok" as const, color: "text-emerald-600", bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/15" },
                  { label: "Warning", count: statusSummary.warn || 0, sub: "Degraded", status: "warn" as const, color: "text-amber-600", bg: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/15" },
                  { label: "Failed", count: statusSummary.fail || 0, sub: "Offline", status: "fail" as const, color: "text-red-600", bg: "from-red-500/10 to-red-500/5", border: "border-red-500/15" },
                  { label: "Unknown", count: statusSummary.unknown || 0, sub: "Pending", status: "unknown" as const, color: "text-gray-500", bg: "from-gray-400/10 to-gray-400/5", border: "border-gray-400/15" },
                ].map((item) => (
                  <div key={item.label} className={`group relative bg-gradient-to-br ${item.bg} rounded-2xl p-5 border ${item.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                      <StatusBadge status={item.status} showText={false} size="lg" />
                    </div>
                    <p className={`text-4xl font-black ${item.color}`}><AnimatedNumber value={item.count} /></p>
                    <p className={`text-sm font-semibold ${item.color} mt-1 opacity-70`}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent status cards */}
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">Agent Status Monitor</CardTitle>
                  <CardDescription className="font-medium">Real-time health and performance metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monitoringLoading ? (
                <div className="flex flex-col items-center py-12 space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground font-medium">Loading health data...</span>
                </div>
              ) : monitoringAgents.length === 0 ? (
                <div className="flex flex-col items-center py-12 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Activity className="h-6 w-6 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No agents found. Register agents in the Registry tab.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monitoringAgents.map((agentStatus, index) => (
                    <div
                      key={agentStatus.agent.id}
                      className="group relative bg-gradient-to-r from-white via-white to-white hover:from-primary/3 hover:via-accent/2 hover:to-primary/3 rounded-xl border border-primary/8 hover:border-primary/20 p-5 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(208,126,59,0.1)] hover:-translate-y-0.5"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Left accent bar */}
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300 ${
                        agentStatus.healthStatus === 'ok' ? 'bg-emerald-500' :
                        agentStatus.healthStatus === 'warn' ? 'bg-amber-500' :
                        agentStatus.healthStatus === 'fail' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />

                      <div className="flex items-center justify-between pl-3">
                        <div className="flex items-center space-x-4">
                          <StatusBadge status={agentStatus.healthStatus} />
                          <div>
                            <h4 className="font-bold text-foreground text-lg">{agentStatus.agent.name}</h4>
                            <Badge variant="outline" className="mt-1 capitalize font-semibold text-xs rounded-lg">{agentStatus.agent.role}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          {/* Metrics */}
                          {[
                            { label: "Response", value: formatResponseTime(agentStatus.responseTime), icon: Timer },
                            { label: "Success", value: `${agentStatus.successRate}%`, icon: TrendingUp },
                            { label: "Uptime", value: `${agentStatus.uptime.toFixed(1)}%`, icon: Wifi },
                          ].map((metric) => (
                            <div key={metric.label} className="text-center min-w-[80px]">
                              <div className="flex items-center justify-center space-x-1">
                                <metric.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-lg font-bold text-foreground">{metric.value}</p>
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground">{metric.label}</p>
                            </div>
                          ))}

                          <div className="text-center min-w-[70px]">
                            <p className="text-sm font-bold text-muted-foreground">{formatLastChecked(agentStatus.lastChecked)}</p>
                            <p className="text-xs font-semibold text-muted-foreground">Last Check</p>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2 pl-2 border-l border-primary/10">
                            <Button onClick={() => handleHealthCheck(agentStatus.agent.id)} variant="outline" size="sm" className="font-bold rounded-lg border-primary/15 hover:bg-primary/8 hover:border-primary/30 transition-all text-xs px-3">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />Test
                            </Button>
                            <Button onClick={() => handleMonitoringToggle(agentStatus.agent.id, agentStatus.agent.status)} variant={agentStatus.agent.status === 'active' ? "outline" : "default"} size="sm" className={`font-bold rounded-lg text-xs px-3 transition-all ${agentStatus.agent.status === 'active' ? 'border-red-500/20 text-red-600 hover:bg-red-500/8' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                              {agentStatus.agent.status === 'active' ? <><PowerOff className="h-3.5 w-3.5 mr-1" />Disable</> : <><Power className="h-3.5 w-3.5 mr-1" />Enable</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────
            TAB 3: ALERTS & FALLBACKS
            ───────────────────────────────────────────────── */}
        <TabsContent value="alerts" className="animate-fade-in space-y-6">
          {/* Critical alerts */}
          <Card className={`relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 ${criticalAlerts.length > 0 ? 'border-red-500/20' : 'border-primary/10'} shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl`}>
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${criticalAlerts.length > 0 ? 'via-red-500/60' : 'via-primary/60'} to-transparent`} />

            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${criticalAlerts.length > 0 ? 'bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/10' : 'bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10'}`}>
                    <Bell className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">
                      {criticalAlerts.length > 0 ? 'Critical Alerts' : 'System Alerts'}
                    </CardTitle>
                    <CardDescription className="font-medium">
                      {criticalAlerts.length > 0 ? `${criticalAlerts.length} alert${criticalAlerts.length > 1 ? 's' : ''} requiring attention` : 'All systems operating normally'}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setShowFallbackModal(true)}
                  className="bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold shadow-[0_4px_16px_rgba(208,126,59,0.3)] hover:shadow-[0_8px_32px_rgba(208,126,59,0.45)] hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-5"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Manual Fallback
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {criticalAlerts.length > 0 ? (
                <div className="space-y-3">
                  {criticalAlerts.map((alert, index) => (
                    <div
                      key={alert.id}
                      className="group relative bg-gradient-to-r from-red-500/5 via-white to-red-500/3 rounded-xl border border-red-500/10 hover:border-red-500/25 p-4 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(239,68,68,0.1)]"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Severity accent */}
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${alert.severity === 'critical' ? 'bg-red-600' : 'bg-amber-500'}`} />

                      <div className="flex items-start justify-between pl-3">
                        <div className="flex items-start space-x-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                            <AlertOctagon className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-foreground">{alert.title}</h4>
                              <Badge className={`text-[10px] px-2 py-0 font-bold uppercase tracking-wider ${alert.severity === 'critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{new Date(alert.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <Button onClick={() => acknowledgeAlert(alert.id)} variant="outline" size="sm" className="font-bold rounded-lg text-xs border-primary/15 hover:bg-primary/8 flex-shrink-0 ml-4">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 space-y-3">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <PulseDot color="bg-emerald-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-bold text-lg">All Clear</p>
                    <p className="text-muted-foreground font-medium text-sm mt-1">No critical alerts. Your agent network is operating smoothly.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All alerts (non-critical) */}
          {alerts.filter(a => a.severity !== 'critical' && a.severity !== 'high').length > 0 && (
            <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/10">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Other Notifications</CardTitle>
                    <CardDescription className="font-medium">Low and medium priority alerts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.filter(a => a.severity !== 'critical' && a.severity !== 'high').map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between bg-gradient-to-r from-amber-500/3 to-transparent rounded-xl border border-amber-500/8 p-4 transition-all duration-300 hover:border-amber-500/20">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{alert.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                      <Button onClick={() => acknowledgeAlert(alert.id)} variant="ghost" size="sm" className="text-xs font-semibold text-muted-foreground hover:text-foreground flex-shrink-0">
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════
          FALLBACK MODAL
          ═══════════════════════════════════════════════════ */}
      {showFallbackModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="relative w-full max-w-md mx-4">
            {/* Glow */}
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-3xl opacity-40" />

            <Card className="relative bg-white border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.35)] rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Manual Fallback</CardTitle>
                    <CardDescription className="font-medium">Switch agent operations to a backup</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">From Agent</Label>
                  <select value={fallbackConfig.from} onChange={(e) => setFallbackConfig(prev => ({ ...prev, from: e.target.value }))} className="w-full px-4 py-2.5 border-2 border-primary/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 font-medium transition-all">
                    <option value="">Select agent to disable</option>
                    {monitoringAgents.filter(a => a.agent.status === 'active').map(s => (
                      <option key={s.agent.id} value={s.agent.id}>{s.agent.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <ChevronRight className="h-4 w-4 text-primary rotate-90" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">To Agent</Label>
                  <select value={fallbackConfig.to} onChange={(e) => setFallbackConfig(prev => ({ ...prev, to: e.target.value }))} className="w-full px-4 py-2.5 border-2 border-primary/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 font-medium transition-all">
                    <option value="">Select fallback agent</option>
                    {monitoringAgents.filter(a => a.agent.id !== fallbackConfig.from && a.agent.is_fallback_enabled).map(s => (
                      <option key={s.agent.id} value={s.agent.id}>{s.agent.name} (Priority: {s.agent.priority})</option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-3">
                  <Button onClick={handleFallback} disabled={!fallbackConfig.from || !fallbackConfig.to} className="flex-1 bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(208,126,59,0.3)] disabled:opacity-50">
                    Execute Fallback
                  </Button>
                  <Button onClick={() => { setShowFallbackModal(false); setFallbackConfig({ from: '', to: '' }); }} variant="outline" className="flex-1 font-bold rounded-xl border-primary/20">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Error display */}
      {monitoringError && (
        <Card className="relative overflow-hidden bg-white/90 border-2 border-red-500/20 rounded-2xl">
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 font-semibold text-sm">{monitoringError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentHub;
