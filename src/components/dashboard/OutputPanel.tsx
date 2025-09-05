import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  RefreshCw, 
  Scissors, 
  Sparkles, 
  Send,
  User,
  Clock,
  FileText,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  };
}

const sampleContent = `# AI Regulation Analysis: What Businesses Need to Know

The European Union's comprehensive AI governance framework represents a pivotal moment in the evolution of artificial intelligence regulation. This landmark legislation establishes clear guidelines for transparency and accountability in automated decision-making systems.

## Key Regulatory Requirements

The new framework introduces several critical requirements:

1. **Transparency Obligations**: Organizations must provide clear documentation of AI system capabilities and limitations
2. **Risk Assessment Protocols**: Mandatory evaluation of potential societal impacts before deployment
3. **Human Oversight Mechanisms**: Ensuring meaningful human control in high-stakes decisions

## Business Implementation Timeline

Companies have 18 months to achieve compliance across three phases:
- **Phase 1** (Months 1-6): Risk assessment and documentation
- **Phase 2** (Months 7-12): System modifications and testing
- **Phase 3** (Months 13-18): Full compliance verification

## Strategic Recommendations

Organizations should begin immediate preparation by establishing cross-functional AI governance teams and conducting comprehensive audits of existing AI implementations.

The regulatory landscape will continue evolving, but early adopters who embrace transparency and accountability will gain competitive advantages in the AI-driven economy.`;

export const OutputPanel = ({ output }: OutputPanelProps) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    toast({
      title: `${action} Initiated`,
      description: `Processing your request for "${output.title}"`,
    });
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(sampleContent);
      toast({
        title: "Content Copied",
        description: "The content has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy content to clipboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Generated Output</span>
            </CardTitle>
            <CardDescription>
              Review and manage your generated content
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopyContent}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Output Metadata */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">{output.title}</h3>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <User className="h-3 w-3" />
              <span>{output.persona}</span>
            </Badge>
            <Badge variant="outline">{output.tone}</Badge>
            <Badge variant="outline">{output.type}</Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{output.created}</span>
            </div>
            <span>•</span>
            <span>{output.wordCount} words</span>
          </div>
        </div>

        <Separator />

        {/* Content Preview */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Content Preview</h4>
          <div className="bg-muted/30 rounded-lg p-4 max-h-80 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-foreground">
                {sampleContent}
              </pre>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleAction("Rewrite")}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Rewrite
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleAction("Shorten")}
            >
              <Scissors className="h-4 w-4 mr-2" />
              Shorten
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleAction("Poeticize")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Poeticize
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleAction("Download")}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          
          <Button 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => handleAction("Send to CMS")}
          >
            <Send className="h-4 w-4 mr-2" />
            Send to CMS
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};