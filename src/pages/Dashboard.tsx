import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TodaysSignals } from "@/components/dashboard/TodaysSignals";
import { OutputQueue } from "@/components/dashboard/OutputQueue";
import { InputPanel } from "@/components/dashboard/InputPanel";
import { OutputPanel } from "@/components/dashboard/OutputPanel";
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
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Sole Central Station</h1>
            <p className="text-lg text-muted-foreground mt-1">
              Monitor signals, manage content workflows, and track your automation pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active Signals</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/20">
              <TrendingUp className="h-5 w-5 text-accent-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">12</div>
            <p className="text-sm text-success mt-1">+2 from yesterday</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-elevated transition-shadow">
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
        
        <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-elevated transition-shadow">
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
        
        <Card className="bg-gradient-card border-0 shadow-elegant hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Content Generated</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-purple/20">
              <FileText className="h-5 w-5 text-accent-purple" />
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
          <OutputQueue onSelectOutput={setSelectedOutput} />
        </div>

        {/* Right Column - Input & Output Panels */}
        <div className="space-y-6">
          <InputPanel />
          {selectedOutput && (
            <OutputPanel output={selectedOutput} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;