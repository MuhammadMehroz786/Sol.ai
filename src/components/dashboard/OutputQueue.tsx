import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, User, Eye } from "lucide-react";

const mockOutputs = [
  {
    id: "1",
    title: "AI Regulation Analysis: What Businesses Need to Know",
    persona: "Malcolm",
    tone: "Data-driven",
    type: "Article",
    status: "Draft",
    created: "1 hour ago",
    wordCount: 1245
  },
  {
    id: "2",
    title: "🧵 Breaking down the new EU AI regulations",
    persona: "Ana", 
    tone: "Urgent",
    type: "Tweet thread",
    status: "Review",
    created: "3 hours ago",
    wordCount: 280
  },
  {
    id: "3",
    title: "OpenAI GPT-5: Technical Deep Dive",
    persona: "Winston",
    tone: "Poetic",
    type: "Script",
    status: "Final",
    created: "5 hours ago",
    wordCount: 890
  },
  {
    id: "4",
    title: "Tech Alliance Safety Standards Overview",
    persona: "Custom",
    tone: "Cultural",
    type: "Article", 
    status: "Draft",
    created: "2 hours ago",
    wordCount: 1567
  }
];

interface OutputQueueProps {
  onSelectOutput: (output: any) => void;
}

export const OutputQueue = ({ onSelectOutput }: OutputQueueProps) => {
  const [activeTab, setActiveTab] = useState("draft");
  
  const filterByStatus = (status: string) => 
    mockOutputs.filter(output => output.status.toLowerCase() === status);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <Badge variant="secondary">{status}</Badge>;
      case "review":
        return <Badge className="bg-warning/10 text-warning border-warning/20">{status}</Badge>;
      case "final":
        return <Badge className="bg-success/10 text-success border-success/20">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const OutputItem = ({ output }: { output: any }) => (
    <div className="border border-border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h3 className="font-medium text-foreground line-clamp-1">
            {output.title}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>{output.persona}</span>
            </div>
            <span>•</span>
            <span>{output.tone}</span>
            <span>•</span>
            <span>{output.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{output.created}</span>
              <span>•</span>
              <span>{output.wordCount} words</span>
            </div>
            {getStatusBadge(output.status)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end pt-2 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onSelectOutput(output)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Output
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Output Queue</span>
            </CardTitle>
            <CardDescription>
              Generated content awaiting review and publication
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draft">
              Draft ({filterByStatus("draft").length})
            </TabsTrigger>
            <TabsTrigger value="review">
              Review ({filterByStatus("review").length})
            </TabsTrigger>
            <TabsTrigger value="final">
              Final ({filterByStatus("final").length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="draft" className="space-y-4 mt-4">
            {filterByStatus("draft").map((output) => (
              <OutputItem key={output.id} output={output} />
            ))}
          </TabsContent>
          
          <TabsContent value="review" className="space-y-4 mt-4">
            {filterByStatus("review").map((output) => (
              <OutputItem key={output.id} output={output} />
            ))}
          </TabsContent>
          
          <TabsContent value="final" className="space-y-4 mt-4">
            {filterByStatus("final").map((output) => (
              <OutputItem key={output.id} output={output} />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};