import { useState, useEffect, useMemo } from "react";
import { formatResponseData as sharedFormatResponseData } from "@/utils/contentFormatters";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT, WEBHOOK_CONTENT_REFINEMENT } from "@/constants/webhooks";
import { useToast } from "@/hooks/use-toast";
import { useVoices } from "@/contexts/VoicesContext";
import { Input } from "@/components/ui/input";
import {
  Edit3, AlertCircle, CheckCircle, Share2,
  Save, Send, FileDown, Sparkles, RotateCcw, Scissors,
  Loader2, ArrowLeft, Download, Wand2, ArrowRight, X,
  FileText, User, Tag, Calendar, SendHorizonal,
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
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [customModifier, setCustomModifier] = useState("");
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { voices } = useVoices();

  useEffect(() => {
    if (open) {
      setEditableContent(initialContent);
      setContentStatus(initialStatus);
      setIsDirty(false);
      setIsProcessingAction("");
      setContentHistory([]);
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

  const formatResponseData = (response: unknown): string => {
    const result = sharedFormatResponseData(response);
    return result || editableContent;
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
    setIsEditingReview(false);
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

  const parseContentFields = (md: string) => {
    const get = (label: string) => {
      const re = new RegExp(`##\\s+${label}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
      return (md.match(re)?.[1] ?? "").trim();
    };
    const headlineMatch = md.match(/^#\s+(.+)/m);
    return {
      headline: (headlineMatch?.[1] ?? "").trim(),
      tldr:     get('In Brief'),
      content:  get('Full Story') || md.replace(/^#\s+.+\n?/m, '').trim(),
      caption:  get('Caption'),
    };
  };

  const sendToWebhook = async (label: string, quickAction: string | null, modifiers: string[]) => {
    const { headline, content, tldr, caption } = parseContentFields(editableContent);
    const response = await fetch(WEBHOOK_CONTENT_REFINEMENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline,
        content,
        tldr,
        caption,
        quick_action: quickAction,
        modifiers,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      setContentHistory(prev => [...prev, editableContent]);
      setEditableContent(formatResponseData(result));
      setIsDirty(true);
      toast({ title: `${label} applied` });
    } else {
      toast({ title: "Action failed", description: `Server responded with ${response.status}.`, variant: "destructive" });
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!editableContent) return;
    setIsProcessingAction(action);
    try {
      await sendToWebhook(action.charAt(0).toUpperCase() + action.slice(1), action, []);
    } catch (err) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : "Network error.", variant: "destructive" });
    } finally {
      setIsProcessingAction("");
    }
  };

  const handleRevert = () => {
    if (!contentHistory.length) return;
    const prev = contentHistory[contentHistory.length - 1];
    setContentHistory(h => h.slice(0, -1));
    setEditableContent(prev);
    setIsDirty(true);
    toast({ title: "Reverted", description: "Restored previous version." });
  };

  const handleCustomModifier = async () => {
    if (!editableContent || !customModifier.trim()) return;
    setIsProcessingAction("custom");
    try {
      await sendToWebhook(customModifier.trim(), null, [customModifier.trim()]);
      setCustomModifier("");
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

  const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
    h1: ({ children }) => (
      <div className="mb-8 pb-5 border-b border-border/40">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-[2px] rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/50">Editorial</span>
        </div>
        <h1 className="text-[21px] font-bold tracking-tight text-foreground leading-[1.25]">{children}</h1>
      </div>
    ),
    h2: ({ children }) => (
      <div className="flex items-center gap-2.5 mt-7 mb-3.5 -mx-8 px-8 py-2 bg-muted/35 border-y border-border/25">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">{children}</span>
      </div>
    ),
    h3: ({ children }) => (
      <h3 className="text-[11px] font-semibold text-primary/60 mt-4 mb-1.5 uppercase tracking-[0.14em]">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-[13.5px] leading-[1.9] text-foreground/80 mb-4 last:mb-0">{children}</p>
    ),
    blockquote: ({ children }) => (
      <div className="my-4 relative rounded-lg overflow-hidden border border-primary/20">
        <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-primary to-accent" />
        <div className="px-5 py-3 bg-primary/5">
          <div className="text-[13px] leading-[1.75] text-foreground/80 [&_p]:mb-0">{children}</div>
        </div>
      </div>
    ),
    hr: () => (
      <div className="my-5 flex items-center gap-3 opacity-25">
        <div className="flex-1 h-px bg-foreground/40" />
        <div className="flex gap-1.5">
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <div className="w-1 h-1 rounded-full bg-foreground/50" />
          <div className="w-1 h-1 rounded-full bg-foreground/20" />
        </div>
        <div className="flex-1 h-px bg-foreground/40" />
      </div>
    ),
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="not-italic text-[12.5px] text-muted-foreground/70">{children}</em>,
    ul: ({ children }) => <ul className="my-3.5 space-y-2">{children}</ul>,
    ol: ({ children }) => <ol className="my-3.5 space-y-2 list-decimal pl-5">{children}</ol>,
    li: ({ children }) => (
      <li className="text-[13.5px] leading-[1.75] text-foreground/80 flex gap-2.5 items-start">
        <span className="mt-[0.6em] w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
        <span>{children}</span>
      </li>
    ),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] h-[92vh] flex flex-col overflow-hidden bg-card border border-border/50 shadow-floating p-0 z-[200] gap-0 [&>button:last-child]:hidden">

        {/* ── Header ── */}
        <div className="shrink-0 relative">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-primary" />
          <div className="px-6 pt-5 pb-4 bg-gradient-surface border-b border-border/30">

            {/* Title + close */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-sm">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[14px] text-foreground leading-snug truncate">Content Workshop</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Tag className="h-3 w-3 text-primary/50" />{displayOutputType}
                    </span>
                    <span className="w-px h-3 bg-border/50" />
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <User className="h-3 w-3 text-accent/60" />
                      {persona.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                    </span>
                    {createdAt && (
                      <>
                        <span className="w-px h-3 bg-border/50" />
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
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
                className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pipeline stepper */}
            <div className="flex items-center gap-0">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = i === currentStageIndex;
                const isDone = i < currentStageIndex;
                const isLast = i === STAGES.length - 1;
                return (
                  <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                      isActive  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                      : isDone  ? 'bg-success/12 text-success border border-success/25'
                      :           'text-muted-foreground/40'
                    }`}>
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="whitespace-nowrap">{stage.label}</span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-px mx-1.5 transition-all duration-500 ${
                        i < currentStageIndex ? 'bg-success/40' : 'bg-border/30'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Hint strip */}
          <div className={`shrink-0 flex items-center gap-2 px-5 py-2 border-b border-border/20 bg-muted/15`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hint.dot}`} />
            <p className={`text-[11px] font-medium ${hint.accent}`}>{hint.text}</p>
          </div>

          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2 border-b border-border/20">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 mr-2">
                {wordCount.toLocaleString()} words
              </span>
              {contentStatus === 'review' && isDirty && (
                <span className="flex items-center gap-1 text-[10px] text-warning/80 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Unsaved
                </span>
              )}
              {contentStatus === 'published' && (
                <span className="flex items-center gap-1 text-[10px] text-blue-500/80 font-medium">
                  <Share2 className="h-3 w-3" />Published
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {contentStatus === 'draft' && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => downloadContent('txt')}
                    className="h-7 text-[11px] px-2.5 gap-1 text-muted-foreground hover:text-foreground">
                    <Download className="h-3 w-3" />.txt
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadContent('md')}
                    className="h-7 text-[11px] px-2.5 gap-1 text-muted-foreground hover:text-foreground">
                    <Download className="h-3 w-3" />.md
                  </Button>
                </>
              )}
              {contentStatus === 'review' && (
                <>
                  <Button size="sm" variant="ghost"
                    onClick={() => setIsEditingReview(v => !v)}
                    className="h-7 text-[11px] px-2.5 gap-1.5 text-muted-foreground hover:text-foreground">
                    {isEditingReview
                      ? <><FileText className="h-3 w-3" />Preview</>
                      : <><Edit3 className="h-3 w-3" />Edit</>}
                  </Button>
                  {isEditingReview && (
                    <Button size="sm" variant="outline" onClick={saveContent}
                      disabled={isSaving || !isDirty}
                      className={`h-7 text-[11px] px-3 gap-1 font-semibold transition-all ${
                        isDirty
                          ? 'border-primary/50 text-primary bg-primary/8 hover:bg-primary/15'
                          : 'border-border/30 text-muted-foreground/40 bg-transparent'
                      }`}>
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {isSaving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
                    </Button>
                  )}
                </>
              )}
              {(contentStatus === 'final' || contentStatus === 'published') && (
                <>
                  <Button size="sm" variant="ghost" onClick={exportToPDF} disabled={isExporting}
                    className="h-7 text-[11px] px-2.5 gap-1 text-muted-foreground hover:text-foreground">
                    {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                    Export PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={sendToSocialAlchemist}
                    className="h-7 text-[11px] px-2.5 gap-1 text-muted-foreground hover:text-foreground">
                    <Wand2 className="h-3 w-3" />Social Assets
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content area — only this scrolls */}
          <div className="flex-1 min-h-0 overflow-hidden px-4 pb-1 pt-3">
            {contentStatus === 'review' && isEditingReview ? (
              <Textarea
                value={editableContent}
                onChange={(e) => { setEditableContent(e.target.value); setIsDirty(true); }}
                className="h-full w-full resize-none text-[13.5px] leading-[1.85] bg-background border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-colors placeholder:text-muted-foreground/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent"
                placeholder="Edit your content here…"
                disabled={!!isProcessingAction}
              />
            ) : (
              <div className={`h-full overflow-y-auto rounded-md bg-background border border-border/30 shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent ${
                contentStatus === 'published' ? 'opacity-60' : ''
              }`}>
                {editableContent ? (
                  <div className="px-8 py-7">
                    <ReactMarkdown components={mdComponents}>{editableContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground/40 italic text-sm">
                    No content available.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Refinement — review only */}
          {contentStatus === 'review' && (
            <div className="shrink-0 mx-4 my-2 rounded-xl border border-border/30 bg-muted/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary/60" />Refine with AI
                </span>
                <div className="flex items-center gap-2">
                  {isProcessingAction && (
                    <span className="text-[11px] text-primary/70 flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />Applying {isProcessingAction}…
                    </span>
                  )}
                  {contentHistory.length > 0 && !isProcessingAction && (
                    <button
                      onClick={handleRevert}
                      className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/60 hover:text-foreground transition-colors"
                      title={`Revert to previous version (${contentHistory.length} available)`}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Revert ({contentHistory.length})
                    </button>
                  )}
                </div>
              </div>
              {/* Custom modifier input */}
              <div className="flex items-center gap-2 px-4 py-2.5">
                <Input
                  value={customModifier}
                  onChange={(e) => setCustomModifier(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomModifier(); } }}
                  placeholder="Custom instruction… e.g. Make the opening punchier"
                  disabled={!!isProcessingAction}
                  className="h-8 text-[12px] bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/40 placeholder:text-muted-foreground/40 disabled:opacity-40"
                />
                <Button size="sm" onClick={handleCustomModifier}
                  disabled={!!isProcessingAction || !customModifier.trim()}
                  className="h-8 w-8 p-0 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-all">
                  {isProcessingAction === 'custom' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 px-4 pb-3 border-t border-border/20 pt-2.5">
                <div className="flex gap-1.5">
                  {[
                    { action: 'poeticize', label: 'Poeticize', icon: Sparkles,  cls: 'text-primary/80 border-primary/25 hover:bg-primary/8 hover:border-primary/50' },
                    { action: 'rewrite',   label: 'Rewrite',   icon: RotateCcw, cls: 'text-accent/80 border-accent/25 hover:bg-accent/8 hover:border-accent/50' },
                    { action: 'shorten',   label: 'Shorten',   icon: Scissors,  cls: 'text-warning/80 border-warning/25 hover:bg-warning/8 hover:border-warning/50' },
                  ].map(({ action, label, icon: Icon, cls }) => (
                    <Button key={action} size="sm" variant="outline"
                      onClick={() => handleQuickAction(action)}
                      disabled={!!isProcessingAction}
                      className={`h-7 text-[11px] px-3 gap-1.5 font-medium border transition-all disabled:opacity-30 ${cls}`}>
                      {isProcessingAction === action ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                      {label}
                    </Button>
                  ))}
                </div>
                <Button size="sm" onClick={() => updateStatus('final')}
                  disabled={!!isProcessingAction}
                  className="h-7 text-[11px] px-4 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow transition-all">
                  <CheckCircle className="h-3 w-3" />Confirm
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border/30 bg-gradient-surface px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {contentStatus === 'draft' && onNewGeneration && (
                <Button variant="ghost" size="sm" onClick={onNewGeneration}
                  className="h-8 text-[11px] px-3 gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />New Generation
                </Button>
              )}
              {contentStatus === 'final' && (
                <Button variant="ghost" size="sm" onClick={() => updateStatus('review')}
                  className="h-8 text-[11px] px-3 gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />Back to Review
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {contentStatus === 'draft' && (
                <Button size="sm" onClick={() => updateStatus('review')}
                  className="h-8 text-[12px] px-5 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-all">
                  Move to Review <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {contentStatus === 'final' && (
                <Button size="sm" onClick={sendToCMS} disabled={isSendingToCMS}
                  className="h-8 text-[12px] px-5 gap-1.5 font-bold bg-gradient-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.99] transition-all">
                  {isSendingToCMS ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isSendingToCMS ? 'Publishing…' : 'Publish'}
                </Button>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};
