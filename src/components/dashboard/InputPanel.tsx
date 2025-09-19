import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Wand2, Send, Lightbulb, User, Volume2, FileText, Sparkles, Brain, Target, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const InputPanel = () => {
  const [topic, setTopic] = useState("AI's impact on authentic cultural storytelling and community building in the digital age");
  const [persona, setPersona] = useState("");
  const [tone, setTone] = useState("");
  const [outputType, setOutputType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const personas = [
    { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader, direct and powerful", avatar: "🔥" },
    { value: "ana", label: "Ana", description: "Cultural critic, insightful and nuanced", avatar: "✨" },
    { value: "winston", label: "Winston", description: "Tech analyst, data-driven and strategic", avatar: "🧠" },
    { value: "custom", label: "Custom Voice", description: "Define your own unique persona", avatar: "🎯" }
  ];

  const tones = [
    { value: "poetic", label: "Poetic", description: "Lyrical, metaphorical, emotionally resonant", color: "text-purple-600" },
    { value: "urgent", label: "Urgent", description: "Direct, compelling, action-oriented", color: "text-red-600" },
    { value: "data-driven", label: "Data-driven", description: "Analytical, evidence-based, factual", color: "text-blue-600" },
    { value: "cultural", label: "Cultural", description: "Community-focused, authentic, relatable", color: "text-green-600" },
    { value: "analytical", label: "Analytical", description: "Deep-dive, strategic, comprehensive", color: "text-indigo-600" },
    { value: "conversational", label: "Conversational", description: "Approachable, engaging, personal", color: "text-orange-600" }
  ];

  const outputTypes = [
    { value: "article", label: "Article", description: "Medium-form content, 800-1500 words", icon: FileText },
    { value: "tweet-thread", label: "Tweet Thread", description: "Sequential social media posts", icon: Target },
    { value: "script", label: "Script", description: "Video or audio content script", icon: Brain },
    { value: "prompt", label: "Prompt", description: "AI prompt for further generation", icon: Lightbulb },
    { value: "longform", label: "Longform", description: "In-depth piece, 2000+ words", icon: FileText },
    { value: "white-paper", label: "White Paper", description: "Research-backed document", icon: FileText }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persona || !tone || !outputType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before generating content.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Content Generated Successfully!",
        description: `${outputType.replace('-', ' ')} created with ${persona}'s ${tone} voice.`,
      });
      console.log({ topic, persona, tone, outputType });
    }, 3000);
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Wand2 className="h-4 w-4 text-white" />
          </div>
          <span>Content Generator</span>
          <Badge className="ml-auto bg-success/10 text-success border-success/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Ready
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure your content generation parameters with SOLE's AI agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Input */}
          <div className="space-y-3">
            <Label htmlFor="topic" className="text-sm font-semibold flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Topic / Content Idea</span>
            </Label>
            <Textarea
              id="topic"
              placeholder="Enter your content topic or idea..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[120px] bg-background border-border resize-none text-sm leading-relaxed"
            />
            <div className="flex items-start space-x-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-primary">
                <p className="font-medium mb-1">Scout GPT Suggestion</p>
                <p>This topic is trending with 73% engagement increase. Consider focusing on community impact and authentic storytelling angles.</p>
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Persona Selection */}
            <div className="space-y-3">
              <Label htmlFor="persona" className="text-sm font-semibold flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Persona</span>
              </Label>
              <Select value={persona} onValueChange={setPersona}>
                <SelectTrigger className="bg-background border-border h-12">
                  <SelectValue placeholder="Choose voice" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {personas.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="py-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{p.avatar}</span>
                        <div>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone Selection */}
            <div className="space-y-3">
              <Label htmlFor="tone" className="text-sm font-semibold flex items-center space-x-2">
                <Volume2 className="h-4 w-4" />
                <span>Tone</span>
              </Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-background border-border h-12">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {tones.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="py-3">
                      <div>
                        <div className={`font-medium ${t.color}`}>{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="output-type" className="text-sm font-semibold flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Output Type</span>
              </Label>
              <Select value={outputType} onValueChange={setOutputType}>
                <SelectTrigger className="bg-background border-border h-12">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {outputTypes.map((o) => {
                    const Icon = o.icon;
                    return (
                      <SelectItem key={o.value} value={o.value} className="py-3">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{o.label}</div>
                            <div className="text-xs text-muted-foreground">{o.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-info/10 text-info border-info/20">
                <Zap className="h-3 w-3 mr-1" />
                Est. 45-90 seconds
              </Badge>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                {topic.length}/500 chars
              </Badge>
            </div>
            
            <Button 
              type="submit" 
              size="lg" 
              disabled={!persona || !tone || !outputType || isGenerating}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-8"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};