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
  Plus
} from "lucide-react";

const defaultPersonas = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader", isDefault: true },
  { value: "ana", label: "Ana", description: "Cultural analyst", isDefault: true },
  { value: "winston", label: "Winston", description: "Strategic narrator", isDefault: true }
];

const tones = [
  { value: "poetic", label: "Poetic", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300" },
  { value: "data-driven", label: "Data-driven", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" },
  { value: "cultural", label: "Cultural", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" },
  { value: "custom", label: "Custom", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300" }
];

const outputTypes = [
  { value: "article", label: "Article", icon: FileText, description: "Written article content" },
  { value: "tweet-thread", label: "Tweet Thread", icon: Twitter, description: "Tweet thread (7–10 posts)" },
  { value: "script", label: "Script", icon: Video, description: "Script (voiceover or video narration)" },
  { value: "prompt", label: "Daily Prompt", icon: ScrollText, description: "Daily Prompt (short-form idea/question)" }
];

const articleLengths = [
  { value: "short", label: "Short", description: "500-700 words" },
  { value: "medium", label: "Medium", description: "700-1600 words" },
  { value: "long", label: "Long", description: "1600+ words" }
];

interface CustomPersona {
  value: string;
  label: string;
  description: string;
  isDefault: boolean;
}

const PERSONAS_STORAGE_KEY = 'sole-custom-personas';

export const ContentGenerator = () => {
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedTone, setSelectedTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [selectedArticleLength, setSelectedArticleLength] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");

  // Custom persona management
  const [personas, setPersonas] = useState<CustomPersona[]>(defaultPersonas);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaDescription, setNewPersonaDescription] = useState("");

  // Article submenu hover state
  const [showArticleSubmenu, setShowArticleSubmenu] = useState(false);
  const [articleItemRef, setArticleItemRef] = useState<HTMLDivElement | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load custom personas from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PERSONAS_STORAGE_KEY);
    if (stored) {
      try {
        const customPersonas = JSON.parse(stored);
        setPersonas([...defaultPersonas, ...customPersonas]);
      } catch (e) {
        console.error('Failed to load custom personas:', e);
      }
    }
  }, []);

  // Save custom personas to localStorage
  const saveCustomPersonas = (allPersonas: CustomPersona[]) => {
    const customOnly = allPersonas.filter(p => !p.isDefault);
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(customOnly));
  };

  const handlePersonaChange = (value: string) => {
    if (value === "create-custom") {
      setEditingPersona(null);
      setNewPersonaName("");
      setNewPersonaDescription("");
      setPersonaModalOpen(true);
    } else {
      setSelectedPersona(value);
    }
  };

  const handleSavePersona = () => {
    if (!newPersonaName.trim() || !newPersonaDescription.trim()) return;

    const personaValue = newPersonaName.toLowerCase().replace(/\s+/g, '-');

    if (editingPersona) {
      // Edit existing persona
      const updatedPersonas = personas.map(p =>
        p.value === editingPersona.value
          ? { ...p, label: newPersonaName, description: newPersonaDescription }
          : p
      );
      setPersonas(updatedPersonas);
      saveCustomPersonas(updatedPersonas);

      // Update selection if editing the currently selected persona
      if (selectedPersona === editingPersona.value) {
        setSelectedPersona(personaValue);
      }
    } else {
      // Create new persona
      const newPersona: CustomPersona = {
        value: personaValue,
        label: newPersonaName,
        description: newPersonaDescription,
        isDefault: false
      };
      const updatedPersonas = [...personas, newPersona];
      setPersonas(updatedPersonas);
      saveCustomPersonas(updatedPersonas);
      setSelectedPersona(personaValue);
    }

    setPersonaModalOpen(false);
    setNewPersonaName("");
    setNewPersonaDescription("");
    setEditingPersona(null);
  };

  const handleEditPersona = (persona: CustomPersona) => {
    setEditingPersona(persona);
    setNewPersonaName(persona.label);
    setNewPersonaDescription(persona.description);
    setPersonaModalOpen(true);
  };

  const handleDeletePersona = (personaValue: string) => {
    const updatedPersonas = personas.filter(p => p.value !== personaValue);
    setPersonas(updatedPersonas);
    saveCustomPersonas(updatedPersonas);

    // Clear selection if deleting the currently selected persona
    if (selectedPersona === personaValue) {
      setSelectedPersona("");
    }
  };


  const handleGenerate = async () => {
    const needsTone = !selectedTone || (selectedTone === "custom" && !customTone.trim());

    if (!selectedPersona || !selectedOutputType || needsTone || !topic.trim()) return;

    setIsGenerating(true);

    try {
      console.log('Starting editorial request...');

      // Use custom tone if selected, otherwise use the tone value
      const effectiveTone = selectedTone === "custom" ? customTone : selectedTone;

      // Extract base output type and article length if applicable
      let baseOutputType = selectedOutputType;
      let articleLength = selectedArticleLength;

      if (selectedOutputType.startsWith('article-')) {
        baseOutputType = 'article';
        articleLength = selectedOutputType.replace('article-', '');
      }

      // Get persona details
      const personaDetails = personas.find(p => p.value === selectedPersona);

      const payload = {
        signal: {
          id: Date.now(),
          headline: topic,
          summary: topic,
          tags: ["Generated Content"],
          priority: "Medium",
          source: "Content Generator",
          score: 85,
          engagement: "+25%"
        },
        persona: selectedPersona,
        personaName: personaDetails?.label || selectedPersona,
        personaDescription: personaDetails?.description || "",
        outputType: baseOutputType,
        tone: effectiveTone,
        articleLength: articleLength || undefined
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
              persona: selectedPersona,
              tones: [selectedTone],
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
      const response = await fetch('https://soleai.app.n8n.cloud/webhook/ac317b82-2163-44ea-8324-5727d9d29a85', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signal: {
            id: Date.now(),
            headline: topic,
            summary: topic,
            tags: ["Generated Content"],
            priority: "Medium",
            source: "Content Generator",
            score: 85,
            engagement: "+25%"
          },
          persona: selectedPersona,
          outputType: selectedOutputType,
          tone: selectedTone,
          content: generatedContent,
          quickAction: action
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

  const needsTone = !selectedTone || (selectedTone === "custom" && !customTone.trim());
  const canGenerate = selectedPersona && selectedOutputType && !needsTone && topic.trim();

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
        {/* Persona Selector */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Persona</span>
          </Label>
          <Select value={selectedPersona} onValueChange={handlePersonaChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a persona...">
                {selectedPersona && personas.find(p => p.value === selectedPersona)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => (
                <SelectItem key={persona.value} value={persona.value}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{persona.label}</div>
                      <div className="text-sm text-muted-foreground">{persona.description}</div>
                    </div>
                    {!persona.isDefault && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-primary/20"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditPersona(persona);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeletePersona(persona.value);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="create-custom">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Plus className="h-4 w-4" />
                  <span>Create Custom Persona</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Tone Modifiers */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Tone</span>
          </Label>
          <Select value={selectedTone} onValueChange={setSelectedTone}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select tone..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-50">
              {tones.map((tone) => (
                <SelectItem
                  key={tone.value}
                  value={tone.value}
                  className="hover:bg-accent"
                >
                  <div className="font-medium">{tone.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom tone input - shown when Custom is selected */}
          {selectedTone === "custom" && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Custom Tone Description</Label>
              <Input
                placeholder="Enter your custom tone (e.g., 'Professional yet casual', 'Inspiring and motivational')"
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                className="bg-background"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Output Type */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Output Type</span>
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
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select output type...">
                {selectedOutputType && (
                  selectedOutputType.startsWith('article-')
                    ? `Article - ${articleLengths.find(l => l.value === selectedOutputType.replace('article-', ''))?.label}`
                    : outputTypes.find(t => t.value === selectedOutputType)?.label
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-50">
              {outputTypes.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  className="hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="text-base font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Article Size Selection - appears when Article is selected */}
          {(selectedOutputType === 'article' || selectedOutputType.startsWith('article-')) && (
            <div className="flex gap-2">
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
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-accent"
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
            Ready to generate {selectedOutputType.replace(/-/g, ' ')} content with {selectedPersona} persona
            {selectedTone && selectedTone !== "custom" && ` in ${tones.find(t => t.value === selectedTone)?.label} tone`}
            {selectedTone === "custom" && customTone && ` in ${customTone} tone`}
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
              Generated by <strong className="text-primary">{selectedPersona}</strong> as <strong className="text-accent">{selectedOutputType}</strong> with <strong className="text-warning">{tones.find(t => t.value === selectedTone)?.label}</strong> tone for: <strong className="text-foreground">{topic}</strong>
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

      {/* Custom Persona Modal */}
      <Dialog open={personaModalOpen} onOpenChange={setPersonaModalOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-card border-border/50 shadow-elegant">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              {editingPersona ? "Edit Persona" : "Create Custom Persona"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingPersona
                ? "Update your custom persona details"
                : "Create a custom persona profile for content generation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="persona-name">Persona Name</Label>
              <Input
                id="persona-name"
                placeholder="e.g., Tech Innovator, Brand Strategist"
                value={newPersonaName}
                onChange={(e) => setNewPersonaName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="persona-description">Persona Description</Label>
              <Input
                id="persona-description"
                placeholder="e.g., Expert in emerging technologies and innovation"
                value={newPersonaDescription}
                onChange={(e) => setNewPersonaDescription(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPersonaModalOpen(false);
                setNewPersonaName("");
                setNewPersonaDescription("");
                setEditingPersona(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePersona}
              disabled={!newPersonaName.trim() || !newPersonaDescription.trim()}
              className="bg-gradient-primary hover:shadow-glow"
            >
              {editingPersona ? "Update" : "Create"} Persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};