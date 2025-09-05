import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Zap, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const personas = [
  { value: "malcolm", label: "Malcolm", description: "Analytical & Strategic" },
  { value: "ana", label: "Ana", description: "Creative & Engaging" },
  { value: "winston", label: "Winston", description: "Technical & Detailed" },
  { value: "custom", label: "Custom", description: "User-defined style" }
];

const tones = [
  { value: "poetic", label: "Poetic", description: "Lyrical and expressive" },
  { value: "urgent", label: "Urgent", description: "Immediate and pressing" },
  { value: "data-driven", label: "Data-driven", description: "Facts and analysis focused" },
  { value: "cultural", label: "Cultural", description: "Social context aware" }
];

const outputTypes = [
  { value: "article", label: "Article", description: "Long-form content" },
  { value: "tweet-thread", label: "Tweet Thread", description: "Social media series" },
  { value: "script", label: "Script", description: "Video/audio content" },
  { value: "prompt", label: "Prompt", description: "AI instruction template" },
  { value: "longform", label: "Longform", description: "Extended analysis (Coming Soon)", disabled: true },
  { value: "whitepaper", label: "White Paper", description: "Technical document (Coming Soon)", disabled: true }
];

export const InputPanel = () => {
  const [persona, setPersona] = useState("");
  const [tone, setTone] = useState("");
  const [outputType, setOutputType] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!persona || !tone || !outputType || !topic.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before generating content.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Call the appropriate API endpoint
      const endpoint = outputType === 'article' ? '/api/scout-editorial' : '/api/editorial';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona,
          tone,
          outputType,
          topic: topic.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate content');
      }
      
      const result = await response.json();
      
      toast({
        title: "Content Generated",
        description: `${outputType} created with ${persona}'s ${tone} style.`,
      });
      
      // Reset form after successful generation
      setPersona("");
      setTone("");
      setOutputType("");
      setTopic("");
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wand2 className="h-5 w-5" />
          <span>Content Generator</span>
        </CardTitle>
        <CardDescription>
          Create new content with AI-powered personas and styles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Persona Selection */}
        <div className="space-y-2">
          <Label htmlFor="persona">Persona</Label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a writing persona" />
            </SelectTrigger>
            <SelectContent>
              {personas.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Tone Selection */}
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue placeholder="Select writing tone" />
            </SelectTrigger>
            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Output Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="output-type">Output Type</Label>
          <Select value={outputType} onValueChange={setOutputType}>
            <SelectTrigger>
              <SelectValue placeholder="Choose output format" />
            </SelectTrigger>
            <SelectContent>
              {outputTypes.map((ot) => (
                <SelectItem 
                  key={ot.value} 
                  value={ot.value}
                  disabled={ot.disabled}
                >
                  <div className="flex flex-col">
                    <span className={`font-medium ${ot.disabled ? 'text-muted-foreground' : ''}`}>
                      {ot.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{ot.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Topic Input */}
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Textarea
            id="topic"
            placeholder="Enter your topic or paste a signal headline here..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Generate Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90" 
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Generate Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};