import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { generateProposal, refineProposal } from "@/services/proposalGeneratorService";
import { exportProposalToPDF } from "@/utils/pdfExport";
import { PROPOSAL_TEMPLATES, PROPOSAL_TYPES, CLIENT_INDUSTRIES, TONE_OPTIONS, ProposalGeneratorInput, ProposalTemplate } from "@/types/proposal";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Briefcase,
  FolderKanban,
  TrendingUp,
  Users,
  Heart,
  Code,
  Megaphone,
  Sparkles,
  Download,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  FileDown,
  Printer,
  ArrowRight,
  FileSignature,
  Building2,
  Target,
  BookOpen,
  Settings2,
  Zap,
  DollarSign,
  Calendar,
  MessageSquare,
  Award
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  FolderKanban,
  TrendingUp,
  Users,
  Heart,
  Code,
  Megaphone,
  FileText
};

export default function ProposalGenerator() {
  const { toast } = useToast();

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [formData, setFormData] = useState<ProposalGeneratorInput>({
    projectName: '',
    clientName: '',
    clientIndustry: '',
    proposalType: '',
    projectDescription: '',
    problemStatement: '',
    proposedSolution: '',
    timeline: '',
    budget: '',
    deliverables: '',
    teamExperience: '',
    competitiveAdvantage: '',
    additionalContext: '',
    tone: 'professional',
    includeTimeline: true,
    includeBudget: true,
    includeTestimonials: false,
    includeCaseStudies: true
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');

  // Refinement state
  const [isRefining, setIsRefining] = useState(false);
  const [refinementDialogOpen, setRefinementDialogOpen] = useState(false);
  const [refinementRequest, setRefinementRequest] = useState('');

  const handleTemplateSelect = (template: ProposalTemplate) => {
    setSelectedTemplate(template);

    // Set default proposal type based on template
    const typeMapping: Record<string, string> = {
      'business': 'Business Partnership',
      'project': 'Project Development',
      'sales': 'Service Agreement',
      'consulting': 'Consulting Engagement',
      'grant': 'Grant Application',
      'software': 'Software Development',
      'marketing': 'Marketing Campaign',
      'custom': ''
    };

    setFormData(prev => ({
      ...prev,
      proposalType: typeMapping[template.id] || ''
    }));
  };

  const handleInputChange = (field: keyof ProposalGeneratorInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = useCallback(async () => {
    if (!formData.projectName.trim() || !formData.clientName.trim() || !formData.problemStatement.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in the project name, client name, and problem statement.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setActiveTab('preview');

    try {
      const result = await generateProposal(formData);

      if (result.error) {
        toast({
          title: "Generation failed",
          description: result.error,
          variant: "destructive"
        });
        setActiveTab('input');
      } else {
        setGeneratedProposal(result.content);
        toast({
          title: "Proposal Generated!",
          description: "Your professional proposal has been created successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      setActiveTab('input');
    } finally {
      setIsGenerating(false);
    }
  }, [formData, toast]);

  const handleRefine = useCallback(async () => {
    if (!refinementRequest.trim()) {
      toast({
        title: "Enter refinement request",
        description: "Please describe how you would like to improve the proposal.",
        variant: "destructive"
      });
      return;
    }

    setIsRefining(true);

    try {
      const result = await refineProposal(generatedProposal, refinementRequest);

      if (result.error) {
        toast({
          title: "Refinement failed",
          description: result.error,
          variant: "destructive"
        });
      } else {
        setGeneratedProposal(result.content);
        setRefinementDialogOpen(false);
        setRefinementRequest('');
        toast({
          title: "Proposal Refined!",
          description: "Your proposal has been updated based on your feedback.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefining(false);
    }
  }, [generatedProposal, refinementRequest, toast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedProposal);
      toast({
        title: "Copied!",
        description: "Proposal content copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  }, [generatedProposal, toast]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedProposal], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Proposal saved as Markdown file.",
    });
  }, [generatedProposal, formData.clientName, toast]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Proposal - ${formData.projectName}</title>
          <style>
            body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.8; color: #333; }
            h1 { color: #1a1a1a; border-bottom: 3px solid #2563eb; padding-bottom: 15px; font-size: 28px; }
            h2 { color: #2563eb; margin-top: 40px; font-size: 22px; }
            h3 { color: #444; font-size: 18px; }
            p { margin: 15px 0; }
            ul, ol { margin: 20px 0; padding-left: 30px; }
            li { margin: 10px 0; }
            blockquote { border-left: 4px solid #2563eb; margin: 25px 0; padding: 15px 25px; background: #f8fafc; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin: 25px 0; }
            th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: 600; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${generatedProposal}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [generatedProposal, formData.projectName]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your PDF.",
      });
      await exportProposalToPDF(generatedProposal, formData.projectName, formData.clientName);
      toast({
        title: "PDF Downloaded!",
        description: "Your proposal has been saved as a PDF file.",
      });
    } catch (error) {
      toast({
        title: "PDF generation failed",
        description: "Unable to create PDF. Please try the Print option instead.",
        variant: "destructive"
      });
    }
  }, [generatedProposal, formData.projectName, formData.clientName, toast]);

  const canGenerate = formData.projectName.trim() && formData.clientName.trim() && formData.problemStatement.trim();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page Hero */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl opacity-60" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.35)]">
                <FileSignature className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">Proposal Generator</h1>
              <p className="text-sm text-[hsl(15,48%,35%)] font-semibold">Craft winning proposals with AI intelligence</p>
            </div>
          </div>
          {generatedProposal && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                <FileDown className="h-4 w-4 mr-1" />
                Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-all duration-200">
                <Download className="h-4 w-4 mr-1 text-primary" />
                <span className="text-primary font-medium">PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </div>
          )}
        </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'input' | 'preview')}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-primary/8 border border-primary/20 p-1 rounded-xl">
              <TabsTrigger value="input" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-[hsl(26,47%,68%)] data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(208,126,59,0.3)] font-semibold rounded-lg">
                <Settings2 className="h-4 w-4" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-[hsl(26,47%,68%)] data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(208,126,59,0.3)] font-semibold rounded-lg" disabled={!generatedProposal && !isGenerating}>
                <BookOpen className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Input Tab */}
            <TabsContent value="input" className="space-y-6">
              {/* Template Selection */}
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Choose a Template
                  </CardTitle>
                  <CardDescription className="text-[hsl(15,48%,40%)]">
                    Select a proposal type to get started quickly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROPOSAL_TEMPLATES.map((template) => {
                      const Icon = iconMap[template.icon] || FileText;
                      const isSelected = selectedTemplate?.id === template.id;
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                            isSelected
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                          }`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${template.color} mb-3 shadow-sm group-hover:scale-105 transition-transform`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm mb-1 text-[hsl(15,48%,25%)]">{template.name}</h3>
                          <p className="text-xs text-[hsl(15,48%,40%)] line-clamp-2">{template.description}</p>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Main Form */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Client & Project Info */}
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Client and Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="projectName">Project Name *</Label>
                        <Input
                          id="projectName"
                          placeholder="Website Redesign"
                          value={formData.projectName}
                          onChange={(e) => handleInputChange('projectName', e.target.value)}
                          className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name *</Label>
                        <Input
                          id="clientName"
                          placeholder="Acme Corporation"
                          value={formData.clientName}
                          onChange={(e) => handleInputChange('clientName', e.target.value)}
                          className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="clientIndustry">Client Industry</Label>
                        <Select
                          value={formData.clientIndustry}
                          onValueChange={(v) => handleInputChange('clientIndustry', v)}
                        >
                          <SelectTrigger className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {CLIENT_INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proposalType">Proposal Type</Label>
                        <Select
                          value={formData.proposalType}
                          onValueChange={(v) => handleInputChange('proposalType', v)}
                        >
                          <SelectTrigger className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROPOSAL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="problemStatement">The Challenge / Problem *</Label>
                      <Textarea
                        id="problemStatement"
                        placeholder="Describe the client's pain points and challenges they are facing..."
                        value={formData.problemStatement}
                        onChange={(e) => handleInputChange('problemStatement', e.target.value)}
                        className="min-h-[100px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proposedSolution">Your Proposed Solution</Label>
                      <Textarea
                        id="proposedSolution"
                        placeholder="How will you solve their problem? What is your approach?"
                        value={formData.proposedSolution}
                        onChange={(e) => handleInputChange('proposedSolution', e.target.value)}
                        className="min-h-[100px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tone of Voice</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone.value}
                            onClick={() => handleInputChange('tone', tone.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              formData.tone === tone.value
                                ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                                : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                            }`}
                          >
                            <div className="font-medium text-sm">{tone.label}</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">{tone.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - Additional Details */}
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Additional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectDescription">Project Description</Label>
                      <Textarea
                        id="projectDescription"
                        placeholder="Provide more details about the project scope and objectives..."
                        value={formData.projectDescription}
                        onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                        className="min-h-[80px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="timeline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Timeline
                        </Label>
                        <Input
                          id="timeline"
                          placeholder="e.g., 3 months"
                          value={formData.timeline}
                          onChange={(e) => handleInputChange('timeline', e.target.value)}
                          className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Budget Range
                        </Label>
                        <Input
                          id="budget"
                          placeholder="e.g., $15,000 - $25,000"
                          value={formData.budget}
                          onChange={(e) => handleInputChange('budget', e.target.value)}
                          className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliverables">Key Deliverables</Label>
                      <Textarea
                        id="deliverables"
                        placeholder="List the main deliverables the client will receive..."
                        value={formData.deliverables}
                        onChange={(e) => handleInputChange('deliverables', e.target.value)}
                        className="min-h-[60px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teamExperience">Your Experience</Label>
                      <Textarea
                        id="teamExperience"
                        placeholder="Relevant experience, past projects, team qualifications..."
                        value={formData.teamExperience}
                        onChange={(e) => handleInputChange('teamExperience', e.target.value)}
                        className="min-h-[60px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="competitiveAdvantage">Why You?</Label>
                      <Textarea
                        id="competitiveAdvantage"
                        placeholder="What sets you apart from competitors?"
                        value={formData.competitiveAdvantage}
                        onChange={(e) => handleInputChange('competitiveAdvantage', e.target.value)}
                        className="min-h-[60px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Include Sections</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleInputChange('includeTimeline', !formData.includeTimeline)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeTimeline
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                          }`}
                        >
                          <Calendar className={`h-5 w-5 ${formData.includeTimeline ? 'text-primary' : 'text-[hsl(15,48%,40%)]'}`} />
                          <div>
                            <div className="font-medium text-sm">Timeline</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Milestones and schedule</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleInputChange('includeBudget', !formData.includeBudget)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeBudget
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                          }`}
                        >
                          <DollarSign className={`h-5 w-5 ${formData.includeBudget ? 'text-primary' : 'text-[hsl(15,48%,40%)]'}`} />
                          <div>
                            <div className="font-medium text-sm">Investment</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Pricing breakdown</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleInputChange('includeCaseStudies', !formData.includeCaseStudies)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeCaseStudies
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                          }`}
                        >
                          <Award className={`h-5 w-5 ${formData.includeCaseStudies ? 'text-primary' : 'text-[hsl(15,48%,40%)]'}`} />
                          <div>
                            <div className="font-medium text-sm">Case Studies</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Past success stories</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleInputChange('includeTestimonials', !formData.includeTestimonials)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeTestimonials
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                          }`}
                        >
                          <MessageSquare className={`h-5 w-5 ${formData.includeTestimonials ? 'text-primary' : 'text-[hsl(15,48%,40%)]'}`} />
                          <div>
                            <div className="font-medium text-sm">Testimonials</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Client quotes</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Generate Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  size="lg"
                  className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold px-8"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Your Proposal...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Proposal
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview">
              {isGenerating ? (
                <Card className="min-h-[600px] bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl animate-pulse" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.4)]">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      </div>
                      <p className="font-semibold text-[hsl(15,48%,25%)]">Generating...</p>
                      <p className="text-sm text-[hsl(15,48%,40%)]">This may take a moment</p>
                    </div>
                  </div>
                </Card>
              ) : generatedProposal ? (
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Preview Panel */}
                  <Card className="lg:col-span-3 bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold">Your Proposal</CardTitle>
                        <CardDescription className="text-[hsl(15,48%,40%)]">For {formData.clientName}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready to Send
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px] pr-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className="text-2xl font-bold border-b-2 border-primary pb-3 mb-6">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xl font-semibold mt-8 mb-4 text-primary">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-lg font-medium mt-6 mb-3">{children}</h3>,
                              table: ({ children }) => <table className="w-full border-collapse border border-primary/20 my-6">{children}</table>,
                              th: ({ children }) => <th className="border border-primary/20 bg-primary/5 px-4 py-3 text-left font-medium">{children}</th>,
                              td: ({ children }) => <td className="border border-primary/20 px-4 py-3">{children}</td>,
                              ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 my-4">{children}</ol>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 py-2 italic bg-primary/5 my-4">{children}</blockquote>,
                              p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                            }}
                          >
                            {generatedProposal}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Actions Panel */}
                  <div className="space-y-4">
                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold">Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200" onClick={handleCopy}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button variant="outline" className="w-full justify-start border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200" onClick={handleDownload}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Download Markdown
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-primary/10 border-primary/30 hover:bg-primary/20 transition-all duration-200" onClick={handleDownloadPDF}>
                          <Download className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-primary font-medium">Download PDF</span>
                        </Button>
                        <Button variant="outline" className="w-full justify-start border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200" onClick={handlePrint}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                        <Separator />
                        <Button
                          variant="outline"
                          className="w-full justify-start border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200"
                          onClick={() => setRefinementDialogOpen(true)}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Refine with AI
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200"
                          onClick={() => setActiveTab('input')}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Edit and Regenerate
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold">Proposal Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Client</span>
                          <span className="font-medium text-[hsl(15,48%,25%)]">{formData.clientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Project</span>
                          <span className="font-medium text-[hsl(15,48%,25%)]">{formData.projectName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Tone</span>
                          <span className="font-medium text-[hsl(15,48%,25%)] capitalize">{formData.tone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Created</span>
                          <span className="font-medium text-[hsl(15,48%,25%)]">{new Date().toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="min-h-[400px] flex items-center justify-center bg-white/95 backdrop-blur-sm border-2 border-primary/15">
                  <div className="text-center space-y-3">
                    <AlertCircle className="h-12 w-12 text-[hsl(15,48%,40%)] mx-auto" />
                    <div>
                      <h3 className="font-semibold text-[hsl(15,48%,25%)]">No Proposal Generated Yet</h3>
                      <p className="text-[hsl(15,48%,40%)] text-sm">Fill in the form and click Generate to create your proposal</p>
                    </div>
                    <Button variant="outline" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={() => setActiveTab('input')}>
                      Go to Configuration
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Refinement Dialog */}
        <Dialog open={refinementDialogOpen} onOpenChange={setRefinementDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Refine Your Proposal
              </DialogTitle>
              <DialogDescription>
                Tell us how you would like to improve the proposal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Make the executive summary more compelling, add more specific numbers, emphasize our experience with similar projects..."
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]"
                  onClick={() => setRefinementRequest('Make it more persuasive and compelling')}
                >
                  More persuasive
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]"
                  onClick={() => setRefinementRequest('Add more specific details and numbers')}
                >
                  Add specifics
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]"
                  onClick={() => setRefinementRequest('Make it shorter and more concise')}
                >
                  Make shorter
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]"
                  onClick={() => setRefinementRequest('Emphasize the ROI and business value')}
                >
                  Focus on ROI
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefinementDialogOpen(false)} disabled={isRefining}>
                Cancel
              </Button>
              <Button
                onClick={handleRefine}
                disabled={isRefining || !refinementRequest.trim()}
                className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Refine Proposal
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
