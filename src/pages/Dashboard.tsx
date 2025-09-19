import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TodaysSignals } from "@/components/dashboard/TodaysSignals";
import { ContentQueue } from "@/components/dashboard/ContentQueue";
import { InputPanel } from "@/components/dashboard/InputPanel";
import { OutputPanel } from "@/components/dashboard/OutputPanel";
import { ContentGenerator } from "@/components/dashboard/ContentGenerator";
import soleLogoWithTagline from "@/assets/sole-logo-with-tagline.png";
import { 
  TrendingUp, 
  FileText, 
  Clock, 
  CheckCircle
} from "lucide-react";

const Dashboard = () => {
  const [selectedOutput, setSelectedOutput] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Sole Central Station</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Monitor signals, manage content workflows, and track your automation pipeline
            </p>
          </div>
          <img 
            src={soleLogoWithTagline} 
            alt="SOLE Logo" 
            className="h-16 w-auto opacity-90"
          />
        </div>
      </div>

      {/* Quick Stats - SOLE Brand Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active Signals</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">12</div>
            <p className="text-sm text-success mt-1">+2 from yesterday</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">In Queue</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">8</div>
            <p className="text-sm text-muted-foreground mt-1">3 in review</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Published Today</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">5</div>
            <p className="text-sm text-success mt-1">+25% from avg</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border border-border shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Content Generated</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <FileText className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">34</div>
            <p className="text-sm text-muted-foreground mt-1">This week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Signals & Queue */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysSignals />
          <ContentQueue onSelectOutput={setSelectedOutput} />
        </div>

        {/* Right Column - Content Generator & Output Panels */}
        <div className="space-y-6">
          <ContentGenerator />
          {selectedOutput && (
            <OutputPanel output={selectedOutput} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;