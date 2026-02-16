import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TodaysSignals } from "@/components/dashboard/TodaysSignals";
import { ContentQueue } from "@/components/dashboard/ContentQueue";
import { ContentGenerator } from "@/components/dashboard/ContentGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import soleLogoWithTagline from "@/assets/sole-logo-new.png";
import soleLogoBlack from "@/assets/SOLE LOGO - BLACK WO BG.png";
import {
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";

interface ContentStats {
  totalGenerated: number;
  inQueue: number;
  inReview: number;
  publishedToday: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ContentStats>({
    totalGenerated: 0,
    inQueue: 0,
    inReview: 0,
    publishedToday: 0
  });

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get all content for user
      const { data: allContent, error } = await supabase
        .from('content_outputs')
        .select('status, created_at, updated_at')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      if (allContent) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalGenerated = allContent.length;
        const inQueue = allContent.filter(c => c.status === 'draft' || c.status === 'review' || c.status === 'final').length;
        const inReview = allContent.filter(c => c.status === 'review').length;
        const publishedToday = allContent.filter(c => {
          if (c.status !== 'published') return false;
          const updatedDate = new Date(c.updated_at);
          return updatedDate >= today;
        }).length;

        setStats({
          totalGenerated,
          inQueue,
          inReview,
          publishedToday
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  // Refresh stats when content is updated
  useEffect(() => {
    (window as any).refreshDashboardStats = () => {
      fetchStats();
    };
    return () => {
      delete (window as any).refreshDashboardStats;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-cream to-accent/20 p-6 rounded-3xl border border-accent/30">
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-brand-dark">Sole Central Station</h1>
            <p className="text-lg text-brand-dark/70 mt-1">
              Monitor signals, manage content workflows, and track your automation pipeline
            </p>
          </div>
          <div className="flex items-center">
            <img
              src={soleLogoWithTagline}
              alt="SOLE Logo"
              className="h-32 w-auto opacity-90"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats - SOLE Brand Metrics */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-primary/20 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-accent/5 to-accent/15 border-2 border-accent/30 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-accent-foreground">In Queue</CardTitle>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Clock className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent-foreground">{stats.inQueue}</div>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{stats.inReview} in review</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success/5 to-success/15 border-2 border-success/30 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-success">Published Today</CardTitle>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success text-white">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.publishedToday}</div>
              <p className="text-sm text-success mt-1 font-medium">Published content today</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-brand-peach/5 to-brand-peach/15 border-2 border-brand-peach/30 shadow-elegant hover:shadow-elevated transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-brand-dark">Content Generated</CardTitle>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-peach text-brand-dark">
                <FileText className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-brand-dark">{stats.totalGenerated}</div>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Total content pieces</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Signals & Queue */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 p-6 rounded-3xl border border-accent/20">
            <TodaysSignals />
          </div>
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-3xl border border-primary/20">
            <ContentQueue onSelectOutput={() => {}} />
          </div>
        </div>

        {/* Right Column - Content Generator */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-brand-cream/50 to-brand-cream/20 p-6 rounded-3xl border border-primary/30">
            <ContentGenerator />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;