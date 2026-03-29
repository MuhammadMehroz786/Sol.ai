import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EDITORIAL_GPT, WEBHOOK_VOICE_PROFILE_CREATE } from "@/constants/webhooks";
import { type VoiceOption } from "@/constants/voices";
import { useVoices } from "@/contexts/VoicesContext";
import { Label } from "@/components/ui/label";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target, Loader2, Download, ArrowLeft, Edit, Sparkles, RotateCcw, Scissors, RefreshCw, X, Search, Briefcase, Lightbulb, Users, FileText, MessageSquare, Video, FileEdit, BookOpen, ScrollText, Palette, AlertCircle, BarChart3, Globe, CheckCircle2, CheckCircle, User, Trash2, Link2, Wand2, Save, Send, FileDown, Shield, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScoutGptService } from "@/services/scoutGptService";
import { Signal } from "@/types/signals";
import { useToast } from "@/hooks/use-toast";
import { GeneratedContentModal, DEFAULT_GUARDRAILS, type Guardrails } from "@/components/dashboard/GeneratedContentModal";

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

// ── Reusable signal card ───────────────────────────────────────────────────
const SignalCard = ({
  signal,
  onOpen,
  onGenerate,
  onLink,
}: {
  signal: Signal;
  onOpen: () => void;
  onGenerate: () => void;
  onLink: () => void;
}) => {
  const priority = signal.priority as 'High' | 'Medium' | 'Low';

  const priorityMeta: Record<string, { bar: string; chip: string; dot: string }> = {
    High:   { bar: 'bg-red-400',     chip: 'text-red-600 bg-red-50 border-red-200',         dot: 'bg-red-400'     },
    Medium: { bar: 'bg-amber-400',   chip: 'text-amber-600 bg-amber-50 border-amber-200',   dot: 'bg-amber-400'   },
    Low:    { bar: 'bg-emerald-400', chip: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
  };
  const pm = priorityMeta[priority] ?? priorityMeta.Low;

  const scoreStyle =
    signal.score >= 80 ? 'bg-gradient-primary text-white shadow-primary/25 shadow-sm' :
    signal.score >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-300' :
    'bg-muted/60 text-muted-foreground border border-border';

  return (
    <div
      onClick={onOpen}
      className="group relative flex items-stretch rounded-2xl border border-border/70 bg-white hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Priority accent bar */}
      <div className={`w-[3px] shrink-0 ${pm.bar} opacity-75 group-hover:opacity-100 transition-opacity`} />

      {/* Main content */}
      <div className="flex-1 min-w-0 px-3.5 py-3">
        {/* Row 1: rank + headline + score */}
        <div className="flex items-start gap-2 mb-1.5">
          {/* Rank */}
          {signal.rank === 1 ? (
            <span className="shrink-0 mt-[1px] inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gradient-primary text-white shadow-sm">
              <Crown className="h-2.5 w-2.5" />#1
            </span>
          ) : (
            <span className="shrink-0 mt-[1px] text-[10px] font-black text-muted-foreground/45 min-w-[18px] text-center">
              #{signal.rank}
            </span>
          )}

          {/* Headline */}
          <h3 className="flex-1 text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-150">
            {signal.headline}
          </h3>

          {/* Score pill */}
          <div className={`shrink-0 ml-1 px-2 py-0.5 rounded-lg text-[11px] font-black tabular-nums ${scoreStyle}`}>
            {signal.score}
          </div>
        </div>

        {/* Row 2: summary */}
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-1 mb-2.5 pl-6">
          {signal.summary}
        </p>

        {/* Row 3: priority chip + tags + source */}
        <div className="flex items-center gap-1.5 pl-6 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0 ${pm.chip}`}>
            {priority}
          </span>

          {signal.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded-md font-medium capitalize">
              {tag}
            </span>
          ))}

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {signal.timestamp && signal.timestamp !== 'recently' && signal.timestamp !== 'now' && (
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />{signal.timestamp}
              </span>
            )}
            {signal.url ? (
              <a
                href={signal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-0.5"
              >
                <ExternalLink className="h-2.5 w-2.5" />{signal.source}
              </a>
            ) : signal.source ? (
              <span className="text-[10px] text-muted-foreground/50">{signal.source}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Actions column */}
      <div
        className="flex flex-col items-stretch justify-center gap-1.5 px-3 border-l border-border/40 shrink-0 min-w-[88px]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onGenerate}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-primary text-white text-[11px] font-bold hover:shadow-glow hover:scale-[1.03] active:scale-95 transition-all duration-150"
          title="Generate content from this signal"
        >
          <Zap className="h-3 w-3 shrink-0" />
          Generate
        </button>
        <button
          onClick={onLink}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/70 bg-card text-muted-foreground hover:bg-primary/8 hover:border-primary/25 hover:text-primary transition-all duration-150 text-[10px] font-semibold"
          title="Send to agent"
        >
          <Link2 className="h-3 w-3 shrink-0" />
          Link
        </button>
      </div>
    </div>
  );
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
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentModalData, setContentModalData] = useState<{
    id: string | null; title: string; content: string;
    persona: string; voiceId: string; outputType: string; topicContext: string; createdAt: string;
    guardrails: Guardrails;
  } | null>(null);
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS);
  const [showGuardrails, setShowGuardrails] = useState(false);
  const [trendingSignals, setTrendingSignals] = useState<Signal[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [signalMode, setSignalMode] = useState<'trending' | 'topic'>('trending');
  const [allSignalsModalSource, setAllSignalsModalSource] = useState<'trending' | 'topic'>('topic');
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
  const [signalDetailOpen, setSignalDetailOpen] = useState(false);
  const [detailSignal, setDetailSignal] = useState<Signal | null>(null);
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

  // Load signals on component mount
  useEffect(() => {
    loadTopicFromLocalStorage();
    initializeSignals();

    // ── Trending signals: auto-fetch once per login session ──
    const sessionKey = 'trending_fetched_this_session';
    const alreadyFetched = sessionStorage.getItem(sessionKey);

    if (!alreadyFetched) {
      setIsLoadingTrending(true);
      ScoutGptService.fetchAndSaveSignals('trending signals', 'trending')
        .then(fresh => {
          setTrendingSignals([...fresh].sort((a, b) => b.score - a.score));
          sessionStorage.setItem(sessionKey, '1');
        })
        .catch(() => {
          // fallback: load whatever is cached in DB
          ScoutGptService.loadSignalsFromDatabase('trending')
            .then(cached => {
              if (cached.length > 0) setTrendingSignals([...cached].sort((a, b) => b.score - a.score));
            })
            .catch(() => {});
        })
        .finally(() => setIsLoadingTrending(false));
    } else {
      ScoutGptService.loadSignalsFromDatabase('trending')
        .then(cached => {
          if (cached.length > 0) setTrendingSignals([...cached].sort((a, b) => b.score - a.score));
        })
        .catch(() => {})
        .finally(() => setIsLoadingTrending(false));
    }

    // ── Topic signals: restore from DB if a topic was saved ──
    const restoreTopicSignals = async () => {
      try {
        const saved = localStorage.getItem('user_signal_topic');
        if (saved && saved.trim()) {
          setIsLoadingAllSignals(true);
          const cached = await ScoutGptService.loadSignalsFromDatabase('topic');
          if (cached.length > 0) {
            setSignals([...cached].sort((a, b) => b.score - a.score));
          }
        }
      } catch {
        // silent — user can re-search
      } finally {
        setIsLoadingAllSignals(false);
      }
    };
    restoreTopicSignals();
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

  const handleRefreshTrending = async () => {
    setIsLoadingTrending(true);
    try {
      const fresh = await ScoutGptService.fetchAndSaveSignals('trending signals', 'trending');
      setTrendingSignals([...fresh].sort((a, b) => b.score - a.score));
      sessionStorage.setItem('trending_fetched_this_session', '1');
      toast({ title: "Trending signals refreshed", description: `Loaded ${fresh.length} fresh signals` });
    } catch (error) {
      toast({ title: "Refresh failed", description: error.message || "Could not refresh trending signals", variant: "destructive" });
    } finally {
      setIsLoadingTrending(false);
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

      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim(), 'topic');

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

      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim(), 'topic');
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

  const guardrailsCustomized = (
    guardrails.cultural_fluency !== DEFAULT_GUARDRAILS.cultural_fluency ||
    guardrails.verification_required !== DEFAULT_GUARDRAILS.verification_required ||
    guardrails.reading_level !== DEFAULT_GUARDRAILS.reading_level ||
    guardrails.empowerment_intensity !== DEFAULT_GUARDRAILS.empowerment_intensity ||
    guardrails.technical_depth !== DEFAULT_GUARDRAILS.technical_depth ||
    guardrails.storytelling_bias !== DEFAULT_GUARDRAILS.storytelling_bias
  );

  const sendToEditorial = async () => {
    if (!selectedSignal || !selectedVoice || !selectedOutputType) return;

    setIsSubmitting(true);

    try {
      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const baseOutputType = selectedOutputType.startsWith('Article-') ? 'article' : selectedOutputType.toLowerCase();
      const contentSize = selectedOutputType.startsWith('Article-') ? selectedOutputType.replace('Article-', '').toLowerCase() : selectedArticleLength.toLowerCase() || undefined;

      const payload: any = {
        topic: selectedSignal.headline,
        signal: {
          headline: selectedSignal.headline,
          summary: selectedSignal.summary
        },
        voice_id: selectedVoice,
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
        const voiceName = voices.find(v => v.value === selectedVoice)?.label || selectedVoice;
        const contentTitle = `${selectedOutputType.replace('-', ' ')} about ${selectedSignal.headline.substring(0, 50)}`;

        // Save to DB as draft
        let savedId: string | null = null;
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const { data, error } = await supabase
              .from('content_outputs')
              .insert({
                user_id: user.user.id,
                title: contentTitle,
                content: formattedContent,
                persona: voiceName,
                output_type: selectedOutputType,
                status: 'draft',
                topic_context: selectedSignal.headline
              })
              .select();

            if (!error && data && data.length > 0) {
              savedId = data[0].id;
              toast({ title: "Content saved!", description: "Draft added to your queue." });
              window.dispatchEvent(new CustomEvent('statsRefresh'));
              window.dispatchEvent(new CustomEvent('contentQueueRefresh'));
            }
          }
        } catch {
          // db save failed — non-critical, still show content
        }

        setContentModalData({
          id: savedId,
          title: contentTitle,
          content: formattedContent,
          persona: voiceName,
          voiceId: selectedVoice,
          outputType: selectedOutputType,
          topicContext: selectedSignal.headline,
          createdAt: new Date().toISOString(),
          guardrails,
        });
        setModalOpen(false);
        setContentModalOpen(true);
      } else {
        toast({ title: `Send failed (${response.status})`, description: response.statusText, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Network error', description: error instanceof Error ? error.message : 'Request failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
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


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive border-destructive/30";
      case "Medium": return "bg-warning/10 text-warning border-warning/30";
      default: return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case "High": return "border-l-destructive/50";
      case "Medium": return "border-l-warning/50";
      default: return "border-l-border";
    }
  };

  const getScorePillColor = (score: number) => {
    if (score >= 80) return "bg-primary/15 text-primary border-primary/30";
    if (score >= 60) return "bg-accent/15 text-accent-foreground border-accent/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gradient-primary text-white shrink-0">
        <Crown className="h-2.5 w-2.5" />#1
      </span>
    );
    return (
      <span className="text-[10px] font-bold text-muted-foreground shrink-0">#{rank}</span>
    );
  };

  const getScoreCircle = (score: number) => {
    if (score >= 80) return 'border-primary/50 text-primary bg-primary/8';
    if (score >= 60) return 'border-amber-400/50 text-amber-600 bg-amber-50';
    return 'border-border text-muted-foreground bg-muted/40';
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-sm">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span>Signals</span>
            {signalMode === 'trending' && trendingSignals.length > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                {trendingSignals.length}
              </span>
            )}
            {signalMode === 'topic' && signals.length > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                {signals.length}
              </span>
            )}
          </CardTitle>
          {signalMode === 'trending' && (
            <button
              onClick={handleRefreshTrending}
              disabled={isLoadingTrending}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary bg-transparent hover:bg-primary/8 border border-transparent hover:border-primary/20 px-2.5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingTrending ? 'animate-spin' : ''}`} />
              {isLoadingTrending ? 'Fetching…' : 'Refresh'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">

        {/* ── Mode Switch ── */}
        <div className="flex items-center bg-muted/35 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setSignalMode('trending')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              signalMode === 'trending'
                ? 'bg-white shadow-sm text-primary border border-primary/15'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            Trending
            {trendingSignals.length > 0 && signalMode !== 'trending' && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 ml-0.5" />
            )}
          </button>
          <button
            onClick={() => setSignalMode('topic')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              signalMode === 'topic'
                ? 'bg-white shadow-sm text-primary border border-primary/15'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            <Search className="h-3 w-3" />
            My Topic
            {signals.length > 0 && signalMode !== 'topic' && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 ml-0.5" />
            )}
          </button>
        </div>

        {/* ── Trending Panel ── */}
        {signalMode === 'trending' && (
          <div>
            {isLoadingTrending ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Scanning for signals…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Usually takes 30–60 seconds</p>
                </div>
              </div>
            ) : trendingSignals.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 rounded-full" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No signals yet</p>
                <p className="text-xs text-muted-foreground">Hit Refresh to fetch today's trending signals</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trendingSignals.slice(0, 3).map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onOpen={() => { setDetailSignal(signal); setSignalDetailOpen(true); }}
                    onGenerate={() => openEditorialModal(signal)}
                    onLink={() => { setSignalForLink(signal); setAgentLinkModalOpen(true); }}
                  />
                ))}
                {trendingSignals.length > 3 && (
                  <button
                    onClick={() => { setAllSignalsModalSource('trending'); setAllSignalsModalOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold text-primary hover:text-primary bg-primary/4 hover:bg-primary/8 rounded-xl transition-all duration-150 border border-dashed border-primary/20 hover:border-primary/35 group"
                  >
                    <BarChart3 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-150" />
                    View all {trendingSignals.length} trending signals
                    <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Topic Panel ── */}
        {signalMode === 'topic' && (
          <div>
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
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary/60" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Discovering signals...</p>
              <p className="text-xs text-muted-foreground">
                {topicSearch ? `Analyzing signals about "${topicSearch}"` : 'Scanning the latest conversations'}
              </p>
              <p className="text-xs text-muted-foreground">This usually takes 30–60 seconds</p>
            </div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 rounded-full" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-lg">
                  <Search className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Discover Trending Signals</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Type a topic above and we'll scan live conversations, rank what's gaining momentum, and surface the signals worth your attention.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Ready to search</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.slice(0, 3).map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onOpen={() => { setDetailSignal(signal); setSignalDetailOpen(true); }}
                onGenerate={() => openEditorialModal(signal)}
                onLink={() => { setSignalForLink(signal); setAgentLinkModalOpen(true); }}
              />
            ))}
            {signals.length > 3 && (
              <button
                onClick={() => { setAllSignalsModalSource('topic'); setAllSignalsModalOpen(true); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold text-primary bg-primary/4 hover:bg-primary/8 rounded-xl transition-all duration-150 border border-dashed border-primary/20 hover:border-primary/35 group"
              >
                <BarChart3 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform duration-150" />
                View all {signals.length} topic signals
                <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
              </button>
            )}
          </div>
        )}
          </div>
        )}
      </CardContent>

      {/* Editorial Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setShowGuardrails(false); }}>
        {/* hide the Dialog's built-in close button — we control close ourselves */}
        <DialogContent className="sm:max-w-lg bg-card border border-primary/25 shadow-2xl shadow-primary/15 ring-1 ring-primary/8 flex flex-col max-h-[90vh] p-0 gap-0 rounded-2xl overflow-hidden [&>button:last-child]:hidden">

          {/* ── Glow top bar ────────────────────────────────── */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-10" />
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

          {/* ── Header ─────────────────────────────────────── */}
          <div className="shrink-0 relative z-10 pt-1">
            <div className="px-5 pt-4 pb-4 border-b border-primary/15 bg-gradient-to-br from-card via-card to-primary/4">

              {/* Title row */}
              <div className="flex items-center gap-3">
                {showGuardrails ? (
                  <button
                    type="button"
                    onClick={() => setShowGuardrails(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50 shadow-sm transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4 text-primary" />
                  </button>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">
                    {showGuardrails ? 'AI Guardrails' : 'Generate Content'}
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                    {showGuardrails ? 'Fine-tune quality, tone & compliance' : 'Configure voice, format & guardrails'}
                  </p>
                </div>
                {/* Single close button */}
                <button
                  onClick={() => { setModalOpen(false); setShowGuardrails(false); }}
                  className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 bg-muted/30 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-all duration-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Signal preview chip — only on panel 1 */}
              {!showGuardrails && selectedSignal && (
                <div className="mt-3.5 flex items-start gap-3 pl-3 pr-3 py-3 rounded-xl bg-gradient-to-r from-primary/8 via-primary/5 to-accent/5 border border-primary/20 shadow-sm">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/20 mt-0.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground leading-snug line-clamp-2">
                      {selectedSignal.headline}
                    </p>
                    {selectedSignal.summary && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {selectedSignal.summary}
                      </p>
                    )}
                  </div>
                  {selectedSignal.score != null && (
                    <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-primary/12 border border-primary/25 shadow-sm">
                      <Star className="h-3 w-3 text-primary" />
                      <span className="text-[11px] font-extrabold text-primary leading-none">{selectedSignal.score}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar — only on panel 1 */}
              {!showGuardrails && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 flex gap-1.5">
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 shadow-sm ${selectedVoice ? 'bg-gradient-to-r from-primary to-primary/80 shadow-primary/30' : 'bg-muted/40'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 shadow-sm ${selectedOutputType ? 'bg-gradient-to-r from-accent to-primary/70 shadow-accent/30' : 'bg-muted/40'}`} />
                  </div>
                  <span className={`text-[10px] font-bold ml-1 transition-colors ${(!selectedVoice || !selectedOutputType) ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                    {!selectedVoice ? '① Pick voice' : !selectedOutputType ? '② Choose format' : '✓ Ready'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Sliding panel body ──────────────────────────── */}
          <div className="flex-1 overflow-hidden relative z-10">
            <div
              className="flex w-[200%] h-full transition-transform duration-300 ease-in-out"
              style={{ transform: showGuardrails ? 'translateX(-50%)' : 'translateX(0)' }}
            >

              {/* Panel 1 — Main form */}
              <div className="w-1/2 h-full overflow-y-auto px-5 py-5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-track]:transparent">

              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-0.5">
                  <div className="h-3.5 w-1 rounded-full bg-primary" />
                  <User className="h-3 w-3 text-primary" />
                  Voice Profile
                  {selectedVoice && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
                </label>
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
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-0.5">
                  <div className="h-3.5 w-1 rounded-full bg-accent" />
                  <FileText className="h-3 w-3 text-accent" />
                  Output Format
                  {selectedOutputType && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-500 animate-in fade-in zoom-in duration-300" />}
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
                  <SelectTrigger className="bg-background border-2 border-border/60 hover:border-accent/50 focus:border-accent hover:shadow-md hover:shadow-accent/8 transition-all duration-200 font-medium">
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
                          className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all duration-200 relative z-10 ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-md shadow-primary/15 scale-[1.02]'
                              : 'border-border/50 hover:border-primary/40 hover:bg-primary/4 bg-background'
                          }`}
                        >
                          <div className="text-sm font-bold">{length.label}</div>
                          <div className="text-[10px] text-muted-foreground">{length.description}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Guardrails entry row */}
              <button
                type="button"
                onClick={() => setShowGuardrails(true)}
                className="flex w-full items-center justify-between px-4 py-3.5 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/6 via-accent/4 to-primary/6 hover:from-primary/12 hover:to-accent/10 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/25 ring-1 ring-primary/20">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">AI Guardrails</span>
                      {guardrailsCustomized ? (
                        <Badge className="h-4 text-[9px] px-1.5 bg-primary/20 text-primary border border-primary/30 font-bold">Custom</Badge>
                      ) : (
                        <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-border/60 text-muted-foreground font-medium">Default</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium">
                      Grade {guardrails.reading_level} · {guardrails.empowerment_intensity} empowerment · {guardrails.technical_depth} depth
                    </p>
                  </div>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-primary/10 group-hover:border-primary/20 border border-transparent transition-all duration-200">
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors -rotate-90" />
                </div>
              </button>

              </div>{/* end panel 1 */}

              {/* Panel 2 — Guardrails */}
              <div className="w-1/2 h-full overflow-y-auto px-5 py-5 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/20 [&::-webkit-scrollbar-track]:transparent">

                {/* Toggle flags */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'cultural_fluency' as const, label: 'Cultural Fluency', desc: 'Adapt tone & references for cultural context', icon: Globe },
                    { key: 'verification_required' as const, label: 'Fact Verification', desc: 'Require source-backed claims in output', icon: CheckCircle2 },
                  ]).map(({ key, label, desc, icon: Icon }) => (
                    <div
                      key={key}
                      className={`flex flex-col gap-2.5 px-3.5 py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        guardrails[key]
                          ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-accent/6 shadow-md shadow-primary/10'
                          : 'border-border/40 bg-muted/15 hover:border-primary/25 hover:bg-muted/25'
                      }`}
                      onClick={() => setGuardrails(g => ({ ...g, [key]: !g[key] }))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors shadow-sm ${guardrails[key] ? 'bg-gradient-to-br from-primary to-accent shadow-primary/25' : 'bg-muted/60'}`}>
                          <Icon className={`h-3.5 w-3.5 ${guardrails[key] ? 'text-white' : 'text-muted-foreground/60'}`} />
                        </div>
                        <Switch checked={guardrails[key]} onCheckedChange={v => setGuardrails(g => ({ ...g, [key]: v }))} onClick={e => e.stopPropagation()} />
                      </div>
                      <div>
                        <div className={`text-[12px] font-bold leading-tight transition-colors ${guardrails[key] ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</div>
                        <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reading Level */}
                <div className="space-y-2.5 rounded-xl border border-border/40 bg-muted/10 px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <div className="h-3 w-0.5 rounded-full bg-primary mr-1" />
                      <BookOpen className="h-3 w-3 text-primary" />Reading Level
                    </Label>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{guardrails.reading_level}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {["5-6", "7-8", "9-10", "11-12", "college"].map(l => (
                      <button key={l} type="button"
                        onClick={() => setGuardrails(g => ({ ...g, reading_level: l }))}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold border-2 transition-all duration-200 ${
                          guardrails.reading_level === l
                            ? 'bg-gradient-to-b from-primary to-primary/80 text-white border-primary shadow-md shadow-primary/30 scale-[1.04]'
                            : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 bg-background'
                        }`}
                      >{l}</button>
                    ))}
                  </div>
                </div>

                {/* Intensity controls */}
                <div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 px-3.5 py-3">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <div className="h-3 w-0.5 rounded-full bg-accent mr-1" />
                    <SlidersHorizontal className="h-3 w-3 text-accent" />Intensity Controls
                  </Label>
                  {([
                    { key: 'empowerment_intensity' as const, label: 'Empowerment', icon: Target },
                    { key: 'technical_depth' as const, label: 'Technical Depth', icon: BarChart3 },
                    { key: 'storytelling_bias' as const, label: 'Storytelling Bias', icon: BookOpen },
                  ]).map(({ key, label, icon: Icon }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-primary/60 shrink-0" />
                        <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
                        <span className="ml-auto text-[10px] font-bold text-primary capitalize bg-primary/8 px-1.5 py-0.5 rounded">{guardrails[key]}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {["low", "medium", "high"].map(level => (
                          <button key={level} type="button"
                            onClick={() => setGuardrails(g => ({ ...g, [key]: level }))}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border-2 capitalize transition-all duration-200 ${
                              guardrails[key] === level
                                ? level === 'low'
                                  ? 'bg-muted text-foreground border-border shadow-sm scale-[1.03]'
                                  : level === 'medium'
                                    ? 'bg-amber-500/15 text-amber-600 border-amber-400/50 shadow-sm scale-[1.03]'
                                    : 'bg-primary/15 text-primary border-primary/50 shadow-md shadow-primary/15 scale-[1.03]'
                                : 'border-border/40 text-muted-foreground/60 hover:border-primary/30 hover:text-muted-foreground bg-background'
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

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="shrink-0 border-t border-primary/12 bg-gradient-to-r from-card via-card to-primary/3 px-5 py-4 relative z-10">
            {showGuardrails ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setGuardrails(DEFAULT_GUARDRAILS)}
                  className="border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border transition-all duration-200 font-semibold text-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />Reset Defaults
                </Button>
                <Button
                  onClick={() => setShowGuardrails(false)}
                  className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 font-bold px-7 shadow-md shadow-primary/15"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />Apply Changes
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border transition-all duration-200 font-semibold text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendToEditorial}
                  disabled={!selectedVoice || !selectedOutputType || isSubmitting}
                  className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all duration-200 font-bold px-7 shadow-md shadow-primary/15 min-w-[160px]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Generate Content</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Universal Generated Content Modal */}
      {contentModalData && (
        <GeneratedContentModal
          open={contentModalOpen}
          onOpenChange={setContentModalOpen}
          contentId={contentModalData.id}
          title={contentModalData.title}
          initialContent={contentModalData.content}
          persona={contentModalData.persona}
          voiceId={contentModalData.voiceId}
          outputType={contentModalData.outputType}
          initialStatus="draft"
          topicContext={contentModalData.topicContext}
          createdAt={contentModalData.createdAt}
          guardrails={contentModalData.guardrails}
          onNewGeneration={() => {
            setContentModalOpen(false);
            setSelectedVoice("");
            setSelectedOutputType("");
            setSelectedArticleLength("");
            setGuardrails(DEFAULT_GUARDRAILS);
            setShowGuardrails(false);
            setModalOpen(true);
          }}
        />
      )}

      {/* All Signals Modal */}
      <Dialog open={allSignalsModalOpen} onOpenChange={setAllSignalsModalOpen}>
        <DialogContent className="sm:max-w-4xl bg-gradient-card border-border/50 shadow-elegant max-h-[80vh] overflow-hidden">
          <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-bold text-primary flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              {allSignalsModalSource === 'trending' ? 'All Trending Signals' : 'All Topic Signals'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete list of {allSignalsModalSource === 'trending' ? trendingSignals.length : signals.length} signals ranked by score
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] py-4 px-1 space-y-2">
            {(allSignalsModalSource === 'trending' ? trendingSignals : signals).map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onOpen={() => { setDetailSignal(signal); setSignalDetailOpen(true); }}
                onGenerate={() => { setAllSignalsModalOpen(false); openEditorialModal(signal); }}
                onLink={() => { setAllSignalsModalOpen(false); setSignalForLink(signal); setAgentLinkModalOpen(true); }}
              />
            ))}
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

      {/* ── Signal Detail Modal ──────────────────────────────────────────── */}
      <Dialog open={signalDetailOpen} onOpenChange={setSignalDetailOpen}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl border-border/80 shadow-elegant rounded-3xl p-0 gap-0">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-primary px-6 py-5">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {detailSignal && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detailSignal.priority === 'High' ? 'bg-red-500/80 text-white' :
                      detailSignal.priority === 'Medium' ? 'bg-amber-400/80 text-white' :
                      'bg-emerald-500/80 text-white'
                    }`}>{detailSignal.priority}</span>
                  )}
                  {detailSignal?.community_context && (
                    <span className="text-[10px] font-medium bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">{detailSignal.community_context}</span>
                  )}
                </div>
                <h2 className="text-base font-black text-white leading-snug">{detailSignal?.headline}</h2>
              </div>
              <div className="shrink-0 text-center bg-white/15 border border-white/25 rounded-xl px-3 py-2">
                <div className="text-2xl font-black text-white leading-none">{detailSignal?.score}</div>
                <div className="text-[10px] text-white/60 mt-0.5">score</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[60vh]">

            {/* Summary */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Summary</p>
              <p className="text-sm text-foreground leading-relaxed">{detailSignal?.summary}</p>
            </div>

            {/* Why it matters */}
            {detailSignal?.rationale && (
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">Why it matters</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{detailSignal.rationale}</p>
              </div>
            )}

            {/* Tags + context */}
            {(detailSignal?.tags?.length > 0 || detailSignal?.community_context) && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Narrative Stakes</p>
                <div className="flex flex-wrap gap-1.5">
                  {detailSignal?.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-1 bg-accent/10 text-accent-foreground capitalize">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Source</p>
                {detailSignal?.url ? (
                  <a href={detailSignal.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />{detailSignal.source}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-foreground">{detailSignal?.source}</p>
                )}
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Published</p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {detailSignal?.timestamp && detailSignal.timestamp !== 'recently' ? `${detailSignal.timestamp} ago` : 'Recently'}
                </p>
              </div>
            </div>

          </div>

          {/* Footer actions */}
          <div className="px-6 pb-5 flex gap-2 border-t border-border pt-4">
            <Button
              className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold"
              onClick={() => { setSignalDetailOpen(false); openEditorialModal(detailSignal!); }}
            >
              <Zap className="h-4 w-4 mr-2" />Generate Content
            </Button>
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              title="Send to agent"
              onClick={() => { setSignalDetailOpen(false); setAllSignalsModalOpen(false); setSignalForLink(detailSignal); setAgentLinkModalOpen(true); }}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Link Modal */}
      <Dialog open={agentLinkModalOpen} onOpenChange={setAgentLinkModalOpen}>
        <DialogContent className="sm:max-w-sm bg-white/95 backdrop-blur-2xl border-border/80 shadow-elegant rounded-3xl p-0 gap-0">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-primary px-5 py-4">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-white/80" />
                <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Send to Agent</p>
              </div>
              <p className="text-sm font-bold text-white leading-snug line-clamp-2">{signalForLink?.headline}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 space-y-2">
            {/* Social Alchemist */}
            <button
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-violet-300 hover:bg-violet-50/50 transition-all duration-200 text-left group"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shrink-0">
                <Wand2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground group-hover:text-violet-700 transition-colors">Social Alchemist</p>
                <p className="text-xs text-muted-foreground">Repurpose into social assets</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Open source URL */}
            {signalForLink?.url && (
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left group"
                onClick={() => {
                  window.open(signalForLink.url, '_blank', 'noopener,noreferrer');
                  setAgentLinkModalOpen(false);
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 shadow-sm shrink-0">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">Open Source</p>
                  <p className="text-xs text-muted-foreground truncate">{signalForLink?.source || new URL(signalForLink.url).hostname.replace('www.', '')}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            )}
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