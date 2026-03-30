import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_VOICE_PROFILE_CREATE, WEBHOOK_EDITORIAL_GPT } from "@/constants/webhooks";
import { useToast } from "@/hooks/use-toast";
import { type VoiceOption } from "@/constants/voices";
import { useVoices } from "@/contexts/VoicesContext";
import { DEFAULT_GUARDRAILS, type Guardrails } from "@/components/dashboard/GeneratedContentModal";
import {
  Sparkles,
  User,
  FileText,
  Twitter,
  Video,
  ScrollText,
  BookOpen,
  FileImage,
  Palette,
  Edit,
  Loader2,
  Trash2,
  Plus,
  Briefcase,
  Target,
  BarChart3,
  FileEdit,
  Users,
  MessageSquare,
  Globe,
  Star,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Shield,
  ChevronDown,
  ArrowLeft,
  SlidersHorizontal,
  RotateCcw,
  X,
  CheckCircle,
  Zap,
} from "lucide-react";

const outputTypes = [
  { value: "article", label: "Article", icon: FileText, description: "Written article content", color: "from-blue-500 to-cyan-500" },
  { value: "tweet-thread", label: "Tweet Thread", icon: Twitter, description: "Tweet thread (7–10 posts)", color: "from-sky-500 to-blue-500" },
  { value: "script", label: "Script", icon: Video, description: "Script (voiceover or video narration)", color: "from-purple-500 to-pink-500" },
  { value: "prompt", label: "Daily Prompt", icon: Lightbulb, description: "Daily Prompt (short-form idea/question)", color: "from-yellow-500 to-orange-500" }
];

const articleLengths = [
  { value: "short", label: "Short", description: "500-700 words" },
  { value: "medium", label: "Medium", description: "700-1600 words" },
  { value: "long", label: "Long", description: "1600+ words" }
];

type CustomVoice = VoiceOption;

