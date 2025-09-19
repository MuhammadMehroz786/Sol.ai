import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, Clock, ArrowRight, Zap, Crown, Star, Target } from "lucide-react";

const signals = [
  {
    id: 1,
    rank: 1,
    headline: "AI Revolution in Creative Content Generation",
    summary: "Major breakthrough in AI-generated content with new GPT models showing unprecedented creativity and cultural awareness.",
    tags: ["AI", "Creative", "Technology"],
    priority: "High",
    timestamp: "2h",
    source: "TechCrunch",
    score: 95,
    engagement: "+73%"
  },
  {
    id: 2,
    rank: 2,
    headline: "Cultural Shifts in Gen Z Digital Engagement",
    summary: "Emerging trends show significant changes in how brands connect with Gen Z through authentic storytelling.",
    tags: ["Marketing", "Culture", "Gen Z"],
    priority: "High",
    timestamp: "3h",
    source: "HBR",
    score: 92,
    engagement: "+45%"
  },
  {
    id: 3,
    rank: 3,
    headline: "Rise of Micro-Influencer Authenticity",
    summary: "Study reveals micro-influencers drive 3x higher engagement rates than mega-influencers.",
    tags: ["Influencer", "Marketing"],
    priority: "Medium",
    timestamp: "5h",
    source: "SMT",
    score: 88,
    engagement: "+28%"
  }
];

export const TodaysSignals = () => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-3 w-3 text-yellow-500" />;
      case 2: return <Star className="h-3 w-3 text-orange-500" />;
      case 3: return <Target className="h-3 w-3 text-blue-500" />;
      default: return <div className="w-3 h-3 rounded-full bg-muted text-xs flex items-center justify-center font-bold">{rank}</div>;
    }
  };

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span>Today's Signals</span>
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-sm">
            {signals.length}
          </Badge>
        </CardTitle>
        <CardDescription className="text-base">
          Priority signals ranked by Scout GPT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((signal) => (
          <div key={signal.id} className="group relative bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:border-primary/30">
            {/* Compact Rank */}
            <div className="absolute -top-1 -left-1 bg-background border border-primary rounded-full p-1">
              {getRankIcon(signal.rank)}
            </div>
            
            <div className="flex justify-between items-start mb-3 pl-4">
              <div className="flex-1 pr-3">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {signal.headline}
                  </h3>
                  <Badge className={`text-sm ${getPriorityColor(signal.priority)}`}>
                    {signal.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {signal.summary}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{signal.score}</div>
                <div className="text-sm text-success">{signal.engagement}</div>
              </div>
            </div>

            {/* Compact Tags */}
            <div className="flex flex-wrap gap-1 mb-3 pl-4">
              {signal.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm px-2 py-1 bg-accent/10 text-accent-foreground">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Compact Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border pl-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{signal.timestamp}</span>
                <span>•</span>
                <span>{signal.source}</span>
              </div>
              
              <div className="flex space-x-2">
                <Button size="sm" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-sm px-3 py-2 h-8">
                  <Zap className="h-4 w-4 mr-1" />
                  Send to Editorial GPT
                </Button>
                <Button size="sm" variant="outline" className="hover:bg-accent/10 text-sm px-3 py-2 h-8">
                  Chain
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary text-sm px-2 py-2 h-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Compact Load More */}
        <Button variant="ghost" size="sm" className="w-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 mt-3 py-2">
          Load More <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};