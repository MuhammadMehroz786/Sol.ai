import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_VOICE_PROFILE_DELETE, WEBHOOK_CONTENT_PUBLISH } from "@/constants/webhooks";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target, Loader2, Download, ArrowLeft, Edit, Sparkles, RotateCcw, Scissors, RefreshCw, X, Search, Briefcase, Lightbulb, Users, FileText, MessageSquare, Video, FileEdit, BookOpen, ScrollText, Palette, AlertCircle, BarChart3, Globe, CheckCircle2, User, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ScoutGptService } from "@/services/scoutGptService";
import { Signal } from "@/types/signals";
import { useToast } from "@/hooks/use-toast";
import { DatabaseTest } from "@/services/testDatabase";
import { quickDatabaseTest } from "@/services/quickTest";
import { testScoutGptApi } from "@/services/testScoutGpt";

interface CustomVoice {
  value: string;
  label: string;
  description: string;
  isDefault: boolean;
  icon?: any;
  color?: string;
  userId?: string;
  databaseId?: string; // Supabase voice_profiles table ID
}

const defaultVoices: CustomVoice[] = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader", isDefault: true, icon: Briefcase, color: "from-blue-500 to-blue-600" },
  { value: "ana", label: "Ana", description: "Cultural analyst", isDefault: true, icon: Palette, color: "from-purple-500 to-pink-500" },
  { value: "winston", label: "Winston", description: "Strategic narrator", isDefault: true, icon: Target, color: "from-orange-500 to-red-500" }
];

const VOICES_STORAGE_KEY = 'sole-custom-voices';

