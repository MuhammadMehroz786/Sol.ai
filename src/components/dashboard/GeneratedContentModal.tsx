import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT } from "@/constants/webhooks";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Edit3, AlertCircle, CheckCircle, Share,
  Eye, Save, Send, FileDown, Sparkles, RotateCcw, Scissors,
  Loader2, ArrowLeft, Download, Wand2, ArrowRight
} from "lucide-react";

type ContentStatus = 'draft' | 'review' | 'final' | 'published';

const statusConfig: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-600 border border-slate-300",
    icon: Edit3,
  },
  review: {
    label: "Review",
    color: "bg-amber-50 text-amber-700 border border-amber-300",
    icon: AlertCircle,
  },
  final: {
    label: "Final",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-300",
    icon: CheckCircle,
  },
  published: {
    label: "Published",
    color: "bg-blue-50 text-blue-700 border border-blue-300",
    icon: Share,
  },
};

export interface GeneratedContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string | null;
  title: string;
  initialContent: string;
  persona: string;
  outputType: string;
  initialStatus: ContentStatus;
  topicContext?: string;
  createdAt?: string;
  /** If provided a "New Generation" button appears in draft footer */
  onNewGeneration?: () => void;
  /** Called after any status or content change so parent can refresh its list */
  onRefresh?: () => void;
}

