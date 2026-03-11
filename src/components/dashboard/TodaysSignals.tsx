import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT, WEBHOOK_VOICE_PROFILE_CREATE } from "@/constants/webhooks";
import { type VoiceOption } from "@/constants/voices";
import { useVoices } from "@/contexts/VoicesContext";
import { Label } from "@/components/ui/label";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target, Loader2, Download, ArrowLeft, Edit, Sparkles, RotateCcw, Scissors, RefreshCw, X, Search, Briefcase, Lightbulb, Users, FileText, MessageSquare, Video, FileEdit, BookOpen, ScrollText, Palette, AlertCircle, BarChart3, Globe, CheckCircle2, User, Trash2, Link2, Wand2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScoutGptService } from "@/services/scoutGptService";
import { Signal } from "@/types/signals";
import { useToast } from "@/hooks/use-toast";

type CustomVoice = VoiceOption;

// ── Search suggestions & spell correction ──────────────────────────────────

const SEARCH_TOPICS = [
  { topic: "artificial intelligence", category: "Technology" },
  { topic: "machine learning", category: "Technology" },
  { topic: "ai", category: "Technology" },
  { topic: "tech", category: "Technology" },
  { topic: "data", category: "Technology" },
  { topic: "algorithms", category: "Technology" },
  { topic: "cybersecurity", category: "Technology" },
  { topic: "blockchain", category: "Technology" },
  { topic: "innovation", category: "Technology" },
  { topic: "digital transformation", category: "Technology" },
  { topic: "internet", category: "Technology" },
  { topic: "software", category: "Technology" },
  { topic: "business", category: "Business" },
  { topic: "career", category: "Business" },
  { topic: "startups", category: "Business" },
  { topic: "entrepreneurship", category: "Business" },
  { topic: "leadership", category: "Business" },
  { topic: "funding", category: "Business" },
  { topic: "marketing", category: "Business" },
  { topic: "strategy", category: "Business" },
  { topic: "enterprise", category: "Business" },
  { topic: "culture", category: "Society" },
  { topic: "society", category: "Society" },
  { topic: "community", category: "Society" },
  { topic: "equity", category: "Society" },
  { topic: "diversity", category: "Society" },
  { topic: "media", category: "Media" },
  { topic: "entertainment", category: "Media" },
  { topic: "music", category: "Media" },
  { topic: "hip hop", category: "Media" },
  { topic: "art", category: "Media" },
  { topic: "education", category: "Knowledge" },
  { topic: "research", category: "Knowledge" },
  { topic: "policy", category: "Knowledge" },
  { topic: "ethics", category: "Knowledge" },
  { topic: "science", category: "Knowledge" },
  { topic: "lifestyle", category: "Lifestyle" },
  { topic: "health", category: "Lifestyle" },
  { topic: "wellness", category: "Lifestyle" },
  { topic: "news", category: "Lifestyle" },
  { topic: "interviews", category: "Lifestyle" },
];

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
};

