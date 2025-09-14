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
          <div key={signal.id} className="bg-gradient-card border-2 border-border rounded-xl p-6 space-y-4 hover:shadow-elegant transition-all duration-300 hover:border-primary/30">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-start gap-3">
                  <h3 className="font-bold text-lg text-foreground line-clamp-2 leading-tight flex-1">
                    {signal.headline}
                  </h3>
                  <Badge variant="default" className="bg-primary text-primary-foreground font-bold text-sm px-3 py-1 min-w-fit">
                    {signal.score}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-base leading-relaxed">
                  {signal.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {signal.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-accent/20 text-accent-foreground font-medium px-2 py-1">
                        {tag}
                      </Badge>
                    ))}
                    {signal.tags.length > 3 && (
                      <Badge variant="secondary" className="bg-accent/20 text-accent-foreground font-medium px-2 py-1">
                        +{signal.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                    <span className="text-foreground">{signal.source}</span>
                    <span>•</span>
                    <span>{signal.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <Button variant="outline" size="sm" className="border-border hover:border-primary/50 hover:bg-primary/5" asChild>
                <a href={signal.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Source
                </a>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-accent shadow-sm hover:shadow-md transition-all duration-200 font-medium px-4">
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