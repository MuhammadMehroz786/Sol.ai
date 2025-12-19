import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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
  Download,
  RotateCcw,
  Scissors,
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
  Lightbulb
} from "lucide-react";

const defaultVoices = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader", isDefault: true, icon: Briefcase, color: "from-blue-500 to-blue-600" },
  { value: "ana", label: "Ana", description: "Cultural analyst", isDefault: true, icon: Palette, color: "from-purple-500 to-pink-500" },
  { value: "winston", label: "Winston", description: "Strategic narrator", isDefault: true, icon: Target, color: "from-orange-500 to-red-500" }
];


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

const VOICES_STORAGE_KEY = 'sole-custom-voices';

export const ContentGenerator = () => {
  const [selectedVoice, setSelectedVoice] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [selectedArticleLength, setSelectedArticleLength] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");

  // Custom voice management
  const [voices, setVoices] = useState<CustomVoice[]>(defaultVoices);
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

  // Article submenu hover state
  const [showArticleSubmenu, setShowArticleSubmenu] = useState(false);
  const [articleItemRef, setArticleItemRef] = useState<HTMLDivElement | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Save custom voices to localStorage
  const saveCustomVoices = (allVoices: CustomVoice[]) => {
    const customOnly = allVoices.filter(v => !v.isDefault);
    localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(customOnly));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('voicesUpdated'));
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
      // Edit existing voice
      const updatedVoices = voices.map(v =>
        v.value === editingVoice.value
          ? { ...v, label: newVoiceName, description: newVoiceDescription }
          : v
      );
      setVoices(updatedVoices);
      saveCustomVoices(updatedVoices);

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
      const updatedVoices = [...voices, newVoice];
      setVoices(updatedVoices);
      saveCustomVoices(updatedVoices);
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
      // Call webhook to delete from database
      const webhookUrl = 'https://soleai.app.n8n.cloud/webhook/4d473f2d-67af-4144-b217-0cb9440124a8';

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

      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Voice deleted",
        description: "Voice profile has been removed successfully",
      });

      setDeleteConfirmOpen(false);
      setVoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting voice profile:', error);
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Delete failed",
        description: "An error occurred while deleting the voice profile",
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
        const { toast } = await import("@/hooks/use-toast");
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

      const webhookUrl = 'https://soleai.app.n8n.cloud/webhook/66bc4c62-262d-4a3c-8d18-098c97672ddd';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();

        let voiceProfileId: string | undefined;

        // Try to save to Supabase voice_profiles table (optional)
        try {
          const { data: voiceProfileData, error: dbError } = await supabase
            .from('voice_profiles')
            .insert({
              profile_name: voiceProfileName.trim(),
              style_json: result.style_json || {},
              samples: result.samples || []
            })
            .select()
            .single();

          if (dbError) {
            console.warn('Could not save voice profile to database:', dbError);
          } else {
            voiceProfileId = voiceProfileData?.id;
          }
        } catch (dbError) {
          console.warn('Error saving voice profile to database (non-fatal):', dbError);
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

        const updatedVoices = [...voices, newVoice];
        setVoices(updatedVoices);
        saveCustomVoices(updatedVoices);
        setSelectedVoice(newVoice.value);

        const { toast } = await import("@/hooks/use-toast");
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
      console.error('Voice profile upload error:', error);
      const { toast } = await import("@/hooks/use-toast");
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
      console.log('Starting editorial request...');

      // Extract base output type and article length if applicable
      let baseOutputType = selectedOutputType;
      let articleLength = selectedArticleLength;

      if (selectedOutputType.startsWith('article-')) {
        baseOutputType = 'article';
        articleLength = selectedOutputType.replace('article-', '');
      }

      // Get voice details
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const payload: any = {
        voice_name: voiceDetails?.label || selectedVoice,
        signal: {
          headline: topic,
          summary: topic
        },
        output_type: baseOutputType
      };

      // Add article_length only if it exists
      if (articleLength) {
        payload.article_length = articleLength;
      }

      console.log('Sending payload:', payload);

      const response = await fetch('https://soleai.app.n8n.cloud/webhook/ac317b82-2163-44ea-8324-5727d9d29a85', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Editorial response:', result);

        // Format the response data beautifully
        const formattedContent = formatResponseData(result);
        console.log('Formatted content:', formattedContent);

        // Store generated content but don't show modal
        setGeneratedContent(formattedContent);

        // Also save to database as draft
        try {
          console.log('Starting database save...');
          const { data: user } = await supabase.auth.getUser();
          console.log('User data:', user);

          if (user.user) {
            const insertData = {
              user_id: user.user.id,
              title: `${selectedOutputType.replace('-', ' ')} about ${topic.substring(0, 50)}`,
              content: formattedContent,
              persona: selectedVoice,
              output_type: selectedOutputType,
              status: 'draft',
              topic_context: topic
            };
            console.log('Inserting data:', insertData);

            const { error, data } = await supabase
              .from('content_outputs')
              .insert(insertData)
              .select();

            console.log('Insert result:', { error, data });

            if (error) {
              console.error('Error saving to database:', error);
              const { toast } = await import("@/hooks/use-toast");
              toast({
                title: "Save failed!",
                description: `Database error: ${error.message}`,
                variant: "destructive",
              });
            } else {
              console.log('Content saved to database as draft successfully');
              const { toast } = await import("@/hooks/use-toast");
              toast({
                title: "Content saved!",
                description: "Content has been added to your queue as draft",
              });

              // Refresh ContentQueue and open draft modal
              console.log('Refreshing content queue...');
              if ((window as any).refreshContentQueue) {
                (window as any).refreshContentQueue();
              } else {
                console.log('refreshContentQueue function not available');
              }

              // Refresh dashboard stats
              if ((window as any).refreshDashboardStats) {
                (window as any).refreshDashboardStats();
              }

              // Open the draft modal automatically with a delay
              if (data && data.length > 0) {
                console.log('Opening draft modal for content ID:', data[0].id);
                setTimeout(() => {
                  if ((window as any).openDraftModal) {
                    (window as any).openDraftModal(data[0].id);
                  } else {
                    console.log('openDraftModal function not available');
                  }
                }, 300);
              }
            }
          } else {
            console.log('No user found for database save');
          }
        } catch (dbError) {
          console.error('Database save error:', dbError);
        }

      } else {
        const errorText = await response.text();
        console.error('Failed to generate content:', response.status, response.statusText, errorText);
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Error generating content",
          description: `Error: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Network error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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

  const handleQuickAction = async (action: string) => {
    if (!generatedContent) return;

    setIsProcessingAction(action);

    try {
      const voiceDetails = voices.find(v => v.value === selectedVoice);

      const response = await fetch('https://soleai.app.n8n.cloud/webhook/ac317b82-2163-44ea-8324-5727d9d29a85', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_name: voiceDetails?.label || selectedVoice,
          signal: {
            headline: topic,
            summary: topic
          },
          output_type: selectedOutputType,
          content: generatedContent,
          quick_action: action
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Quick action response:', result);

        // Use the same formatting function for consistency
        const formattedContent = formatResponseData(result);
        console.log('Formatted quick action content:', formattedContent);

        setGeneratedContent(formattedContent);
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
    if (!generatedContent) return;

    const filename = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canGenerate = selectedVoice && selectedOutputType && topic.trim();

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">Content Generator</CardTitle>
            <CardDescription className="text-base">
              Create tailored content with AI personas
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedVoice ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
          <div className={`h-2 w-2 rounded-full transition-all duration-300 ${selectedOutputType ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
          <div className={`h-2 w-2 rounded-full transition-all duration-300 ${topic.trim() ? 'bg-gradient-to-r from-primary to-accent scale-110 shadow-lg shadow-primary/50' : 'bg-muted'}`} />
        </div>
        <div className="text-center text-xs text-muted-foreground mb-4">
          {!selectedVoice && "Start by selecting a voice"}
          {selectedVoice && !selectedOutputType && "Great! Now select an output type"}
          {selectedVoice && selectedOutputType && !topic.trim() && "Almost there! Add your topic"}
          {selectedVoice && selectedOutputType && topic.trim() && "Perfect! Ready to generate"}
        </div>

        {/* Voice Selector */}
        <div className="space-y-3 relative">
          <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-xl opacity-50 rounded-2xl" />
          <Label className="text-base font-semibold flex items-center space-x-2 relative">
            <User className="h-4 w-4 text-primary" />
            <span>Voice</span>
            {selectedVoice && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
          </Label>
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
                          className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-primary/20 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditVoice(voice);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </button>
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

        <Separator />

        {/* Output Type */}
        <div className="space-y-3 relative">
          <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 blur-xl opacity-50 rounded-2xl" />
          <Label className="text-base font-semibold flex items-center space-x-2 relative">
            <FileText className="h-4 w-4 text-warning" />
            <span>Output Type</span>
            {selectedOutputType && <CheckCircle2 className="h-4 w-4 ml-2 text-success animate-in fade-in zoom-in duration-300" />}
          </Label>
          <Select
            value={selectedOutputType.startsWith('article-') ? 'article' : selectedOutputType}
            onValueChange={(value) => {
              if (value === 'article') {
                // Set to article so the size buttons appear
                setSelectedOutputType('article');
                setSelectedArticleLength("");
                return;
              }
              setSelectedOutputType(value);
              setSelectedArticleLength("");
            }}
          >
            <SelectTrigger className="relative bg-white/80 backdrop-blur-sm border-2 border-warning/20 hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all duration-300 hover:scale-[1.02]">
              <SelectValue placeholder="Select output type...">
                {selectedOutputType && (
                  selectedOutputType.startsWith('article-')
                    ? `Article - ${articleLengths.find(l => l.value === selectedOutputType.replace('article-', ''))?.label}`
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
                    className="hover:bg-gradient-to-r hover:from-warning/10 hover:to-primary/10 cursor-pointer transition-all duration-200 my-1 rounded-lg group"
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

          {/* Article Size Selection - appears when Article is selected */}
          {(selectedOutputType === 'article' || selectedOutputType.startsWith('article-')) && (
            <div className="flex gap-2 animate-in slide-in-from-top duration-300 relative z-10">
              {articleLengths.map((length) => {
                const articleValue = `article-${length.value}`;
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
                        ? "border-primary bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-accent/10 hover:scale-102"
                    }`}
                  >
                    <div className="font-semibold text-sm">{length.label}</div>
                    <div className="text-xs opacity-80 mt-0.5">{length.description}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Topic Input */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Topic & Context</Label>
          <Textarea
            placeholder="Describe the topic, provide context, or paste source material..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[100px] resize-none bg-background"
          />
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
          size="lg"
        >
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
              <span>Generating...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Generate Content</span>
            </div>
          )}
        </Button>

        {/* Status Info */}
        {canGenerate && (
          <div className="text-xs text-muted-foreground text-center">
            Ready to generate {selectedOutputType.replace(/-/g, ' ')} content with {voices.find(v => v.value === selectedVoice)?.label || selectedVoice} voice
          </div>
        )}
      </CardContent>

      {/* Generated Content Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader className="bg-gradient-surface border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-bold text-primary">
              Generated Content
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Generated by <strong className="text-primary">{voices.find(v => v.value === selectedVoice)?.label || selectedVoice}</strong> voice as <strong className="text-accent">{selectedOutputType}</strong> for: <strong className="text-foreground">{topic}</strong>
            </DialogDescription>
          </DialogHeader>

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
                {generatedContent || "Generated content will appear here..."}
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
                  disabled={isProcessingAction === 'poeticize' || !generatedContent}
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
                  disabled={isProcessingAction === 'rewrite' || !generatedContent}
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
                  disabled={isProcessingAction === 'shorten' || !generatedContent}
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

          <DialogFooter className="bg-gradient-surface border-t border-border/30 pt-4">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={!!isProcessingAction}
              className="bg-accent/20 border-accent/50 text-accent hover:bg-accent/30 hover:border-accent/70 hover:shadow-md transition-all duration-200 font-medium"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Voice Modal */}
      <Dialog open={voiceModalOpen} onOpenChange={setVoiceModalOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingVoice ? "Edit Voice" : "Create Custom Voice"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingVoice
                ? "Update your custom voice details"
                : "Create a custom voice profile for content generation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name</Label>
              <Input
                id="voice-name"
                placeholder="Enter voice name"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-description">Voice Description</Label>
              <Input
                id="voice-description"
                placeholder="Describe the voice style"
                value={newVoiceDescription}
                onChange={(e) => setNewVoiceDescription(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoiceModalOpen(false);
                setNewVoiceName("");
                setNewVoiceDescription("");
                setEditingVoice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVoice}
              disabled={!newVoiceName.trim() || !newVoiceDescription.trim()}
              className="bg-gradient-primary hover:shadow-glow"
            >
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
              <Label htmlFor="voice-profile-name">Name your voice</Label>
              <Input
                id="voice-profile-name"
                placeholder="Name your voice..."
                value={voiceProfileName}
                onChange={(e) => setVoiceProfileName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload your articles</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="voice-file-upload"
                  multiple
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="voice-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload articles</div>
                  <div className="text-xs text-muted-foreground">PDF or TXT files only</div>
                </label>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedFiles.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFile(index)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoiceProfileModalOpen(false);
                setUploadedFiles([]);
                setVoiceProfileName("");
              }}
              disabled={isUploadingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVoiceProfile}
              disabled={uploadedFiles.length === 0 || !voiceProfileName.trim() || isUploadingProfile}
              className="bg-gradient-primary hover:shadow-glow"
            >
              {isUploadingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Voice Profile
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