const getTopicSuggestions = (query: string) => {
  if (query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const startsWith = SEARCH_TOPICS.filter(s => s.topic.startsWith(q));
  const contains = SEARCH_TOPICS.filter(s => !s.topic.startsWith(q) && s.topic.includes(q));
  return [...startsWith, ...contains].slice(0, 6);
};

const getSpellCorrection = (query: string): string | null => {
  if (query.length < 3) return null;
  const q = query.toLowerCase().trim();
  if (SEARCH_TOPICS.some(s => s.topic.includes(q))) return null;
  let best: { topic: string; dist: number } | null = null;
  for (const { topic } of SEARCH_TOPICS) {
    const words = topic.split(' ');
    const dists = [levenshtein(q, topic), ...words.map(w => levenshtein(q, w))];
    const dist = Math.min(...dists);
    if (!best || dist < best.dist) best = { topic, dist };
  }
  const threshold = Math.max(2, Math.floor(q.length / 3));
  return best && best.dist <= threshold ? best.topic : null;
};

export const TodaysSignals = () => {
  const navigate = useNavigate();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState<{ [key: string]: boolean }>({});
  const [isLoadingAllSignals, setIsLoadingAllSignals] = useState(true);
  const [allSignalsModalOpen, setAllSignalsModalOpen] = useState(false);
  const [agentLinkModalOpen, setAgentLinkModalOpen] = useState(false);
  const [signalForLink, setSignalForLink] = useState<Signal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { voices, addVoice, removeVoice, updateVoice } = useVoices();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [voiceToDelete, setVoiceToDelete] = useState<CustomVoice | null>(null);
  const [isDeletingVoice, setIsDeletingVoice] = useState(false);
  const [modalMode, setModalMode] = useState<'form' | 'results'>('form');
  const [generatedContent, setGeneratedContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [isFilteringByTopic, setIsFilteringByTopic] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedArticleLength, setSelectedArticleLength] = useState("");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceProfileModalOpen, setVoiceProfileModalOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<CustomVoice | null>(null);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceDescription, setNewVoiceDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [voiceProfileName, setVoiceProfileName] = useState("");
  const { toast } = useToast();

  const outputTypes = [
    { value: "Article", label: "Article", icon: FileText, description: "In-depth written content", color: "from-blue-500 to-cyan-500", available: true },
    { value: "Tweet thread", label: "Tweet thread", icon: MessageSquare, description: "Threaded social posts", color: "from-sky-500 to-blue-500", available: true },
    { value: "Script", label: "Script", icon: Video, description: "Video or audio script", color: "from-purple-500 to-pink-500", available: true },
    { value: "Prompt", label: "Prompt", icon: Lightbulb, description: "AI prompt template", color: "from-yellow-500 to-orange-500", available: true }
  ];

  const articleLengths = [
    { value: "short", label: "Short", description: "500-700 words" },
    { value: "medium", label: "Medium", description: "700-1600 words" },
    { value: "long", label: "Long", description: "1600+ words" }
  ];

  const topicGroups = [
    {
      label: "Technology & Innovation",
      icon: Globe,
      color: "from-blue-500 to-cyan-500",
      topics: ["ai", "tech", "data", "algorithms", "digital", "internet", "network", "innovation"]
    },
    {
      label: "Business & Career",
      icon: Briefcase,
      color: "from-orange-500 to-amber-500",
      topics: ["business", "career", "startups", "funding", "enterprise", "entrepreneurship", "strategy", "leadership"]
    },
    {
      label: "Society & Culture",
      icon: Users,
      color: "from-purple-500 to-pink-500",
      topics: ["culture", "society", "community", "equity", "race", "women", "latinx", "public opinion", "history"]
    },
    {
      label: "Media & Entertainment",
      icon: Video,
      color: "from-rose-500 to-red-500",
      topics: ["media", "entertainment", "music", "hip hop", "art", "artists", "clubs"]
    },
    {
      label: "Knowledge & Research",
      icon: BookOpen,
      color: "from-emerald-500 to-teal-500",
      topics: ["education", "research", "data justice", "ethics", "policy", "investigations"]
    },
    {
      label: "Lifestyle & Personal",
      icon: Star,
      color: "from-indigo-500 to-purple-500",
      topics: ["life", "lifestyle", "beauty", "interviews", "process", "news"]
    }
  ];

  // Load signals on component mount — restore from database if a topic was saved
  useEffect(() => {
    loadTopicFromLocalStorage();
    initializeSignals();

    // Restore previously fetched signals from Supabase
    const restoreSignals = async () => {
      try {
        const saved = localStorage.getItem('user_signal_topic');
        if (saved && saved.trim()) {
          setIsLoadingAllSignals(true);
          const cached = await ScoutGptService.loadSignalsFromDatabase();
          if (cached.length > 0) {
            const sorted = [...cached].sort((a, b) => b.score - a.score);
            setSignals(sorted);
          }
        }
      } catch {
        // silent — user can re-search
      } finally {
        setIsLoadingAllSignals(false);
      }
    };
    restoreSignals();
  }, []);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Re-register signalsUpdated whenever topicSearch changes to avoid stale closure
  useEffect(() => {
    const handleSignalsUpdated = () => {
      if (topicSearch.trim()) {
        loadInitialSignals();
      }
    };
    window.addEventListener('signalsUpdated', handleSignalsUpdated);
    return () => window.removeEventListener('signalsUpdated', handleSignalsUpdated);
  }, [topicSearch]);

  // Listen for openAllSignalsModal custom event
  useEffect(() => {
    const handler = () => setAllSignalsModalOpen(true);
    window.addEventListener('openAllSignalsModal', handler);
    return () => window.removeEventListener('openAllSignalsModal', handler);
  }, []);

  const initializeSignals = () => {
    // Ready for user to search signals
    setIsLoadingAllSignals(false);
  };

  // Topic search management functions
  const loadTopicFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('user_signal_topic');
      if (saved) setTopicSearch(saved);
    } catch {
      // ignore
    }
  };

  const saveTopicToLocalStorage = (topic: string) => {
    try {
      localStorage.setItem('user_signal_topic', topic);
    } catch {
      // ignore
    }
  };

  const handleSearchWithTopic = async () => {
    if (!topicSearch.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to search for signals",
        variant: "destructive",
      });
      return;
    }

    saveTopicToLocalStorage(topicSearch);
    setIsFilteringByTopic(true);

    try {
      await loadInitialSignals();
    } catch (error) {
      const errorMessage = error.message || "Failed to search for signals";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");

      toast({
        title: isTimeout ? "Search Timed Out" : "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFilteringByTopic(false);
    }
  };

  const handleClearTopic = () => {
    setTopicSearch("");
    saveTopicToLocalStorage("");
    setSignals([]); // Clear signals instead of reloading
  };

  const loadInitialSignals = async () => {
    if (!topicSearch.trim()) {
      setIsLoadingAllSignals(false);
      return;
    }

    try {
      setIsLoadingAllSignals(true);

      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim());

      if (newSignals.length === 0) {
        toast({
          title: "No signals found",
          description: `No signals found for topic: ${topicSearch}`,
          variant: "destructive",
        });
        setSignals([]);
        return;
      }

      const sortedSignals = [...newSignals].sort((a, b) => b.score - a.score);
      setSignals(sortedSignals);

      toast({
        title: "Signals loaded",
        description: `Loaded ${newSignals.length} fresh signals for "${topicSearch}"`,
      });
    } catch (error) {
      setSignals([]);
      const errorMessage = error.message || "Failed to load signals";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");
      toast({
        title: isTimeout ? "Search Timed Out" : "Error Loading Signals",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
    }
  };

  const handleLoadMoreSignals = async () => {
    if (!topicSearch.trim()) {
      toast({
        title: "Topic required",
        description: "Please select a topic before loading signals",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingAllSignals(true);
      toast({ title: "Loading new signals...", description: "Fetching latest signals" });

      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim());
      const sortedSignals = [...newSignals].sort((a, b) => b.score - a.score);
      setSignals(sortedSignals);

      toast({ title: "Signals updated!", description: `Loaded ${newSignals.length} signals` });
    } catch (error) {
      const errorMessage = error.message || "Failed to load signals";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");
      toast({
        title: isTimeout ? "Search Timed Out" : "Error Loading Signals",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
    }
  };

  const openEditorialModal = (signal: Signal) => {
    setSelectedSignal(signal);
    setSelectedVoice("");
    setSelectedOutputType("");
    setSelectedArticleLength("");
    setModalMode('form');
    setGeneratedContent("");
    setEditableContent("");
    setIsProcessingAction("");
    setModalOpen(true);
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
      updateVoice(editingVoice.value, { label: newVoiceName, description: newVoiceDescription });
      if (selectedVoice === editingVoice.value) {
        setSelectedVoice(voiceValue);
      }
    } else {
      const newVoice: CustomVoice = {
        value: voiceValue,
        label: newVoiceName,
        description: newVoiceDescription,
        isDefault: false,
      };
      addVoice(newVoice);
      setSelectedVoice(voiceValue);
    }

    setVoiceModalOpen(false);
    setNewVoiceName("");
    setNewVoiceDescription("");
    setEditingVoice(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVoiceProfile = async () => {
    if (uploadedFiles.length === 0 || !voiceProfileName.trim()) return;

    setIsUploadingProfile(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({ title: "Authentication required", description: "Please log in to create a voice profile", variant: "destructive" });
        return;
      }

      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('voice_name', voiceProfileName.trim());
      formData.append('user_id', user.user.id);

      const response = await fetch(WEBHOOK_VOICE_PROFILE_CREATE, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        let voiceProfileId: string | undefined;
        try {
          const { data: voiceProfileData, error: dbError } = await supabase
            .from('voice_profiles')
            .insert({
              profile_name: voiceProfileName.trim(),
              style_json: result.style_json || { description: result.description || 'Custom voice profile' },
              samples: result.samples || [],
              user_id: user.user.id,
            })
            .select('id')
            .single();

          if (!dbError) {
            voiceProfileId = voiceProfileData?.id;
          }
        } catch {
          // non-fatal db error
        }

        const newVoice: CustomVoice = {
          value: `voice-${Date.now()}`,
          label: voiceProfileName,
          description: result.description || 'Custom voice profile',
          isDefault: false,
          userId: user.user.id,
          databaseId: voiceProfileId,
        };

        addVoice(newVoice);
        setSelectedVoice(newVoice.value);

        toast({ title: "Voice profile created!", description: "Your personal voice profile has been generated successfully" });

        setVoiceProfileModalOpen(false);
        setUploadedFiles([]);
        setVoiceProfileName("");
      } else {
        throw new Error('Failed to upload voice profile');
      }
    } catch {
      toast({ title: "Upload failed", description: "Failed to create voice profile. Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const sendToEditorial = async () => {
    if (!selectedSignal || !selectedVoice || !selectedOutputType) return;

    setIsSubmitting(true);

    try {
      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const baseOutputType = selectedOutputType.startsWith('Article-') ? 'Article' : selectedOutputType;
      const articleLength = selectedOutputType.startsWith('Article-') ? selectedOutputType.replace('Article-', '') : selectedArticleLength;

      const payload: any = {
        voice_name: voiceDetails?.label || selectedVoice,
        signal: {
          headline: selectedSignal.headline,
          summary: selectedSignal.summary
        },
        output_type: baseOutputType
      };

      if (articleLength) {
        payload.article_length = articleLength;
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
        setFullResponse(result);
        const formattedContent = formatResponseData(result);

        // Store generated content but don't show modal
        setGeneratedContent(formattedContent);
        setEditableContent(formattedContent);

        // Also save to database as draft
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const voiceName = voices.find(v => v.value === selectedVoice)?.label || selectedVoice;
            const { error, data } = await supabase
              .from('content_outputs')
              .insert({
                user_id: user.user.id,
                title: `${selectedOutputType.replace('-', ' ')} about ${selectedSignal.headline.substring(0, 50)}`,
                content: formattedContent,
                persona: voiceName,
                output_type: selectedOutputType,
                status: 'draft',
                topic_context: selectedSignal.headline
              })
              .select();

            if (error) {
              // db save failed — content was generated but not persisted
            } else {
              toast({ title: "Content saved!", description: "Content has been added to your queue as draft" });

              setModalOpen(false);
              window.dispatchEvent(new CustomEvent('statsRefresh'));

              if (data && data.length > 0) {
                const contentId = data[0].id;
                window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('openDraftModal', { detail: { id: contentId } }));
                }, 500);
              }
            }
          }
        } catch {
          // db save failed — non-critical
        }
      } else {
        toast({ title: `Send failed (${response.status})`, description: response.statusText, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Network error', description: error instanceof Error ? error.message : 'Request failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedSignal || !editableContent) return;

    setIsProcessingAction(action);

    try {
      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const response = await fetch(WEBHOOK_EDITORIAL_GPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_name: voiceDetails?.label || selectedVoice,
          signal: {
            headline: selectedSignal.headline,
            summary: selectedSignal.summary
          },
          output_type: selectedOutputType,
          content: editableContent,
          quick_action: action
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEditableContent(formatResponseData(result));
      }
    } catch {
      // quick action failed silently
    } finally {
      setIsProcessingAction("");
    }
  };

  const downloadContent = (format: 'txt' | 'md') => {
    if (!editableContent || !selectedSignal) return;

    const filename = `${selectedSignal.headline.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    const blob = new Blob([editableContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatResponseData = (response: any) => {
    if (!response) return "";

    let data = Array.isArray(response) && response.length > 0 ? response[0] : response;

    // If we have text_output, format it beautifully
    if (data.text_output) {
      return formatTextOutput(data.text_output, data);
    }

    // Fallback to old format handling with improved formatting
    let formatted = "";

    // Header with signal context
    formatted += `# 🎯 **Generated Content**\n\n`;
    formatted += `> *Created by ${data.persona || 'AI Assistant'} • ${data.output_type || 'Content'} • ${new Date().toLocaleDateString()}*\n\n`;
    formatted += `---\n\n`;

    // Title/Headline
    if (data.headline) {
      formatted += `## 📰 **Headline**\n\n**${data.headline}**\n\n---\n\n`;
    }

    // Main Content
    if (data.content_markdown) {
      formatted += `## 📝 **Main Content**\n\n${data.content_markdown}\n\n---\n\n`;
    }

    // TLDR
    if (data.tldr) {
      formatted += `## ⚡ **TL;DR**\n\n**Key Takeaway:** ${data.tldr}\n\n---\n\n`;
    }

    // Caption
    if (data.caption) {
      formatted += `## 💬 **Social Caption**\n\n${data.caption}\n\n---\n\n`;
    }

    // If no main content sections found, show all available fields
    if (!data.headline && !data.content_markdown && !data.tldr && !data.caption && !data.text_output) {
      formatted += `## 📋 **Full Response**\n\n`;
      Object.entries(data).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        if (typeof value === 'string') {
          formatted += `**${formattedKey}:** ${value}\n\n`;
        } else {
          formatted += `**${formattedKey}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
        }
      });
    } else if (!data.text_output) {
      // Metadata footer
      formatted += `## 📊 **Generation Details**\n\n`;
      if (data.persona) formatted += `👤 **Persona:** ${data.persona}\n\n`;
      if (data.output_type) formatted += `📄 **Output Type:** ${data.output_type}\n\n`;
      if (data.slug) formatted += `🔗 **Slug:** ${data.slug}\n\n`;
      if (data.created_at) formatted += `📅 **Created:** ${new Date(data.created_at).toLocaleString()}\n\n`;
    }

    return formatted;
  };

  const formatTextOutput = (textOutput: string, metadata: any) => {
    // Enhanced formatting for better readability
    let formatted = textOutput;

    // Add header if not present
    if (!formatted.startsWith('#')) {
      formatted = `# 🎯 **Generated Content**\n\n${formatted}`;
    }

    // Add metadata footer if available
    if (metadata) {
      formatted += `\n\n---\n\n`;
      formatted += `### 📊 **Generation Details**\n\n`;
      if (metadata.persona) formatted += `👤 **Persona:** ${metadata.persona}  \n`;
      if (metadata.output_type) formatted += `📄 **Output Type:** ${metadata.output_type}  \n`;
      if (metadata.created_at) formatted += `📅 **Created:** ${new Date(metadata.created_at).toLocaleString()}  \n`;
      formatted += `🤖 **Generated with SOLE AI**`;
    }

    // Enhance formatting with better structure
    formatted = formatted
      // Make headers more prominent
      .replace(/^## /gm, '## 🔹 **')
      .replace(/^### /gm, '### 💫 **')
      // Close bold headers
      .replace(/^(#{2,3} [🔹💫] \*\*[^*]+)\*\*/gm, '$1**')
      // Enhance bullet points
      .replace(/^- /gm, '✅ ')
      .replace(/^\* /gm, '⭐ ')
      // Add spacing around sections
      .replace(/^(#{1,3})/gm, '\n$1')
      // Clean up extra newlines
      .replace(/\n{3,}/g, '\n\n');

    return formatted;
  };

  const goBackToForm = () => {
    setModalMode('form');
    setSelectedVoice("");
    setSelectedOutputType("");
    setSelectedArticleLength("");
    setGeneratedContent("");
    setEditableContent("");
    setIsProcessingAction("");
    setFullResponse(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-3 w-3 text-yellow-500" />;
      case 2: return <Star className="h-3 w-3 text-orange-500" />;
      case 3: return <Target className="h-3 w-3 text-blue-500" />;
      default: return <div className="w-3 h-3 rounded-full bg-muted text-xs flex items-center justify-center font-bold">{rank}</div>;
    }
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span>Trending Signals</span>
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-sm">
            {isLoadingAllSignals ? '...' : signals.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-base">
          Priority signals ranked by relevance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Topic Filter Section */}
        <div className="relative mb-4 z-50">
          {/* Multi-layer glow effects */}
          <div className="absolute inset-0 -m-2 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/15 blur-2xl opacity-30 rounded-2xl" />

          {/* Main container */}
          <div className="relative bg-white/98 backdrop-blur-2xl rounded-2xl border-2 border-primary/20 p-4 shadow-[0_4px_20px_rgba(208,126,59,0.12),0_2px_8px_rgba(208,126,59,0.08)]">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 -z-10 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />

            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-primary">
                <Search className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Search by Topic</h3>
            </div>

            {/* Input section */}
            <div className="flex space-x-2 relative z-[60]">
              {/* Search Input with suggestions */}
              <div className="relative flex-1" ref={searchContainerRef}>
                <Input
                  value={topicSearch}
                  onChange={(e) => {
                    setTopicSearch(e.target.value);
                    setShowSuggestions(true);
                    setActiveSuggestionIndex(-1);
                  }}
                  onFocus={() => topicSearch.length >= 2 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    const suggestions = getTopicSuggestions(topicSearch);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveSuggestionIndex(i => Math.min(i + 1, suggestions.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveSuggestionIndex(i => Math.max(i - 1, -1));
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                      setActiveSuggestionIndex(-1);
                    } else if (e.key === 'Enter') {
                      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                        setTopicSearch(suggestions[activeSuggestionIndex].topic);
                        setShowSuggestions(false);
                        setActiveSuggestionIndex(-1);
                      } else if (topicSearch.trim()) {
                        setShowSuggestions(false);
                        handleSearchWithTopic();
                      }
                    }
                  }}
                  placeholder="Enter a topic to search..."
                  className="w-full bg-white border-2 border-primary/20 focus:border-primary/50 hover:border-primary/40 rounded-xl text-sm transition-all duration-300 px-4 py-2 pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

                {/* Suggestions dropdown */}
                {showSuggestions && topicSearch.length >= 2 && (() => {
                  const suggestions = getTopicSuggestions(topicSearch);
                  const correction = suggestions.length === 0 ? getSpellCorrection(topicSearch) : null;
                  if (suggestions.length === 0 && !correction) return null;
                  return (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-primary/20 rounded-xl shadow-[0_8px_24px_rgba(208,126,59,0.15)] z-[70] overflow-hidden">
                      {correction && (
                        <button
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors flex items-center gap-2 border-b border-border/40"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTopicSearch(correction);
                            setShowSuggestions(false);
                            setActiveSuggestionIndex(-1);
                          }}
                        >
                          <Search className="h-3.5 w-3.5 text-primary/50 flex-shrink-0" />
                          <span className="text-muted-foreground">Did you mean </span>
                          <span className="font-semibold text-primary">{correction}</span>
                          <span className="text-muted-foreground">?</span>
                        </button>
                      )}
                      {suggestions.map((s, i) => (
                        <button
                          key={s.topic}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                            i === activeSuggestionIndex ? 'bg-primary/10' : 'hover:bg-primary/5'
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTopicSearch(s.topic);
                            setShowSuggestions(false);
                            setActiveSuggestionIndex(-1);
                          }}
                        >
                          <Search className="h-3.5 w-3.5 text-primary/40 flex-shrink-0" />
                          <span className="flex-1 capitalize">{s.topic}</span>
                          <span className="text-[10px] font-medium text-primary/50 bg-primary/8 px-2 py-0.5 rounded-full">{s.category}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {topicSearch && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearTopic}
                  className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-xl px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSearchWithTopic}
                disabled={isFilteringByTopic || !topicSearch.trim()}
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300 rounded-xl px-4"
              >
                {isFilteringByTopic ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Helper text */}
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              {!topicSearch.trim()
                ? "Enter any topic to search for trending signals"
                : `Ready to search for "${topicSearch}"`
              }
            </p>
          </div>
        </div>


        {isLoadingAllSignals ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-base font-medium text-foreground">Discovering trending signals...</p>
              <p className="text-sm text-muted-foreground">
                {topicSearch ? `Analyzing signals about "${topicSearch}"` : 'Scanning the latest conversations and trends'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">This usually takes 30-60 seconds</p>
            </div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 rounded-full"></div>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-lg">
                  <Search className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Discover Trending Signals
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Enter any topic in the search bar above to discover the latest trending signals and conversations. Scout GPT will analyze and rank the most relevant content for you.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                <span>Ready to search</span>
              </div>
            </div>
          </div>
        ) : (
          // Always display only top 3 signals in main view
          signals.slice(0, 3).map((signal) => (
          <div key={signal.id} className="group relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:border-primary/30">
            {/* Compact Rank */}
            <div className="absolute -top-1 -left-1 bg-background border border-primary rounded-full p-1">
              {getRankIcon(signal.rank)}
            </div>
            
            <div className="flex justify-between items-start mb-3 pl-4">
              <div className="flex-1 pr-3">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {signal.headline}
                  </h3>
                  <Badge className={`text-sm ${getPriorityColor(signal.priority)}`}>
                    {signal.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {signal.summary}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{signal.score}</div>
                <div className="text-sm text-success">{signal.engagement}</div>
              </div>
            </div>

            {/* Compact Tags */}
            <div className="flex flex-wrap gap-1 mb-3 pl-4">
              {signal.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm px-2 py-1 bg-accent/10 text-accent-foreground">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Compact Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border pl-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {signal.timestamp && signal.timestamp !== 'recently' && signal.timestamp !== 'now' && (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>{signal.timestamp}</span>
                    <span>•</span>
                  </>
                )}
                <span>{signal.source}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-sm px-3 py-2 h-8"
                  onClick={() => openEditorialModal(signal)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Generate Content
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-primary/10 hover:text-primary text-sm px-2 py-2 h-8"
                  title="Send to agent"
                  onClick={() => { setSignalForLink(signal); setAgentLinkModalOpen(true); }}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          ))
        )}

        {/* View All Signals Button */}
        {signals.length > 0 && !isLoadingAllSignals && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-accent hover:text-accent-foreground hover:bg-accent/10 mt-2 py-2"
            onClick={() => setAllSignalsModalOpen(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View All Signals ({signals.length})
          </Button>
        )}
      </CardContent>

      {/* Editorial Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={`${modalMode === 'results' ? "sm:max-w-4xl" : "sm:max-w-md"} bg-gradient-card border-border/50 shadow-elegant`}>
          <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-bold text-primary">
              {modalMode === 'form' ? 'Generate Content' : 'Generated Content'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {modalMode === 'form'
                ? <>Configure content generation for: <strong className="text-foreground">{selectedSignal?.headline}</strong></>
                : <>
                    Generated by <strong className="text-primary">{voices.find(v => v.value === selectedVoice)?.label || selectedVoice}</strong> as <strong className="text-accent">{selectedOutputType}</strong> for: <strong className="text-foreground">{selectedSignal?.headline}</strong>
                  </>
              }
            </DialogDescription>
          </DialogHeader>

          {modalMode === 'form' ? (
            <div className="space-y-6 py-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedVoice ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedOutputType ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
              </div>
              <div className="text-center text-xs text-muted-foreground mb-4">
                {!selectedVoice && "Start by selecting a voice"}
                {selectedVoice && !selectedOutputType && "Great! Now choose an output type"}
                {selectedVoice && selectedOutputType && "Perfect! Ready to generate"}
              </div>

              {/* Voice Selection */}
              <div className="space-y-3 relative">
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-xl opacity-50 rounded-2xl" />
                <label className="text-sm font-semibold text-foreground flex items-center relative">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Select Voice
                  {selectedVoice && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
                </label>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02]">
                    <SelectValue placeholder="Select a voice...">
                      {selectedVoice && voices.find(v => v.value === selectedVoice)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                    {voices.map((voice) => {
                      const Icon = voice.icon || User;
                      return (
                        <div key={voice.value} className="relative group/item">
                          <SelectItem
                            value={voice.value}
                            className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-all duration-200 my-1 rounded-lg pr-16"
                          >
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
                              <button
                                type="button"
                                className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-destructive/20 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteVoice(voice.value);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <Separator className="my-2" />
                    <SelectItem value="create-voice-profile" className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-all duration-200 my-1 rounded-lg">
                      <div className="flex items-center gap-2 font-medium">
                        <Sparkles className="h-4 w-4" />
                        <span>Create Personal Voice</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Output Type Selection */}
              <div className="space-y-3 relative">
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 blur-xl opacity-50 rounded-2xl" />
                <label className="text-sm font-semibold text-foreground flex items-center relative">
                  <FileText className="h-4 w-4 mr-2 text-accent" />
                  Select Output Type
                  {selectedOutputType && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
                </label>
                <Select
                  value={selectedOutputType.startsWith('Article-') ? 'Article' : selectedOutputType}
                  onValueChange={(value) => {
                    if (value === 'Article') {
                      setSelectedOutputType('Article');
                      setSelectedArticleLength("");
                      return;
                    }
                    setSelectedOutputType(value);
                    setSelectedArticleLength("");
                  }}
                >
                  <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-accent/20 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:scale-[1.02]">
                    <SelectValue placeholder="Choose output type...">
                      {selectedOutputType && (
                        selectedOutputType.startsWith('Article-')
                          ? `Article - ${articleLengths.find(l => l.value === selectedOutputType.replace('Article-', ''))?.label}`
                          : outputTypes.find(t => t.value === selectedOutputType)?.label
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                    {outputTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          disabled={!type.available}
                          className="hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 cursor-pointer transition-all duration-200 my-1 rounded-lg group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
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

                {/* Article Size Selection */}
                {(selectedOutputType === 'Article' || selectedOutputType.startsWith('Article-')) && (
                  <div className="flex gap-2 animate-in slide-in-from-top duration-300 relative z-10">
                    {articleLengths.map((length) => {
                      const articleValue = `Article-${length.value}`;
                      const isSelected = selectedOutputType === articleValue;
                      return (
                        <button
                          key={length.value}
                          type="button"
                          onClick={() => {
                            setSelectedOutputType(articleValue);
                            setSelectedArticleLength(length.value);
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all duration-300 relative z-10 ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-md'
                              : 'border-border hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          <div className="text-sm font-semibold">{length.label}</div>
                          <div className="text-xs text-muted-foreground">{length.description}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center">
                    <Edit className="h-4 w-4 mr-1 text-primary" />
                    Generated Content
                  </label>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadContent('txt')}
                      className="text-xs bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary/70 hover:shadow-md transition-all duration-200 font-medium"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      .txt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadContent('md')}
                      className="text-xs bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:border-accent/70 hover:shadow-md transition-all duration-200 font-medium"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      .md
                    </Button>
                  </div>
                </div>
                <div className="h-[300px] font-mono text-sm bg-gradient-surface border border-border/50 rounded-md p-3 select-none overflow-auto whitespace-pre-wrap">
                  {editableContent || "Generated content will appear here..."}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quick Actions</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAction('poeticize')}
                    disabled={isProcessingAction === 'poeticize' || !editableContent}
                    className="text-sm bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary/70 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    {isProcessingAction === 'poeticize' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Poeticize
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAction('rewrite')}
                    disabled={isProcessingAction === 'rewrite' || !editableContent}
                    className="text-sm bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:border-accent/70 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    {isProcessingAction === 'rewrite' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-1" />
                    )}
                    Rewrite
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAction('shorten')}
                    disabled={isProcessingAction === 'shorten' || !editableContent}
                    className="text-sm bg-warning/20 border-warning/50 text-warning hover:bg-warning/30 hover:border-warning/70 hover:shadow-md transition-all duration-200 font-medium"
                  >
                    {isProcessingAction === 'shorten' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Scissors className="h-4 w-4 mr-1" />
                    )}
                    Shorten
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-gradient-surface border-t border-border/30 pt-4">
            {modalMode === 'form' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="bg-muted/20 border-muted/50 hover:bg-muted/30 hover:border-muted/70 hover:shadow-md transition-all duration-200 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendToEditorial}
                  disabled={!selectedVoice || !selectedOutputType || isSubmitting}
                  className="bg-gradient-primary hover:shadow-glow hover:scale-105 transition-all duration-300 font-medium px-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={goBackToForm}
                  disabled={!!isProcessingAction}
                  className="bg-primary/20 border-primary/50 text-primary hover:bg-primary/30 hover:border-primary/70 hover:shadow-md transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  New Generation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={!!isProcessingAction}
                  className="bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:border-accent/70 hover:shadow-md transition-all duration-200 font-medium"
                >
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Signals Modal */}
      <Dialog open={allSignalsModalOpen} onOpenChange={setAllSignalsModalOpen}>
        <DialogContent className="sm:max-w-4xl bg-gradient-card border-border/50 shadow-elegant max-h-[80vh] overflow-hidden">
          <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-bold text-primary flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              All Trending Signals
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete list of {signals.length} signals ranked by score
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] py-4">
            <div className="space-y-3">
              {signals.map((signal) => (
                <div key={signal.id} className="group relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:border-primary/30">
                  {/* Compact Rank */}
                  <div className="absolute -top-1 -left-1 bg-background border border-primary rounded-full p-1">
                    {getRankIcon(signal.rank)}
                  </div>

                  <div className="flex justify-between items-start mb-3 pl-4">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {signal.headline}
                        </h3>
                        <Badge className={`text-sm ${getPriorityColor(signal.priority)}`}>
                          {signal.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {signal.summary}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{signal.score}</div>
                      <div className="text-sm text-success">{signal.engagement}</div>
                    </div>
                  </div>

                  {/* Compact Tags */}
                  <div className="flex flex-wrap gap-1 mb-3 pl-4">
                    {signal.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-sm px-2 py-1 bg-accent/10 text-accent-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Compact Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border pl-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {signal.timestamp && signal.timestamp !== 'recently' && signal.timestamp !== 'now' && (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>{signal.timestamp}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{signal.source}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-sm px-3 py-2 h-8"
                        onClick={() => {
                          setAllSignalsModalOpen(false);
                          openEditorialModal(signal);
                        }}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Generate Content
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-primary/10 hover:text-primary text-sm px-2 py-2 h-8"
                        title="Send to agent"
                        onClick={() => { setSignalForLink(signal); setAgentLinkModalOpen(true); }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="bg-gradient-surface border-t border-border/30 pt-4">
            <Button
              variant="outline"
              onClick={() => setAllSignalsModalOpen(false)}
              className="bg-muted/20 border-muted/50 hover:bg-muted/30 hover:border-muted/70 hover:shadow-md transition-all duration-200 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setAllSignalsModalOpen(false);
                handleLoadMoreSignals();
              }}
              disabled={isLoadingAllSignals}
              className="bg-gradient-primary hover:shadow-glow hover:scale-105 transition-all duration-300 font-medium px-6"
            >
              {isLoadingAllSignals ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load New Signals
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Link Modal */}
      <Dialog open={agentLinkModalOpen} onOpenChange={setAgentLinkModalOpen}>
        <DialogContent className="sm:max-w-sm bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Send to Agent
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground line-clamp-2">
              {signalForLink?.headline}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {/* Social Alchemist */}
            <button
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
              onClick={() => {
                setAgentLinkModalOpen(false);
                setAllSignalsModalOpen(false);
                navigate('/social-alchemist', {
                  state: {
                    signal: {
                      headline: signalForLink?.headline,
                      summary: signalForLink?.summary,
                      url: signalForLink?.url,
                    }
                  }
                });
              }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                <Wand2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">Social Alchemist</div>
                <div className="text-xs text-muted-foreground">Repurpose into social assets</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Open source URL if available */}
            {signalForLink?.url && (
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left group"
                onClick={() => {
                  window.open(signalForLink.url, '_blank', 'noopener,noreferrer');
                  setAgentLinkModalOpen(false);
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 shrink-0">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">Open Source</div>
                  <div className="text-xs text-muted-foreground truncate">{signalForLink.url}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            )}

            {/* Placeholder for future agents */}
            <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/50 opacity-40 cursor-not-allowed">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-muted-foreground">More agents</div>
                <div className="text-xs text-muted-foreground">Coming soon</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{voiceToDelete?.label}"? This action cannot be undone and will permanently remove this voice profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingVoice}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVoice}
              disabled={isDeletingVoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingVoice ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Voice Modal */}
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
              <Label htmlFor="signal-voice-name">Voice Name</Label>
              <Input
                id="signal-voice-name"
                placeholder="Enter voice name"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signal-voice-desc">Voice Description</Label>
              <Input
                id="signal-voice-desc"
                placeholder="Describe the voice style"
                value={newVoiceDescription}
                onChange={(e) => setNewVoiceDescription(e.target.value)}
                className="bg-background"
              />
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

      {/* Voice Profile Generation Modal */}
      <Dialog open={voiceProfileModalOpen} onOpenChange={setVoiceProfileModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Voice Profile Generation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload your articles to create a personalized voice profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signal-voice-profile-name">Name your voice</Label>
              <Input
                id="signal-voice-profile-name"
                placeholder="Name your voice..."
                value={voiceProfileName}
                onChange={(e) => setVoiceProfileName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Upload your articles</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" multiple accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" id="signal-voice-files" />
                <label htmlFor="signal-voice-files" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload articles</div>
                  <div className="text-xs text-muted-foreground">PDF or TXT files only</div>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-2 px-3">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="ml-2 text-destructive hover:text-destructive/80"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoiceProfileModalOpen(false); setUploadedFiles([]); setVoiceProfileName(""); }} disabled={isUploadingProfile}>Cancel</Button>
            <Button onClick={handleSubmitVoiceProfile} disabled={uploadedFiles.length === 0 || !voiceProfileName.trim() || isUploadingProfile} className="bg-gradient-primary hover:shadow-glow">
              {isUploadingProfile ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Generate Voice Profile</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};