export const TodaysSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState<{ [key: string]: boolean }>({});
  const [isLoadingAllSignals, setIsLoadingAllSignals] = useState(true);
  const [allSignalsModalOpen, setAllSignalsModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voices, setVoices] = useState<CustomVoice[]>(defaultVoices);
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
  const { toast } = useToast();

  const outputTypes = [
    { value: "Article", label: "Article", icon: FileText, description: "In-depth written content", color: "from-blue-500 to-cyan-500", available: true },
    { value: "Tweet thread", label: "Tweet thread", icon: MessageSquare, description: "Threaded social posts", color: "from-sky-500 to-blue-500", available: true },
    { value: "Script", label: "Script", icon: Video, description: "Video or audio script", color: "from-purple-500 to-pink-500", available: true },
    { value: "Prompt", label: "Prompt", icon: Lightbulb, description: "AI prompt template", color: "from-yellow-500 to-orange-500", available: true }
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

  // Load custom voices from localStorage and listen for changes
  useEffect(() => {
    const loadVoices = () => {
      const stored = localStorage.getItem(VOICES_STORAGE_KEY);
      if (stored) {
        try {
          let customVoices = JSON.parse(stored);

          // Clean up old voice profiles with "My Voice Profile" label
          const cleanedVoices = customVoices.filter((v: CustomVoice) => v.label !== 'My Voice Profile');

          // If we removed any, save the cleaned version
          if (cleanedVoices.length !== customVoices.length) {
            localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(cleanedVoices));
            customVoices = cleanedVoices;
          }

          setVoices([...defaultVoices, ...customVoices]);
        } catch (e) {
          console.error('Failed to load custom voices:', e);
        }
      } else {
        setVoices(defaultVoices);
      }
    };

    // Initial load
    loadVoices();

    // Listen for storage changes (from other components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VOICES_STORAGE_KEY) {
        loadVoices();
      }
    };

    // Listen for custom event (for same-page updates)
    const handleVoiceUpdate = () => {
      loadVoices();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('voicesUpdated', handleVoiceUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('voicesUpdated', handleVoiceUpdate);
    };
  }, []);

  // Load signals on component mount
  useEffect(() => {
    // Load topic search from localStorage
    loadTopicFromLocalStorage();
    initializeSignals();

    // Listen for signal updates from scheduler
    const handleSignalsUpdated = () => {
      console.log('Signals updated event received');
      // Only reload if a topic is already selected
      if (topicSearch.trim()) {
        console.log('Reloading signals for topic:', topicSearch);
        loadInitialSignals();
      } else {
        console.log('No topic selected, skipping automatic reload');
      }
    };

    window.addEventListener('signalsUpdated', handleSignalsUpdated);

    return () => {
      window.removeEventListener('signalsUpdated', handleSignalsUpdated);
    };
  }, []);

  // Expose modal function to Dashboard
  useEffect(() => {
    (window as any).openAllSignalsModal = () => {
      setAllSignalsModalOpen(true);
    };

    return () => {
      delete (window as any).openAllSignalsModal;
    };
  }, []);

  const initializeSignals = async () => {
    console.log('🚀 Initializing Today\'s Signals component...');

    // Quick database functionality test
    const quickTestPassed = await quickDatabaseTest();
    console.log('🧪 Quick database test result:', quickTestPassed);

    // Test Scout GPT API directly
    const apiTestResult = await testScoutGptApi();
    console.log('🧪 Scout GPT API test result:', apiTestResult);

    // Run database tests first
    const testResults = await DatabaseTest.runAllTests();

    if (!testResults.connection) {
      toast({
        title: "Database Connection Error",
        description: "Cannot connect to database. Please check your connection.",
        variant: "destructive",
      });
      setIsLoadingAllSignals(false);
      return;
    }

    if (!testResults.auth) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view signals.",
        variant: "destructive",
      });
      setIsLoadingAllSignals(false);
      return;
    }

    if (!testResults.signalsTable) {
      toast({
        title: "Database Setup Required",
        description: "Signals table not found. Please run the database migration.",
        variant: "destructive",
      });
      setIsLoadingAllSignals(false);
      return;
    }

    // Don't automatically load signals - wait for user to search
    setIsLoadingAllSignals(false);
    console.log('✅ Ready for user to search signals');
  };

  // Topic search management functions
  const loadTopicFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('user_signal_topic');
      if (saved) {
        setTopicSearch(saved);
      }
    } catch (error) {
      console.error('Error loading topic from localStorage:', error);
    }
  };

  const saveTopicToLocalStorage = (topic: string) => {
    try {
      localStorage.setItem('user_signal_topic', topic);
    } catch (error) {
      console.error('Error saving topic to localStorage:', error);
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

    console.log('🔍 Search button clicked with topic:', topicSearch);
    saveTopicToLocalStorage(topicSearch);
    setIsFilteringByTopic(true);

    try {
      await loadInitialSignals();
      console.log('✅ Search completed successfully');
    } catch (error) {
      console.error('❌ Search failed:', error);
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
    // Require topic to be selected
    if (!topicSearch.trim()) {
      console.log('⚠️ No topic selected, skipping signal fetch');
      setIsLoadingAllSignals(false);
      return;
    }

    try {
      console.log('🔄 Starting loadInitialSignals...');
      console.log('🔄 Current signals in state:', signals.length);
      setIsLoadingAllSignals(true);

      console.log('📡 Fetching fresh signals from Scout GPT...');
      console.log('🎯 Using topic filter:', topicSearch);
      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim());
      console.log('📊 Fetched new signals count:', newSignals.length);
      console.log('📊 New signals data:', JSON.stringify(newSignals.slice(0, 2), null, 2));

      if (newSignals.length === 0) {
        console.warn('⚠️ No signals returned from ScoutGptService');
        toast({
          title: "No signals found",
          description: `No signals found for topic: ${topicSearch}`,
          variant: "destructive",
        });
        setSignals([]);
        return;
      }

      // Sort signals by score (highest first) before setting state
      const sortedSignals = [...newSignals].sort((a, b) => b.score - a.score);
      console.log('📊 Sorted signals count:', sortedSignals.length);
      console.log('📊 Top signal after sort:', sortedSignals[0]?.headline, 'Score:', sortedSignals[0]?.score);

      setSignals(sortedSignals);
      console.log('✅ Set new signals to state (sorted by score)');
      console.log('✅ State should now have', sortedSignals.length, 'signals');

      toast({
        title: "Signals loaded",
        description: `Loaded ${newSignals.length} fresh signals for "${topicSearch}"`,
      });
    } catch (error) {
      console.error('❌ Error loading initial signals:', error);
      console.error('❌ Error stack:', error.stack);
      setSignals([]); // Set empty array on error

      const errorMessage = error.message || "Failed to load signals";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");

      toast({
        title: isTimeout ? "Search Timed Out" : "Error Loading Signals",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
      console.log('🏁 loadInitialSignals completed');
      console.log('🏁 Final signals in state:', signals.length);
    }
  };

  const handleLoadMoreSignals = async () => {
    console.log('🔄 Load More Signals button clicked!');

    // Require topic to be selected
    if (!topicSearch.trim()) {
      toast({
        title: "Topic required",
        description: "Please select a topic before loading signals",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 Starting manual signal fetch...');
      setIsLoadingAllSignals(true);

      toast({
        title: "Loading new signals...",
        description: "Fetching latest signals",
      });

      console.log('📡 Calling ScoutGptService.fetchAndSaveSignals()...');
      console.log('🎯 Using topic filter:', topicSearch);
      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim());
      console.log('✅ Received signals:', newSignals.length);
      console.log('📝 Signal details:', newSignals);

      // Sort signals by score (highest first) before setting state
      const sortedSignals = [...newSignals].sort((a, b) => b.score - a.score);
      setSignals(sortedSignals);
      console.log('✅ Updated state with new signals (sorted by score)');

      toast({
        title: "Signals updated!",
        description: `Loaded ${newSignals.length} signals`,
      });
    } catch (error) {
      console.error('❌ Error loading more signals:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      const errorMessage = error.message || "Failed to load signals";
      const isTimeout = errorMessage.toLowerCase().includes("timeout");

      toast({
        title: isTimeout ? "Search Timed Out" : "Error Loading Signals",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
      console.log('🏁 handleLoadMoreSignals completed');
    }
  };

  const openEditorialModal = (signal: Signal) => {
    setSelectedSignal(signal);
    setSelectedVoice("");
    setSelectedOutputType("");
    setModalMode('form');
    setGeneratedContent("");
    setEditableContent("");
    setIsProcessingAction("");
    setModalOpen(true);
  };

  const saveCustomVoices = (allVoices: CustomVoice[]) => {
    const customOnly = allVoices.filter(v => !v.isDefault);
    localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(customOnly));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('voicesUpdated'));
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
      // Call webhook to delete from database
      const webhookUrl = WEBHOOK_VOICE_PROFILE_DELETE;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_name: voiceToDelete.label
        })
      });

      if (!response.ok) {
        console.error('Webhook deletion failed:', response.statusText);
      }

      // Delete from local state regardless of webhook success
      const updatedVoices = voices.filter(v => v.value !== voiceToDelete.value);
      setVoices(updatedVoices);
      saveCustomVoices(updatedVoices);

      // Clear selection if deleting the currently selected voice
      if (selectedVoice === voiceToDelete.value) {
        setSelectedVoice("");
      }

      toast({
        title: "Voice deleted",
        description: "Voice profile has been removed successfully",
      });

      setDeleteConfirmOpen(false);
      setVoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      toast({
        title: "Delete failed",
        description: "An error occurred while deleting the voice profile",
        variant: "destructive",
      });
    } finally {
      setIsDeletingVoice(false);
    }
  };

  const sendToEditorial = async () => {
    if (!selectedSignal || !selectedVoice || !selectedOutputType) {
      console.log('Missing required fields:', { selectedSignal, selectedVoice, selectedOutputType });
      return;
    }

    console.log('Starting editorial request...');
    setIsSubmitting(true);

    try {
      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const payload = {
        voice_name: voiceDetails?.label || selectedVoice,
        signal: {
          headline: selectedSignal.headline,
          summary: selectedSignal.summary
        },
        output_type: selectedOutputType
      };

      console.log('Sending payload:', payload);

      const response = await fetch(WEBHOOK_CONTENT_PUBLISH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Editorial response:', result);

        // Store full response for display
        setFullResponse(result);

        // Format the response data beautifully
        const formattedContent = formatResponseData(result);
        console.log('Formatted content:', formattedContent);

        // Store generated content but don't show modal
        setGeneratedContent(formattedContent);
        setEditableContent(formattedContent);

        // Also save to database as draft
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user.user) {
            const { error, data } = await supabase
              .from('content_outputs')
              .insert({
                user_id: user.user.id,
                title: `${selectedOutputType.replace('-', ' ')} about ${selectedSignal.headline.substring(0, 50)}`,
                content: formattedContent,
                persona: selectedVoice,
                output_type: selectedOutputType,
                status: 'draft',
                topic_context: selectedSignal.headline
              })
              .select();

            if (error) {
              console.error('Error saving to database:', error);
            } else {
              console.log('Content saved to database as draft, data:', data);
              const { toast } = await import("@/hooks/use-toast");
              toast({
                title: "Content saved!",
                description: "Content has been added to your queue as draft",
              });

              // Close modal first
              setModalOpen(false);

              // Refresh dashboard stats
              if ((window as any).refreshDashboardStats) {
                (window as any).refreshDashboardStats();
              }

              // Open the draft modal automatically
              if (data && data.length > 0) {
                const contentId = data[0].id;
                console.log('Attempting to open draft modal for content ID:', contentId);

                // First refresh the content queue, then open modal
                if ((window as any).refreshContentQueue) {
                  console.log('Refreshing content queue...');
                  await (window as any).refreshContentQueue();
                }

                // Open modal with a delay to ensure refresh is complete
                setTimeout(() => {
                  console.log('Checking for openDraftModal function...');
                  if ((window as any).openDraftModal) {
                    console.log('Calling openDraftModal with ID:', contentId);
                    (window as any).openDraftModal(contentId);
                  } else {
                    console.log('ERROR: openDraftModal function not available on window');
                    console.log('Available functions:', Object.keys(window).filter(k => k.includes('ContentQueue') || k.includes('Modal')));
                  }
                }, 500);
              } else {
                console.log('ERROR: No data returned from database insert');
              }
            }
          }
        } catch (dbError) {
          console.error('Database save error:', dbError);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to send to editorial:', response.status, response.statusText, errorText);
        alert(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending to editorial:', error);
      alert(`Network error: ${error.message}`);
    } finally {
      console.log('Request completed, setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!selectedSignal || !editableContent) return;

    setIsProcessingAction(action);

    try {
      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const response = await fetch(WEBHOOK_CONTENT_PUBLISH, {
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
        console.log('Quick action response:', result);

        // Use the same formatting function for consistency
        const formattedContent = formatResponseData(result);
        console.log('Formatted quick action content:', formattedContent);

        setEditableContent(formattedContent);
      } else {
        console.error('Failed to process quick action:', response.statusText);
      }
    } catch (error) {
      console.error('Error processing quick action:', error);
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

    console.log('Formatting response data:', response);

    // Handle array response (webhook returns array with one object)
    let data = response;
    if (Array.isArray(response) && response.length > 0) {
      data = response[0];
    }

    console.log('Processing data:', data);

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
      .replace(/^\\* /gm, '⭐ ')
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
              {/* Simple Text Input */}
              <div className="relative flex-1">
                <Input
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && topicSearch.trim()) {
                      handleSearchWithTopic();
                    }
                  }}
                  placeholder="Enter a topic to search..."
                  className="w-full bg-white border-2 border-primary/20 focus:border-primary/50 hover:border-primary/40 rounded-xl text-sm transition-all duration-300 px-4 py-2 pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                <Clock className="h-4 w-4" />
                <span>{signal.timestamp}</span>
                <span>•</span>
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
                <Button size="sm" variant="outline" className="hover:bg-accent/10 text-sm px-3 py-2 h-8">
                  Chain
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary text-sm px-2 py-2 h-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          ))
        )}

        {/* Load New Signals Button */}
        {signals.length > 0 && !isLoadingAllSignals && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-accent hover:text-accent-foreground hover:bg-accent/10 mt-2 py-2"
            onClick={handleLoadMoreSignals}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Load New Signals
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
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
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
                <Select value={selectedOutputType} onValueChange={setSelectedOutputType}>
                  <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-accent/20 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:scale-[1.02]">
                    <SelectValue placeholder="Choose output type..." />
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
              Complete list of {signals.length} signals ranked by Scout GPT score
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
                      <Clock className="h-4 w-4" />
                      <span>{signal.timestamp}</span>
                      <span>•</span>
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
                      <Button size="sm" variant="outline" className="hover:bg-accent/10 text-sm px-3 py-2 h-8">
                        Chain
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary text-sm px-2 py-2 h-8">
                        <ExternalLink className="h-4 w-4" />
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
    </Card>
  );
};