export const ContentGenerator = ({ onClose }: { onClose?: () => void }) => {
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [selectedArticleLength, setSelectedArticleLength] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  const [showGuardrails, setShowGuardrails] = useState(false);

  const { toast } = useToast();

  // Custom voice management (shared context)
  const { voices, addVoice, removeVoice, updateVoice } = useVoices();
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceProfileModalOpen, setVoiceProfileModalOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<CustomVoice | null>(null);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceDescription, setNewVoiceDescription] = useState("");

  // Voice profile generation
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [voiceProfileName, setVoiceProfileName] = useState("");

  // Voice deletion confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<CustomVoice | null>(null);
  const [isDeletingVoice, setIsDeletingVoice] = useState(false);

  const handleVoiceChange = (value: string) => {
    if (value === "create-voice-profile") {
      setVoiceProfileModalOpen(true);
    } else if (value === "create-custom") {
      setEditingVoice(null);
      setNewVoiceName("");
      setNewVoiceDescription("");
      setVoiceModalOpen(true);
    } else {
      setSelectedVoice(value);
    }
  };

  const handleSaveVoice = () => {
    if (!newVoiceName.trim() || !newVoiceDescription.trim()) return;

    const voiceValue = newVoiceName.toLowerCase().replace(/\s+/g, '-');

    if (editingVoice) {
      // Edit existing voice
      updateVoice(editingVoice.value, { value: voiceValue, label: newVoiceName, description: newVoiceDescription });

      // Update selection if editing the currently selected voice
      if (selectedVoice === editingVoice.value) {
        setSelectedVoice(voiceValue);
      }
    } else {
      // Create new voice
      const newVoice: CustomVoice = {
        value: voiceValue,
        label: newVoiceName,
        description: newVoiceDescription,
        isDefault: false
      };
      addVoice(newVoice);
      setSelectedVoice(voiceValue);
    }

    setVoiceModalOpen(false);
    setNewVoiceName("");
    setNewVoiceDescription("");
    setEditingVoice(null);
  };

  const handleEditVoice = (voice: CustomVoice) => {
    setEditingVoice(voice);
    setNewVoiceName(voice.label);
    setNewVoiceDescription(voice.description);
    setVoiceModalOpen(true);
  };

  const handleDeleteVoice = (voiceValue: string) => {
    const voice = voices.find(v => v.value === voiceValue);
    if (voice && !voice.isDefault) {
      setVoiceToDelete(voice);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteVoice = async () => {
    if (!voiceToDelete) return;

    setIsDeletingVoice(true);

    try {
      if (voiceToDelete.databaseId) {
        const { error: dbError } = await supabase
          .from('voice_profiles')
          .delete()
          .eq('id', voiceToDelete.databaseId);

        if (dbError) throw dbError;
      }

      removeVoice(voiceToDelete.value);

      if (selectedVoice === voiceToDelete.value) {
        setSelectedVoice("");
      }

      toast({
        title: "Voice deleted",
        description: "Voice profile has been removed successfully",
      });

      setDeleteConfirmOpen(false);
      setVoiceToDelete(null);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "An error occurred while deleting the voice profile",
        variant: "destructive",
      });
    } finally {
      setIsDeletingVoice(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => {
        const isPdf = file.type === 'application/pdf';
        const isText = file.type === 'text/plain';
        return isPdf || isText;
      });
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVoiceProfile = async () => {
    if (uploadedFiles.length === 0 || !voiceProfileName.trim()) return;

    setIsUploadingProfile(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user.user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a voice profile",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('voice_name', voiceProfileName.trim());
      formData.append('user_id', user.user.id);

      const webhookUrl = WEBHOOK_VOICE_PROFILE_CREATE;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();

        let voiceProfileId: string | undefined;

        // n8n webhook already saved the record — just fetch the ID
        try {
          const { data: voiceProfileData, error: dbError } = await supabase
            .from('voice_profiles')
            .select('id')
            .eq('user_id', user.user.id)
            .eq('name', voiceProfileName.trim())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (dbError) {
            console.error('[voice_profiles fetch]', dbError);
          } else {
            voiceProfileId = voiceProfileData?.id;
          }
        } catch (e) {
          console.error('[voice_profiles fetch] exception', e);
        }

        // Create voice profile in local state
        const newVoice: CustomVoice = {
          value: `voice-${Date.now()}`,
          label: voiceProfileName,
          description: result.description || 'Custom voice profile',
          isDefault: false,
          userId: user.user.id,
          databaseId: voiceProfileId
        };

        addVoice(newVoice);
        setSelectedVoice(newVoice.value);

        toast({
          title: "Voice profile created!",
          description: "Your personal voice profile has been generated successfully",
        });

        setVoiceProfileModalOpen(false);
        setUploadedFiles([]);
        setVoiceProfileName("");
      } else {
        throw new Error('Failed to upload voice profile');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to create voice profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingProfile(false);
    }
  };


  const handleGenerate = async () => {
    if (!selectedVoice || !selectedOutputType || !topic.trim()) return;

    setIsGenerating(true);

    try {
      // Extract base output type and article length if applicable
      let baseOutputType = selectedOutputType;
      let contentSize = selectedArticleLength;

      if (selectedOutputType.startsWith('article-')) {
        baseOutputType = 'article';
        contentSize = selectedOutputType.replace('article-', '');
      }

      const resolvedVoiceId = voices.find(v => v.value === selectedVoice)?.databaseId ?? selectedVoice;

      const payload: any = {
        topic,
        signal: {
          headline: topic,
          summary: topic
        },
        voice_id: resolvedVoiceId,
        output_type: baseOutputType,
        guardrails,
      };

      if (contentSize) {
        payload.content_size = contentSize;
      }

      const response = await fetch(WEBHOOK_EDITORIAL_GPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const formattedContent = formatResponseData(result);

        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const voiceName = voices.find(v => v.value === selectedVoice)?.label || selectedVoice;
            const { data: saved, error } = await supabase
              .from('content_outputs')
              .insert({
                user_id: user.user.id,
                title: `${selectedOutputType.replace('-', ' ')} about ${topic.substring(0, 50)}`,
                content: formattedContent,
                persona: voiceName,
                output_type: selectedOutputType,
                status: 'draft',
                topic_context: topic,
              })
              .select('id')
              .single();

            if (error) {
              toast({ title: "Save failed!", description: `Database error: ${error.message}`, variant: "destructive" });
            } else {
              window.dispatchEvent(new CustomEvent('statsRefresh'));
              window.dispatchEvent(new CustomEvent('openDraftModal', { detail: { id: saved.id, voiceId: resolvedVoiceId, guardrails } }));
            }
          }
        } catch {
          // db save failed — non-critical
        }
      } else {
        toast({ title: "Error generating content", description: `Error: ${response.status} ${response.statusText}`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Network error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatResponseData = (response: any): string => {
    if (!response) return "";
    const data = Array.isArray(response) && response.length > 0 ? response[0] : response;

    if (typeof data === "string") return data;
    if (data.text_output) return data.text_output;
    if (data.content_markdown) return data.content_markdown;

    const body = data.content || data.body || "";
    const { headline, tldr, caption } = data;

    if (!headline && !body && !tldr && !caption) {
      return JSON.stringify(data, null, 2);
    }

    let out = "";

    if (headline) {
      out += `# ${headline}\n\n`;
    }

    if (tldr) {
      out += `## In Brief\n\n${tldr}\n\n`;
    }

    if (body) {
      out += `## Full Story\n\n${body}\n\n`;
    }

    if (caption) {
      out += `## Caption\n\n${caption}`;
    }

    return out.trim();
  };

  const canGenerate = selectedVoice && selectedOutputType && topic.trim();

  const guardrailsCustomized = (
    guardrails.cultural_fluency !== DEFAULT_GUARDRAILS.cultural_fluency ||
    guardrails.verification_required !== DEFAULT_GUARDRAILS.verification_required ||
    guardrails.reading_level !== DEFAULT_GUARDRAILS.reading_level ||
    guardrails.empowerment_intensity !== DEFAULT_GUARDRAILS.empowerment_intensity ||
    guardrails.technical_depth !== DEFAULT_GUARDRAILS.technical_depth ||
    guardrails.storytelling_bias !== DEFAULT_GUARDRAILS.storytelling_bias
  );

  return (
    <>
      {/* ── Glow top bar ─────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-10 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/12 to-transparent pointer-events-none z-0" />

      {/* ── Header ───────────────────────────────────────── */}
      <div className="shrink-0 relative z-10 pt-1">
        <div className="px-5 pt-4 pb-4 border-b border-primary/15 bg-gradient-to-br from-card via-card to-primary/5">

          {showGuardrails ? (
            /* Guardrails header */
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowGuardrails(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 shadow-sm transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 text-primary" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">AI Guardrails</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Fine-tune quality, tone & compliance</p>
              </div>
              {guardrailsCustomized && (
                <button
                  type="button"
                  onClick={() => setGuardrails(DEFAULT_GUARDRAILS)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors bg-muted/40 hover:bg-primary/8 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
                >
                  <RotateCcw className="h-3 w-3" />Reset
                </button>
              )}
              <button
                onClick={onClose}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 bg-muted/30 hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-all duration-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Main header */
            <div>
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md scale-110" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25 ring-2 ring-primary/20">
                    <Sparkles className="h-5 w-5 text-white drop-shadow" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-[16px] font-black text-foreground tracking-tight leading-tight">Content Generator</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">AI-powered content crafted to your voice</p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 bg-muted/30 hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-all duration-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Readiness status chips */}
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                {[
                  { filled: !!selectedVoice, icon: User, label: selectedVoice ? (voices.find(v => v.value === selectedVoice)?.label ?? 'Voice') : 'Voice' },
                  { filled: !!selectedOutputType, icon: FileText, label: selectedOutputType ? selectedOutputType.replace(/-/g, ' ') : 'Format' },
                  { filled: !!topic.trim(), icon: Lightbulb, label: topic.trim() ? 'Topic set' : 'Topic' },
                ].map(({ filled, icon: Icon, label }, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all duration-300 ${
                    filled
                      ? 'bg-primary/10 border-primary/25 text-primary shadow-sm'
                      : 'bg-muted/40 border-border/40 text-muted-foreground/60'
                  }`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="capitalize max-w-[80px] truncate">{label}</span>
                    {filled && <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/40" />}
                  </div>
                ))}
                {canGenerate && (
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-primary">
                    <Zap className="h-3 w-3" />Ready
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sliding panel body ────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div
          className="flex w-[200%] h-full transition-transform duration-300 ease-in-out"
          style={{ transform: showGuardrails ? 'translateX(-50%)' : 'translateX(0)' }}
        >

          {/* Panel 1 — Main form */}
          <div className="w-1/2 h-full overflow-y-auto px-5 py-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-track]:transparent">

            {/* Voice Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <div className="h-3 w-0.5 rounded-full bg-primary" />
                <User className="h-3 w-3 text-primary" />
                Voice Profile
                {selectedVoice && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
              </Label>
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger className="bg-background border-2 border-border/60 hover:border-primary/50 focus:border-primary hover:shadow-md hover:shadow-primary/8 transition-all duration-200 font-medium">
                  <SelectValue placeholder="Select a voice...">
                    {selectedVoice && voices.find(v => v.value === selectedVoice)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                  {voices.map((voice) => {
                    const Icon = voice.icon || User;
                    return (
                      <div key={voice.value} className="relative group/item">
                        <SelectItem value={voice.value} className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-all duration-200 my-1 rounded-lg pr-16">
                          <div className="flex items-center space-x-3 py-1">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${voice.color || 'from-gray-400 to-gray-500'} shadow-md group-hover/item:scale-110 transition-transform duration-200`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{voice.label}</div>
                              <div className="text-xs text-muted-foreground">{voice.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                        {!voice.isDefault && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                            <button type="button" className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-primary/20 transition-colors"
                              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); handleEditVoice(voice); }}>
                              <Edit className="h-3 w-3" />
                            </button>
                            <button type="button" className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-destructive/20 transition-colors"
                              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteVoice(voice.value); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Separator className="my-2" />
                  <SelectItem value="create-voice-profile" className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-all duration-200 my-1 rounded-lg">
                    <div className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" /><span>Create Personal Voice</span></div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Output Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <div className="h-3 w-0.5 rounded-full bg-accent" />
                <FileText className="h-3 w-3 text-accent" />
                Output Format
                {selectedOutputType && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
              </Label>
              <Select
                value={selectedOutputType.startsWith('article-') ? 'article' : selectedOutputType}
                onValueChange={(value) => {
                  if (value === 'article') { setSelectedOutputType('article'); setSelectedArticleLength(""); return; }
                  setSelectedOutputType(value); setSelectedArticleLength("");
                }}
              >
                <SelectTrigger className="bg-background border-2 border-border/60 hover:border-accent/50 focus:border-accent hover:shadow-md hover:shadow-accent/8 transition-all duration-200 font-medium">
                  <SelectValue placeholder="Select output type...">
                    {selectedOutputType && (
                      selectedOutputType.startsWith('article-')
                        ? `Article — ${articleLengths.find(l => l.value === selectedOutputType.replace('article-', ''))?.label}`
                        : outputTypes.find(t => t.value === selectedOutputType)?.label
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                  {outputTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value} className="hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 cursor-pointer transition-all duration-200 my-1 rounded-lg group">
                        <div className="flex items-center space-x-3 py-1">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${type.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {(selectedOutputType === 'article' || selectedOutputType.startsWith('article-')) && (
                <div className="flex gap-1.5 animate-in slide-in-from-top duration-300 relative z-10">
                  {articleLengths.map((length) => {
                    const articleValue = `article-${length.value}`;
                    const isSelected = selectedOutputType === articleValue;
                    return (
                      <button key={length.value} type="button"
                        onClick={() => { setSelectedOutputType(articleValue); setSelectedArticleLength(length.value); }}
                        className={`flex-1 py-1.5 px-2 rounded-xl border-2 transition-all duration-200 ${
                          isSelected ? "border-primary bg-primary/10 shadow-md shadow-primary/15 scale-[1.02]" : "border-border/50 hover:border-primary/40 hover:bg-primary/4 bg-background"
                        }`}
                      >
                        <div className="font-bold text-xs">{length.label}</div>
                        <div className="text-[10px] text-muted-foreground">{length.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topic Input */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <div className="h-3 w-0.5 rounded-full bg-primary/60" />
                <Lightbulb className="h-3 w-3 text-primary/60" />
                Topic & Context
                {topic.trim() && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
              </Label>
              <Textarea
                placeholder="Describe the topic, provide context, or paste source material..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[80px] resize-none bg-background border-2 border-border/60 hover:border-primary/40 focus:border-primary text-sm transition-colors duration-200"
              />
            </div>

            {/* Guardrails entry row */}
            <button
              type="button"
              onClick={() => setShowGuardrails(true)}
              className="flex w-full items-center justify-between px-3.5 py-3 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/6 via-accent/4 to-primary/6 hover:from-primary/12 hover:to-accent/10 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/25 ring-1 ring-primary/20">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-foreground">AI Guardrails</span>
                    {guardrailsCustomized
                      ? <Badge className="h-3.5 text-[8px] px-1.5 bg-primary/20 text-primary border border-primary/30 font-bold">Custom</Badge>
                      : <Badge variant="outline" className="h-3.5 text-[8px] px-1 border-border/60 text-muted-foreground font-medium">Default</Badge>
                    }
                  </div>
                  <p className="text-[9px] text-muted-foreground/80 mt-0.5 font-medium">
                    Grade {guardrails.reading_level} · {guardrails.empowerment_intensity} empowerment
                  </p>
                </div>
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/10 border border-transparent group-hover:border-primary/20 transition-all duration-200">
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
              </div>
            </button>

          </div>{/* end panel 1 */}

          {/* Panel 2 — Guardrails */}
          <div className="w-1/2 h-full overflow-y-auto px-5 py-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-track]:transparent">

            {/* Toggle flags */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'cultural_fluency' as const, label: 'Cultural Fluency', desc: 'Adapt for cultural context', icon: Globe },
                { key: 'verification_required' as const, label: 'Fact Verification', desc: 'Require source backing', icon: CheckCircle2 },
              ]).map(({ key, label, desc, icon: Icon }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    guardrails[key]
                      ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-accent/6 shadow-md shadow-primary/10'
                      : 'border-border/40 bg-muted/15 hover:border-primary/25 hover:bg-muted/25'
                  }`}
                  onClick={() => setGuardrails(g => ({ ...g, [key]: !g[key] }))}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md shadow-sm transition-colors ${guardrails[key] ? 'bg-gradient-to-br from-primary to-accent shadow-primary/20' : 'bg-muted/60'}`}>
                        <Icon className={`h-3 w-3 ${guardrails[key] ? 'text-white' : 'text-muted-foreground/60'}`} />
                      </div>
                      <span className={`text-[10px] font-bold leading-tight transition-colors ${guardrails[key] ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight">{desc}</p>
                  </div>
                  <Switch checked={guardrails[key]} onCheckedChange={v => setGuardrails(g => ({ ...g, [key]: v }))} onClick={e => e.stopPropagation()} />
                </div>
              ))}
            </div>

            {/* Reading Level */}
            <div className="space-y-1.5 rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <div className="h-2.5 w-0.5 rounded-full bg-primary" />
                  <BookOpen className="h-2.5 w-2.5 text-primary" />Reading Level
                </Label>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{guardrails.reading_level}</span>
              </div>
              <div className="flex gap-1">
                {["5-6", "7-8", "9-10", "11-12", "college"].map(l => (
                  <button key={l} type="button"
                    onClick={() => setGuardrails(g => ({ ...g, reading_level: l }))}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border-2 transition-all duration-200 ${
                      guardrails.reading_level === l
                        ? 'bg-gradient-to-b from-primary to-primary/80 text-white border-primary shadow-md shadow-primary/25 scale-[1.04]'
                        : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 bg-background'
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Intensity controls */}
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <div className="h-2.5 w-0.5 rounded-full bg-accent" />
                <SlidersHorizontal className="h-2.5 w-2.5 text-accent" />Intensity
              </Label>
              {([
                { key: 'empowerment_intensity' as const, label: 'Empowerment', icon: Target },
                { key: 'technical_depth' as const, label: 'Tech Depth', icon: BarChart3 },
                { key: 'storytelling_bias' as const, label: 'Storytelling', icon: SlidersHorizontal },
              ]).map(({ key, label, icon: Icon }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-2.5 w-2.5 text-primary/60 shrink-0" />
                    <Label className="text-[10px] font-semibold text-muted-foreground">{label}</Label>
                    <span className="ml-auto text-[9px] font-bold text-primary capitalize bg-primary/8 px-1.5 py-0.5 rounded">{guardrails[key]}</span>
                  </div>
                  <div className="flex gap-1">
                    {["low", "medium", "high"].map(level => (
                      <button key={level} type="button"
                        onClick={() => setGuardrails(g => ({ ...g, [key]: level }))}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border-2 capitalize transition-all duration-200 ${
                          guardrails[key] === level
                            ? level === 'low'
                              ? 'bg-muted text-foreground border-border shadow-sm scale-[1.03]'
                              : level === 'medium'
                                ? 'bg-amber-500/15 text-amber-600 border-amber-400/50 shadow-sm scale-[1.03]'
                                : 'bg-primary/15 text-primary border-primary/50 shadow-md shadow-primary/15 scale-[1.03]'
                            : 'border-border/40 text-muted-foreground/50 hover:border-primary/30 hover:text-muted-foreground bg-background'
                        }`}
                      >{level}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>{/* end panel 2 */}

        </div>{/* end sliding track */}
      </div>{/* end overflow-hidden */}

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="shrink-0 border-t border-primary/12 bg-gradient-to-r from-card via-card to-primary/3 px-5 py-4 relative z-10">
        {showGuardrails ? (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setGuardrails(DEFAULT_GUARDRAILS)}
              className="border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground font-semibold text-sm transition-all duration-200">
              <RotateCcw className="h-3.5 w-3.5 mr-2" />Reset Defaults
            </Button>
            <Button onClick={() => setShowGuardrails(false)}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 font-bold shadow-md shadow-primary/15">
              <CheckCircle className="h-4 w-4 mr-2" />Apply Changes
            </Button>
          </div>
        ) : (
          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}
            className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all duration-200 font-bold shadow-md shadow-primary/15 h-11 text-[14px]">
            {isGenerating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              : <><Sparkles className="h-4 w-4 mr-2" />Generate Content</>
            }
          </Button>
        )}
      </div>

      {/* ── Voice modals ─────────────────────────────────── */}
      <Dialog open={voiceModalOpen} onOpenChange={setVoiceModalOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingVoice ? "Edit Voice" : "Create Custom Voice"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingVoice ? "Update your custom voice details" : "Create a custom voice profile for content generation"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input id="voice-name" placeholder="Enter voice name" value={newVoiceName} onChange={(e) => setNewVoiceName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-description">Voice Description</Label>
              <Input id="voice-description" placeholder="Describe the voice style" value={newVoiceDescription} onChange={(e) => setNewVoiceDescription(e.target.value)} className="bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoiceModalOpen(false); setNewVoiceName(""); setNewVoiceDescription(""); setEditingVoice(null); }}>Cancel</Button>
            <Button onClick={handleSaveVoice} disabled={!newVoiceName.trim() || !newVoiceDescription.trim()} className="bg-gradient-primary hover:shadow-glow">
              {editingVoice ? "Update" : "Create"} Voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voiceProfileModalOpen} onOpenChange={setVoiceProfileModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" />Voice Profile Generation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload your articles to create a personalized voice profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voice-profile-name">Name your voice</Label>
              <Input id="voice-profile-name" placeholder="Name your voice..." value={voiceProfileName} onChange={(e) => setVoiceProfileName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Upload your articles</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" id="voice-file-upload" multiple accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
                <label htmlFor="voice-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload articles</div>
                  <div className="text-xs text-muted-foreground">PDF or TXT files only</div>
                </label>
              </div>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedFiles.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded-lg border border-border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveFile(index)} className="h-6 w-6 p-0 flex-shrink-0">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoiceProfileModalOpen(false); setUploadedFiles([]); setVoiceProfileName(""); }} disabled={isUploadingProfile}>Cancel</Button>
            <Button onClick={handleSubmitVoiceProfile} disabled={uploadedFiles.length === 0 || !voiceProfileName.trim() || isUploadingProfile} className="bg-gradient-primary hover:shadow-glow">
              {isUploadingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Voice Profile</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{voiceToDelete?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVoice}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVoice} disabled={isDeletingVoice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingVoice ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};