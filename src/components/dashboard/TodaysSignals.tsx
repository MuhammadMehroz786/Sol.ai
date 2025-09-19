import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target } from "lucide-react";

const signals = [
  {
    id: 1,
    rank: 1,
    headline: "AI Revolution in Creative Content Generation",
    summary: "Major breakthrough in AI-generated content creation with new GPT models showing unprecedented creativity and cultural awareness. This could reshape how SOLE approaches content production.",
    tags: ["AI", "Creative", "Technology", "Culture"],
    url: "https://example.com/ai-creative-breakthrough",
    priority: "High",
    timestamp: "2 hours ago",
    source: "TechCrunch",
    score: 95,
    engagement: "73% increase"
  },
  {
    id: 2,
    rank: 2,
    headline: "Cultural Shifts in Gen Z Digital Engagement",
    summary: "Emerging trends show significant changes in how brands connect with Gen Z audiences through authentic storytelling and community-driven content strategies.",
    tags: ["Marketing", "Culture", "Gen Z", "Storytelling"],
    url: "https://example.com/gen-z-engagement",
    priority: "High",
    timestamp: "3 hours ago",
    source: "Harvard Business Review",
    score: 92,
    engagement: "45% growth"
  },
  {
    id: 3,
    rank: 3,
    headline: "Rise of Micro-Influencer Authenticity",
    summary: "Study reveals micro-influencers with 10K-100K followers drive 3x higher engagement rates than mega-influencers, emphasizing authentic community connections.",
    tags: ["Influencer", "Marketing", "Authenticity"],
    url: "https://example.com/micro-influencer-study",
    priority: "Medium",
    timestamp: "5 hours ago",
    source: "Social Media Today",
    score: 88,
    engagement: "28% boost"
  },
  {
    id: 4,
    rank: 4,
    headline: "AI-Powered Personalization in Content",
    summary: "New algorithms enable real-time content personalization based on cultural context, user behavior, and emotional state analysis.",
    tags: ["AI", "Personalization", "UX"],
    url: "https://example.com/ai-personalization",
    priority: "Medium",
    timestamp: "6 hours ago",
    source: "Wired",
    score: 85,
    engagement: "18% lift"
  },
  {
    id: 5,
    rank: 5,
    headline: "Sustainability Messaging in Brand Identity",
    summary: "Consumer research shows 73% of millennials willing to pay premium for sustainable brands, driving major shifts in brand messaging strategies.",
    tags: ["Sustainability", "Branding", "Millennials"],
    url: "https://example.com/sustainability-branding",
    priority: "Medium",
    timestamp: "8 hours ago",
    source: "Fast Company",
    score: 82,
    engagement: "22% rise"
  }
];

export const TodaysSignals = () => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium": return "bg-warning/10 text-warning border-warning/20";
      case "Low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Star className="h-4 w-4 text-orange-500" />;
      case 3: return <Target className="h-4 w-4 text-blue-500" />;
      default: return <div className="w-4 h-4 rounded-full bg-muted text-xs flex items-center justify-center font-bold">{rank}</div>;
    }
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span>Today's Signals</span>
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">
            {signals.length} Active
          </Badge>
        </CardTitle>
        <CardDescription>
          Priority content signals detected and ranked by Scout GPT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.id} className="group relative bg-card border border-border rounded-lg p-5 hover:shadow-elevated transition-all duration-300 hover:border-primary/30">
            {/* Rank Badge */}
            <div className="absolute -top-3 -left-3 flex items-center justify-center">
              <div className="bg-background border-2 border-primary rounded-full p-2 shadow-md">
                {getRankIcon(signal.rank)}
              </div>
            </div>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {signal.headline}
                  </h3>
                  <Badge className={getPriorityColor(signal.priority)}>
                    {signal.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                  {signal.summary}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary mb-1">{signal.score}</div>
                <div className="text-xs text-success font-medium">{signal.engagement}</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {signal.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-accent/10 text-accent-foreground hover:bg-accent/20">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{signal.timestamp}</span>
                </div>
                <span>•</span>
                <span className="font-medium">{signal.source}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                  <Zap className="h-3 w-3 mr-1" />
                  Send to Editorial GPT
                </Button>
                <Button size="sm" variant="outline" className="hover:bg-accent/10">
                  Chain Agent
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Load More */}
        <div className="pt-4 border-t border-border">
          <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground hover:bg-accent/10">
            Load More Signals
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};