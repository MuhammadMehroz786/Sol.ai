import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT } from "@/constants/webhooks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Search,
  Filter,
  Edit3,
  Download,
  Share,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ArrowRight,
  Loader2,
  Save,
  Send,
  FileDown,
  Sparkles,
  RotateCcw,
  Scissors,
  X,
  Wand2
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
  const [editableContent, setEditableContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingToCMS, setIsSendingToCMS] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Send content to Social Alchemist
  const sendToSocialAlchemist = () => {
    if (!selectedOutput) return;

    // Close the modal first
    closeModal();

    // Navigate to Social Alchemist
    navigate('/social-alchemist');

    // Dispatch event with content after a short delay to ensure page is loaded
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('editorialToSocialAlchemist', {
        detail: { content: selectedOutput.content }
      }));
    }, 100);

    toast({
      title: "Content sent to Social Alchemist",
      description: "Generate social assets from your content",
    });
  };

  // Listen for cross-component events via CustomEvents
  useEffect(() => {
    const handleRefresh = () => { fetchOutputs(); };

    const handleOpenDraftModal = (e: Event) => {
      const contentId = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!contentId) return;

      const output = outputs.find(o => o.id === contentId);
      if (output) {
        openContentModal(output);
      } else if (user) {
        supabase
          .from('content_outputs')
          .select('*')
          .eq('id', contentId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              openContentModal(data as ContentOutput);
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

  const openContentModal = (output: ContentOutput) => {
    setSelectedOutput(output);
    setEditableContent(output.content);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedOutput(null);
    setEditableContent("");
    setIsProcessingAction("");
  };

  const saveContent = async () => {
    if (!selectedOutput) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('content_outputs')
      .update({ content: editableContent })
      .eq('id', selectedOutput.id);

    if (error) {
      toast({
        title: "Error saving content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Content saved",
        description: "Your changes have been saved",
      });
      fetchOutputs();
      // Update the selected output with new content
      setSelectedOutput({ ...selectedOutput, content: editableContent });
    }
    setIsSaving(false);
  };

  const formatResponseData = (response: any): string => {
    if (!response) return "";
    const data = Array.isArray(response) && response.length > 0 ? response[0] : response;
    if (data.text_output) return data.text_output;
    if (data.content_markdown) return data.content_markdown;
    if (data.headline || data.body || data.tldr || data.caption) {
      let out = "";
      if (data.headline) out += `**${data.headline}**\n\n`;
      if (data.tldr) out += `${data.tldr}\n\n`;
      if (data.body) out += `${data.body}\n\n`;
      if (data.caption) out += `---\n${data.caption}`;
      return out.trim();
    }
    return editableContent;
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedOutput || !editableContent) return;

    setIsProcessingAction(action);

    try {
      const response = await fetch(WEBHOOK_EDITORIAL_GPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_name: selectedOutput.persona,
          signal: {
            headline: selectedOutput.topic_context || selectedOutput.title,
            summary: selectedOutput.topic_context || selectedOutput.title,
          },
          output_type: selectedOutput.output_type.startsWith('Article') ? 'Article' : selectedOutput.output_type,
          content: editableContent,
          quickAction: action,
        })
      });

      if (response.ok) {
        const result = await response.json();
        const processed = formatResponseData(result);
        setEditableContent(processed);
        toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} applied`, description: "Content updated." });
      } else {
        toast({ title: "Quick action failed", description: `Server responded with ${response.status}.`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Quick action failed", description: error instanceof Error ? error.message : "Network error.", variant: "destructive" });
    } finally {
      setIsProcessingAction("");
    }
  };

  const exportToPDF = async () => {
    if (!selectedOutput || !editableContent) return;

    setIsExporting(true);
    // Simple PDF export using browser print
    const printContent = `
      <html>
        <head>
          <title>${selectedOutput.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .metadata { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #007acc; }
            .content { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${selectedOutput.title}</h1>
          <div class="metadata">
            <strong>Persona:</strong> ${selectedOutput.persona}<br>
            <strong>Type:</strong> ${selectedOutput.output_type}<br>
            <strong>Status:</strong> ${selectedOutput.status}<br>
            <strong>Created:</strong> ${new Date(selectedOutput.created_at).toLocaleString()}
          </div>
          <div class="content">${editableContent.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }

    setIsExporting(false);
    toast({
      title: "Export initiated",
      description: "Print dialog opened for PDF export",
    });
  };

  const sendToCMS = async () => {
    if (!selectedOutput) return;

    setIsSendingToCMS(true);

    // Update status to published
    const { error } = await supabase
      .from('content_outputs')
      .update({ status: 'published' })
      .eq('id', selectedOutput.id);

    if (error) {
      toast({
        title: "Error sending to CMS",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sent to CMS",
        description: "Content has been published successfully",
      });
      fetchOutputs();
      closeModal();
    }

    setIsSendingToCMS(false);
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

      {/* Content Viewer/Editor Modal */}
      {selectedOutput && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-4xl h-[90vh] overflow-hidden flex flex-col bg-gradient-card border border-border/50 shadow-elegant p-0 z-[200]">
            <DialogHeader className="bg-gradient-surface border-b border-border/30 px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <DialogTitle className="text-primary font-bold text-base leading-tight truncate">
                    {selectedOutput.title}
                  </DialogTitle>
                </div>
                {(() => {
                  const config = statusConfig[selectedOutput.status];
                  const Icon = config.icon;
                  return (
                    <Badge className={`shrink-0 ml-2 text-[10px] ${config.color}`}>
                      <Icon className="h-3 w-3 mr-1" />{config.label}
                    </Badge>
                  );
                })()}
              </div>
              <DialogDescription asChild>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {selectedOutput.output_type.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {selectedOutput.persona.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(selectedOutput.created_at).toLocaleDateString()}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Content
                    {selectedOutput.status === 'review' && (
                      <span className="ml-1 text-[10px] text-muted-foreground font-normal normal-case border border-border px-1.5 py-0.5 rounded">editable</span>
                    )}
                  </label>

                  {selectedOutput.status === 'review' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveContent}
                      disabled={isSaving}
                      className="h-7 text-[11px] px-2.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium shadow-sm transition-all"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                  )}
                </div>

                {selectedOutput.status === 'review' ? (
                  <Textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="min-h-[52vh] font-mono text-xs bg-background border-border resize-none"
                    placeholder="Edit your content here..."
                  />
                ) : (
                  <div
                    className="min-h-[52vh] font-mono text-xs bg-background border border-border rounded-lg p-4 overflow-auto whitespace-pre-wrap shadow-inner"
                    tabIndex={0}
                  >
                    {selectedOutput.content || "No content available..."}
                  </div>
                )}
              </div>

              {/* Quick Actions - Only show for review status */}
              {selectedOutput.status === 'review' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('poeticize')}
                        disabled={isProcessingAction === 'poeticize'}
                        className="h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium shadow-sm transition-all"
                      >
                        {isProcessingAction === 'poeticize' ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Poeticize
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('rewrite')}
                        disabled={isProcessingAction === 'rewrite'}
                        className="h-8 text-xs bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-medium shadow-sm transition-all"
                      >
                        {isProcessingAction === 'rewrite' ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Rewrite
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction('shorten')}
                        disabled={isProcessingAction === 'shorten'}
                        className="h-8 text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 font-medium shadow-sm transition-all"
                      >
                        {isProcessingAction === 'shorten' ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Scissors className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Shorten
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(selectedOutput.id, 'final')}
                      className="h-8 text-xs bg-success/10 border-success/30 text-success hover:bg-success/20 hover:border-success/50 font-medium shadow-sm transition-all"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Confirm Edits
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* DialogFooter - Only show for draft and final status (not review) */}
            {selectedOutput.status !== 'review' && (
              <DialogFooter className="bg-gradient-surface border-t border-border/30 px-6 py-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between w-full gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOutput.status === 'final' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={sendToSocialAlchemist}
                          className="h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium shadow-sm transition-all"
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                          Social Assets
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus(selectedOutput.id, 'review')}
                          className="h-8 text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 font-medium shadow-sm transition-all"
                        >
                          <ArrowRight className="h-3.5 w-3.5 mr-1.5 rotate-180" />
                          Back to Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToPDF}
                          disabled={isExporting}
                          className="h-8 text-xs bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-medium shadow-sm transition-all"
                        >
                          {isExporting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <FileDown className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Export PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={sendToCMS}
                          disabled={isSendingToCMS}
                          className="h-8 text-xs bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary/70 font-medium shadow-sm transition-all"
                        >
                          {isSendingToCMS ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Send to CMS
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {selectedOutput.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(selectedOutput.id, 'review')}
                        className="h-8 text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 font-medium shadow-sm transition-all"
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                        Move to Review
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
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