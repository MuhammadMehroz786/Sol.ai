import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      // Here you would integrate with your AI generation logic
    }, 3000);
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
            <CardTitle className="text-lg font-semibold">Content Generator</CardTitle>
            <CardDescription className="text-sm">
              Create tailored content with AI personas
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Persona Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center space-x-2">
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
                    <div className="text-xs text-muted-foreground">{persona.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Tone Modifiers */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tone Modifiers</Label>
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
          <Label className="text-sm font-medium">Output Type</Label>
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
                    <div className="text-sm font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Topic Input */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Topic & Context</Label>
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