export const GeneratedContentModal = ({
  open,
  onOpenChange,
  contentId,
  title,
  initialContent,
  persona,
  outputType,
  initialStatus,
  topicContext,
  createdAt,
  onNewGeneration,
  onRefresh,
}: GeneratedContentModalProps) => {
  const [editableContent, setEditableContent] = useState(initialContent);
  const [contentStatus, setContentStatus] = useState<ContentStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingToCMS, setIsSendingToCMS] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Sync with incoming props whenever the modal opens with new data
  useEffect(() => {
    if (open) {
      setEditableContent(initialContent);
      setContentStatus(initialStatus);
      setIsProcessingAction("");
    }
  }, [open, contentId]); // reset only when modal opens or different content is loaded

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

  const updateStatus = async (newStatus: ContentStatus) => {
    if (contentId) {
      const { error } = await supabase
        .from('content_outputs')
        .update({ status: newStatus })
        .eq('id', contentId);
      if (error) {
        toast({ title: "Error updating status", description: error.message, variant: "destructive" });
        return;
      }
      window.dispatchEvent(new CustomEvent('statsRefresh'));
      window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
      onRefresh?.();
    }
    setContentStatus(newStatus);
  };

  const saveContent = async () => {
    if (!contentId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('content_outputs')
      .update({ content: editableContent })
      .eq('id', contentId);
    if (error) {
      toast({ title: "Error saving content", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content saved", description: "Your changes have been saved." });
      window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
      onRefresh?.();
    }
    setIsSaving(false);
  };

  const handleQuickAction = async (action: string) => {
    if (!editableContent) return;
    setIsProcessingAction(action);
    try {
      const baseOutputType = outputType.startsWith('Article') ? 'Article' : outputType;
      const response = await fetch(WEBHOOK_EDITORIAL_GPT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_name: persona,
          signal: {
            headline: topicContext || title,
            summary: topicContext || title,
          },
          output_type: baseOutputType,
          content: editableContent,
          quickAction: action,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setEditableContent(formatResponseData(result));
        toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} applied`, description: "Content updated." });
      } else {
        toast({ title: "Quick action failed", description: `Server responded with ${response.status}.`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Quick action failed", description: err instanceof Error ? err.message : "Network error.", variant: "destructive" });
    } finally {
      setIsProcessingAction("");
    }
  };

  const downloadContent = (format: 'txt' | 'md') => {
    if (!editableContent) return;
    const safeName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blob = new Blob([editableContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    setIsExporting(true);
    const printContent = `<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:20px;line-height:1.6}h1{color:#333;border-bottom:2px solid #333;padding-bottom:10px}.content{white-space:pre-wrap}</style></head><body><h1>${title}</h1><div class="content">${editableContent.replace(/\n/g, '<br>')}</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
    setIsExporting(false);
    toast({ title: "Export initiated", description: "Print dialog opened for PDF export." });
  };

  const sendToCMS = async () => {
    if (!contentId) return;
    setIsSendingToCMS(true);
    const { error } = await supabase
      .from('content_outputs')
      .update({ status: 'published' })
      .eq('id', contentId);
    if (error) {
      toast({ title: "Error sending to CMS", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sent to CMS", description: "Content has been published successfully." });
      window.dispatchEvent(new CustomEvent('statsRefresh'));
      window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
      onRefresh?.();
      onOpenChange(false);
    }
    setIsSendingToCMS(false);
  };

  const sendToSocialAlchemist = () => {
    onOpenChange(false);
    navigate('/social-alchemist');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('editorialToSocialAlchemist', { detail: { content: editableContent } }));
    }, 100);
    toast({ title: "Content sent to Social Alchemist", description: "Generate social assets from your content." });
  };

  const statusCfg = statusConfig[contentStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] overflow-hidden flex flex-col bg-gradient-card border border-border/50 shadow-elegant p-0 z-[200]">
        <DialogHeader className="bg-gradient-surface border-b border-border/30 px-6 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <DialogTitle className="text-primary font-bold text-base leading-tight truncate">
                {title}
              </DialogTitle>
            </div>
            <Badge className={`shrink-0 ml-2 text-[10px] ${statusCfg.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />{statusCfg.label}
            </Badge>
          </div>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {(() => {
                  const base = outputType.startsWith('Article') ? 'Article' : outputType.replace(/-/g, ' ');
                  return base.charAt(0).toUpperCase() + base.slice(1);
                })()}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {persona.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
              </Badge>
              {createdAt && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Content
                {contentStatus === 'review' && (
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal normal-case border border-border px-1.5 py-0.5 rounded">editable</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {contentStatus === 'draft' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => downloadContent('txt')}
                      className="h-7 text-[11px] px-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium transition-all">
                      <Download className="h-3 w-3 mr-1" />.txt
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadContent('md')}
                      className="h-7 text-[11px] px-2 bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-medium transition-all">
                      <Download className="h-3 w-3 mr-1" />.md
                    </Button>
                  </>
                )}
                {contentStatus === 'review' && (
                  <Button size="sm" variant="outline" onClick={saveContent} disabled={isSaving}
                    className="h-7 text-[11px] px-2.5 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium transition-all">
                    {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                )}
              </div>
            </div>

            {contentStatus === 'review' ? (
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
                {editableContent || "No content available..."}
              </div>
            )}
          </div>

          {/* Quick Actions — review only */}
          {contentStatus === 'review' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('poeticize')}
                    disabled={isProcessingAction === 'poeticize'}
                    className="h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium shadow-sm transition-all">
                    {isProcessingAction === 'poeticize' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    Poeticize
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('rewrite')}
                    disabled={isProcessingAction === 'rewrite'}
                    className="h-8 text-xs bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-medium shadow-sm transition-all">
                    {isProcessingAction === 'rewrite' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                    Rewrite
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction('shorten')}
                    disabled={isProcessingAction === 'shorten'}
                    className="h-8 text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 font-medium shadow-sm transition-all">
                    {isProcessingAction === 'shorten' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5 mr-1.5" />}
                    Shorten
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => updateStatus('final')}
                  className="h-8 text-xs bg-success/10 border-success/30 text-success hover:bg-success/20 hover:border-success/50 font-medium shadow-sm transition-all">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Confirm Edits
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer — hidden in review mode (actions are inline above) */}
        {contentStatus !== 'review' && (
          <DialogFooter className="bg-gradient-surface border-t border-border/30 px-6 py-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              {/* Left: final/published actions */}
              <div className="flex flex-wrap gap-1.5">
                {(contentStatus === 'final' || contentStatus === 'published') && (
                  <>
                    <Button variant="outline" size="sm" onClick={sendToSocialAlchemist}
                      className="h-8 text-xs bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 font-medium shadow-sm transition-all">
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Social Assets
                    </Button>
                    {contentStatus === 'final' && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus('review')}
                        className="h-8 text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 hover:border-warning/50 font-medium shadow-sm transition-all">
                        <ArrowRight className="h-3.5 w-3.5 mr-1.5 rotate-180" />
                        Back to Review
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting}
                      className="h-8 text-xs bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50 font-medium shadow-sm transition-all">
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
                      Export PDF
                    </Button>
                    {contentStatus === 'final' && (
                      <Button variant="outline" size="sm" onClick={sendToCMS} disabled={isSendingToCMS}
                        className="h-8 text-xs bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary/70 font-medium shadow-sm transition-all">
                        {isSendingToCMS ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                        Send to CMS
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Right: draft navigation */}
              <div className="flex items-center gap-1.5">
                {contentStatus === 'draft' && onNewGeneration && (
                  <Button variant="outline" size="sm" onClick={onNewGeneration}
                    disabled={!!isProcessingAction}
                    className="h-8 text-xs bg-muted/20 border-muted/50 hover:bg-muted/30 font-medium transition-all">
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    New Generation
                  </Button>
                )}
                {contentStatus === 'draft' && (
                  <Button size="sm" onClick={() => updateStatus('review')}
                    disabled={!!isProcessingAction}
                    className="h-8 text-xs bg-gradient-primary hover:shadow-glow font-medium transition-all px-4">
                    Move to Review
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
