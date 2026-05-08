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
import { generateSOP, refineSOP } from "@/services/sopGeneratorService";
import { exportSOPToPDF } from "@/utils/pdfExport";
import { SOP_TEMPLATES, DEPARTMENTS, OUTPUT_FORMATS, COMPLIANCE_FRAMEWORKS, RISK_LEVELS, SOPGeneratorInput, SOPTemplate } from "@/types/sop";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  FileText,
  Factory,
  Heart,
  Server,
  Users,
  DollarSign,
  Headphones,
  Shield,
  Sparkles,
  Download as DownloadIcon,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  FileDown,
  Printer,
  ArrowRight,
  ClipboardList,
  Building2,
  Target,
  BookOpen,
  Settings2,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Factory,
  Heart,
  Server,
  Users,
  DollarSign,
  Headphones,
  Shield,
  FileText
};

export default function SOPGenerator() {
  const { toast } = useToast();

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<SOPTemplate | null>(null);
  const [formData, setFormData] = useState<SOPGeneratorInput>({
    processName: '',
    department: '',
    industry: '',
    processDescription: '',
    targetAudience: '',
    complianceRequirements: '',
    safetyRequirements: '',
    additionalContext: '',
    outputFormat: 'detailed',
    includeFlowchart: false,
    complianceFramework: 'none',
    riskLevel: 'medium',
    includeTraining: true,
    includeTroubleshooting: true,
    language: 'english'
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSOP, setGeneratedSOP] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');

  // Refinement state
  const [isRefining, setIsRefining] = useState(false);
  const [refinementDialogOpen, setRefinementDialogOpen] = useState(false);
  const [refinementRequest, setRefinementRequest] = useState('');

  const handleTemplateSelect = (template: SOPTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      industry: template.industry,
      department: template.industry === 'Human Resources' ? 'Human Resources' :
                  template.industry === 'Finance' ? 'Finance' :
                  template.industry === 'Technology' ? 'IT/Technology' :
                  template.industry === 'Healthcare' ? 'Healthcare' :
                  template.industry === 'Manufacturing' ? 'Manufacturing' :
                  template.industry === 'Customer Service' ? 'Customer Service' :
                  template.industry === 'Safety' ? 'Quality Assurance' : ''
    }));
  };

  const handleInputChange = (field: keyof SOPGeneratorInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = useCallback(async () => {
    if (!formData.processName.trim() || !formData.processDescription.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in the process name and description.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setActiveTab('preview');

    try {
      const result = await generateSOP(formData);

      if (result.error) {
        toast({
          title: "Generation failed",
          description: result.error,
          variant: "destructive"
        });
        setActiveTab('input');
      } else {
        setGeneratedSOP(result.content);
        toast({
          title: "SOP Generated!",
          description: "Your Standard Operating Procedure has been created successfully.",
        });
      }
    } catch {
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
        description: "Please describe how you'd like to improve the SOP.",
        variant: "destructive"
      });
      return;
    }

    setIsRefining(true);

    try {
      const result = await refineSOP(generatedSOP, refinementRequest);

      if (result.error) {
        toast({
          title: "Refinement failed",
          description: result.error,
          variant: "destructive"
        });
      } else {
        setGeneratedSOP(result.content);
        setRefinementDialogOpen(false);
        setRefinementRequest('');
        toast({
          title: "SOP Refined!",
          description: "Your SOP has been updated based on your feedback.",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefining(false);
    }
  }, [generatedSOP, refinementRequest, toast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedSOP);
      toast({
        title: "Copied!",
        description: "SOP content copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive"
      });
    }
  }, [generatedSOP, toast]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedSOP], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOP-${formData.processName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "SOP saved as Markdown file.",
    });
  }, [generatedSOP, formData.processName, toast]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SOP - ${formData.processName}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            h3 { color: #555; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; }
            ol, ul { margin: 15px 0; padding-left: 30px; }
            li { margin: 8px 0; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            blockquote { border-left: 4px solid #ddd; margin: 20px 0; padding-left: 20px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${generatedSOP.replace(/^#/gm, '<h1>').replace(/^##/gm, '<h2>').replace(/^###/gm, '<h3>')}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [generatedSOP, formData.processName]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your PDF.",
      });
      await exportSOPToPDF(generatedSOP, formData.processName);
      toast({
        title: "PDF Downloaded!",
        description: "Your SOP has been saved as a PDF file.",
      });
    } catch {
      toast({
        title: "PDF generation failed",
        description: "Unable to create PDF. Please try the Print option instead.",
        variant: "destructive"
      });
    }
  }, [generatedSOP, formData.processName, toast]);

  const canGenerate = formData.processName.trim() && formData.processDescription.trim() && formData.department;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page Hero */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl opacity-60" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.35)]">
                <ClipboardList className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">SOP Generator</h1>
              <p className="text-sm text-[hsl(15,48%,35%)] font-semibold">AI-Powered Standard Operating Procedures</p>
            </div>
          </div>
          {generatedSOP && (
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
                <DownloadIcon className="h-4 w-4 mr-1 text-primary" />
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
              <TabsTrigger value="preview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-[hsl(26,47%,68%)] data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(208,126,59,0.3)] font-semibold rounded-lg" disabled={!generatedSOP && !isGenerating}>
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
                    Select an industry template or start from scratch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SOP_TEMPLATES.map((template) => {
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
                {/* Left Column - Basic Info */}
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="processName">Process Name *</Label>
                      <Input
                        id="processName"
                        placeholder="e.g., Employee Onboarding Process"
                        value={formData.processName}
                        onChange={(e) => handleInputChange('processName', e.target.value)}
                        className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(v) => handleInputChange('department', v)}
                      >
                        <SelectTrigger className="bg-white/80 border-primary/20 focus:border-primary/50">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        placeholder="e.g., Technology, Healthcare, Finance"
                        value={formData.industry}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <Input
                        id="targetAudience"
                        placeholder="e.g., New employees, Department managers"
                        value={formData.targetAudience}
                        onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                        className="bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {OUTPUT_FORMATS.map((format) => (
                          <button
                            key={format.value}
                            onClick={() => handleInputChange('outputFormat', format.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${
                              formData.outputFormat === format.value
                                ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                                : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                            }`}
                          >
                            <div className="font-medium text-sm text-[hsl(15,48%,25%)]">{format.label}</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">{format.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complianceFramework">Compliance Framework</Label>
                      <Select
                        value={formData.complianceFramework}
                        onValueChange={(v) => handleInputChange('complianceFramework', v)}
                      >
                        <SelectTrigger className="bg-white/80 border-primary/20 focus:border-primary/50">
                          <SelectValue placeholder="Select compliance framework" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLIANCE_FRAMEWORKS.map((fw) => (
                            <SelectItem key={fw.value} value={fw.value}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{fw.label}</span>
                                <span className="text-xs text-[hsl(15,48%,40%)]">- {fw.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Risk Level</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {RISK_LEVELS.map((risk) => (
                          <button
                            key={risk.value}
                            onClick={() => handleInputChange('riskLevel', risk.value)}
                            className={`p-2 rounded-lg border-2 transition-all text-center ${
                              formData.riskLevel === risk.value
                                ? `border-primary ${risk.color}`
                                : 'border-primary/20 hover:border-primary/50 bg-white/80'
                            }`}
                          >
                            <div className="font-medium text-xs text-[hsl(15,48%,25%)]">{risk.label}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[hsl(15,48%,40%)]">
                        {RISK_LEVELS.find(r => r.value === formData.riskLevel)?.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - Description & Requirements */}
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Process Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="processDescription">Process Description *</Label>
                      <Textarea
                        id="processDescription"
                        placeholder="Describe the process in detail. Include the main steps, goals, and expected outcomes..."
                        value={formData.processDescription}
                        onChange={(e) => handleInputChange('processDescription', e.target.value)}
                        className="min-h-[120px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complianceRequirements">Compliance Requirements</Label>
                      <Textarea
                        id="complianceRequirements"
                        placeholder="Any regulatory, legal, or industry standards that must be followed..."
                        value={formData.complianceRequirements}
                        onChange={(e) => handleInputChange('complianceRequirements', e.target.value)}
                        className="min-h-[80px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="safetyRequirements">Safety Requirements</Label>
                      <Textarea
                        id="safetyRequirements"
                        placeholder="Safety protocols, PPE requirements, hazard warnings..."
                        value={formData.safetyRequirements}
                        onChange={(e) => handleInputChange('safetyRequirements', e.target.value)}
                        className="min-h-[80px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additionalContext">Additional Context</Label>
                      <Textarea
                        id="additionalContext"
                        placeholder="Any other information that would help generate a better SOP..."
                        value={formData.additionalContext}
                        onChange={(e) => handleInputChange('additionalContext', e.target.value)}
                        className="min-h-[60px] bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Include Sections</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleInputChange('includeTraining', !formData.includeTraining)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeTraining
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${
                            formData.includeTraining ? 'border-primary bg-primary' : 'border-primary/40'
                          }`}>
                            {formData.includeTraining && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-[hsl(15,48%,25%)]">Training Requirements</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Certifications & skills needed</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleInputChange('includeTroubleshooting', !formData.includeTroubleshooting)}
                          className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            formData.includeTroubleshooting
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${
                            formData.includeTroubleshooting ? 'border-primary bg-primary' : 'border-primary/40'
                          }`}>
                            {formData.includeTroubleshooting && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-[hsl(15,48%,25%)]">Troubleshooting Guide</div>
                            <div className="text-xs text-[hsl(15,48%,40%)]">Common issues & solutions</div>
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
                      Generating SOP...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate SOP
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
              ) : generatedSOP ? (
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Preview Panel */}
                  <Card className="lg:col-span-3 bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold">Generated SOP</CardTitle>
                        <CardDescription className="text-[hsl(15,48%,40%)]">{formData.processName}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px] pr-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              h1: ({ children }) => <h1 className="text-2xl font-bold border-b pb-2 mb-4">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-primary">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
                              table: ({ children }) => <table className="w-full border-collapse border border-primary/20 my-4">{children}</table>,
                              th: ({ children }) => <th className="border border-primary/20 bg-primary/5 px-3 py-2 text-left font-medium">{children}</th>,
                              td: ({ children }) => <td className="border border-primary/20 px-3 py-2">{children}</td>,
                              ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1">{children}</ol>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-[hsl(15,48%,40%)]">{children}</blockquote>,
                            }}
                          >
                            {generatedSOP}
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
                          <DownloadIcon className="h-4 w-4 mr-2 text-primary" />
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
                          onClick={() => {
                            setActiveTab('input');
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Edit & Regenerate
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold">Document Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Department</span>
                          <span className="font-medium text-[hsl(15,48%,25%)]">{formData.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Industry</span>
                          <span className="font-medium text-[hsl(15,48%,25%)]">{formData.industry || 'General'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Format</span>
                          <span className="font-medium text-[hsl(15,48%,25%)] capitalize">{formData.outputFormat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[hsl(15,48%,40%)]">Generated</span>
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
                      <h3 className="font-semibold text-[hsl(15,48%,25%)]">No SOP Generated Yet</h3>
                      <p className="text-[hsl(15,48%,40%)] text-sm">Fill in the form and click Generate to create your SOP</p>
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
                Refine SOP with AI
              </DialogTitle>
              <DialogDescription>
                Describe how you'd like to improve or modify the generated SOP
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="e.g., Add more detail to the safety section, simplify the language, add a troubleshooting section, make it more concise..."
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setRefinementRequest('Add more detail to the procedures section')}
                >
                  More detail
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setRefinementRequest('Simplify the language for easier understanding')}
                >
                  Simplify
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setRefinementRequest('Add a troubleshooting section')}
                >
                  Add troubleshooting
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setRefinementRequest('Add more safety warnings and precautions')}
                >
                  More safety info
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={() => setRefinementDialogOpen(false)} disabled={isRefining}>
                Cancel
              </Button>
              <Button onClick={handleRefine} disabled={isRefining || !refinementRequest.trim()} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                {isRefining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Refine SOP
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
