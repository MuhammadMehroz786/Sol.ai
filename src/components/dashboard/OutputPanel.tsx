import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  RefreshCw, 
  Scissors, 
  Sparkles, 
  Send,
  User,
  Clock,
  FileText,
  Copy,
  Eye,
  Share,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Zap,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface OutputPanelProps {
  output: {
    id: string;
    title: string;
    persona: string;
    tone: string;
    type: string;
    status: string;
    created: string;
    wordCount: number;
    preview?: string;
    tags?: string[];
  };
}

const sampleContent = `# The Future of AI in Creative Industries

## Introduction

The intersection of artificial intelligence and human creativity represents one of the most fascinating frontiers in modern technology. As we stand at this crossroads, it's essential to examine how AI is not replacing human creativity, but rather amplifying it in unprecedented ways.

## The Cultural Context

In the realm of SOLE's vision, AI becomes a tool for authentic cultural expression rather than a replacement for human insight. The technology serves as a catalyst for deeper storytelling and community connection.

### Key Insights:

1. **Amplification, Not Replacement**: AI enhances human creativity rather than diminishing it
2. **Cultural Authenticity**: Technology must serve genuine cultural expression
3. **Community Connection**: Tools should strengthen rather than isolate communities

## The SOLE Approach

At SOLE, we believe in "Born for Us. Raised by the Culture" - a philosophy that puts community and authenticity at the center of technological innovation.

### Strategic Implementation:

- **Community-First Design**: Every AI tool is designed with community building in mind
- **Cultural Sensitivity**: Understanding that technology must respect and enhance cultural narratives
- **Authentic Voice**: Maintaining genuine human expression in AI-assisted content

## Looking Forward

The future of AI in creative industries isn't about perfect algorithms or flawless automation. It's about creating technology that understands culture, respects community, and amplifies authentic human voices.

As we continue this journey, SOLE remains committed to developing AI that serves people, not the other way around.

---

*This content was generated using SOLE's Editorial GPT with Ana's analytical tone, focusing on cultural authenticity and community impact.*`;

export const OutputPanel = ({ output }: OutputPanelProps) => {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<string>("");

  const quickActions = [
    { value: "rewrite", label: "Rewrite", icon: RefreshCw },
    { value: "shorten", label: "Shorten", icon: Scissors },
    { value: "enhance", label: "Enhance", icon: Sparkles }
  ];

  const handleDownload = async () => {
    try {
      const blob = new Blob([sampleContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${output.title.replace(/\s+/g, '-').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Markdown file has been downloaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Unable to download the content.",
        variant: "destructive"
      });
    }
  };

  const handleAction = (action: string) => {
    if (action === "export") {
      handleDownload();
      return;
    }
    
    toast({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Processing`,
      description: `Your request for "${output.title}" is being processed by our AI agents.`,
    });
  };

  const handleApplyAction = () => {
    if (!selectedAction) {
      toast({
        title: "No Action Selected",
        description: "Please select an action to apply.",
        variant: "destructive"
      });
      return;
    }

    handleAction(selectedAction);
    setSelectedAction(""); // Reset selection after applying
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(sampleContent);
      toast({
        title: "Content Copied",
        description: "The full content has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy content to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case "ana": return "bg-accent/10 text-accent-foreground border-accent/20";
      case "malcolm": return "bg-primary/10 text-primary border-primary/20";
      case "winston": return "bg-secondary/10 text-secondary-foreground border-secondary/20";
      default: return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "final": return "bg-success/10 text-success border-success/20";
      case "review": return "bg-warning/10 text-warning border-warning/20";
      case "draft": return "bg-info/10 text-info border-info/20";
      default: return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span>Generated Output</span>
            </CardTitle>
            <CardDescription>
              Review, edit, and publish your AI-generated content
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleCopyContent}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Output Metadata */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl text-foreground leading-tight">{output.title}</h3>
          
          <div className="flex flex-wrap gap-2">
            <Badge className={getPersonaColor(output.persona)}>
              <User className="h-3 w-3 mr-1" />
              {output.persona}
            </Badge>
            <Badge variant="outline" className="border-accent/20 text-accent-foreground">
              {output.tone}
            </Badge>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {output.type}
            </Badge>
            <Badge className={getStatusColor(output.status)}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {output.status}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{output.created}</span>
              </div>
              <span>•</span>
              <span>{output.wordCount} words</span>
              <span>•</span>
              <span>~{Math.round(output.wordCount / 200)} min read</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="secondary" className="bg-success/10 text-success">
                <BarChart3 className="h-3 w-3 mr-1" />
                Quality Score: 94%
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Content Preview</h4>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Full Screen
            </Button>
          </div>
          <div className="bg-background border border-border rounded-lg p-6 max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{sampleContent}</ReactMarkdown>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Quick Actions</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="flex-1 bg-background">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {quickActions.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <SelectItem key={action.value} value={action.value} className="hover:bg-accent">
                        <div className="flex items-center">
                          <IconComponent className="h-4 w-4 mr-2" />
                          {action.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleApplyAction}
                disabled={!selectedAction}
                variant="outline"
                className="hover:bg-primary/10 hover:border-primary/20"
              >
                Apply
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button 
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-sm px-3 py-2 h-9"
              onClick={() => handleAction("Send to CMS")}
            >
              <Send className="h-4 w-4 mr-2" />
              Send to CMS
            </Button>
            <Button 
              variant="outline"
              className="hover:bg-info/10 border-info/20 text-sm px-3 py-2 h-9"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};