import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT } from "@/constants/webhooks";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, AlertCircle, CheckCircle, Share2,
  Save, Send, FileDown, Sparkles, RotateCcw, Scissors,
  Loader2, ArrowLeft, Download, Wand2, ArrowRight, X,
  FileText, User, Tag, Calendar,
} from "lucide-react";

type ContentStatus = 'draft' | 'review' | 'final' | 'published';

const STAGES: { key: ContentStatus; label: string; icon: React.ElementType }[] = [
  { key: 'draft',     label: 'Draft',     icon: Edit3 },
  { key: 'review',    label: 'Review',    icon: AlertCircle },
  { key: 'final',     label: 'Final',     icon: CheckCircle },
  { key: 'published', label: 'Published', icon: Share2 },
];

const STAGE_INDEX: Record<ContentStatus, number> = {
  draft: 0, review: 1, final: 2, published: 3,
};

const STAGE_HINT: Record<ContentStatus, { text: string; accent: string; border: string; dot: string }> = {
  draft:     { text: "Your draft is ready. Download it or move it to review when you're ready to refine.", accent: "text-primary/80", border: "border-l-primary/60", dot: "bg-primary" },
  review:    { text: "Edit the content directly, or use AI actions below to refine tone and length. Save then confirm.", accent: "text-warning/90", border: "border-l-warning/70", dot: "bg-warning" },
  final:     { text: "Content is finalised and ready to export or publish.", accent: "text-success/80", border: "border-l-success/60", dot: "bg-success" },
  published: { text: "This content has been published to your CMS.", accent: "text-blue-600/80", border: "border-l-blue-400/60", dot: "bg-blue-400" },
};

export interface Guardrails {
  cultural_fluency: boolean;
  verification_required: boolean;
  reading_level: string;
  empowerment_intensity: string;
  technical_depth: string;
  storytelling_bias: string;
}

export const DEFAULT_GUARDRAILS: Guardrails = {
  cultural_fluency: true,
  verification_required: true,
  reading_level: "9-10",
  empowerment_intensity: "medium",
  technical_depth: "medium",
  storytelling_bias: "medium",
};

export interface GeneratedContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string | null;
  title: string;
  initialContent: string;
  persona: string;
  voiceId: string;
  outputType: string;
  initialStatus: ContentStatus;
  topicContext?: string;
  createdAt?: string;
  guardrails?: Guardrails;
  onNewGeneration?: () => void;
  onRefresh?: () => void;
}

