import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { GeneratedContentModal, DEFAULT_GUARDRAILS, type Guardrails } from "@/components/dashboard/GeneratedContentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  Edit3,
  Share,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface ContentOutput {
  id: string;
  title: string;
  content: string;
  persona: string;
  tones: string[];
  output_type: string;
  status: 'draft' | 'review' | 'final' | 'published';
  topic_context?: string;
  created_at: string;
  updated_at: string;
}

interface ContentQueueProps {
  onSelectOutput: (output: ContentOutput) => void;
  pendingOpenId?: string | null;
  onDraftOpened?: () => void;
}

const statusConfig = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-600 border border-slate-300",
    accent: "border-l-slate-400",
    headerColor: "text-slate-600",
    dotColor: "bg-slate-400",
    icon: Edit3
  },
  review: {
    label: "Review",
    color: "bg-amber-50 text-amber-700 border border-amber-300",
    accent: "border-l-amber-400",
    headerColor: "text-amber-700",
    dotColor: "bg-amber-400",
    icon: AlertCircle
  },
  final: {
    label: "Final",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-300",
    accent: "border-l-emerald-500",
    headerColor: "text-emerald-700",
    dotColor: "bg-emerald-500",
    icon: CheckCircle
  },
  published: {
    label: "Published",
    color: "bg-blue-50 text-blue-700 border border-blue-300",
    accent: "border-l-blue-500",
    headerColor: "text-blue-700",
    dotColor: "bg-blue-500",
    icon: Share
  }
};

