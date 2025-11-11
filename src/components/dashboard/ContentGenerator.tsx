import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Loader2
} from "lucide-react";

const personas = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader" },
  { value: "ana", label: "Ana", description: "Cultural analyst" },
  { value: "winston", label: "Winston", description: "Strategic narrator" },
  { value: "custom", label: "Custom", description: "Define your own" }
];

const tones = [
  { value: "poetic", label: "Poetic", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300" },
  { value: "data-driven", label: "Data-driven", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300" },
  { value: "cultural", label: "Cultural", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" }
];

const outputTypes = [
  { value: "article", label: "Article", icon: FileText, description: "Article (350–500 words)" },
  { value: "tweet-thread", label: "Tweet Thread", icon: Twitter, description: "Tweet thread (7–10 posts)" },
  { value: "script", label: "Script", icon: Video, description: "Script (voiceover or video narration)" },
  { value: "prompt", label: "Daily Prompt", icon: ScrollText, description: "Daily Prompt (short-form idea/question)" },
  { value: "longform", label: "Longform", icon: BookOpen, description: "Deep analysis (Phase 2)" },
  { value: "whitepaper", label: "White Paper", icon: FileImage, description: "Technical document (Phase 2)" }
];

export const ContentGenerator = () => {
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedTone, setSelectedTone] = useState("");
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState("");


  const handleGenerate = async () => {
    if (!selectedPersona || !selectedOutputType || !selectedTone || !topic.trim()) return;
    
    setIsGenerating(true);
    
    try {
      console.log('Starting editorial request...');

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

  const canGenerate = selectedPersona && selectedOutputType && selectedTone && topic.trim();

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
          <Select value={selectedPersona} onValueChange={setSelectedPersona}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a persona..." />
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => (
                <SelectItem key={persona.value} value={persona.value}>
                  <div>
                    <div className="font-medium">{persona.label}</div>
                    <div className="text-sm text-muted-foreground">{persona.description}</div>
                  </div>
                </SelectItem>
              ))}
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
        </div>

        <Separator />

        {/* Output Type */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Output Type</span>
          </Label>
          <Select value={selectedOutputType} onValueChange={setSelectedOutputType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select output type..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-50">
              {outputTypes.map((type) => (
                <SelectItem 
                  key={type.value} 
                  value={type.value}
                  disabled={type.value === "longform" || type.value === "whitepaper"}
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
            Ready to generate {selectedOutputType.replace('-', ' ')} content with {selectedPersona} persona
            {selectedTone && ` in ${tones.find(t => t.value === selectedTone)?.label} tone`}
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
    </Card>
  );
};