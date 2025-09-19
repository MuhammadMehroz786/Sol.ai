import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  User, 
  FileText, 
  Twitter,
  Video,
  ScrollText,
  BookOpen,
  FileImage
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
  { value: "article", label: "Article", icon: FileText, description: "Long-form content" },
  { value: "tweet-thread", label: "Tweet Thread", icon: Twitter, description: "Social media series" },
  { value: "script", label: "Script", icon: Video, description: "Video/audio content" },
  { value: "prompt", label: "Prompt", icon: ScrollText, description: "AI prompt template" },
  { value: "longform", label: "Longform", icon: BookOpen, description: "Deep analysis (Phase 2)" },
  { value: "whitepaper", label: "White Paper", icon: FileImage, description: "Technical document (Phase 2)" }
];

export const ContentGenerator = () => {
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedOutputType, setSelectedOutputType] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleTone = (tone: string) => {
    setSelectedTones(prev => 
      prev.includes(tone) 
        ? prev.filter(t => t !== tone)
        : [...prev, tone]
    );
  };

  const handleGenerate = async () => {
    if (!selectedPersona || !selectedOutputType || !topic.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // For now, generate sample content - this would be replaced with actual AI generation
      const sampleContent = generateSampleContent(selectedPersona, selectedOutputType, topic, selectedTones);
      
      // Here you would integrate with your AI generation logic
      // For now, we'll create a mock output after a delay
      setTimeout(async () => {
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('User not authenticated');

          const { error } = await supabase
            .from('content_outputs')
            .insert({
              user_id: user.user.id,
              title: `${selectedOutputType.replace('-', ' ')} about ${topic.substring(0, 50)}`,
              content: sampleContent,
              persona: selectedPersona,
              tones: selectedTones,
              output_type: selectedOutputType,
              status: 'draft',
              topic_context: topic
            });

          if (error) throw error;

          // Reset form
          setSelectedPersona("");
          setSelectedTones([]);
          setSelectedOutputType("");
          setTopic("");
          
          // Show success message
          const { toast } = await import("@/hooks/use-toast");
          toast({
            title: "Content generated!",
            description: "Your content has been added to the queue",
          });
          
        } catch (error: any) {
          console.error('Error saving content:', error);
          const { toast } = await import("@/hooks/use-toast");
          toast({
            title: "Error generating content",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsGenerating(false);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
    }
  };

  const generateSampleContent = (persona: string, outputType: string, topic: string, tones: string[]) => {
    const toneText = tones.length > 0 ? ` with a ${tones.join(' and ')} tone` : '';
    
    switch (outputType) {
      case 'article':
        return `# ${topic}\n\nThis is a comprehensive article written by ${persona}${toneText}.\n\n## Introduction\n\nThis article explores the nuances of ${topic} from a unique perspective...\n\n## Key Points\n\n- Point 1: Understanding the fundamentals\n- Point 2: Practical applications\n- Point 3: Future implications\n\n## Conclusion\n\nIn conclusion, ${topic} represents a significant opportunity for growth and innovation...`;
      
      case 'tweet-thread':
        return `🧵 Thread: ${topic}\n\n1/ ${persona} here with thoughts on ${topic}${toneText}\n\n2/ The key insight is that we need to think differently about this space\n\n3/ Here's what most people get wrong...\n\n4/ But here's the opportunity...\n\n5/ Final thoughts: ${topic} is just getting started\n\n/end`;
      
      case 'script':
        return `SCRIPT: ${topic}\n\n[INTRO]\nHey everyone, ${persona} here. Today we're diving deep into ${topic}${toneText}.\n\n[MAIN CONTENT]\nSo let's start with the basics...\n\n[CALL TO ACTION]\nWhat do you think about ${topic}? Let me know in the comments below.\n\n[OUTRO]\nThanks for watching, see you next time!`;
      
      case 'prompt':
        return `You are ${persona}, responding ${toneText} about ${topic}.\n\nContext: ${topic}\n\nYour task is to provide insights that are:\n- Authentic to your voice\n- Culturally relevant\n- Actionable for the audience\n\nRespond with depth and nuance, avoiding surface-level analysis.`;
      
      default:
        return `Content about ${topic} written by ${persona}${toneText}.\n\nThis is placeholder content that would be generated by AI based on your specifications.`;
    }
  };

  const canGenerate = selectedPersona && selectedOutputType && topic.trim();

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
          <Label className="text-base font-medium">Tone Modifiers</Label>
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <Badge
                key={tone.value}
                variant={selectedTones.includes(tone.value) ? "default" : "outline"}
                className={`cursor-pointer transition-all hover:scale-105 ${
                  selectedTones.includes(tone.value) 
                    ? "bg-primary text-primary-foreground" 
                    : tone.color
                }`}
                onClick={() => toggleTone(tone.value)}
              >
                {tone.label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Output Type */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Output Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {outputTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedOutputType === type.value ? "default" : "outline"}
                className="h-auto p-3 justify-start"
                onClick={() => setSelectedOutputType(type.value)}
                disabled={type.value === "longform" || type.value === "whitepaper"}
              >
                <div className="flex items-center space-x-3">
                  <type.icon className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-base font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
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
            {selectedTones.length > 0 && ` in ${selectedTones.join(', ')} tone${selectedTones.length > 1 ? 's' : ''}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};