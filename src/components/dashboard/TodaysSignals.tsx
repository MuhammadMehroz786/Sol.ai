import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target, Loader2, Download, ArrowLeft, Edit, Sparkles, RotateCcw, Scissors, RefreshCw, X, Search, Briefcase, Lightbulb, Users, FileText, MessageSquare, Video, FileEdit, BookOpen, ScrollText, Palette, AlertCircle, BarChart3, Globe, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ScoutGptService } from "@/services/scoutGptService";
import { Signal } from "@/types/signals";
import { useToast } from "@/hooks/use-toast";
import { DatabaseTest } from "@/services/testDatabase";
import { quickDatabaseTest } from "@/services/quickTest";
import { testScoutGptApi } from "@/services/testScoutGpt";


export const TodaysSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState<{ [key: string]: boolean }>({});
  const [isLoadingAllSignals, setIsLoadingAllSignals] = useState(true);
  const [allSignalsModalOpen, setAllSignalsModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [selectedTone, setSelectedTone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<'form' | 'results'>('form');
  const [generatedContent, setGeneratedContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [isFilteringByTopic, setIsFilteringByTopic] = useState(false);
  const { toast } = useToast();

  const personas = [
    { value: "Malcolm", label: "Malcolm", icon: Briefcase, description: "Strategic business perspective", color: "from-blue-500 to-blue-600" },
    { value: "Ana", label: "Ana", icon: Palette, description: "Creative and artistic approach", color: "from-purple-500 to-pink-500" },
    { value: "Winston", label: "Winston", icon: Target, description: "Results-driven strategist", color: "from-orange-500 to-red-500" },
    { value: "Business Analyst", label: "Business Analyst", icon: BarChart3, description: "Data and metrics focused", color: "from-emerald-500 to-teal-500" },
    { value: "Content Creator", label: "Content Creator", icon: FileEdit, description: "Engaging content specialist", color: "from-indigo-500 to-purple-500" },
    { value: "Marketing Manager", label: "Marketing Manager", icon: Users, description: "Audience-focused marketer", color: "from-pink-500 to-rose-500" },
    { value: "Social Media Manager", label: "Social Media Manager", icon: MessageSquare, description: "Social engagement expert", color: "from-cyan-500 to-blue-500" },
    { value: "Technical Writer", label: "Technical Writer", icon: BookOpen, description: "Clear technical documentation", color: "from-slate-500 to-gray-600" },
    { value: "Brand Strategist", label: "Brand Strategist", icon: Star, description: "Brand identity expert", color: "from-yellow-500 to-orange-500" },
    { value: "Communications Director", label: "Communications Director", icon: Globe, description: "Corporate communications", color: "from-teal-500 to-cyan-500" }
  ];

  const outputTypes = [
    { value: "Article", label: "Article", icon: FileText, description: "In-depth written content", color: "from-blue-500 to-cyan-500", available: true },
    { value: "Tweet thread", label: "Tweet thread", icon: MessageSquare, description: "Threaded social posts", color: "from-sky-500 to-blue-500", available: true },
    { value: "Script", label: "Script", icon: Video, description: "Video or audio script", color: "from-purple-500 to-pink-500", available: true },
    { value: "Prompt", label: "Prompt", icon: Lightbulb, description: "AI prompt template", color: "from-yellow-500 to-orange-500", available: true },
    { value: "Longform (future)", label: "Longform", icon: BookOpen, description: "Extended article format", color: "from-gray-400 to-gray-500", available: false },
    { value: "White paper (future)", label: "White paper", icon: ScrollText, description: "Professional report", color: "from-gray-400 to-gray-500", available: false }
  ];

  const tones = [
    { value: "poetic", label: "Poetic", icon: Palette, description: "Creative and artistic expression", color: "from-purple-500 to-pink-500" },
    { value: "urgent", label: "Urgent", icon: AlertCircle, description: "Time-sensitive and compelling", color: "from-orange-500 to-red-500" },
    { value: "data-driven", label: "Data-driven", icon: BarChart3, description: "Facts and analytics focused", color: "from-blue-500 to-cyan-500" },
    { value: "cultural", label: "Cultural", icon: Globe, description: "Socially aware perspective", color: "from-emerald-500 to-teal-500" }
  ];

  // Load signals on component mount
  useEffect(() => {
    // Load topic search from localStorage
    loadTopicFromLocalStorage();
    initializeSignals();

    // Listen for signal updates from scheduler
    const handleSignalsUpdated = () => {
      console.log('Signals updated event received, reloading...');
      loadInitialSignals();
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

    // If all tests pass, load signals
    await loadInitialSignals();
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

    saveTopicToLocalStorage(topicSearch);
    setIsFilteringByTopic(true);
    await loadInitialSignals();
    setIsFilteringByTopic(false);
  };

  const handleClearTopic = () => {
    setTopicSearch("");
    saveTopicToLocalStorage("");
    loadInitialSignals();
  };

  const loadInitialSignals = async () => {
    try {
      console.log('🔄 Starting loadInitialSignals...');
      setIsLoadingAllSignals(true);

      console.log('📡 Fetching fresh signals from Scout GPT on login...');
      console.log('🎯 Using topic filter:', topicSearch);
      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim() ? topicSearch.trim() : undefined);
      console.log('📊 Fetched new signals count:', newSignals.length);

      // Sort signals by score (highest first) before setting state
      const sortedSignals = [...newSignals].sort((a, b) => b.score - a.score);
      setSignals(sortedSignals);
      console.log('✅ Set new signals to state (sorted by score)');

      toast({
        title: "Signals loaded",
        description: `Loaded ${newSignals.length} fresh signals`,
      });
    } catch (error) {
      console.error('❌ Error loading initial signals:', error);
      setSignals([]); // Set empty array on error

      toast({
        title: "Error loading signals",
        description: error.message || "Failed to load signals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
      console.log('🏁 loadInitialSignals completed');
    }
  };

  const handleLoadMoreSignals = async () => {
    console.log('🔄 Load More Signals button clicked!');

    try {
      console.log('🚀 Starting manual signal fetch...');
      setIsLoadingAllSignals(true);

      toast({
        title: "Loading new signals...",
        description: "Fetching latest signals",
      });

      console.log('📡 Calling ScoutGptService.fetchAndSaveSignals()...');
      console.log('🎯 Using topic filter:', topicSearch);
      const newSignals = await ScoutGptService.fetchAndSaveSignals(topicSearch.trim() ? topicSearch.trim() : undefined);
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

      toast({
        title: "Error",
        description: `Failed to load new signals: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllSignals(false);
      console.log('🏁 handleLoadMoreSignals completed');
    }
  };

  const openEditorialModal = (signal: Signal) => {
    setSelectedSignal(signal);
    setSelectedPersona("");
    setSelectedOutputType("");
    setSelectedTone("");
    setModalMode('form');
    setGeneratedContent("");
    setEditableContent("");
    setIsProcessingAction("");
    setModalOpen(true);
  };

  const sendToEditorial = async () => {
    if (!selectedSignal || !selectedPersona || !selectedOutputType || !selectedTone) {
      console.log('Missing required fields:', { selectedSignal, selectedPersona, selectedOutputType, selectedTone });
      return;
    }

    console.log('Starting editorial request...');
    setIsSubmitting(true);

    try {
      const payload = {
        signal: {
          id: selectedSignal.id,
          headline: selectedSignal.headline,
          summary: selectedSignal.summary,
          tags: selectedSignal.tags,
          priority: selectedSignal.priority,
          source: selectedSignal.source,
          score: selectedSignal.score,
          engagement: selectedSignal.engagement
        },
        persona: selectedPersona,
        outputType: selectedOutputType,
        tone: selectedTone
      };

      console.log('Sending payload:', payload);

      const response = await fetch('https://soleai.app.n8n.cloud/webhook/ac317b82-2163-44ea-8324-5727d9d29a85', {
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
                persona: selectedPersona,
                tones: [selectedTone],
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
      const response = await fetch('https://soleai.app.n8n.cloud/webhook/ac317b82-2163-44ea-8324-5727d9d29a85', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signal: {
            id: selectedSignal.id,
            headline: selectedSignal.headline,
            summary: selectedSignal.summary,
            tags: selectedSignal.tags,
            priority: selectedSignal.priority,
            source: selectedSignal.source,
            score: selectedSignal.score,
            engagement: selectedSignal.engagement
          },
          persona: selectedPersona,
          outputType: selectedOutputType,
          tone: selectedTone,
          content: editableContent,
          quickAction: action
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
    setSelectedPersona("");
    setSelectedOutputType("");
    setSelectedTone("");
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
        <div className="relative mb-4">
          {/* Multi-layer glow effects */}
          <div className="absolute inset-0 -m-2 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/15 blur-2xl opacity-30 rounded-2xl" />

          {/* Main container */}
          <div className="relative bg-white/98 backdrop-blur-2xl rounded-2xl border-2 border-primary/20 p-4 shadow-[0_4px_20px_rgba(208,126,59,0.12),0_2px_8px_rgba(208,126,59,0.08)] overflow-hidden">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 -z-10 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />

            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-primary">
                <Search className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Filter by Topic</h3>
            </div>

            {/* Input section */}
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter topic (e.g., AI, Sneakers, Fashion)..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchWithTopic();
                  }
                }}
                className="flex-1 bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/30 rounded-xl text-sm placeholder:text-muted-foreground/70 transition-all duration-300"
              />
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
                ? "Enter a topic to filter signals or leave empty for general signals"
                : `Ready to search for "${topicSearch}"`
              }
            </p>
          </div>
        </div>

        {isLoadingAllSignals ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading signals...</span>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No signals available</div>
            <Button
              size="sm"
              onClick={handleLoadMoreSignals}
              disabled={isLoadingAllSignals}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Zap className="h-4 w-4 mr-2" />
              Load Signals from Scout GPT
            </Button>
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
                  Send to Editorial GPT
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

        {/* Show All Signals Modal Button */}
        {signals.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 mt-3 py-2"
            onClick={() => setAllSignalsModalOpen(true)}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Show All Signals ({signals.length} total)
          </Button>
        )}

        {/* Load New Signals Button */}
        {signals.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-accent hover:text-accent-foreground hover:bg-accent/10 mt-2 py-2"
            onClick={handleLoadMoreSignals}
            disabled={isLoadingAllSignals}
          >
            {isLoadingAllSignals ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading New Signals...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load New Signals
              </>
            )}
          </Button>
        )}
      </CardContent>

      {/* Editorial Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={`${modalMode === 'results' ? "sm:max-w-4xl" : "sm:max-w-md"} bg-gradient-card border-border/50 shadow-elegant`}>
          <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-bold text-primary">
              {modalMode === 'form' ? 'Send to Editorial GPT' : 'Generated Content'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {modalMode === 'form'
                ? <>Configure content generation for: <strong className="text-foreground">{selectedSignal?.headline}</strong></>
                : <>
                    Generated by <strong className="text-primary">{selectedPersona}</strong> as <strong className="text-accent">{selectedOutputType}</strong> with <strong className="text-warning">{tones.find(t => t.value === selectedTone)?.label}</strong> tone for: <strong className="text-foreground">{selectedSignal?.headline}</strong>
                  </>
              }
            </DialogDescription>
          </DialogHeader>

          {modalMode === 'form' ? (
            <div className="space-y-6 py-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedPersona ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedOutputType ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
                <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedTone ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
              </div>
              <div className="text-center text-xs text-muted-foreground mb-4">
                {!selectedPersona && !selectedOutputType && !selectedTone && "Start by selecting a persona"}
                {selectedPersona && !selectedOutputType && !selectedTone && "Great! Now choose an output type"}
                {selectedPersona && selectedOutputType && !selectedTone && "Almost there! Select a tone"}
                {selectedPersona && selectedOutputType && selectedTone && "Perfect! Ready to generate"}
              </div>

              {/* Persona Selection */}
              <div className="space-y-3 relative">
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-xl opacity-50 rounded-2xl" />
                <label className="text-sm font-semibold text-foreground flex items-center relative">
                  <Users className="h-4 w-4 mr-2 text-primary" />
                  Select Persona
                  {selectedPersona && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
                </label>
                <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                  <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] group">
                    <SelectValue placeholder="Choose a persona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                    {personas.map((persona) => {
                      const Icon = persona.icon;
                      return (
                        <SelectItem
                          key={persona.value}
                          value={persona.value}
                          className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 cursor-pointer transition-all duration-200 my-1 rounded-lg group"
                        >
                          <div className="flex items-center space-x-3 py-1">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${persona.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{persona.label}</span>
                              <span className="text-xs text-muted-foreground">{persona.description}</span>
                            </div>
                          </div>
                        </SelectItem>
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

              {/* Tone Selection */}
              <div className="space-y-3 relative">
                <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-xl opacity-50 rounded-2xl" />
                <label className="text-sm font-semibold text-foreground flex items-center relative">
                  <Sparkles className="h-4 w-4 mr-2 text-warning" />
                  Select Tone
                  {selectedTone && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
                </label>
                <Select value={selectedTone} onValueChange={setSelectedTone}>
                  <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-warning/20 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 hover:scale-[1.02]">
                    <SelectValue placeholder="Choose tone..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50">
                    {tones.map((tone) => {
                      const Icon = tone.icon;
                      return (
                        <SelectItem
                          key={tone.value}
                          value={tone.value}
                          className="hover:bg-gradient-to-r hover:from-warning/10 hover:to-primary/10 cursor-pointer transition-all duration-200 my-1 rounded-lg group"
                        >
                          <div className="flex items-center space-x-3 py-1">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${tone.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{tone.label}</span>
                              <span className="text-xs text-muted-foreground">{tone.description}</span>
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
                  disabled={!selectedPersona || !selectedOutputType || !selectedTone || isSubmitting}
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
                        Send to Editorial GPT
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
    </Card>
  );
};