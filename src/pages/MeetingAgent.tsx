import { useState, useCallback, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { generateAgenda, generateMinutes, extractActionItems, generateFollowUpEmail, refineMeetingDocument, processTranscript, loadSavedMeetings, saveMeeting, deleteSavedMeeting } from "@/services/meetingAgentService";
import { exportToPDF } from "@/utils/pdfExport";
import {
  MeetingMode,
  MeetingAgendaInput,
  MeetingMinutesInput,
  ActionItemsInput,
  FollowUpEmailInput,
  TranscriptInput,
  SavedMeeting,
  MEETING_TYPES,
  MEETING_DURATIONS,
  MEETING_TONES,
  PRIORITY_LEVELS,
  MEETING_TEMPLATES,
  TRANSCRIPT_OUTPUT_TYPES
} from "@/types/meeting";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  Calendar,
  FileText,
  CheckSquare,
  Mail,
  Sparkles,
  Copy,
  Download,
  Loader2,
  Wand2,
  ArrowLeft,
  FileDown,
  Mic,
  Save,
  Trash2,
  FolderOpen,
  X
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Calendar,
  FileText,
  CheckSquare,
  Mail,
  Mic
};

export default function MeetingAgent() {
  const { toast } = useToast();

  // Mode state
  const [activeMode, setActiveMode] = useState<MeetingMode | null>(null);

  // Agenda form state
  const [agendaForm, setAgendaForm] = useState<MeetingAgendaInput>({
    meetingTitle: '',
    meetingType: '',
    attendees: '',
    duration: '1 hour',
    objectives: '',
    previousActionItems: '',
    additionalTopics: '',
    tone: 'professional'
  });

  // Minutes form state
  const [minutesForm, setMinutesForm] = useState<MeetingMinutesInput>({
    meetingTitle: '',
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: '',
    absentees: '',
    discussionNotes: '',
    decisions: '',
    additionalContext: ''
  });

  // Action items form state
  const [actionsForm, setActionsForm] = useState<ActionItemsInput>({
    meetingNotes: '',
    attendees: '',
    projectContext: '',
    priorityLevel: 'standard'
  });

  // Follow-up form state
  const [followupForm, setFollowUpForm] = useState<FollowUpEmailInput>({
    meetingTitle: '',
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: '',
    keyDecisions: '',
    actionItems: '',
    nextSteps: '',
    tone: 'professional'
  });

  // Transcript form state
  const [transcriptForm, setTranscriptForm] = useState<TranscriptInput>({
    meetingTitle: '',
    meetingDate: new Date().toISOString().split('T')[0],
    transcript: '',
    outputType: 'all',
    additionalContext: ''
  });

  // Saved meetings state
  const [savedMeetings, setSavedMeetings] = useState<SavedMeeting[]>([]);
  const [showSavedMeetings, setShowSavedMeetings] = useState(false);
  const [viewingSavedMeeting, setViewingSavedMeeting] = useState<SavedMeeting | null>(null);

  // Load saved meetings on mount
  useEffect(() => {
    setSavedMeetings(loadSavedMeetings());
  }, []);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  // Refinement state
  const [refinementDialogOpen, setRefinementDialogOpen] = useState(false);
  const [refinementRequest, setRefinementRequest] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    let result: { content: string; error?: string } = { content: '' };

    try {
      switch (activeMode) {
        case 'agenda':
          if (!agendaForm.meetingTitle || !agendaForm.objectives) {
            toast({ title: "Missing fields", description: "Please fill in meeting title and objectives.", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          result = await generateAgenda(agendaForm);
          break;
        case 'minutes':
          if (!minutesForm.meetingTitle || !minutesForm.discussionNotes) {
            toast({ title: "Missing fields", description: "Please fill in meeting title and discussion notes.", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          result = await generateMinutes(minutesForm);
          break;
        case 'actions':
          if (!actionsForm.meetingNotes || !actionsForm.attendees) {
            toast({ title: "Missing fields", description: "Please fill in meeting notes and attendees.", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          result = await extractActionItems(actionsForm);
          break;
        case 'followup':
          if (!followupForm.meetingTitle || !followupForm.keyDecisions || !followupForm.actionItems) {
            toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          result = await generateFollowUpEmail(followupForm);
          break;
        case 'transcript':
          if (!transcriptForm.meetingTitle || !transcriptForm.transcript) {
            toast({ title: "Missing fields", description: "Please fill in meeting title and transcript.", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          result = await processTranscript(transcriptForm);
          break;
      }

      if (result.error) {
        toast({ title: "Generation failed", description: result.error, variant: "destructive" });
      } else {
        setGeneratedContent(result.content);
        toast({ title: "Generated!", description: "Your meeting document is ready." });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [activeMode, agendaForm, minutesForm, actionsForm, followupForm, transcriptForm, toast]);

  const handleRefine = useCallback(async () => {
    if (!refinementRequest.trim()) return;
    setIsRefining(true);

    try {
      const result = await refineMeetingDocument(generatedContent, refinementRequest);
      if (result.error) {
        toast({ title: "Refinement failed", description: result.error, variant: "destructive" });
      } else {
        setGeneratedContent(result.content);
        setRefinementDialogOpen(false);
        setRefinementRequest('');
        toast({ title: "Refined!", description: "Document updated." });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  }, [generatedContent, refinementRequest, toast]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast({ title: "Copied!", description: "Content copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }, [generatedContent, toast]);

  const handleDownload = useCallback(() => {
    const modeLabels = { agenda: 'Agenda', minutes: 'Minutes', actions: 'Actions', followup: 'FollowUp', transcript: 'Transcript' };
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting-${modeLabels[activeMode!]}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!" });
  }, [generatedContent, activeMode, toast]);

  const handleDownloadPDF = useCallback(async () => {
    const modeLabels = { agenda: 'Meeting Agenda', minutes: 'Meeting Minutes', actions: 'Action Items', followup: 'Follow-Up Email', transcript: 'Transcript' };
    try {
      toast({ title: "Generating PDF..." });
      await exportToPDF(generatedContent, {
        filename: `${modeLabels[activeMode!].replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
        title: modeLabels[activeMode!],
        accentColor: '#0891b2'
      });
      toast({ title: "PDF Downloaded!" });
    } catch {
      toast({ title: "PDF failed", variant: "destructive" });
    }
  }, [generatedContent, activeMode, toast]);

  const getModeTitle = () => {
    const titles: Record<MeetingMode, string> = {
      agenda: 'Meeting Agenda',
      minutes: 'Meeting Minutes',
      actions: 'Action Items',
      followup: 'Follow-Up Email',
      transcript: 'From Transcript'
    };
    return titles[activeMode!] || 'Meeting Agent';
  };

  const handleSaveMeeting = useCallback(() => {
    if (!generatedContent || !activeMode) return;

    let title = '';
    let date = new Date().toISOString().split('T')[0];

    switch (activeMode) {
      case 'agenda':
        title = agendaForm.meetingTitle || 'Untitled Agenda';
        break;
      case 'minutes':
        title = minutesForm.meetingTitle || 'Untitled Minutes';
        date = minutesForm.meetingDate;
        break;
      case 'actions':
        title = actionsForm.projectContext || 'Untitled Actions';
        break;
      case 'followup':
        title = followupForm.meetingTitle || 'Untitled Follow-Up';
        date = followupForm.meetingDate;
        break;
      case 'transcript':
        title = transcriptForm.meetingTitle || 'Untitled Meeting';
        date = transcriptForm.meetingDate;
        break;
    }

    saveMeeting(title, date, activeMode, generatedContent);
    setSavedMeetings(loadSavedMeetings());
    toast({ title: "Saved!", description: "Meeting document saved to your library." });
  }, [generatedContent, activeMode, agendaForm, minutesForm, actionsForm, followupForm, transcriptForm, toast]);

  const handleDeleteSavedMeeting = useCallback((id: string) => {
    deleteSavedMeeting(id);
    setSavedMeetings(loadSavedMeetings());
    if (viewingSavedMeeting?.id === id) {
      setViewingSavedMeeting(null);
    }
    toast({ title: "Deleted" });
  }, [viewingSavedMeeting, toast]);

  const handleViewSavedMeeting = useCallback((meeting: SavedMeeting) => {
    setViewingSavedMeeting(meeting);
    setGeneratedContent(meeting.content);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page Hero */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeMode && (
              <Button variant="ghost" size="sm" onClick={() => { setActiveMode(null); setGeneratedContent(''); }} className="mr-1 border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl opacity-60" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.35)]">
                <Calendar className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">Meeting Agent</h1>
              <p className="text-sm text-[hsl(15,48%,35%)] font-semibold">{activeMode ? getModeTitle() : 'Agendas, Minutes & Follow-ups — Powered by AI'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {generatedContent && (
              <>
                <Button variant="outline" size="sm" onClick={handleSaveMeeting} className="bg-green-50 border-green-200 hover:bg-green-100">
                  <Save className="h-4 w-4 mr-1 text-green-600" />
                  <span className="text-green-700">Save</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                  <FileDown className="h-4 w-4 mr-1" />
                  MD
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="bg-primary/10 border-primary/30 hover:bg-primary/20 transition-all duration-200">
                  <Download className="h-4 w-4 mr-1 text-primary" />
                  <span className="text-primary font-medium">PDF</span>
                </Button>
              </>
            )}
            <Button
              variant={showSavedMeetings ? "secondary" : "outline"}
              size="sm"
              className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200"
              onClick={() => setShowSavedMeetings(!showSavedMeetings)}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Saved ({savedMeetings.length})
            </Button>
          </div>
        </div>
          {/* Mode Selection */}
          {!activeMode && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-[hsl(15,48%,25%)] mb-2">What would you like to create?</h2>
                <p className="text-[hsl(15,48%,40%)]">Select a document type to get started</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {MEETING_TEMPLATES.map((template) => {
                  const Icon = iconMap[template.icon] || FileText;
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer transition-all duration-200 bg-white/95 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/50 hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] hover:scale-[1.02] group"
                      onClick={() => setActiveMode(template.id as MeetingMode)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${template.color} shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-[hsl(15,48%,25%)]">{template.name}</h3>
                        <p className="text-sm text-[hsl(15,48%,40%)]">{template.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda Mode */}
          {activeMode === 'agenda' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Create Meeting Agenda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Meeting Title *</Label>
                      <Input
                        placeholder="Q4 Planning Session"
                        value={agendaForm.meetingTitle}
                        onChange={(e) => setAgendaForm(prev => ({ ...prev, meetingTitle: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Type</Label>
                      <Select value={agendaForm.meetingType} onValueChange={(v) => setAgendaForm(prev => ({ ...prev, meetingType: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {MEETING_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select value={agendaForm.duration} onValueChange={(v) => setAgendaForm(prev => ({ ...prev, duration: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEETING_DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={agendaForm.tone} onValueChange={(v) => setAgendaForm(prev => ({ ...prev, tone: v as 'formal' | 'professional' | 'casual' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEETING_TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Attendees</Label>
                    <Input
                      placeholder="John Smith (PM), Sarah Lee (Dev), Mike Chen (Design)"
                      value={agendaForm.attendees}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, attendees: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Meeting Objectives *</Label>
                    <Textarea
                      placeholder="What are the goals for this meeting? What decisions need to be made?"
                      value={agendaForm.objectives}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, objectives: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Previous Action Items (optional)</Label>
                    <Textarea
                      placeholder="Any action items from previous meetings to review"
                      value={agendaForm.previousActionItems}
                      onChange={(e) => setAgendaForm(prev => ({ ...prev, previousActionItems: e.target.value }))}
                      className="min-h-[60px]"
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                    {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Agenda</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold">Generated Agenda</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={() => setRefinementDialogOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-1" />Refine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[hsl(15,48%,40%)]">
                      Fill in the form and click Generate
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Minutes Mode */}
          {activeMode === 'minutes' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Generate Meeting Minutes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Meeting Title *</Label>
                      <Input
                        placeholder="Weekly Team Sync"
                        value={minutesForm.meetingTitle}
                        onChange={(e) => setMinutesForm(prev => ({ ...prev, meetingTitle: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Date</Label>
                      <Input
                        type="date"
                        value={minutesForm.meetingDate}
                        onChange={(e) => setMinutesForm(prev => ({ ...prev, meetingDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Attendees</Label>
                      <Input
                        placeholder="John, Sarah, Mike, Lisa"
                        value={minutesForm.attendees}
                        onChange={(e) => setMinutesForm(prev => ({ ...prev, attendees: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Absent</Label>
                      <Input
                        placeholder="Tom (OOO)"
                        value={minutesForm.absentees}
                        onChange={(e) => setMinutesForm(prev => ({ ...prev, absentees: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Discussion Notes *</Label>
                    <Textarea
                      placeholder="Paste your raw meeting notes here. The AI will organize them into professional minutes."
                      value={minutesForm.discussionNotes}
                      onChange={(e) => setMinutesForm(prev => ({ ...prev, discussionNotes: e.target.value }))}
                      className="min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Key Decisions Made</Label>
                    <Textarea
                      placeholder="List any decisions that were made during the meeting"
                      value={minutesForm.decisions}
                      onChange={(e) => setMinutesForm(prev => ({ ...prev, decisions: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                    {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Minutes</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold">Generated Minutes</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={() => setRefinementDialogOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-1" />Refine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[hsl(15,48%,40%)]">
                      Fill in the form and click Generate
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Items Mode */}
          {activeMode === 'actions' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Extract Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Meeting Notes *</Label>
                    <Textarea
                      placeholder="Paste your meeting notes. The AI will extract and organize all action items."
                      value={actionsForm.meetingNotes}
                      onChange={(e) => setActionsForm(prev => ({ ...prev, meetingNotes: e.target.value }))}
                      className="min-h-[180px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attendees (potential owners) *</Label>
                    <Input
                      placeholder="John Smith, Sarah Lee, Mike Chen"
                      value={actionsForm.attendees}
                      onChange={(e) => setActionsForm(prev => ({ ...prev, attendees: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Project Context</Label>
                    <Input
                      placeholder="e.g., Website Redesign Q4"
                      value={actionsForm.projectContext}
                      onChange={(e) => setActionsForm(prev => ({ ...prev, projectContext: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority Level</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_LEVELS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setActionsForm(prev => ({ ...prev, priorityLevel: p.value as 'standard' | 'urgent' | 'critical' }))}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            actionsForm.priorityLevel === p.value ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]' : 'border-primary/20 hover:border-primary/50 bg-white/80'
                          }`}
                        >
                          <Badge className={p.color}>{p.label}</Badge>
                          <p className="text-xs text-[hsl(15,48%,40%)] mt-1">{p.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                    {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Extracting...</> : <><Sparkles className="h-4 w-4 mr-2" />Extract Action Items</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold">Action Items</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={() => setRefinementDialogOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-1" />Refine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[hsl(15,48%,40%)]">
                      Fill in the form and click Extract
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Follow-up Email Mode */}
          {activeMode === 'followup' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Generate Follow-Up Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Meeting Title *</Label>
                      <Input
                        placeholder="Product Strategy Meeting"
                        value={followupForm.meetingTitle}
                        onChange={(e) => setFollowUpForm(prev => ({ ...prev, meetingTitle: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Date</Label>
                      <Input
                        type="date"
                        value={followupForm.meetingDate}
                        onChange={(e) => setFollowUpForm(prev => ({ ...prev, meetingDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Recipients</Label>
                      <Input
                        placeholder="team@company.com, stakeholders"
                        value={followupForm.attendees}
                        onChange={(e) => setFollowUpForm(prev => ({ ...prev, attendees: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={followupForm.tone} onValueChange={(v) => setFollowUpForm(prev => ({ ...prev, tone: v as 'formal' | 'professional' | 'friendly' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEETING_TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Key Decisions Made *</Label>
                    <Textarea
                      placeholder="List the main decisions from the meeting"
                      value={followupForm.keyDecisions}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, keyDecisions: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Action Items *</Label>
                    <Textarea
                      placeholder="List action items with owners and deadlines"
                      value={followupForm.actionItems}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, actionItems: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Next Steps</Label>
                    <Textarea
                      placeholder="Any upcoming meetings, milestones, or deadlines"
                      value={followupForm.nextSteps}
                      onChange={(e) => setFollowUpForm(prev => ({ ...prev, nextSteps: e.target.value }))}
                      className="min-h-[60px]"
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                    {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Email</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold">Follow-Up Email</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={() => setRefinementDialogOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-1" />Refine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[hsl(15,48%,40%)]">
                      Fill in the form and click Generate
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transcript Mode */}
          {activeMode === 'transcript' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Process Meeting Transcript
                  </CardTitle>
                  <CardDescription>
                    Paste your meeting notes or transcript and generate professional documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Meeting Title *</Label>
                      <Input
                        placeholder="Team Weekly Sync"
                        value={transcriptForm.meetingTitle}
                        onChange={(e) => setTranscriptForm(prev => ({ ...prev, meetingTitle: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Date</Label>
                      <Input
                        type="date"
                        value={transcriptForm.meetingDate}
                        onChange={(e) => setTranscriptForm(prev => ({ ...prev, meetingDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transcript / Notes *</Label>
                    <Textarea
                      placeholder="Paste your meeting transcript, raw notes, or audio transcription here. The AI will extract key information, decisions, and action items automatically."
                      value={transcriptForm.transcript}
                      onChange={(e) => setTranscriptForm(prev => ({ ...prev, transcript: e.target.value }))}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-[hsl(15,48%,40%)]">
                      Tip: Include speaker names (e.g., "John: ...") for better owner assignment
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>What would you like to generate?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TRANSCRIPT_OUTPUT_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() => setTranscriptForm(prev => ({ ...prev, outputType: type.value as TranscriptInput['outputType'] }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            transcriptForm.outputType === type.value
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80'
                          }`}
                        >
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-[hsl(15,48%,40%)] mt-0.5">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Context (optional)</Label>
                    <Input
                      placeholder="e.g., Project name, team involved, key stakeholders"
                      value={transcriptForm.additionalContext}
                      onChange={(e) => setTranscriptForm(prev => ({ ...prev, additionalContext: e.target.value }))}
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                    {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="h-4 w-4 mr-2" />Process Transcript</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold">Generated Documents</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={() => setRefinementDialogOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-1" />Refine
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[hsl(15,48%,40%)] text-center">
                      <div>
                        <Mic className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>Paste your meeting transcript and select output type</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Saved Meetings Sidebar */}
        {showSavedMeetings && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white/98 backdrop-blur-2xl border-l-2 border-primary/20 shadow-[0_-8px_40px_rgba(208,126,59,0.15)] z-50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-primary/15 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-[hsl(15,48%,25%)]">Saved Meetings</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSavedMeetings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {savedMeetings.length === 0 ? (
                <div className="text-center py-8 text-[hsl(15,48%,40%)]">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No saved meetings yet</p>
                  <p className="text-xs mt-1">Generate a document and click Save</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedMeetings.map(meeting => {
                    const modeLabels: Record<MeetingMode, string> = {
                      agenda: 'Agenda',
                      minutes: 'Minutes',
                      actions: 'Actions',
                      followup: 'Follow-Up',
                      transcript: 'Transcript'
                    };
                    return (
                      <div
                        key={meeting.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                          viewingSavedMeeting?.id === meeting.id ? 'border-primary bg-primary/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]' : 'border-primary/20 hover:border-primary/50'
                        }`}
                        onClick={() => handleViewSavedMeeting(meeting)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{meeting.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{modeLabels[meeting.type]}</Badge>
                              <span className="text-xs text-[hsl(15,48%,40%)]">{meeting.date}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-[hsl(15,48%,40%)] hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedMeeting(meeting.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Refinement Dialog */}
        <Dialog open={refinementDialogOpen} onOpenChange={setRefinementDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Refine Document
              </DialogTitle>
              <DialogDescription>How would you like to improve this document?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="e.g., Add more detail to the action items, make it more concise, change the tone..."
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex flex-wrap gap-2">
                {['Make it more concise', 'Add more detail', 'Make it more formal', 'Clarify action items'].map(suggestion => (
                  <Badge key={suggestion} variant="outline" className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]" onClick={() => setRefinementRequest(suggestion)}>
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={() => setRefinementDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRefine} disabled={isRefining} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                {isRefining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Refining...</> : <><Sparkles className="h-4 w-4 mr-2" />Refine</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