export const GeneratedContentModal = ({
  open,
  onOpenChange,
  contentId,
  title,
  initialContent,
  persona,
  voiceId,
  outputType,
  initialStatus,
  topicContext,
  createdAt,
  guardrails,
  onNewGeneration,
  onRefresh,
}: GeneratedContentModalProps) => {
  const [editableContent, setEditableContent] = useState(initialContent);
  const [contentStatus, setContentStatus] = useState<ContentStatus>(initialStatus);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingToCMS, setIsSendingToCMS] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setEditableContent(initialContent);
      setContentStatus(initialStatus);
      setIsDirty(false);
      setIsProcessingAction("");
    }
  }, [open, contentId]);

  const wordCount = useMemo(() => {
    const text = editableContent.trim();
    return text ? text.split(/\s+/).length : 0;
  }, [editableContent]);

  const displayOutputType = useMemo(() => {
    const base = outputType.startsWith('Article') ? 'Article' : outputType.replace(/-/g, ' ');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }, [outputType]);

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
        toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
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
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setIsDirty(false);
      toast({ title: "Saved", description: "Your edits have been saved." });
      window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
      onRefresh?.();
    }
    setIsSaving(false);
  };

  const handleQuickAction = async (action: string) => {
    if (!editableContent) return;
    setIsProcessingAction(action);
    try {
      const baseOutputType = outputType.startsWith('Article') ? 'article' : outputType.toLowerCase();
      const topic = topicContext || title;
      const response = await fetch(WEBHOOK_EDITORIAL_GPT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          signal: { headline: topic, summary: topic },
          voice_id: voiceId,
          output_type: baseOutputType,
          content: editableContent,
          guardrails: guardrails ?? DEFAULT_GUARDRAILS,
          modifiers: [action],
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setEditableContent(formatResponseData(result));
        setIsDirty(true);
        toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} applied` });
      } else {
        toast({ title: "Action failed", description: `Server responded with ${response.status}.`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : "Network error.", variant: "destructive" });
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
    const printContent = `<html><head><title>${title}</title><style>body{font-family:Georgia,serif;margin:40px;line-height:1.8;color:#222}h1{font-size:1.5rem;margin-bottom:1rem;border-bottom:1px solid #ccc;padding-bottom:.5rem}.content{white-space:pre-wrap;font-size:1rem}</style></head><body><h1>${title}</h1><div class="content">${editableContent.replace(/\n/g, '<br>')}</div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
    setIsExporting(false);
    toast({ title: "Print dialog opened", description: "Save as PDF from your browser." });
  };

  const sendToCMS = async () => {
    if (!contentId) return;
    setIsSendingToCMS(true);
    const { error } = await supabase
      .from('content_outputs')
      .update({ status: 'published' })
      .eq('id', contentId);
    if (error) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Published", description: "Content has been sent to CMS." });
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
    toast({ title: "Sent to Social Alchemist" });
  };

  const currentStageIndex = STAGE_INDEX[contentStatus];
  const hint = STAGE_HINT[contentStatus];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* h-[92vh] + flex col — nothing scrolls except the content area */}
      <DialogContent className="sm:max-w-4xl h-[92vh] flex flex-col overflow-hidden bg-card border border-border/60 shadow-floating p-0 z-[200] gap-0">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="shrink-0 relative overflow-hidden">
          {/* Gradient accent strip at top */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-primary" />

          <div className="px-6 pt-5 pb-0 bg-gradient-surface border-b border-border/40">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow/30 shadow-md mt-0.5">
                  <FileText className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 className="font-bold text-[15px] text-foreground leading-tight truncate">
                    {title}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                      <Tag className="h-3 w-3 text-primary/60" />{displayOutputType}
                    </span>
                    <span className="w-px h-3 bg-border/60" />
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                      <User className="h-3 w-3 text-accent/70" />
                      {persona.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                    </span>
                    {createdAt && (
                      <>
                        <span className="w-px h-3 bg-border/60" />
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="shrink-0 mt-1 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pipeline stepper */}
            <div className="flex items-center pb-4">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = i === currentStageIndex;
                const isDone = i < currentStageIndex;
                const isLast = i === STAGES.length - 1;
                return (
                  <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                        : isDone
                          ? 'bg-success/15 text-success'
                          : 'text-muted-foreground/35'
                    }`}>
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="text-[11px] font-semibold whitespace-nowrap tracking-wide">
                        {stage.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-px mx-2 transition-all duration-500 ${
                        i < currentStageIndex ? 'bg-success/50' : 'bg-border/40'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Middle: fixed layout, only content area scrolls ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stage hint bar — shrink-0 */}
          <div className={`shrink-0 mx-4 mt-3 mb-0 border-l-[3px] ${hint.border} bg-muted/25 rounded-r-lg px-3 py-2`}>
            <p className={`text-[11px] font-medium leading-relaxed ${hint.accent}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${hint.dot} mr-2 mb-[1px]`} />
              {hint.text}
            </p>
          </div>

          {/* Content toolbar — shrink-0 */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1.5">
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.1em]">
              Content
            </span>
            <div className="flex items-center gap-1.5">
              {contentStatus === 'draft' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => downloadContent('txt')}
                    className="h-7 text-[11px] px-2.5 gap-1 border-primary/20 text-primary/80 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 font-medium transition-all">
                    <Download className="h-3 w-3" />.txt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadContent('md')}
                    className="h-7 text-[11px] px-2.5 gap-1 border-accent/30 text-accent/80 bg-accent/5 hover:bg-accent/10 hover:border-accent/50 font-medium transition-all">
                    <Download className="h-3 w-3" />.md
                  </Button>
                </>
              )}
              {contentStatus === 'review' && (
                <Button size="sm" variant="outline" onClick={saveContent}
                  disabled={isSaving || !isDirty}
                  className={`h-7 text-[11px] px-3 gap-1.5 font-semibold transition-all ${
                    isDirty
                      ? 'border-primary/60 text-primary bg-primary/8 hover:bg-primary/15 hover:border-primary/80 shadow-sm'
                      : 'border-border/40 text-muted-foreground/50 bg-transparent'
                  }`}>
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {isSaving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
                </Button>
              )}
            </div>
          </div>

          {/* THE ONLY SCROLLABLE AREA */}
          <div className="flex-1 min-h-0 px-4">
            {contentStatus === 'review' ? (
              <Textarea
                value={editableContent}
                onChange={(e) => { setEditableContent(e.target.value); setIsDirty(true); }}
                className="h-full w-full resize-none font-mono text-[13px] leading-relaxed bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/60 transition-colors placeholder:text-muted-foreground/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent"
                placeholder="Edit your content here…"
                disabled={!!isProcessingAction}
              />
            ) : (
              <div className={`h-full overflow-y-auto text-[13px] leading-relaxed bg-background border border-border/50 rounded-md p-4 whitespace-pre-wrap shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent ${
                contentStatus === 'published' ? 'opacity-70' : ''
              }`}>
                {editableContent || <span className="text-muted-foreground/50 italic">No content available.</span>}
              </div>
            )}
          </div>

          {/* Word count row — shrink-0 */}
          <div className="shrink-0 flex items-center justify-between px-4 pt-1.5 pb-1">
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {wordCount.toLocaleString()} words
            </span>
            {contentStatus === 'review' && isDirty && (
              <span className="flex items-center gap-1.5 text-[11px] text-warning font-semibold animate-pulse-slow">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Unsaved changes
              </span>
            )}
            {contentStatus === 'published' && (
              <span className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                <Share2 className="h-3 w-3" />Published
              </span>
            )}
          </div>

          {/* AI Refinement panel — shrink-0, review only */}
          {contentStatus === 'review' && (
            <div className="shrink-0 mx-4 mb-3 rounded-xl border border-primary/15 bg-gradient-to-b from-primary/5 to-accent/5 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary/5">
                <span className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.12em] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Refine with AI
                </span>
                {isProcessingAction && (
                  <span className="text-[11px] text-primary/80 flex items-center gap-1.5 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Applying {isProcessingAction}…
                  </span>
                )}
              </div>
              {/* Actions row */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="flex gap-1.5">
                  {[
                    { action: 'poeticize', label: 'Poeticize', icon: Sparkles,  cls: 'text-primary border-primary/30 bg-primary/8 hover:bg-primary/18 hover:border-primary/60 hover:shadow-sm hover:shadow-primary/10' },
                    { action: 'rewrite',   label: 'Rewrite',   icon: RotateCcw, cls: 'text-accent border-accent/30 bg-accent/8 hover:bg-accent/18 hover:border-accent/60 hover:shadow-sm hover:shadow-accent/10' },
                    { action: 'shorten',   label: 'Shorten',   icon: Scissors,  cls: 'text-warning border-warning/30 bg-warning/8 hover:bg-warning/18 hover:border-warning/60 hover:shadow-sm hover:shadow-warning/10' },
                  ].map(({ action, label, icon: Icon, cls }) => (
                    <Button key={action} size="sm" variant="outline"
                      onClick={() => handleQuickAction(action)}
                      disabled={!!isProcessingAction}
                      className={`h-8 text-xs px-3 gap-1.5 font-semibold border transition-all disabled:opacity-35 ${cls}`}>
                      {isProcessingAction === action
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Icon className="h-3.5 w-3.5" />}
                      {label}
                    </Button>
                  ))}
                </div>
                <Button size="sm" onClick={() => updateStatus('final')}
                  disabled={!!isProcessingAction}
                  className="h-8 text-xs px-4 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-all">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Confirm Edits
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer — draft / final / published only ─────────── */}
        {contentStatus !== 'review' && (
          <div className="shrink-0 border-t border-border/40 bg-gradient-surface px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">

              {/* Left: secondary actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(contentStatus === 'final' || contentStatus === 'published') && (
                  <>
                    <Button variant="outline" size="sm" onClick={sendToSocialAlchemist}
                      className="h-8 text-xs px-3 gap-1.5 font-medium border-primary/25 text-primary/80 bg-primary/5 hover:bg-primary/12 hover:border-primary/50 transition-all">
                      <Wand2 className="h-3.5 w-3.5" />
                      Social Assets
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting}
                      className="h-8 text-xs px-3 gap-1.5 font-medium border-border/60 hover:bg-muted/50 transition-all">
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      Export PDF
                    </Button>
                    {contentStatus === 'final' && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus('review')}
                        className="h-8 text-xs px-3 gap-1.5 font-medium border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Review
                      </Button>
                    )}
                  </>
                )}
                {contentStatus === 'draft' && onNewGeneration && (
                  <Button variant="outline" size="sm" onClick={onNewGeneration}
                    className="h-8 text-xs px-3 gap-1.5 font-medium border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    New Generation
                  </Button>
                )}
              </div>

              {/* Right: primary action */}
              <div className="flex items-center gap-2">
                {contentStatus === 'draft' && (
                  <Button size="sm" onClick={() => updateStatus('review')}
                    className="h-8 text-xs px-5 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-all">
                    Move to Review
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {contentStatus === 'final' && (
                  <Button size="sm" onClick={sendToCMS} disabled={isSendingToCMS}
                    className="h-8 text-xs px-5 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-all">
                    {isSendingToCMS ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isSendingToCMS ? 'Publishing…' : 'Publish'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
