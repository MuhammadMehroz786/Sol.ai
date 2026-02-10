/**
 * Social Alchemist - Content Repurposing Tool
 *
 * IDEMPOTENCY HANDLING:
 * - Generates a deterministic idempotency key based on all inputs (voice, platforms, source type, content)
 * - Same inputs = same key = webhook returns cached result (no reprocessing)
 * - Different inputs = different key = new generation
 * - Webhook handles server-side caching and deduplication
 * - Double-click protection via isGenerating state
 *
 * API PAYLOAD STRUCTURE:
 * {
 *   idempotencyKey: "sa-{hash-of-inputs}",
 *   userId: "uuid-of-authenticated-user",
 *   payload: {
 *     voiceProfile: "Malcolm" | "Ana" | "Winston" | "Custom Voice Name",
 *     sourceType: "raw_text" | "url" | "doc_id" | "transcript",
 *     source: "content-string",
 *     targetPlatforms: ["x", "linkedin", "instagram_carousel", "short_video"]
 *   }
 * }
 *
 * TYPE MAPPINGS:
 * - UI "paste" → API "raw_text"
 * - UI "instagram" → API "instagram_carousel"
 * - UI "video" → API "short_video"
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Link as LinkIcon,
  FileCode,
  Mic,
  Twitter,
  Linkedin,
  Instagram,
  Video,
  Copy,
  Download,
  Send,
  Loader2,
  CheckCircle2,
  User,
  Sparkles,
  Trash2,
  Briefcase,
  Palette,
  Target,
  Wand2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileJson,
  FileDown,
  Hash,
  MessageSquare,
  Image as ImageIcon,
  Film,
  AlertTriangle,
  RotateCw,
  Zap,
  Crown,
  Eye,
  AtSign,
  Layers,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type SourceType = "paste" | "url" | "doc_id" | "transcript";
type Platform = "x" | "linkedin" | "instagram" | "video";

// API Types
type ApiSourceType = "raw_text" | "url" | "doc_id" | "transcript";
type ApiPlatform = "x" | "linkedin" | "instagram_carousel" | "short_video";

interface SocialAlchemistRequest {
  idempotencyKey: string;
  userId: string;
  payload: {
    voiceProfile: string;
    sourceType: ApiSourceType;
    source: string;
    targetPlatforms: ApiPlatform[];
  };
}

// Social Alchemist Response Types
interface SocialAlchemistResponse {
  ok: boolean;
  runId: string;
  status: "succeeded" | "partial_failure" | "failed";
  outputs: {
    x?: { tweets: string[] };
    linkedin?: { post: string };
    instagram_carousel?: {
      slides: string[];
      caption: string;
      altText: string[];
    };
    short_video?: {
      script: string;
      beats: string[];
    };
  };
  errors?: Array<{
    platform: string;
    error: string;
  }>;
}

interface PlatformResult {
  platform: Platform;
  content: string;
  badges: string[];
}

// Modal state for new design
interface GeneratedContentModalState {
  open: boolean;
  data: SocialAlchemistResponse | null;
  activeTab: string | null;
  copiedItem: string | null;
}

interface CustomVoice {
  value: string;
  label: string;
  description: string;
  isDefault: boolean;
  icon?: any;
  color?: string;
  userId?: string;
  databaseId?: string;
}

// Default voices
const defaultVoices: CustomVoice[] = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader", isDefault: true, icon: Briefcase, color: "from-blue-500 to-blue-600" },
  { value: "ana", label: "Ana", description: "Cultural analyst", isDefault: true, icon: Palette, color: "from-purple-500 to-pink-500" },
  { value: "winston", label: "Winston", description: "Strategic narrator", isDefault: true, icon: Target, color: "from-orange-500 to-red-500" }
];

const VOICES_STORAGE_KEY = 'sole-custom-voices';

// Webhook URL for content generation
const WEBHOOK_URL = "https://soleai.app.n8n.cloud/webhook/ab4dc726-d881-46c6-bcc3-3b1bffd2c7c4";

// Platform configurations
const platformConfigs = {
  x: {
    label: "X Thread",
    icon: Twitter,
    color: "text-neutral-900 dark:text-neutral-100",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    gradient: "from-neutral-900 to-neutral-700"
  },
  linkedin: {
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-[#0077B5]",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    gradient: "from-blue-600 to-blue-700"
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    gradient: "from-pink-600 to-purple-600"
  },
  video: {
    label: "Video",
    icon: Video,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    gradient: "from-red-600 to-red-700"
  },
};

// Modal platform display configs with richer styling
const modalPlatformConfigs: Record<string, {
  label: string;
  headline: string;
  icon: any;
  gradient: string;
  lightBg: string;
  accentColor: string;
  badgeColor: string;
}> = {
  x: {
    label: "X Thread",
    headline: "Thread Crafted for Maximum Reach",
    icon: Twitter,
    gradient: "from-sky-400 via-blue-400 to-cyan-400",
    lightBg: "from-[hsl(47,59%,98%)] to-[hsl(200,70%,96%)]",
    accentColor: "text-sky-500",
    badgeColor: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  linkedin: {
    label: "LinkedIn",
    headline: "Professional Post Ready to Publish",
    icon: Linkedin,
    gradient: "from-[#0077B5] via-[#0066A0] to-[#004D80]",
    lightBg: "from-[hsl(47,59%,98%)] to-[hsl(205,59%,96%)]",
    accentColor: "text-[#0077B5]",
    badgeColor: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  instagram_carousel: {
    label: "Instagram Carousel",
    headline: "Visual Story Ready to Captivate",
    icon: Instagram,
    gradient: "from-pink-500 via-purple-500 to-orange-400",
    lightBg: "from-[hsl(47,59%,98%)] to-[hsl(340,59%,96%)]",
    accentColor: "text-pink-600",
    badgeColor: "bg-pink-50 text-pink-700 border border-pink-200",
  },
  short_video: {
    label: "Video Script",
    headline: "Script Engineered to Hook & Convert",
    icon: Video,
    gradient: "from-red-500 via-orange-500 to-amber-500",
    lightBg: "from-[hsl(47,59%,98%)] to-[hsl(15,59%,96%)]",
    accentColor: "text-red-600",
    badgeColor: "bg-red-50 text-red-700 border border-red-200",
  },
};

const SocialAlchemist = () => {
  const { toast } = useToast();
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voices, setVoices] = useState<CustomVoice[]>(defaultVoices);
  const [sourceType, setSourceType] = useState<SourceType>("paste");
  const [sourceContent, setSourceContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<PlatformResult[] | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);

  // New modal state
  const [generatedContentModal, setGeneratedContentModal] = useState<GeneratedContentModalState>({
    open: false,
    data: null,
    activeTab: null,
    copiedItem: null,
  });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);


  // Voice profile modal states
  const [voiceProfileModalOpen, setVoiceProfileModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [voiceProfileName, setVoiceProfileName] = useState("");

  // Voice deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<CustomVoice | null>(null);
  const [isDeletingVoice, setIsDeletingVoice] = useState(false);

  // Helper: Generate deterministic idempotency key based on inputs
  const generateIdempotencyKey = () => {
    // Create a deterministic hash from all inputs
    const inputString = JSON.stringify({
      voice: selectedVoice,
      platforms: selectedPlatforms.sort(),
      sourceType: mapSourceTypeToApi(sourceType),
      source: sourceContent,
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `sa-${Math.abs(hash).toString(36)}`;
  };

  // Helper: Map UI source type to API source type
  const mapSourceTypeToApi = (uiType: SourceType): ApiSourceType => {
    if (uiType === "paste") return "raw_text";
    return uiType; // url, doc_id, transcript remain the same
  };

  // Helper: Map UI platform to API platform
  const mapPlatformToApi = (uiPlatform: Platform): ApiPlatform => {
    const platformMap: Record<Platform, ApiPlatform> = {
      x: "x",
      linkedin: "linkedin",
      instagram: "instagram_carousel",
      video: "short_video"
    };
    return platformMap[uiPlatform];
  };

  // Helper: Validate API request payload
  const validateApiRequest = (request: SocialAlchemistRequest): { valid: boolean; error?: string } => {
    if (!request.idempotencyKey) {
      return { valid: false, error: "Missing idempotency key" };
    }
    if (!request.userId) {
      return { valid: false, error: "Missing user ID" };
    }
    if (!request.payload.voiceProfile) {
      return { valid: false, error: "Missing voice profile selection" };
    }
    if (!request.payload.source || request.payload.source.trim().length === 0) {
      return { valid: false, error: "Content source cannot be empty" };
    }
    if (!request.payload.targetPlatforms || request.payload.targetPlatforms.length === 0) {
      return { valid: false, error: "At least one platform must be selected" };
    }
    const validSourceTypes: ApiSourceType[] = ["raw_text", "url", "doc_id", "transcript"];
    if (!validSourceTypes.includes(request.payload.sourceType)) {
      return { valid: false, error: `Invalid source type: ${request.payload.sourceType}` };
    }
    const validPlatforms: ApiPlatform[] = ["x", "linkedin", "instagram_carousel", "short_video"];
    const invalidPlatforms = request.payload.targetPlatforms.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return { valid: false, error: `Invalid platforms: ${invalidPlatforms.join(', ')}` };
    }
    return { valid: true };
  };

  // Load custom voices
  useEffect(() => {
    const loadVoices = () => {
      const stored = localStorage.getItem(VOICES_STORAGE_KEY);
      if (stored) {
        try {
          let customVoices = JSON.parse(stored);
          const cleanedVoices = customVoices.filter((v: CustomVoice) => v.label !== 'My Voice Profile');
          if (cleanedVoices.length !== customVoices.length) {
            localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(cleanedVoices));
            customVoices = cleanedVoices;
          }
          setVoices([...defaultVoices, ...customVoices]);
        } catch (e) {
          console.error('Failed to load custom voices:', e);
        }
      }
    };

    loadVoices();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VOICES_STORAGE_KEY) loadVoices();
    };

    const handleVoiceUpdate = () => loadVoices();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('voicesUpdated', handleVoiceUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('voicesUpdated', handleVoiceUpdate);
    };
  }, []);

  // Listen for content from Content Queue
  useEffect(() => {
    const handleEditorialContent = (event: CustomEvent) => {
      if (event.detail && event.detail.content) {
        setSourceType("paste");
        setSourceContent(event.detail.content);
        toast({
          title: "Content loaded",
          description: "Editorial content has been loaded. Select a voice and platforms to generate social assets.",
        });
      }
    };

    window.addEventListener('editorialToSocialAlchemist', handleEditorialContent as EventListener);

    return () => {
      window.removeEventListener('editorialToSocialAlchemist', handleEditorialContent as EventListener);
    };
  }, [toast]);

  const saveCustomVoices = (allVoices: CustomVoice[]) => {
    const customOnly = allVoices.filter(v => !v.isDefault);
    localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(customOnly));
    window.dispatchEvent(new Event('voicesUpdated'));
  };

  const handleVoiceChange = (value: string) => {
    if (value === "create-voice-profile") {
      setVoiceProfileModalOpen(true);
    } else {
      setSelectedVoice(value);
    }
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
      const webhookUrl = 'https://soleai.app.n8n.cloud/webhook/4d473f2d-67af-4144-b217-0cb9440124a8';
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_name: voiceToDelete.label })
      });

      const updatedVoices = voices.filter(v => v.value !== voiceToDelete.value);
      setVoices(updatedVoices);
      saveCustomVoices(updatedVoices);

      if (selectedVoice === voiceToDelete.value) setSelectedVoice("");

      toast({ title: "Voice deleted", description: "Voice profile removed successfully" });
      setDeleteConfirmOpen(false);
      setVoiceToDelete(null);
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setIsDeletingVoice(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file =>
        file.type === 'application/pdf' || file.type === 'text/plain'
      );
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({ title: "Authentication required", variant: "destructive" });
        return;
      }

      const formData = new FormData();
      uploadedFiles.forEach(file => formData.append('files', file));
      formData.append('voice_name', voiceProfileName.trim());
      formData.append('user_id', userData.user.id);

      const response = await fetch('https://soleai.app.n8n.cloud/webhook/66bc4c62-262d-4a3c-8d18-098c97672ddd', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const newVoice: CustomVoice = {
          value: `voice-${Date.now()}`,
          label: voiceProfileName,
          description: result.description || 'Custom voice profile',
          isDefault: false,
          userId: userData.user.id
        };

        const updatedVoices = [...voices, newVoice];
        setVoices(updatedVoices);
        saveCustomVoices(updatedVoices);
        setSelectedVoice(newVoice.value);

        toast({ title: "Voice profile created!" });
        setVoiceProfileModalOpen(false);
        setUploadedFiles([]);
        setVoiceProfileName("");
      }
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    // Prevent double-click submissions
    if (isGenerating) return;

    // Get authenticated user
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate content",
        variant: "destructive"
      });
      return;
    }

    // Generate deterministic idempotency key from inputs
    // Same inputs = same key = webhook returns cached result
    const key = generateIdempotencyKey();

    setIsGenerating(true);
    setResults(null);

    try {
      // Get voice profile name from selected voice
      const selectedVoiceProfile = voices.find(v => v.value === selectedVoice);
      const voiceProfileName = selectedVoiceProfile?.label || selectedVoice;

      // Prepare API request payload according to schema
      const requestBody: SocialAlchemistRequest = {
        idempotencyKey: key,
        userId: userData.user.id,
        payload: {
          voiceProfile: voiceProfileName,
          sourceType: mapSourceTypeToApi(sourceType),
          source: sourceContent,
          targetPlatforms: selectedPlatforms.map(mapPlatformToApi)
        }
      };

      // Validate request before sending
      const validation = validateApiRequest(requestBody);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log('Sending request to webhook:', requestBody);

      // Single fetch — 120s timeout so the webhook has plenty of time
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result = await response.json();
      console.log('Webhook response (raw):', result);

      // ---- Normalize response ----

      // Handle array responses — n8n returns one item per platform
      if (Array.isArray(result) && result.length > 0) {
        console.log(`Response is an array with ${result.length} element(s), merging`);

        const mergedOutputs: Record<string, any> = {};
        const mergedErrors: Array<{ platform: string; error: string }> = [];
        let runId = '';

        for (const item of result) {
          // Unwrap { data: {...} } wrappers
          const entry = (item.data && !item.platform && !item.ok) ? item.data : item;

          if (entry.runId && !runId) runId = entry.runId;

          // ---- Format A: { platform, artifact, validation } (actual n8n response) ----
          if (entry.platform && entry.artifact) {
            console.log(`  Platform "${entry.platform}": artifact keys =`, Object.keys(entry.artifact));
            if (entry.validation?.error || entry.artifact?.error) {
              mergedErrors.push({ platform: entry.platform, error: entry.validation?.error || entry.artifact.error });
            } else {
              mergedOutputs[entry.platform] = entry.artifact;
            }
            continue;
          }

          // ---- Format B: { ok, runId, outputs: { platform: data } } (legacy format) ----
          if (entry.outputs && typeof entry.outputs === 'object') {
            for (const [key, value] of Object.entries(entry.outputs)) {
              if (value && typeof value === 'object' && !(value as any).error) {
                mergedOutputs[key] = value;
              } else if (value && typeof value === 'object' && (value as any).error) {
                mergedErrors.push({ platform: key, error: (value as any).error });
              }
            }
          }

          if (entry.errors && Array.isArray(entry.errors)) mergedErrors.push(...entry.errors);
          if (!entry.outputs && !entry.artifact && entry.error) {
            mergedErrors.push({ platform: entry.platform || 'Unknown', error: entry.error });
          }
        }

        const hasOutputs = Object.keys(mergedOutputs).length > 0;
        result = {
          ok: hasOutputs,
          runId: runId || 'unknown',
          status: mergedErrors.length === 0 ? 'succeeded' : hasOutputs ? 'partial_failure' : 'failed',
          outputs: mergedOutputs,
          ...(mergedErrors.length > 0 ? { errors: mergedErrors } : {}),
        };

        console.log('Merged outputs:', Object.keys(mergedOutputs));
        if (mergedErrors.length) console.log('Merged errors:', mergedErrors);
      }

      // Handle wrapped responses { data: {...} }
      if (result.data && !result.ok && !result.runId) {
        result = result.data;
      }

      // Separate error-only entries from outputs
      if (result.outputs && typeof result.outputs === 'object') {
        const cleanOutputs: Record<string, any> = {};
        const extraErrors: Array<{ platform: string; error: string }> = [];
        for (const [key, value] of Object.entries(result.outputs)) {
          if (value && typeof value === 'object' && (value as any).error) {
            extraErrors.push({ platform: key, error: (value as any).error });
          } else if (value) {
            cleanOutputs[key] = value;
          }
        }
        if (extraErrors.length > 0) {
          result.outputs = cleanOutputs;
          result.errors = [...(result.errors || []), ...extraErrors];
          if (Object.keys(cleanOutputs).length > 0) result.status = 'partial_failure';
        }
      }

      // Fill defaults
      if (!result.runId) result.runId = 'unknown';
      if (result.ok === undefined) result.ok = !!result.outputs && Object.keys(result.outputs).length > 0;
      if (!result.status) result.status = result.errors?.length ? 'partial_failure' : 'succeeded';

      console.log('Webhook response (processed):', result);
      console.log('Output keys:', result.outputs ? Object.keys(result.outputs) : 'none');
      // Log each platform's artifact shape for debugging
      if (result.outputs) {
        for (const [platform, data] of Object.entries(result.outputs)) {
          console.log(`  Platform "${platform}" data keys:`, data ? Object.keys(data as object) : 'null');
          console.log(`  Platform "${platform}" full data:`, JSON.stringify(data, null, 2)?.slice(0, 500));
        }
      }
      if (result.errors) console.log('Errors:', result.errors);

      // ---- Display result ----
      const hasUsableOutputs = result.outputs && typeof result.outputs === 'object' && Object.keys(result.outputs).length > 0;

      if (hasUsableOutputs) {
        const firstAvailablePlatform = Object.keys(result.outputs)[0] || null;
        setGeneratedContentModal({
          open: true,
          data: result,
          activeTab: firstAvailablePlatform,
          copiedItem: null,
        });
        setCurrentSlideIndex(0);

        const successCount = Object.keys(result.outputs).length;
        const errorCount = result.errors?.length || 0;
        toast({
          title: errorCount > 0 ? "Partially generated" : "Content generated!",
          description: errorCount > 0
            ? `${successCount} platform${successCount !== 1 ? 's' : ''} succeeded, ${errorCount} failed`
            : `Generated content for ${successCount} platform${successCount !== 1 ? 's' : ''}`,
        });
      } else {
        const errorMsg = result.errors?.map((e: any) => e.error || e.platform).join('; ')
          || 'No content was returned.';
        console.error('No usable outputs:', JSON.stringify(result, null, 2));
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      console.error('Generation error:', error);

      const isTimeout = error.name === 'AbortError';
      toast({
        title: isTimeout ? "Request timed out" : "Generation failed",
        description: isTimeout
          ? "The server took too long to respond. Please try again."
          : (error.message || "Please try again"),
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (content: string, platform: Platform) => {
    await navigator.clipboard.writeText(content);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  // New modal utilities
  const handleCopyContent = async (content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setGeneratedContentModal(prev => ({ ...prev, copiedItem: label }));
      setTimeout(() => setGeneratedContentModal(prev => ({ ...prev, copiedItem: null })), 2000);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
    } catch (error) {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleCopyAllContent = async () => {
    if (!generatedContentModal.data?.outputs) return;

    const outputs = generatedContentModal.data.outputs;
    let allContent = '';

    if (outputs.x?.tweets) {
      allContent += `=== X (TWITTER) ===\n${outputs.x.tweets.map((t, i) => `Tweet ${i + 1}:\n${t}`).join('\n\n')}\n\n`;
    }
    if (outputs.linkedin?.post) {
      allContent += `=== LINKEDIN ===\n${outputs.linkedin.post}\n\n`;
    }
    if (outputs.instagram_carousel) {
      allContent += `=== INSTAGRAM CAROUSEL ===\n`;
      allContent += `Slides:\n${outputs.instagram_carousel.slides.map((s, i) => `Slide ${i + 1}:\n${s}`).join('\n\n')}\n\n`;
      allContent += `Caption:\n${outputs.instagram_carousel.caption}\n\n`;
    }
    if (outputs.short_video) {
      allContent += `=== SHORT VIDEO ===\nScript:\n${outputs.short_video.script}\n\nBeats:\n${outputs.short_video.beats.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n`;
    }

    await handleCopyContent(allContent, "All content");
  };

  const handleExportJSON = () => {
    if (!generatedContentModal.data) return;
    const blob = new Blob([JSON.stringify(generatedContentModal.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-alchemist-${generatedContentModal.data.runId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Content exported as JSON" });
  };

  const handleExportMarkdown = () => {
    if (!generatedContentModal.data) return;
    const outputs = generatedContentModal.data.outputs;
    let markdown = `# Generated Content\n\n---\n\n`;

    if (outputs.x?.tweets) {
      markdown += `## X (Twitter Thread)\n\n${outputs.x.tweets.map((t, i) => `### Tweet ${i + 1}\n\n${t}\n`).join('\n')}\n---\n\n`;
    }
    if (outputs.linkedin?.post) {
      markdown += `## LinkedIn Post\n\n${outputs.linkedin.post}\n\n---\n\n`;
    }
    if (outputs.instagram_carousel) {
      markdown += `## Instagram Carousel\n\n### Slides\n\n${outputs.instagram_carousel.slides.map((s, i) => `**Slide ${i + 1}**\n\n${s}\n`).join('\n')}\n\n### Caption\n\n${outputs.instagram_carousel.caption}\n\n---\n\n`;
    }
    if (outputs.short_video) {
      markdown += `## Short Video\n\n### Script\n\n${outputs.short_video.script}\n\n### Beats\n\n${outputs.short_video.beats.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-alchemist-${generatedContentModal.data.runId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Content exported as Markdown" });
  };

  // Count available output tabs
  const getAvailableTabs = () => {
    if (!generatedContentModal.data?.outputs) return [];
    const outputs = generatedContentModal.data.outputs;
    const tabs: string[] = [];
    // Only include platforms with valid, renderable data (not error objects)
    if (outputs.x?.tweets?.length) tabs.push('x');
    if (outputs.linkedin?.post) tabs.push('linkedin');
    if (outputs.instagram_carousel?.slides?.length && outputs.instagram_carousel?.caption !== undefined) tabs.push('instagram_carousel');
    if (outputs.short_video?.script && outputs.short_video?.beats?.length) tabs.push('short_video');
    return tabs;
  };

  // Get dynamic modal headline
  const getModalHeadline = () => {
    const tabs = getAvailableTabs();
    if (tabs.length === 0) return "Generation Complete";
    if (tabs.length === 1) {
      const config = modalPlatformConfigs[tabs[0]];
      return config?.headline || "Your Content is Ready";
    }
    return "Crafted & Ready to Publish";
  };

  // Get dynamic subheadline
  const getModalSubheadline = () => {
    const tabs = getAvailableTabs();
    if (tabs.length === 0) return "";
    const platformNames = tabs.map(t => modalPlatformConfigs[t]?.label || t).join(', ');
    return `${tabs.length} platform${tabs.length > 1 ? 's' : ''} generated: ${platformNames}`;
  };

  const canGenerate = sourceContent.trim().length > 0 && selectedPlatforms.length > 0 && selectedVoice;

  // Step completion state for progress
  const step1Done = !!selectedVoice;
  const step2Done = selectedPlatforms.length > 0;
  const step3Done = !!sourceContent.trim();
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />

      {/* Floating Gradient Orbs */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(21, 58%, 53%) 0%, transparent 70%)',
          animation: 'floatOrb1 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(26, 47%, 70%) 0%, transparent 70%)',
          animation: 'floatOrb2 25s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(47, 59%, 80%) 0%, transparent 70%)',
          animation: 'floatOrb3 18s ease-in-out infinite',
        }}
      />

      {/* Inline keyframes for orbs */}
      <style>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.05); }
          66% { transform: translate(20px, -30px) scale(0.95); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -20px) scale(1.08); }
          66% { transform: translate(-20px, 30px) scale(0.92); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 25px) scale(1.1); }
        }
        @keyframes shimmerGlow {
          0%, 100% { box-shadow: 0 0 15px hsl(21, 58%, 53%, 0.3), 0 0 30px hsl(26, 47%, 70%, 0.15); }
          50% { box-shadow: 0 0 25px hsl(21, 58%, 53%, 0.5), 0 0 50px hsl(26, 47%, 70%, 0.25); }
        }
        @keyframes progressPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 hsl(21, 58%, 53%, 0.4); }
          50% { transform: scale(1.15); box-shadow: 0 0 0 6px hsl(21, 58%, 53%, 0); }
        }
        @keyframes slideContent {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header - Fixed Height with glassmorphism */}
      <header className="shrink-0 h-16 border-b border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-md shadow-elegant relative z-10">
        <div className="h-full flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div
              className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              style={{ animation: 'shimmerGlow 3s ease-in-out infinite' }}
            >
              <Wand2 className="h-5 w-5 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Social Alchemist</h1>
              <p className="text-xs text-muted-foreground">Transform content across platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Completion indicator in header */}
            <div className="hidden md:flex items-center gap-1.5 mr-3 px-3 py-1.5 rounded-full bg-white/60 dark:bg-card/60 backdrop-blur-sm border border-border/50">
              {[step1Done, step2Done, step3Done].map((done, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    done ? "w-6 bg-gradient-to-r from-primary to-accent" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent/20 hover:scale-110 transition-all duration-300">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Calculated Height to prevent overflow */}
      <main className="flex-1 min-h-0 relative z-10">
        <div className="h-full px-6 py-5">
          <div className="h-full grid grid-cols-[420px,1fr] gap-5">

            {/* Left Panel - Controls with glassmorphism */}
            <div className="flex flex-col gap-3 bg-white/70 dark:bg-card/70 backdrop-blur-xl border border-white/50 dark:border-border/50 rounded-2xl p-5 shadow-elegant hover:shadow-xl transition-all duration-500 relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none rounded-2xl" />

              {/* Progress Indicator - Enhanced */}
              <div className="relative flex items-center justify-center gap-0 mb-1">
                {/* Connecting line */}
                <div className="absolute top-1/2 left-[calc(50%-48px)] w-24 h-[2px] bg-muted rounded-full -translate-y-1/2" />
                <div
                  className="absolute top-1/2 left-[calc(50%-48px)] h-[2px] bg-gradient-to-r from-primary to-accent rounded-full -translate-y-1/2 transition-all duration-700"
                  style={{ width: `${(completedSteps / 3) * 96}px` }}
                />
                {[step1Done, step2Done, step3Done].map((done, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative z-10 h-3 w-3 rounded-full transition-all duration-500 mx-5",
                      done
                        ? "bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/40"
                        : "bg-white dark:bg-card border-2 border-muted"
                    )}
                    style={done ? { animation: 'progressPulse 2s ease-in-out infinite', animationDelay: `${i * 0.3}s` } : undefined}
                  />
                ))}
              </div>
              <div className="text-center text-[11px] font-medium text-muted-foreground mb-1 relative z-10">
                {completedSteps === 3 && (
                  <span className="text-primary font-semibold inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Ready to generate
                  </span>
                )}
                {completedSteps < 3 && (
                  <span>
                    {!step1Done && "Select a voice profile to begin"}
                    {step1Done && !step2Done && "Choose target platforms"}
                    {step1Done && step2Done && !step3Done && "Add your source content"}
                  </span>
                )}
              </div>

              {/* Voice Selector */}
              <div className="space-y-1.5 relative z-10">
                <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Voice Profile
                  {selectedVoice && <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
                </Label>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="relative h-11 border-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300 font-medium rounded-xl">
                    <SelectValue placeholder="Select voice profile..." />
                  </SelectTrigger>
                  <SelectContent className="border-2 bg-popover/95 backdrop-blur-md">
                    {voices.map(voice => {
                      const Icon = voice.icon || User;
                      return (
                        <div key={voice.value} className="relative group/item">
                          <SelectItem value={voice.value} className="pr-10 py-2.5 cursor-pointer hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 transition-all duration-200 my-1 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-md group-hover/item:scale-110 transition-transform duration-200",
                                voice.color || 'from-gray-400 to-gray-500'
                              )}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{voice.label}</div>
                                <div className="text-xs text-muted-foreground">{voice.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                          {!voice.isDefault && (
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/20 transition-colors z-10"
                              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteVoice(voice.value); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <Separator className="my-1" />
                    <SelectItem value="create-voice-profile" className="py-2.5 cursor-pointer">
                      <div className="flex items-center gap-2.5 font-semibold text-sm text-primary">
                        <Sparkles className="h-5 w-5" />
                        Create Personal Voice
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-0.5 opacity-50" />

              {/* Target Platforms */}
              <div className="space-y-1.5 relative z-10">
                <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                  </div>
                  Target Platforms
                  {selectedPlatforms.length > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                      {selectedPlatforms.length}
                    </Badge>
                  )}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(platformConfigs) as Platform[]).map(platform => {
                    const config = platformConfigs[platform];
                    const Icon = config.icon;
                    const isSelected = selectedPlatforms.includes(platform);

                    return (
                      <button
                        key={platform}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all duration-300 relative group",
                          isSelected
                            ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10 scale-[1.03] shadow-lg shadow-primary/15"
                            : "border-border/80 bg-white/50 dark:bg-background/50 backdrop-blur-sm hover:border-primary/40 hover:bg-accent/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        onClick={() => togglePlatform(platform)}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 blur-sm opacity-50 -z-10"></div>
                        )}
                        <Checkbox checked={isSelected} className="h-4 w-4" />
                        <Icon className={cn("h-5 w-5 group-hover:scale-110 transition-transform duration-200", config.color)} />
                        <span className="text-xs font-semibold flex-1 text-left">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="my-0.5 opacity-50" />

              {/* Source Type */}
              <div className="space-y-1.5 relative z-10">
                <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Source Type
                </Label>
                <RadioGroup value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "paste", icon: FileText, label: "Paste Text" },
                      { value: "url", icon: LinkIcon, label: "URL" },
                      { value: "doc_id", icon: FileCode, label: "Doc ID" },
                      { value: "transcript", icon: Mic, label: "Transcript" },
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 p-2.5 cursor-pointer transition-all duration-300 group relative",
                          sourceType === value
                            ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10 scale-[1.02] shadow-md shadow-primary/15"
                            : "border-border/80 bg-white/50 dark:bg-background/50 backdrop-blur-sm hover:border-primary/40 hover:bg-accent/10 hover:scale-[1.02] hover:shadow-md"
                        )}
                        onClick={() => setSourceType(value as SourceType)}
                      >
                        <RadioGroupItem value={value} id={value} className="h-4 w-4" />
                        <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <Label htmlFor={value} className="text-xs font-semibold cursor-pointer">{label}</Label>
                      </button>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Generate Button */}
              <div className="mt-auto pt-2 relative z-10">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="relative w-full h-14 text-base font-bold bg-gradient-to-r from-primary via-primary/90 to-accent shadow-lg hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden group rounded-xl"
                  size="lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  {isGenerating ? (
                    <div className="relative z-10 flex items-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      <span className="animate-pulse">Generating...</span>
                    </div>
                  ) : (
                    <div className="relative z-10 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      Generate Content
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Panel - Content Input */}
            <div className="flex flex-col gap-4 border border-white/50 dark:border-border/50 rounded-2xl p-6 bg-white/70 dark:bg-card/70 backdrop-blur-xl shadow-elegant hover:shadow-xl transition-all duration-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none rounded-2xl"></div>
              {/* Decorative corner accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/[0.05] to-transparent rounded-bl-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/[0.05] to-transparent rounded-tr-[60px] pointer-events-none" />

              <Label className="text-base font-bold flex items-center gap-2.5 text-foreground relative z-10">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Content
                {sourceContent.trim() && <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto animate-in fade-in zoom-in duration-300" />}
              </Label>

              {(sourceType === "paste" || sourceType === "transcript") && (
                <Textarea
                  placeholder={
                    sourceType === "paste"
                      ? "Paste your long-form content here... articles, blog posts, newsletters, or any written content you want to repurpose."
                      : "Paste your video or audio transcript here..."
                  }
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="flex-1 resize-none font-mono text-sm border-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm focus:border-primary focus:shadow-lg focus:shadow-primary/10 transition-all duration-300 relative z-10 rounded-xl"
                />
              )}

              {sourceType === "url" && (
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="h-14 font-mono text-sm border-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm focus:border-primary focus:shadow-lg focus:shadow-primary/10 transition-all duration-300 relative z-10 rounded-xl"
                />
              )}

              {sourceType === "doc_id" && (
                <div className="space-y-2.5 relative z-10">
                  <Input
                    placeholder="doc-abc123-xyz"
                    value={sourceContent}
                    onChange={(e) => setSourceContent(e.target.value)}
                    className="h-14 font-mono text-sm border-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm focus:border-primary focus:shadow-lg focus:shadow-primary/10 transition-all duration-300 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Enter the ID of an existing document from your library
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Voice Profile Modal */}
      <Dialog open={voiceProfileModalOpen} onOpenChange={setVoiceProfileModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-background via-background to-primary/5 border-2 border-border/50 backdrop-blur-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent blur-lg opacity-50"></div>
                <Sparkles className="h-6 w-6 text-white relative z-10" />
              </div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Create Voice Profile</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Voice Name
              </Label>
              <Input
                placeholder="My Professional Voice"
                value={voiceProfileName}
                onChange={(e) => setVoiceProfileName(e.target.value)}
                className="h-11 border-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm focus:border-primary focus:shadow-lg focus:shadow-primary/10 transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Upload Articles
              </Label>
              <div className="relative border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer group overflow-hidden">
                <input
                  type="file"
                  id="voice-upload"
                  multiple
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <label htmlFor="voice-upload" className="cursor-pointer flex flex-col items-center gap-2 relative z-10">
                  <FileText className="h-12 w-12 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                  <div className="text-sm font-semibold group-hover:text-primary transition-colors duration-300">Click to upload articles</div>
                  <div className="text-xs text-muted-foreground">PDF or TXT files</div>
                </label>
              </div>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
                </Label>
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/60 dark:bg-muted/60 backdrop-blur-sm rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-300 group animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveFile(i)} className="h-8 w-8 p-0 hover:bg-destructive/20 transition-colors duration-300">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setVoiceProfileModalOpen(false)} className="flex-1 h-11 font-semibold border-2 hover:bg-accent/10 hover:border-accent/50 hover:scale-[1.02] transition-all duration-300">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVoiceProfile}
              disabled={!uploadedFiles.length || !voiceProfileName.trim() || isUploadingProfile}
              className="flex-1 h-11 font-semibold bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isUploadingProfile ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Profile</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== REVAMPED OUTPUT MODAL — TWO-PANEL LAYOUT ========== */}
      <Dialog
        open={generatedContentModal.open}
        onOpenChange={(open) => setGeneratedContentModal(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-6xl h-[92vh] md:h-[88vh] flex flex-col bg-white border border-[hsl(47,50%,90%)] shadow-xl p-0 gap-0 rounded-xl overflow-hidden">
          {generatedContentModal.data && (() => {
            const availableTabs = getAvailableTabs();
            const activeTab = generatedContentModal.activeTab;
            const data = generatedContentModal.data;

            // Helper to get content count label for sidebar
            const getContentCount = (tabKey: string): string => {
              if (tabKey === 'x' && data.outputs.x) return `${data.outputs.x.tweets.length} tweets`;
              if (tabKey === 'linkedin' && data.outputs.linkedin) return '1 post';
              if (tabKey === 'instagram_carousel' && data.outputs.instagram_carousel) return `${data.outputs.instagram_carousel.slides.length} slides`;
              if (tabKey === 'short_video' && data.outputs.short_video) return `${data.outputs.short_video.beats.length} beats`;
              return '';
            };

            return (
              <>
                {/* ===== HEADER ===== */}
                <div className="shrink-0 border-b border-[hsl(47,50%,90%)] bg-gradient-to-r from-[hsl(47,60%,98%)] to-white modal-header-animate">
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm modal-icon-spin">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-shimmer">Social Assets</h2>
                          <p className="text-xs text-muted-foreground">
                            {availableTabs.length} platform{availableTabs.length !== 1 ? 's' : ''} generated
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {data.runId && (
                          <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">
                            {data.runId.slice(0, 8)}
                          </span>
                        )}
                        <Badge
                          className={cn(
                            "text-xs font-medium",
                            data.status === 'succeeded' && "bg-success/10 text-success border-success/20",
                            data.status === 'partial_failure' && "bg-warning/10 text-warning border-warning/20",
                            data.status === 'failed' && "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {data.status === 'succeeded' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {data.status === 'partial_failure' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {data.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {data.status === 'succeeded' ? 'Ready' :
                           data.status === 'partial_failure' ? 'Partial' : 'Failed'}
                        </Badge>
                      </div>
                    </div>

                    {/* Summary pills */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {availableTabs.map(tabKey => {
                        const config = modalPlatformConfigs[tabKey];
                        if (!config) return null;
                        const Icon = config.icon;
                        return (
                          <div
                            key={tabKey}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium modal-pill-animate cursor-pointer hover:scale-105 transition-transform", config.badgeColor)}
                            style={{ animationDelay: `${availableTabs.indexOf(tabKey) * 100 + 200}ms` }}
                            onClick={() => {
                              setGeneratedContentModal(prev => ({ ...prev, activeTab: tabKey }));
                              setCurrentSlideIndex(0);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <Icon className="h-3 w-3" />
                            <span>{config.label}</span>
                          </div>
                        );
                      })}
                      {data.errors?.map(err => (
                        <div key={err.platform} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          <span>{err.platform}</span>
                        </div>
                      ))}
                    </div>

                    {/* Partial Failure Warning */}
                    {data.status === 'partial_failure' && (
                      <div className="mt-3 p-2.5 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Some platforms failed. You can still use the successful outputs below.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== MAIN BODY: SIDEBAR + CONTENT VIEWER ===== */}
                <div className="flex-1 flex min-h-0">
                  {/* Sidebar — hidden on mobile, replaced by horizontal scroll */}
                  <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[hsl(47,50%,92%)] bg-[hsl(47,50%,98.5%)] p-3 gap-2 overflow-y-auto">
                    {availableTabs.map(tabKey => {
                      const config = modalPlatformConfigs[tabKey];
                      if (!config) return null;
                      const Icon = config.icon;
                      const isActive = activeTab === tabKey;
                      return (
                        <button
                          key={tabKey}
                          onClick={() => {
                            setGeneratedContentModal(prev => ({ ...prev, activeTab: tabKey }));
                            setCurrentSlideIndex(0);
                          }}
                          className={cn(
                            "relative flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 group modal-sidebar-item",
                            isActive
                              ? "bg-white border border-[hsl(47,50%,88%)] sidebar-active-glow"
                              : "hover:bg-white/80 hover:shadow-sm border border-transparent"
                          )}
                          style={{ animationDelay: `${availableTabs.indexOf(tabKey) * 60 + 100}ms` }}
                        >
                          {/* Active accent bar */}
                          {isActive && (
                            <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b modal-accent-bar", config.gradient)} />
                          )}
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all",
                            isActive ? `bg-gradient-to-br ${config.gradient} shadow-sm` : "bg-[hsl(47,40%,94%)]"
                          )}>
                            <Icon className={cn("h-4 w-4", isActive ? "text-white" : config.accentColor)} />
                          </div>
                          <div className="min-w-0">
                            <div className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>{config.label}</div>
                            <div className="text-[11px] text-muted-foreground/70">{getContentCount(tabKey)}</div>
                          </div>
                        </button>
                      );
                    })}
                    {data.errors?.map(err => (
                      <div key={err.platform} className="flex items-center gap-3 p-3 rounded-xl opacity-40 cursor-not-allowed">
                        <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate text-muted-foreground">{err.platform}</div>
                          <div className="text-[11px] text-destructive/70">Failed</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile horizontal tab pills — shown only on mobile */}
                  <div className="flex md:hidden shrink-0 absolute top-[auto] z-10 w-full px-3 pt-1 pb-2 bg-white/90 backdrop-blur-sm border-b border-[hsl(47,50%,92%)]" style={{ position: 'sticky', top: 0 }}>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {availableTabs.map(tabKey => {
                        const config = modalPlatformConfigs[tabKey];
                        if (!config) return null;
                        const Icon = config.icon;
                        const isActive = activeTab === tabKey;
                        return (
                          <button
                            key={tabKey}
                            onClick={() => {
                              setGeneratedContentModal(prev => ({ ...prev, activeTab: tabKey }));
                              setCurrentSlideIndex(0);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                              isActive
                                ? `bg-gradient-to-r ${config.gradient} text-white shadow-sm`
                                : "bg-[hsl(47,40%,95%)] text-[hsl(15,30%,40%)] hover:bg-[hsl(47,45%,92%)]"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ===== CONTENT VIEWER ===== */}
                  <div className="flex-1 flex flex-col min-h-0 min-w-0">
                    {/* X (Twitter) Thread */}
                    {activeTab === 'x' && data.outputs.x && (
                      <>
                        <div className="shrink-0 px-5 py-3 border-b border-[hsl(47,50%,92%)] bg-[hsl(47,50%,99%)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-sm shadow-sky-200">
                                <Twitter className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-foreground">X Thread</h3>
                                <p className="text-xs text-muted-foreground">
                                  {data.outputs.x.tweets.length} tweets &middot; {data.outputs.x.tweets.reduce((sum, t) => sum + t.length, 0)} chars total
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyContent(data.outputs.x!.tweets.join('\n\n'), 'Entire thread')}
                              className="h-8 text-xs"
                            >
                              {generatedContentModal.copiedItem === 'Entire thread' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy All</>
                              )}
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="px-5 py-4">
                            {/* Thread with connector line */}
                            <div className="relative">
                              {/* Vertical thread connector */}
                              {data.outputs.x.tweets.length > 1 && (
                                <div className="absolute left-[19px] top-[48px] bottom-6 w-[2px] bg-gradient-to-b from-sky-300 via-sky-200 to-sky-100/0 rounded-full hidden md:block" />
                              )}
                              <div className="space-y-3">
                                {data.outputs.x.tweets.map((tweet, index) => (
                                  <div
                                    key={index}
                                    className="group relative flex gap-3 modal-content-animate"
                                    style={{ animationDelay: `${index * 60}ms` }}
                                  >
                                    {/* Number bubble */}
                                    <div className="hidden md:flex shrink-0 relative z-10">
                                      <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center shadow-sm number-bubble">
                                        <span className="text-xs font-bold text-white">{index + 1}</span>
                                      </div>
                                    </div>
                                    {/* Tweet card */}
                                    <div className="flex-1 p-3.5 rounded-xl border border-[hsl(47,50%,90%)] bg-white hover:border-sky-300 card-hover-lift">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="md:hidden h-5 w-5 rounded bg-sky-500 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-white">{index + 1}</span>
                                          </div>
                                          <span className={cn(
                                            "text-xs font-medium",
                                            tweet.length > 270 ? "text-destructive" : tweet.length > 250 ? "text-amber-600" : "text-muted-foreground"
                                          )}>
                                            {tweet.length}/280
                                          </span>
                                          {tweet.length > 270 && <AlertCircle className="h-3 w-3 text-destructive" />}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleCopyContent(tweet, `Tweet ${index + 1}`)}
                                          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          {generatedContentModal.copiedItem === `Tweet ${index + 1}` ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-success copy-success-bounce" />
                                          ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{tweet}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </>
                    )}

                    {/* LinkedIn Post */}
                    {activeTab === 'linkedin' && data.outputs.linkedin && (
                      <>
                        <div className="shrink-0 px-5 py-3 border-b border-[hsl(47,50%,92%)] bg-[hsl(47,50%,99%)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-[#0077B5] flex items-center justify-center shadow-sm shadow-blue-200">
                                <Linkedin className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-foreground">LinkedIn Post</h3>
                                <p className="text-xs text-muted-foreground">
                                  {data.outputs.linkedin.post.length} chars &middot; ~{Math.ceil(data.outputs.linkedin.post.split(/\s+/).length / 200)} min read
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyContent(data.outputs.linkedin!.post, 'LinkedIn post')}
                              className="h-8 text-xs"
                            >
                              {generatedContentModal.copiedItem === 'LinkedIn post' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy</>
                              )}
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="px-5 py-4">
                            <div className="max-w-2xl mx-auto border border-[hsl(47,50%,90%)] rounded-xl bg-white shadow-sm overflow-hidden modal-content-animate hover:shadow-md transition-shadow duration-300">
                              {/* Profile mock header */}
                              <div className="flex items-center gap-3 p-4 border-b border-[hsl(47,50%,92%)]">
                                <div className="h-12 w-12 rounded-full bg-[#0077B5] flex items-center justify-center ring-2 ring-blue-100">
                                  <User className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">Your Profile</div>
                                  <div className="text-xs text-muted-foreground">Just now &middot; Public</div>
                                </div>
                              </div>

                              {/* Post content */}
                              <div className="p-4">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {data.outputs.linkedin.post.split(/(\#\w+)/g).map((part, i) =>
                                    part.startsWith('#') ? (
                                      <span key={i} className="text-[#0077B5] font-semibold">{part}</span>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    )
                                  )}
                                </p>
                              </div>

                              {/* Character & word count bar */}
                              <div className="px-4 py-3 border-t border-[hsl(47,50%,92%)] bg-[hsl(47,50%,98%)] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className="text-xs text-muted-foreground">
                                    {data.outputs.linkedin.post.split(/\s+/).length} words
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ~{Math.ceil(data.outputs.linkedin.post.split(/\s+/).length / 200)} min read
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {data.outputs.linkedin.post.length} / 3,000
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </>
                    )}

                    {/* Instagram Carousel */}
                    {activeTab === 'instagram_carousel' && data.outputs.instagram_carousel && (
                      <>
                        <div className="shrink-0 px-5 py-3 border-b border-[hsl(47,50%,92%)] bg-[hsl(47,50%,99%)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-sm shadow-pink-200">
                                <Instagram className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-foreground">Instagram Carousel</h3>
                                <p className="text-xs text-muted-foreground">
                                  {data.outputs.instagram_carousel.slides.length} slides &middot; {data.outputs.instagram_carousel.caption.length} char caption
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const allSlides = data.outputs.instagram_carousel!.slides.join('\n\n---\n\n');
                                const caption = data.outputs.instagram_carousel!.caption;
                                handleCopyContent(`${allSlides}\n\n===CAPTION===\n${caption}`, 'All slides & caption');
                              }}
                              className="h-8 text-xs"
                            >
                              {generatedContentModal.copiedItem === 'All slides & caption' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3 mr-1" /> Copy All</>
                              )}
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="px-5 py-4 space-y-4">
                            {/* Slides grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {data.outputs.instagram_carousel.slides.map((slide, index) => (
                                <div
                                  key={index}
                                  className="group p-3.5 rounded-xl border border-[hsl(47,50%,90%)] bg-white hover:border-pink-300 card-hover-lift modal-content-animate"
                                  style={{ animationDelay: `${index * 60}ms` }}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-sm number-bubble">
                                        <span className="text-xs font-bold text-white">{index + 1}</span>
                                      </div>
                                      <span className="text-xs font-medium text-muted-foreground">Slide {index + 1}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleCopyContent(slide, `Slide ${index + 1}`)}
                                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      {generatedContentModal.copiedItem === `Slide ${index + 1}` ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success copy-success-bounce" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{slide}</p>

                                  {data.outputs.instagram_carousel!.altText[index] && (
                                    <div className="flex items-start gap-2 pt-2.5 mt-2.5 border-t border-[hsl(47,50%,92%)]">
                                      <ImageIcon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground italic">
                                        {data.outputs.instagram_carousel!.altText[index]}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Caption card */}
                            <div className="border border-[hsl(47,50%,90%)] rounded-xl bg-white p-4 shadow-sm modal-content-animate hover:shadow-md transition-shadow duration-300" style={{ animationDelay: '150ms' }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-pink-600" />
                                  <Label className="text-sm font-semibold">Caption</Label>
                                  <span className="text-[11px] text-muted-foreground">{data.outputs.instagram_carousel.caption.length} chars</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyContent(data.outputs.instagram_carousel!.caption, 'Caption')}
                                  className="h-7 px-2 text-xs"
                                >
                                  {generatedContentModal.copiedItem === 'Caption' ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1 text-success" /> Copied</>
                                  ) : (
                                    <><Copy className="h-3 w-3 mr-1" /> Copy</>
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {data.outputs.instagram_carousel.caption.split(/(\#\w+)/g).map((part, i) =>
                                  part.startsWith('#') ? (
                                    <span key={i} className="text-pink-600 font-semibold">{part}</span>
                                  ) : (
                                    <span key={i}>{part}</span>
                                  )
                                )}
                              </p>
                            </div>
                          </div>
                        </ScrollArea>
                      </>
                    )}

                    {/* Video Script */}
                    {activeTab === 'short_video' && data.outputs.short_video && (
                      <>
                        <div className="shrink-0 px-5 py-3 border-b border-[hsl(47,50%,92%)] bg-[hsl(47,50%,99%)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm shadow-orange-200">
                                <Video className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-foreground">Video Script</h3>
                                <p className="text-xs text-muted-foreground">
                                  {data.outputs.short_video.beats.length} beats &middot; {data.outputs.short_video.script.split(/\s+/).length} words
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const script = data.outputs.short_video!.script;
                                const beats = data.outputs.short_video!.beats.join('\n');
                                handleCopyContent(`${script}\n\n===BEATS===\n${beats}`, 'Script & beats');
                              }}
                              className="h-8 text-xs"
                            >
                              {generatedContentModal.copiedItem === 'Script & beats' ? (
                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Copied</>
                              ) : (
                                <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy All</>
                              )}
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1">
                          <div className="px-5 py-4 space-y-5">
                            {/* Script block */}
                            <div className="space-y-3" style={{ animation: 'slideContent 0.4s ease-out' }}>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                  <Type className="h-4 w-4 text-red-500" />
                                  Full Script
                                </Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyContent(data.outputs.short_video!.script, 'Script')}
                                  className="h-7 text-xs"
                                >
                                  {generatedContentModal.copiedItem === 'Script' ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Copied</>
                                  ) : (
                                    <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>
                                  )}
                                </Button>
                              </div>
                              <div className="rounded-xl border-l-4 border-l-orange-300 bg-gradient-to-br from-[hsl(47,60%,98.5%)] to-[hsl(25,50%,97.5%)] p-5 shadow-sm">
                                <p className="text-sm leading-[1.9] whitespace-pre-wrap font-medium">
                                  {data.outputs.short_video.script}
                                </p>
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[hsl(47,50%,92%)]">
                                  <span className="text-xs text-muted-foreground">{data.outputs.short_video.script.split(/\s+/).length} words</span>
                                  <span className="text-xs text-muted-foreground">~{Math.ceil(data.outputs.short_video.script.split(/\s+/).length / 150)} min speaking</span>
                                </div>
                              </div>
                            </div>

                            {/* Beats timeline */}
                            <div className="space-y-3">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-500" />
                                Beats Timeline
                              </Label>
                              <div className="relative">
                                {/* Vertical connector line */}
                                <div className="absolute left-[15px] top-8 bottom-4 w-[2px] bg-gradient-to-b from-orange-300 via-amber-200 to-amber-100/0 rounded-full" />
                                <div className="space-y-2.5">
                                  {data.outputs.short_video.beats.map((beat, index) => (
                                    <div
                                      key={index}
                                      className="relative flex gap-3 items-start"
                                      style={{ animation: 'slideContent 0.4s ease-out', animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
                                    >
                                      <div className="relative z-10 h-8 w-8 rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-400 flex items-center justify-center shadow-sm shrink-0 number-bubble">
                                        <span className="text-xs font-bold text-white">{index + 1}</span>
                                      </div>
                                      <div className="flex-1 p-3 rounded-xl border border-[hsl(47,50%,90%)] bg-white hover:border-orange-300 card-hover-lift">
                                        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Beat {index + 1}</span>
                                        <p className="text-sm leading-relaxed mt-1">{beat}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </>
                    )}

                    {/* Empty state — if no tab is selected (edge case) */}
                    {(!activeTab || !availableTabs.includes(activeTab)) && availableTabs.length > 0 && (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        Select a platform to view content
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== FOOTER ===== */}
                <div className="shrink-0 px-5 py-3 border-t border-[hsl(47,50%,90%)] bg-[hsl(47,50%,98.5%)] modal-footer-animate">
                  <div className="flex items-center gap-2.5">
                    <Button
                      onClick={handleCopyAllContent}
                      className="flex-1 h-10 font-semibold bg-gradient-to-r from-primary to-accent shadow-md hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.01] transition-all duration-200 rounded-lg modal-cta-glow"
                    >
                      {generatedContentModal.copiedItem === 'All content' ? (
                        <><CheckCircle2 className="h-4 w-4 mr-2 text-white" /> All Content Copied</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-2" /> Copy All Content</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportJSON}
                      className="h-10 px-4 font-medium rounded-lg hover:scale-[1.03] hover:shadow-sm transition-all duration-200"
                    >
                      <FileJson className="h-4 w-4 mr-1.5" />
                      JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportMarkdown}
                      className="h-10 px-4 font-medium rounded-lg hover:scale-[1.03] hover:shadow-sm transition-all duration-200"
                    >
                      <FileDown className="h-4 w-4 mr-1.5" />
                      Markdown
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-background via-background to-destructive/5 border-2 border-border/50 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              Delete Voice Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{voiceToDelete?.label}"</span>? This action cannot be undone and will permanently remove this voice profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVoice} className="h-11 font-semibold border-2 hover:bg-accent/10 hover:border-accent/50 hover:scale-[1.02] transition-all duration-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVoice}
              disabled={isDeletingVoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 font-semibold shadow-lg hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isDeletingVoice ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialAlchemist;
