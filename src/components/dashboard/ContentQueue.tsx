import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_CONTENT_PUBLISH } from "@/constants/webhooks";
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
}

const statusConfig = {
  draft: { 
    label: "Draft", 
    color: "bg-muted text-muted-foreground", 
    icon: Edit3 
  },
  review: { 
    label: "Review", 
    color: "bg-warning/20 text-warning", 
    icon: AlertCircle 
  },
  final: { 
    label: "Final", 
    color: "bg-success/20 text-success", 
    icon: CheckCircle 
  },
  published: { 
    label: "Published", 
    color: "bg-primary/20 text-primary", 
    icon: Share 
  }
};

export const ContentQueue = ({ onSelectOutput }: ContentQueueProps) => {
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

  // Expose refresh function and openDraftModal globally
  useEffect(() => {
    (window as any).refreshContentQueue = fetchOutputs;
    (window as any).openDraftModal = async (contentId: string) => {
      console.log('openDraftModal called with ID:', contentId);
      console.log('Current outputs:', outputs);
      const output = outputs.find(o => o.id === contentId);
      console.log('Found output:', output);
      if (output) {
        console.log('Opening modal for output:', output.title);
        openContentModal(output);
      } else {
        console.log('Output not found, fetching fresh data...');
        // Fetch fresh data from database
        if (!user) return;

        const { data, error } = await supabase
          .from('content_outputs')
          .select('*')
          .eq('id', contentId)
          .single();

        if (error) {
          console.error('Error fetching content:', error);
        } else if (data) {
          console.log('Found output from database, opening modal');
          openContentModal(data as ContentOutput);
          // Also refresh the list in background
          fetchOutputs();
        } else {
          console.log('Still no output found after database fetch');
        }
      }
    };
    return () => {
      delete (window as any).refreshContentQueue;
      delete (window as any).openDraftModal;
    };
  }, [user, outputs]);

  useEffect(() => {
    if (user) {
      fetchOutputs();
    }
  }, [user]);

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

      // Refresh dashboard stats
      if ((window as any).refreshDashboardStats) {
        (window as any).refreshDashboardStats();
      }
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

      // Refresh dashboard stats
      if ((window as any).refreshDashboardStats) {
        (window as any).refreshDashboardStats();
      }
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

  const handleQuickAction = async (action: string) => {
    if (!selectedOutput || !editableContent) return;

    setIsProcessingAction(action);

    try {
      const response = await fetch(WEBHOOK_CONTENT_PUBLISH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signal: {
            id: Date.now(),
            headline: selectedOutput.topic_context || selectedOutput.title,
            summary: selectedOutput.topic_context || selectedOutput.title,
            tags: ["Quick Action"],
            priority: "Medium",
            source: "Content Queue",
            score: 85,
            engagement: "+25%"
          },
          persona: selectedOutput.persona,
          outputType: selectedOutput.output_type,
          tone: selectedOutput.tones[0] || "poetic",
          content: editableContent,
          quickAction: action
        })
      });

      if (response.ok) {
        const result = await response.json();
        let data = result;
        if (Array.isArray(result) && result.length > 0) {
          data = result[0];
        }

        // Use the text_output if available, otherwise fallback
        const processedContent = data.text_output || data.content_markdown || JSON.stringify(data);
        setEditableContent(processedContent);

        toast({
          title: `${action} completed`,
          description: "Content has been processed with quick action",
        });
      } else {
        console.error('Failed to process quick action:', response.statusText);
        toast({
          title: "Quick action failed",
          description: "Failed to process the quick action",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing quick action:', error);
      toast({
        title: "Quick action failed",
        description: "Network error occurred",
        variant: "destructive",
      });
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
        <CardHeader>
          <CardTitle>Content Queue</CardTitle>
          <CardDescription>Loading your generated content...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Content Queue</CardTitle>
            <CardDescription className="text-sm">
              Manage your generated content pipeline
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 bg-background">
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
            <SelectTrigger className="w-full sm:w-32 bg-background">
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

        <Separator />

        {/* Content Grid */}
        <div className="space-y-6">
          {Object.entries(groupedOutputs).map(([status, items]) => {
            if (items.length === 0) return null;
            
            const config = statusConfig[status as keyof typeof statusConfig];
            const Icon = config.icon;
            
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {config.label} ({items.length})
                  </h3>
                </div>
                
                <div className="grid gap-3">
                  {items.map((output) => (
                    <div
                      key={output.id}
                      className="bg-background rounded-lg border border-border p-4 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => openContentModal(output)}
                    >
                      <div className="flex items-start justify-between space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-sm truncate">{output.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {output.output_type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {output.content.substring(0, 120)}...
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {output.persona.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                              </Badge>
                              {output.tones.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {output.tones[0]} {output.tones.length > 1 && `+${output.tones.length - 1}`}
                                </Badge>
                              )}
                            </div>
                            
                            <Badge className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {status !== 'published' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = status === 'draft' ? 'review' : 
                                                 status === 'review' ? 'final' : 'published';
                                updateStatus(output.id, nextStatus as ContentOutput['status']);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOutput(output.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No content found</h3>
              <p className="text-sm text-muted-foreground">
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
          <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-gradient-card border-border/50 shadow-elegant">
            <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
              <div className="flex items-center justify-between mb-3">
                <DialogTitle className="text-xl font-bold text-primary uppercase">
                  {selectedOutput.title}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const config = statusConfig[selectedOutput.status];
                    const Icon = config.icon;
                    return (
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 ${
                        selectedOutput.status === 'draft'
                          ? 'bg-muted/30 border-muted text-muted-foreground'
                          : selectedOutput.status === 'review'
                          ? 'bg-muted/30 border-muted text-muted-foreground'
                          : selectedOutput.status === 'final'
                          ? 'bg-muted/30 border-muted text-muted-foreground'
                          : 'bg-primary/20 border-primary/50 text-primary'
                      }`}>
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold text-sm uppercase tracking-wide">
                          {config.label.toUpperCase()} MODE
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <DialogDescription className="text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedOutput.output_type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedOutput.persona.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created: {new Date(selectedOutput.created_at).toLocaleDateString()}
                  </span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center uppercase">
                    <Eye className="h-4 w-4 mr-1 text-primary" />
                    Content
                    {selectedOutput.status === 'review' && (
                      <span className="ml-2 text-xs text-muted-foreground normal-case">(Editable)</span>
                    )}
                  </label>

                  {selectedOutput.status === 'review' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveContent}
                      disabled={isSaving}
                      className="text-xs bg-primary/30 border-primary/70 text-black hover:bg-primary/40 hover:border-primary font-medium shadow-sm"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>

                {selectedOutput.status === 'review' ? (
                  <Textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    onKeyDown={(e) => {
                      // Prevent copying shortcuts
                      if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'x')) {
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="h-[300px] font-mono text-sm bg-background border-border resize-none select-none"
                    placeholder="Edit your content here..."
                  />
                ) : (
                  <div
                    className="h-[300px] font-mono text-sm bg-gradient-surface border border-border/50 rounded-md p-3 overflow-auto whitespace-pre-wrap select-none"
                    onKeyDown={(e) => {
                      // Prevent copying shortcuts
                      if (e.ctrlKey && (e.key === 'c' || e.key === 'a' || e.key === 'x')) {
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    tabIndex={0}
                  >
                    {selectedOutput.content || "No content available..."}
                  </div>
                )}
              </div>

              {/* Quick Actions - Only show for review status */}
              {selectedOutput.status === 'review' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground uppercase">Quick Actions</label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleQuickAction('poeticize')}
                        disabled={isProcessingAction === 'poeticize'}
                        className="bg-primary/30 border-primary/70 text-black hover:bg-primary/40 hover:border-primary font-medium shadow-sm h-10"
                      >
                        {isProcessingAction === 'poeticize' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Poeticize
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleQuickAction('rewrite')}
                        disabled={isProcessingAction === 'rewrite'}
                        className="bg-accent/30 border-accent/70 text-black hover:bg-accent/40 hover:border-accent font-medium shadow-sm h-10"
                      >
                        {isProcessingAction === 'rewrite' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Rewrite
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleQuickAction('shorten')}
                        disabled={isProcessingAction === 'shorten'}
                        className="bg-warning/30 border-warning/70 text-black hover:bg-warning/40 hover:border-warning font-medium shadow-sm h-10"
                      >
                        {isProcessingAction === 'shorten' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Scissors className="h-4 w-4 mr-2" />
                        )}
                        Shorten
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateStatus(selectedOutput.id, 'final')}
                        className="bg-success/30 border-success/70 text-black hover:bg-success/40 hover:border-success font-medium shadow-sm h-10"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Edits
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DialogFooter - Only show for draft and final status (not review) */}
            {selectedOutput.status !== 'review' && (
              <DialogFooter className="bg-gradient-surface border-t border-border/30 pt-4 pb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Export/CMS buttons only for final status */}
                    {selectedOutput.status === 'final' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={sendToSocialAlchemist}
                          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-700 hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-500/70 font-medium shadow-sm h-10"
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Create Social Assets
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateStatus(selectedOutput.id, 'review')}
                          className="bg-warning/30 border-warning/70 text-black hover:bg-warning/40 hover:border-warning font-medium shadow-sm h-10"
                        >
                          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                          Back to Review
                        </Button>
                        <Button
                          variant="outline"
                          onClick={exportToPDF}
                          disabled={isExporting}
                          className="bg-accent/30 border-accent/70 text-black hover:bg-accent/40 hover:border-accent font-medium shadow-sm h-10"
                        >
                          {isExporting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4 mr-2" />
                          )}
                          Export PDF
                        </Button>
                        <Button
                          variant="outline"
                          onClick={sendToCMS}
                          disabled={isSendingToCMS}
                          className="bg-primary/30 border-primary/70 text-black hover:bg-primary/40 hover:border-primary font-medium shadow-sm h-10"
                        >
                          {isSendingToCMS ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send to CMS
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status transition buttons - only for draft status */}
                    {selectedOutput.status === 'draft' && (
                      <Button
                        variant="outline"
                        onClick={() => updateStatus(selectedOutput.id, 'review')}
                        className="bg-warning/30 border-warning/70 text-black hover:bg-warning/40 hover:border-warning font-medium shadow-sm h-10"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
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
    </Card>
  );
};