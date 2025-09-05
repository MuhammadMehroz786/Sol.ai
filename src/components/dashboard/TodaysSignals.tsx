import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Send, TrendingUp } from "lucide-react";

const mockSignals = [
  {
    id: "1",
    headline: "AI Regulation Framework Published by EU",
    summary: "The European Union has released comprehensive guidelines for AI governance, focusing on transparency and accountability in automated decision-making systems.",
    tags: ["AI", "Regulation", "Europe", "Policy"],
    source: "TechCrunch",
    url: "https://techcrunch.com/ai-regulation",
    score: 95,
    timestamp: "2 hours ago"
  },
  {
    id: "2", 
    headline: "OpenAI Announces GPT-5 Development Milestone",
    summary: "OpenAI reveals significant progress in next-generation language model training, with enhanced reasoning capabilities and reduced hallucination rates.",
    tags: ["OpenAI", "GPT-5", "AI", "Technology"],
    source: "The Verge",
    url: "https://theverge.com/openai-gpt5",
    score: 92,
    timestamp: "4 hours ago"
  },
  {
    id: "3",
    headline: "Major Tech Companies Form AI Safety Alliance",
    summary: "Google, Microsoft, and Amazon collaborate on industry-wide safety standards for AI deployment in enterprise environments.",
    tags: ["AI Safety", "Tech Giants", "Collaboration"],
    source: "Reuters",
    url: "https://reuters.com/tech-ai-alliance",
    score: 88,
    timestamp: "6 hours ago"
  }
];

export const TodaysSignals = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Today's Signals</span>
            </CardTitle>
            <CardDescription>
              Top-ranked signals from your content sources
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockSignals.map((signal) => (
          <div key={signal.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-foreground line-clamp-2">
                    {signal.headline}
                  </h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {signal.score}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {signal.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {signal.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {signal.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{signal.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{signal.source}</span>
                    <span>•</span>
                    <span>{signal.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button variant="ghost" size="sm" asChild>
                <a href={signal.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Source
                </a>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Send className="h-4 w-4 mr-2" />
                Send to Editorial
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};