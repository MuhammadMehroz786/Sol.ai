import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAgentMonitoring } from "@/hooks/useAgentMonitoring";
import { StatusBadge } from "@/components/monitoring/StatusBadge";
import {
  Agent, AgentInsert, AgentWithStats, AgentRole, AgentStatus, AuthMethod, validateEndpoint,
} from "@/types/agents";
import { agentMonitoringService } from "@/services/agentMonitoring";
import {
  Settings, Plus, Search, CheckCircle, XCircle, Clock, Bot, Zap, Shield,
  Trash2, AlertTriangle, Play, X, MoreHorizontal, Activity,
  Heart, Radio, Bell, ArrowRightLeft, RefreshCw, Power, PowerOff,
  Wifi, Timer, TrendingUp, Eye, ChevronRight, AlertOctagon, BarChart3,
  Hash,
} from "lucide-react";

// ─── Shared form fields (extracted outside component to prevent remounting on state change) ───
const AgentFormFields = ({
  formData,
  setFormData,
}: {
  formData: Partial<AgentInsert>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<AgentInsert>>>;
}) => (
  <>
    <div className="space-y-2">
      <Label className="font-semibold">Agent Name *</Label>
      <Input
        placeholder="e.g., GPT-4 Content Generator"
        value={formData.name || ""}
        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
        className="rounded-xl border-primary/20 focus:border-primary/40"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="font-semibold">Role</Label>
        <Select value={formData.role || ""} onValueChange={(v) => setFormData(p => ({ ...p, role: v as AgentRole }))}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>
            {[
              { value: "content_discovery",   label: "Content Discovery" },
              { value: "content_refinement",  label: "Content Refinement" },
              { value: "data_analysis",       label: "Data Analysis" },
              { value: "fallback_processing", label: "Fallback Processing" },
              { value: "custom",              label: "Custom" },
            ].map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="font-semibold">Auth Method</Label>
        <Select value={formData.auth_method || ""} onValueChange={(v) => setFormData(p => ({ ...p, auth_method: v as AuthMethod }))}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select method" /></SelectTrigger>
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
      <Input
        placeholder="e.g., Content generation, Data analysis"
        value={formData.function || ""}
        onChange={(e) => setFormData(p => ({ ...p, function: e.target.value }))}
        className="rounded-xl border-primary/20"
      />
    </div>
    <div className="space-y-2">
      <Label className="font-semibold">API Endpoint *</Label>
      <Input
        placeholder="https://api.example.com/v1/..."
        value={formData.endpoint || ""}
        onChange={(e) => setFormData(p => ({ ...p, endpoint: e.target.value }))}
        className="rounded-xl border-primary/20"
      />
    </div>
    <div className="space-y-2">
      <Label className="font-semibold">API Key / Token</Label>
      <Input
        type="password"
        placeholder="Enter your API key or token"
        value={formData.api_key_encrypted || ""}
        onChange={(e) => setFormData(p => ({ ...p, api_key_encrypted: e.target.value }))}
        className="rounded-xl border-primary/20"
      />
    </div>
    <div className="space-y-2">
      <Label className="font-semibold">Status</Label>
      <Select value={formData.status || ""} onValueChange={(v) => setFormData(p => ({ ...p, status: v as AgentStatus }))}>
        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="planned">Planned</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/3 px-4 py-3">
      <div>
        <p className="font-semibold text-sm text-foreground">Fallback Agent</p>
        <p className="text-xs text-muted-foreground mt-0.5">Allow this agent to be used as a fallback when others fail</p>
      </div>
      <Switch
        checked={formData.is_fallback_enabled ?? false}
        onCheckedChange={(checked) => setFormData(p => ({ ...p, is_fallback_enabled: checked }))}
      />
    </div>
  </>
);

// ─── Animated counter ───
const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else { setDisplay(Math.round(current * 10) / 10); }
    }, 800 / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{typeof value === "number" && value % 1 !== 0 ? display.toFixed(1) : Math.round(display)}{suffix}</>;
};