export const ContentQueue = ({ onSelectOutput, pendingOpenId, onDraftOpened }: ContentQueueProps) => {
  const [outputs, setOutputs] = useState<ContentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedOutput, setSelectedOutput] = useState<ContentOutput | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVoiceId, setModalVoiceId] = useState("");
  const [modalGuardrails, setModalGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Listen for cross-component events via CustomEvents
  useEffect(() => {
    const handleRefresh = () => { fetchOutputs(); };

    const handleOpenDraftModal = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; voiceId?: string; guardrails?: Guardrails }>).detail;
      const contentId = detail?.id;
      if (!contentId) return;

      const voiceId = detail?.voiceId ?? "";
      const guardrails = detail?.guardrails ?? DEFAULT_GUARDRAILS;

      const output = outputs.find(o => o.id === contentId);
      if (output) {
        openContentModal(output, voiceId, guardrails);
      } else if (user) {
        supabase
          .from('content_outputs')
          .select('*')
          .eq('id', contentId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              openContentModal(data as ContentOutput, voiceId, guardrails);
              fetchOutputs();
            }
          });
      }
    };

    window.addEventListener('contentQueueRefresh', handleRefresh);
    window.addEventListener('openDraftModal', handleOpenDraftModal);
    return () => {
      window.removeEventListener('contentQueueRefresh', handleRefresh);
      window.removeEventListener('openDraftModal', handleOpenDraftModal);
    };
  }, [user, outputs]);

  useEffect(() => {
    if (user) {
      fetchOutputs();
    }
  }, [user]);

  // Open a specific draft when the queue mounts with a pendingOpenId
  useEffect(() => {
    if (!pendingOpenId || loading) return;
    const found = outputs.find(o => o.id === pendingOpenId);
    if (found) {
      openContentModal(found);
      onDraftOpened?.();
    } else if (user) {
      supabase
        .from('content_outputs')
        .select('*')
        .eq('id', pendingOpenId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            openContentModal(data as ContentOutput);
            fetchOutputs();
            onDraftOpened?.();
          }
        });
    }
  }, [pendingOpenId, loading]);

  const fetchOutputs = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('content_outputs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOutputs((data || []) as ContentOutput[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: ContentOutput['status']) => {
    const { error } = await supabase
      .from('content_outputs')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchOutputs();
      toast({
        title: "Status updated",
        description: `Content moved to ${newStatus}`,
      });

      // Update the selected output with new status and keep modal open
      if (selectedOutput && selectedOutput.id === id) {
        setSelectedOutput({ ...selectedOutput, status: newStatus });
      }

      window.dispatchEvent(new CustomEvent('statsRefresh'));
    }
  };

  const deleteOutput = async (id: string) => {
    const { error } = await supabase
      .from('content_outputs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchOutputs();
      toast({
        title: "Content deleted",
        description: "Content has been removed from your queue",
      });
      window.dispatchEvent(new CustomEvent('statsRefresh'));
    }
  };

  const openContentModal = (output: ContentOutput, voiceId = "", guardrails: Guardrails = DEFAULT_GUARDRAILS) => {
    setSelectedOutput(output);
    setModalVoiceId(voiceId || output.persona);
    setModalGuardrails(guardrails);
    setModalOpen(true);
  };

  const filteredOutputs = outputs.filter(output => {
    const matchesSearch = output.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         output.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || output.status === statusFilter;
    const matchesType = typeFilter === "all" || output.output_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique output types from existing data for dynamic filter
  const availableTypes = Array.from(new Set(outputs.map(output => output.output_type)))
    .filter(Boolean)
    .sort();

  const groupedOutputs = {
    draft: filteredOutputs.filter(o => o.status === 'draft'),
    review: filteredOutputs.filter(o => o.status === 'review'),
    final: filteredOutputs.filter(o => o.status === 'final'),
    published: filteredOutputs.filter(o => o.status === 'published')
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-base font-semibold">Content Queue</CardTitle>
        <CardDescription className="text-xs">Loading your generated content...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Content Queue</CardTitle>
            <CardDescription className="text-xs">
              Manage your generated content pipeline
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background h-8 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-28 bg-background h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-28 bg-background h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-0" />

        {/* Content Grid */}
        <div className="space-y-3">
          {Object.entries(groupedOutputs).map(([status, items]) => {
            if (items.length === 0) return null;

            const config = statusConfig[status as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                  <Icon className={`h-3.5 w-3.5 ${config.headerColor}`} />
                  <h3 className={`font-bold text-[11px] uppercase tracking-wider ${config.headerColor}`}>
                    {config.label} <span className="opacity-60">({items.length})</span>
                  </h3>
                </div>

                <div className="grid gap-2">
                  {items.map((output) => (
                    <div
                      key={output.id}
                      className={`bg-background rounded-lg border border-border border-l-[3px] ${config.accent} p-3 hover:shadow-md hover:shadow-black/5 transition-all duration-200 cursor-pointer`}
                      onClick={() => openContentModal(output)}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <h4 className="font-medium text-xs truncate">{output.title}</h4>
                            <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                              {output.output_type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1.5">
                            {output.content.substring(0, 100)}...
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                {output.persona.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                              </Badge>
                              {output.tones.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {output.tones[0]} {output.tones.length > 1 && `+${output.tones.length - 1}`}
                                </Badge>
                              )}
                            </div>

                            <Badge className={`text-[10px] ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center space-x-0.5">
                          {status !== 'published' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = status === 'draft' ? 'review' :
                                                 status === 'review' ? 'final' : 'published';
                                updateStatus(output.id, nextStatus as ContentOutput['status']);
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(output.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredOutputs.length === 0 && (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-medium text-sm text-foreground mb-1">No content found</h3>
              <p className="text-xs text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Generate some content to get started"}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Universal Generated Content Modal */}
      {selectedOutput && (
        <GeneratedContentModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedOutput(null);
          }}
          contentId={selectedOutput.id}
          title={selectedOutput.title}
          initialContent={selectedOutput.content}
          persona={selectedOutput.persona}
          voiceId={modalVoiceId}
          outputType={selectedOutput.output_type}
          initialStatus={selectedOutput.status}
          topicContext={selectedOutput.topic_context}
          createdAt={selectedOutput.created_at}
          guardrails={modalGuardrails}
          onRefresh={fetchOutputs}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl border-2 border-red-200/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-red-700">Delete content?</AlertDialogTitle>
            <AlertDialogDescription>
              This content will be permanently removed from your queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) { deleteOutput(deleteTarget); setDeleteTarget(null); } }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};