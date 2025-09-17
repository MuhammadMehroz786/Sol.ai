import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Search, 
  Filter,
  Edit3,
  Download,
  Share,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ContentOutput {
  id: string;
  title: string;
  content: string;
  persona: string;
  tones: string[];
  output_type: string;
  status: 'draft' | 'review' | 'final' | 'published';
  topic_context?: string;
  created_at: string;
  updated_at: string;
}

interface ContentQueueProps {
  onSelectOutput: (output: ContentOutput) => void;
}

const statusConfig = {
  draft: { 
    label: "Draft", 
    color: "bg-muted text-muted-foreground", 
    icon: Edit3 
  },
  review: { 
    label: "Review", 
    color: "bg-warning/20 text-warning", 
    icon: AlertCircle 
  },
  final: { 
    label: "Final", 
    color: "bg-success/20 text-success", 
    icon: CheckCircle 
  },
  published: { 
    label: "Published", 
    color: "bg-primary/20 text-primary", 
    icon: Share 
  }
};

export const ContentQueue = ({ onSelectOutput }: ContentQueueProps) => {
  const [outputs, setOutputs] = useState<ContentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchOutputs();
    }
  }, [user]);

  const fetchOutputs = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('content_outputs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOutputs((data || []) as ContentOutput[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: ContentOutput['status']) => {
    const { error } = await supabase
      .from('content_outputs')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchOutputs();
      toast({
        title: "Status updated",
        description: `Content moved to ${newStatus}`,
      });
    }
  };

  const deleteOutput = async (id: string) => {
    const { error } = await supabase
      .from('content_outputs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchOutputs();
      toast({
        title: "Content deleted",
        description: "Content has been removed from your queue",
      });
    }
  };

  const filteredOutputs = outputs.filter(output => {
    const matchesSearch = output.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         output.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || output.status === statusFilter;
    const matchesType = typeFilter === "all" || output.output_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const groupedOutputs = {
    draft: filteredOutputs.filter(o => o.status === 'draft'),
    review: filteredOutputs.filter(o => o.status === 'review'),
    final: filteredOutputs.filter(o => o.status === 'final'),
    published: filteredOutputs.filter(o => o.status === 'published')
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border border-border shadow-elegant">
        <CardHeader>
          <CardTitle>Content Queue</CardTitle>
          <CardDescription>Loading your generated content...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border border-border shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Content Queue</CardTitle>
            <CardDescription className="text-sm">
              Manage your generated content pipeline
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="tweet-thread">Tweet Thread</SelectItem>
              <SelectItem value="script">Script</SelectItem>
              <SelectItem value="prompt">Prompt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Content Grid */}
        <div className="space-y-6">
          {Object.entries(groupedOutputs).map(([status, items]) => {
            if (items.length === 0) return null;
            
            const config = statusConfig[status as keyof typeof statusConfig];
            const Icon = config.icon;
            
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                    {config.label} ({items.length})
                  </h3>
                </div>
                
                <div className="grid gap-3">
                  {items.map((output) => (
                    <div
                      key={output.id}
                      className="bg-background rounded-lg border border-border p-4 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => onSelectOutput(output)}
                    >
                      <div className="flex items-start justify-between space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-sm truncate">{output.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {output.output_type.replace('-', ' ')}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {output.content.substring(0, 120)}...
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {output.persona}
                              </Badge>
                              {output.tones.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {output.tones[0]} {output.tones.length > 1 && `+${output.tones.length - 1}`}
                                </Badge>
                              )}
                            </div>
                            
                            <Badge className={`text-xs ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {status !== 'published' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = status === 'draft' ? 'review' : 
                                                 status === 'review' ? 'final' : 'published';
                                updateStatus(output.id, nextStatus as ContentOutput['status']);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOutput(output.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredOutputs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No content found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Generate some content to get started"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};