// ─── Pulse dot ───
const PulseDot = ({ color }: { color: string }) => (
  <span className="relative flex h-3 w-3">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
  </span>
);

const Agents = () => {
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState<Partial<AgentInsert>>({
    name: "", role: undefined, function: "", endpoint: "",
    auth_method: undefined, api_key_encrypted: "",
    api_headers: {}, input_schema: null, output_schema: null,
    status: undefined, priority: undefined, is_fallback_enabled: false,
  });

  // ─── Monitoring hook ───
  const {
    agents: monitoringAgents,
    alerts,
    loading: monitoringLoading,
    error: monitoringError,
    runHealthCheck,
    toggleAgentStatus: monitoringToggleStatus,
    triggerFallback,
    acknowledgeAlert,
    updatePriority,
    toggleFallback,
    startMonitoring,
    stopMonitoring,
  } = useAgentMonitoring();

  // ─── Extra monitoring UI state ───
  const [editingPriority, setEditingPriority] = useState<{ id: string; value: number } | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackConfig, setFallbackConfig] = useState<{ from: string; to: string }>({ from: "", to: "" });

  // ─── Fetch registry agents ───
  const fetchAgents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agents").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Error fetching agents", description: error.message, variant: "destructive" });
      } else {
        const agentsWithStats: AgentWithStats[] = (data || []).map(agent => ({
          ...agent,
          success_rate: agent.success_rate ?? null,
          total_requests: agent.total_requests || 0,
          uptime_percentage: agent.total_requests > 0 ? (agent.success_rate || 0) : 0,
          avg_response_time: agent.response_time || 0,
          is_healthy: agent.status === "active" && (agent.success_rate || 0) > 80,
        }));
        setAgents(agentsWithStats);
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { if (user) fetchAgents(); }, [user, fetchAgents]);

  // ─── CRUD ───
  const handleAddAgent = async () => {
    if (!user || !formData.name || !formData.endpoint) {
      toast({ title: "Validation Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }
    if (!validateEndpoint(formData.endpoint)) {
      toast({ title: "Invalid Endpoint", description: "Please enter a valid HTTPS URL", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("agents").insert({ ...formData, user_id: user.id });
    if (error) {
      toast({ title: "Error adding agent", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent added", description: `${formData.name} has been registered` });
      setIsAddDialogOpen(false);
      resetForm();
      fetchAgents();
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent || !formData.name || !formData.endpoint) return;
    const { error } = await supabase.from("agents").update(formData).eq("id", selectedAgent.id);
    if (error) {
      toast({ title: "Error updating agent", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent updated", description: `${formData.name} has been updated` });
      setIsEditDialogOpen(false);
      resetForm();
      fetchAgents();
    }
  };

  const handleDeleteAgent = async (id: string) => {
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting agent", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent deleted" });
      fetchAgents();
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("agents").update({ status: newStatus }).eq("id", agent.id);
    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `${agent.name} is now ${newStatus}` });
      fetchAgents();
    }
  };

  const handleTestAgent = async (agent: Agent) => {
    setIsTestingAgent(agent.id);
    try {
      const result = await agentMonitoringService.runManualHealthCheck(agent.id);
      if (result) {
        const newTotal = (agent.total_requests || 0) + 1;
        const prevSuccessful = Math.round(((agent.success_rate || 0) / 100) * (agent.total_requests || 0));
        const newSuccessful = result.success ? prevSuccessful + 1 : prevSuccessful;
        await supabase.from("agents").update({
          last_ping: new Date().toISOString(),
          response_time: result.response_time,
          total_requests: newTotal,
          success_rate: newTotal > 0 ? Math.round((newSuccessful / newTotal) * 10000) / 100 : 0,
        }).eq("id", agent.id);
        toast({
          title: result.success ? "Test successful" : "Test failed",
          description: result.success
            ? `${agent.name} responded in ${result.response_time}ms (${result.health_status})`
            : `${agent.name} — ${result.error_message || "No response"}`,
          variant: result.success ? "default" : "destructive",
        });
      } else {
        toast({ title: "Test failed", description: `Could not reach ${agent.name}`, variant: "destructive" });
      }
      fetchAgents();
    } finally {
      setIsTestingAgent(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "", role: undefined, function: "", endpoint: "",
      auth_method: undefined, api_key_encrypted: "",
      api_headers: {}, input_schema: null, output_schema: null,
      status: undefined, priority: undefined, is_fallback_enabled: false,
    });
    setSelectedAgent(null);
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name, role: agent.role, function: agent.function,
      endpoint: agent.endpoint, auth_method: agent.auth_method,
      api_key_encrypted: agent.api_key_encrypted || "",
      api_headers: agent.api_headers || {},
      input_schema: agent.input_schema, output_schema: agent.output_schema,
      status: agent.status,
      priority: (agent as AgentWithStats).priority ?? 1,
      is_fallback_enabled: (agent as AgentWithStats).is_fallback_enabled ?? false,
    });
    setIsEditDialogOpen(true);
  };

  // ─── Monitoring handlers ───
  const handleHealthCheck = async (agentId: string) => { await runHealthCheck(agentId); };

  const handleMonitoringToggle = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await monitoringToggleStatus(agentId, newStatus as "active" | "inactive");
  };

  const handleUpdatePriority = async (agentId: string, priority: number) => {
    if (isNaN(priority) || priority < 1) return;
    const success = await updatePriority(agentId, priority);
    if (success) {
      toast({ title: "Priority updated", description: `Agent priority set to ${priority}` });
    } else {
      toast({ title: "Failed to update priority", variant: "destructive" });
    }
    setEditingPriority(null);
  };

  const handleToggleFallback = async (agentId: string, enabled: boolean) => {
    const success = await toggleFallback(agentId, enabled);
    if (!success) {
      toast({ title: "Failed to update fallback setting", variant: "destructive" });
    }
  };

  const handleFallback = async () => {
    if (fallbackConfig.from && fallbackConfig.to) {
      const success = await triggerFallback(fallbackConfig.from, fallbackConfig.to, "Manual fallback triggered");
      if (success) { setShowFallbackModal(false); setFallbackConfig({ from: "", to: "" }); }
    }
  };

  // ─── Computed values ───
  const statusSummary = monitoringAgents.reduce((acc, a) => {
    acc[a.healthStatus] = (acc[a.healthStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "high");

  const activeCount = agents.filter(a => a.status === "active").length;
  const avgResponse = agents.length > 0
    ? agents.reduce((s, a) => s + (a.response_time || 0), 0) / agents.length / 1000 : 0;
  const avgSuccess = (() => {
    const withData = agents.filter(a => a.total_requests && a.total_requests > 0);
    return withData.length > 0 ? withData.reduce((s, a) => s + (a.success_rate || 0), 0) / withData.length : 0;
  })();

  const filteredAgents = agents.filter(agent => {
    const matchesFilter = filter === "all" || agent.status === filter;
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ─── Helpers ───
  const getStatusBadge = (status: Agent["status"]) => {
    const configs: Record<string, { className: string; icon: typeof CheckCircle; label: string }> = {
      active:   { className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle, label: "Active" },
      inactive: { className: "bg-red-500/10 text-red-500 border-red-500/20",             icon: XCircle,     label: "Inactive" },
      planned:  { className: "bg-amber-500/10 text-amber-600 border-amber-500/20",        icon: Clock,       label: "Planned" },
      error:    { className: "bg-red-600/10 text-red-600 border-red-600/20",              icon: AlertTriangle, label: "Error" },
    };
    const config = configs[status] || { className: "bg-gray-100 text-gray-500 border-gray-200", icon: Clock, label: "Unknown" };
    const Icon = config.icon;
    return <Badge className={`${config.className} font-semibold`}><Icon className="h-3 w-3 mr-1" />{config.label}</Badge>;
  };

  const formatResponseTime = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const formatLastChecked = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // AgentFormFields is defined outside this component to prevent remount on state change

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(21,58%,48%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,40%)] p-8 shadow-[0_16px_64px_rgba(208,126,59,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(226,161,118,0.2)_0%,transparent_40%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)",
          backgroundSize: "32px 32px"
        }} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl animate-pulse-slow" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <Bot className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div className="absolute -top-1 -right-1"><PulseDot color="bg-emerald-400" /></div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg">Agent Hub</h1>
              <p className="text-lg text-white/70 mt-1 font-medium">
                Configure, deploy, and monitor your AI agent network
              </p>
            </div>
          </div>

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
                <span className="text-sm font-bold text-red-200">{criticalAlerts.length} Alert{criticalAlerts.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Total Agents", value: agents.length,  suffix: "",  icon: Bot,    color: "text-white" },
            { label: "Active",        value: activeCount,    suffix: "",  icon: CheckCircle, color: "text-emerald-300" },
            { label: "Avg Response",  value: avgResponse,    suffix: "s", icon: Zap,    color: "text-amber-300" },
            { label: "Success Rate",  value: avgSuccess,     suffix: "%", icon: Shield, color: "text-emerald-300" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group relative bg-white/8 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
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
        <TabsList className="relative w-full h-auto p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.1)] grid grid-cols-3">
          {[
            { value: "registry",   icon: Settings,  label: "Registry",          desc: "Setup & Config" },
            { value: "monitoring", icon: Activity,  label: "Monitoring",         desc: "Live Health" },
            { value: "alerts",     icon: Bell,      label: "Alerts & Fallbacks", desc: "Notifications" },
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

        {/* ─────────────────────────────────────────────────
            TAB 1: REGISTRY
            ───────────────────────────────────────────────── */}
        <TabsContent value="registry" className="animate-fade-in space-y-6">
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Registered Agents</CardTitle>
                    <CardDescription className="font-medium">Configure and manage your AI agent network</CardDescription>
                  </div>
                </div>

                {/* Add Agent Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold shadow-[0_4px_16px_rgba(208,126,59,0.3)] hover:shadow-[0_8px_32px_rgba(208,126,59,0.45)] hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-5">
                      <Plus className="h-4 w-4 mr-2" />Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.25)] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Add New Agent</DialogTitle>
                      <DialogDescription>Register a new AI agent to your orchestration network</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <AgentFormFields formData={formData} setFormData={setFormData} />
                      <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} className="rounded-xl font-semibold">Cancel</Button>
                        <Button onClick={handleAddAgent} className="bg-gradient-to-r from-primary to-[hsl(26,47%,60%)] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(208,126,59,0.25)]">Add Agent</Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Edit Agent Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="sm:max-w-lg border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.25)] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Edit Agent</DialogTitle>
                      <DialogDescription>Update your agent configuration</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <AgentFormFields formData={formData} setFormData={setFormData} />
                      <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }} className="rounded-xl font-semibold">Cancel</Button>
                        <Button onClick={handleUpdateAgent} className="bg-gradient-to-r from-primary to-[hsl(26,47%,60%)] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(208,126,59,0.25)]">Update Agent</Button>
                      </DialogFooter>
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
                  <SelectTrigger className="w-44 rounded-xl border-primary/15"><SelectValue /></SelectTrigger>
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
                      {["Agent Name","Role","Purpose","Status","Endpoint","Auth","Response","Last Ping","Actions"].map(h => (
                        <TableHead key={h} className="font-bold text-[hsl(15,48%,25%)]">{h}</TableHead>
                      ))}
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
                              {searchTerm || filter !== "all" ? "No agents match your filters" : "No agents registered yet. Add your first agent above."}
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
                            <div className={`w-2 h-2 rounded-full ${agent.status === "active" ? "bg-emerald-500" : agent.status === "error" ? "bg-red-500" : "bg-gray-300"}`} />
                            <span className="font-semibold">{agent.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize font-semibold rounded-lg">{agent.role}</Badge></TableCell>
                        <TableCell><span className="text-sm text-muted-foreground">{agent.function || "-"}</span></TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[180px] truncate text-muted-foreground">{agent.endpoint}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs font-semibold rounded-lg">{agent.auth_method}</Badge></TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${agent.response_time && agent.response_time > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {agent.response_time && agent.response_time > 0 ? `${agent.response_time}ms` : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {agent.last_ping ? new Date(agent.last_ping).toLocaleDateString() : "-"}
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
                                {isTestingAgent === agent.id
                                  ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                                  : <><Play className="h-4 w-4 mr-2 text-primary" />Test Agent</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(agent)} className="rounded-lg font-semibold">
                                {agent.status === "active"
                                  ? <><PowerOff className="h-4 w-4 mr-2 text-red-500" />Deactivate</>
                                  : <><Power className="h-4 w-4 mr-2 text-emerald-500" />Activate</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(agent)} className="rounded-lg font-semibold">
                                <Settings className="h-4 w-4 mr-2 text-primary" />Edit Agent
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteConfirm({ id: agent.id, name: agent.name })} className="text-destructive focus:text-destructive rounded-lg font-semibold">
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
          {/* Controls */}
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/10">
                    <Heart className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">System Health Overview</CardTitle>
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
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Healthy", count: statusSummary.ok || 0,      sub: "Online",   status: "ok"      as const, color: "text-emerald-600", bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/15" },
                  { label: "Warning", count: statusSummary.warn || 0,     sub: "Degraded", status: "warn"    as const, color: "text-amber-600",   bg: "from-amber-500/10 to-amber-500/5",   border: "border-amber-500/15" },
                  { label: "Failed",  count: statusSummary.fail || 0,     sub: "Offline",  status: "fail"    as const, color: "text-red-600",     bg: "from-red-500/10 to-red-500/5",       border: "border-red-500/15" },
                  { label: "Unknown", count: statusSummary.unknown || 0,  sub: "Pending",  status: "unknown" as const, color: "text-gray-500",    bg: "from-gray-400/10 to-gray-400/5",     border: "border-gray-400/15" },
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
                  <CardTitle className="text-xl font-bold">Agent Status Monitor</CardTitle>
                  <CardDescription className="font-medium">Real-time health, performance metrics, and fallback controls</CardDescription>
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
                        agentStatus.healthStatus === "ok"   ? "bg-emerald-500" :
                        agentStatus.healthStatus === "warn" ? "bg-amber-500"   :
                        agentStatus.healthStatus === "fail" ? "bg-red-500"     : "bg-gray-300"
                      }`} />

                      <div className="flex items-center justify-between pl-3">
                        {/* Left: name + role */}
                        <div className="flex items-center space-x-4 min-w-0">
                          <StatusBadge status={agentStatus.healthStatus} />
                          <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-lg truncate">{agentStatus.agent.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="capitalize font-semibold text-xs rounded-lg">{agentStatus.agent.role}</Badge>
                              {agentStatus.agent.is_fallback_enabled && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold rounded-lg">Fallback</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: metrics + controls */}
                        <div className="flex items-center space-x-5 flex-shrink-0">
                          {/* Metrics */}
                          {[
                            { label: "Response", value: formatResponseTime(agentStatus.responseTime), icon: Timer },
                            { label: "Success",  value: `${agentStatus.successRate}%`,                icon: TrendingUp },
                            { label: "Uptime",   value: `${agentStatus.uptime.toFixed(1)}%`,          icon: Wifi },
                          ].map((metric) => (
                            <div key={metric.label} className="text-center min-w-[70px]">
                              <div className="flex items-center justify-center space-x-1">
                                <metric.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-lg font-bold text-foreground">{metric.value}</p>
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground">{metric.label}</p>
                            </div>
                          ))}

                          {/* Last check */}
                          <div className="text-center min-w-[60px]">
                            <p className="text-sm font-bold text-muted-foreground">{formatLastChecked(agentStatus.lastChecked)}</p>
                            <p className="text-xs font-semibold text-muted-foreground">Last Check</p>
                          </div>

                          {/* Priority — click to edit */}
                          <div className="text-center min-w-[50px]">
                            {editingPriority?.id === agentStatus.agent.id ? (
                              <input
                                type="number"
                                min={1} max={100}
                                defaultValue={editingPriority.value}
                                autoFocus
                                onBlur={(e) => handleUpdatePriority(agentStatus.agent.id, parseInt(e.target.value))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdatePriority(agentStatus.agent.id, parseInt((e.target as HTMLInputElement).value));
                                  if (e.key === "Escape") setEditingPriority(null);
                                }}
                                className="w-12 text-center border border-primary/30 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 px-1 py-0.5"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingPriority({ id: agentStatus.agent.id, value: (agentStatus.agent as AgentWithStats).priority ?? 1 })}
                                className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center justify-center"
                                title="Click to edit priority"
                              >
                                <Hash className="h-3 w-3 mr-0.5 text-muted-foreground" />
                                {(agentStatus.agent as AgentWithStats).priority ?? 1}
                              </button>
                            )}
                            <p className="text-xs font-semibold text-muted-foreground">Priority</p>
                          </div>

                          {/* Fallback toggle */}
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={agentStatus.agent.is_fallback_enabled ?? false}
                              onCheckedChange={(checked) => handleToggleFallback(agentStatus.agent.id, checked)}
                              className="scale-90"
                            />
                            <p className="text-[10px] font-semibold text-muted-foreground">Fallback</p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex space-x-2 pl-2 border-l border-primary/10">
                            <Button onClick={() => handleHealthCheck(agentStatus.agent.id)} variant="outline" size="sm" className="font-bold rounded-lg border-primary/15 hover:bg-primary/8 hover:border-primary/30 transition-all text-xs px-3">
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />Test
                            </Button>
                            <Button
                              onClick={() => handleMonitoringToggle(agentStatus.agent.id, agentStatus.agent.status)}
                              variant={agentStatus.agent.status === "active" ? "outline" : "default"}
                              size="sm"
                              className={`font-bold rounded-lg text-xs px-3 transition-all ${agentStatus.agent.status === "active" ? "border-red-500/20 text-red-600 hover:bg-red-500/8" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
                            >
                              {agentStatus.agent.status === "active"
                                ? <><PowerOff className="h-3.5 w-3.5 mr-1" />Disable</>
                                : <><Power className="h-3.5 w-3.5 mr-1" />Enable</>}
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
          <Card className={`relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 ${criticalAlerts.length > 0 ? "border-red-500/20" : "border-primary/10"} shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl`}>
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${criticalAlerts.length > 0 ? "via-red-500/60" : "via-primary/60"} to-transparent`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${criticalAlerts.length > 0 ? "bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/10" : "bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10"}`}>
                    <Bell className={`h-5 w-5 ${criticalAlerts.length > 0 ? "text-red-600" : "text-primary"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">
                      {criticalAlerts.length > 0 ? "Critical Alerts" : "System Alerts"}
                    </CardTitle>
                    <CardDescription className="font-medium">
                      {criticalAlerts.length > 0 ? `${criticalAlerts.length} alert${criticalAlerts.length > 1 ? "s" : ""} requiring attention` : "All systems operating normally"}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setShowFallbackModal(true)}
                  className="bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold shadow-[0_4px_16px_rgba(208,126,59,0.3)] hover:shadow-[0_8px_32px_rgba(208,126,59,0.45)] hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-5"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />Manual Fallback
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {criticalAlerts.length > 0 ? (
                <div className="space-y-3">
                  {criticalAlerts.map((alert, index) => (
                    <div
                      key={alert.id}
                      className="group relative bg-gradient-to-r from-red-500/5 via-white to-red-500/3 rounded-xl border border-red-500/10 hover:border-red-500/25 p-4 transition-all duration-300"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${alert.severity === "critical" ? "bg-red-600" : "bg-amber-500"}`} />
                      <div className="flex items-start justify-between pl-3">
                        <div className="flex items-start space-x-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${alert.severity === "critical" ? "bg-red-500/15" : "bg-amber-500/15"}`}>
                            <AlertOctagon className={`h-4 w-4 ${alert.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-foreground">{alert.title}</h4>
                              <Badge className={`text-[10px] px-2 py-0 font-bold uppercase ${alert.severity === "critical" ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
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
                    <div className="absolute -top-1 -right-1"><PulseDot color="bg-emerald-400" /></div>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-bold text-lg">All Clear</p>
                    <p className="text-muted-foreground font-medium text-sm mt-1">No critical alerts. Your agent network is operating smoothly.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low/medium alerts */}
          {alerts.filter(a => a.severity !== "critical" && a.severity !== "high").length > 0 && (
            <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-primary/10 shadow-[0_8px_32px_rgba(208,126,59,0.08)] rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/10">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Other Notifications</CardTitle>
                    <CardDescription className="font-medium">Low and medium priority alerts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.filter(a => a.severity !== "critical" && a.severity !== "high").map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between bg-gradient-to-r from-amber-500/3 to-transparent rounded-xl border border-amber-500/8 p-4 hover:border-amber-500/20 transition-all duration-300">
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
          MANUAL FALLBACK MODAL
          ═══════════════════════════════════════════════════ */}
      {showFallbackModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="relative w-full max-w-md mx-4">
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-3xl opacity-40" />
            <Card className="relative bg-white border-2 border-primary/20 shadow-[0_20px_60px_rgba(208,126,59,0.35)] rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15">
                      <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Manual Fallback</CardTitle>
                      <CardDescription className="font-medium">Switch agent operations to a backup</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowFallbackModal(false)} className="rounded-lg h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold">From Agent</Label>
                  <select
                    value={fallbackConfig.from}
                    onChange={(e) => setFallbackConfig(p => ({ ...p, from: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-primary/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all"
                  >
                    <option value="">Select agent to disable</option>
                    {monitoringAgents.filter(a => a.agent.status === "active").map(s => (
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
                  <select
                    value={fallbackConfig.to}
                    onChange={(e) => setFallbackConfig(p => ({ ...p, to: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-primary/15 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all"
                  >
                    <option value="">Select fallback agent</option>
                    {monitoringAgents
                      .filter(a => a.agent.id !== fallbackConfig.from && a.agent.is_fallback_enabled)
                      .map(s => (
                        <option key={s.agent.id} value={s.agent.id}>{s.agent.name} (Priority: {(s.agent as AgentWithStats).priority})</option>
                      ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-3">
                  <Button
                    onClick={handleFallback}
                    disabled={!fallbackConfig.from || !fallbackConfig.to}
                    className="flex-1 bg-gradient-to-r from-primary via-[hsl(26,47%,60%)] to-primary text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(208,126,59,0.3)] disabled:opacity-50"
                  >
                    Execute Fallback
                  </Button>
                  <Button
                    onClick={() => { setShowFallbackModal(false); setFallbackConfig({ from: "", to: "" }); }}
                    variant="outline"
                    className="flex-1 font-bold rounded-xl border-primary/20"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Error banner */}
      {monitoringError && (
        <Card className="relative overflow-hidden bg-white/90 border-2 border-red-500/20 rounded-2xl">
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 font-semibold text-sm">{monitoringError}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-2 border-red-200/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-red-700">Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-bold">{deleteConfirm?.name}</span> will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirm) { handleDeleteAgent(deleteConfirm.id); setDeleteConfirm(null); } }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agents;
