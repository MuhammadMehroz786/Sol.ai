import { useState, useCallback, useRef, useEffect } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { generatePersonaContent, chatWithPersona, getPersonaIntroduction } from "@/services/personaService";
import { exportToPDF } from "@/utils/pdfExport";
import { Persona, ChatMessage, DEFAULT_PERSONAS, CONTENT_TYPES, CONTENT_LENGTHS, PersonaWritingRequest } from "@/types/persona";
import ReactMarkdown from "react-markdown";
import {
  Users,
  MessageSquare,
  PenTool,
  Sparkles,
  Send,
  Copy,
  Download,
  Loader2,
  Plus,
  User,
  Palette,
  Brain,
  BookOpen,
  Trash2,
  RefreshCw,
  ChevronRight,
  Zap,
  ArrowLeft,
  FileDown
} from "lucide-react";

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export default function PersonaGPT() {
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Personas state
  const [personas, setPersonas] = useState<Persona[]>(() => {
    // Load saved personas from localStorage or use defaults
    const saved = localStorage.getItem('personas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_PERSONAS.map(p => ({ ...p, id: generateId(), createdAt: new Date() }));
      }
    }
    return DEFAULT_PERSONAS.map(p => ({ ...p, id: generateId(), createdAt: new Date() }));
  });

  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [activeMode, setActiveMode] = useState<'select' | 'write' | 'chat'>('select');

  // Content generation state
  const [contentType, setContentType] = useState<string>('email');
  const [topic, setTopic] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Create persona dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPersona, setNewPersona] = useState({
    name: '',
    description: '',
    avatar: '👤',
    personality: '',
    writingStyle: '',
    tone: '',
    background: '',
    expertise: '',
    catchphrases: '',
    color: 'from-gray-500 to-gray-700'
  });

  // Save personas to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('personas', JSON.stringify(personas));
  }, [personas]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSelectPersona = useCallback(async (persona: Persona) => {
    setSelectedPersona(persona);
    setActiveMode('select');
    setChatMessages([]);
    setGeneratedContent('');
  }, []);

  const handleStartWriting = useCallback(() => {
    if (!selectedPersona) return;
    setActiveMode('write');
    setGeneratedContent('');
    setTopic('');
    setAdditionalContext('');
  }, [selectedPersona]);

  const handleStartChat = useCallback(async () => {
    if (!selectedPersona) return;
    setActiveMode('chat');
    setChatMessages([]);
    setChatInput('');

    // Get persona introduction
    const result = await getPersonaIntroduction(selectedPersona);
    if (result.content) {
      setChatMessages([{
        id: generateId(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        personaId: selectedPersona.id
      }]);
    }
  }, [selectedPersona]);

  const handleGenerateContent = useCallback(async () => {
    if (!selectedPersona || !topic.trim()) {
      toast({
        title: "Missing topic",
        description: "Please enter a topic for the content.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const request: PersonaWritingRequest = {
        personaId: selectedPersona.id,
        contentType: contentType as PersonaWritingRequest['contentType'],
        topic,
        additionalContext,
        length: contentLength
      };

      const result = await generatePersonaContent(selectedPersona, request);

      if (result.error) {
        toast({
          title: "Generation failed",
          description: result.error,
          variant: "destructive"
        });
      } else {
        setGeneratedContent(result.content);
        toast({
          title: "Content Generated!",
          description: `${selectedPersona.name} has created your ${contentType}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPersona, contentType, topic, additionalContext, contentLength, toast]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedPersona || !chatInput.trim() || isChatting) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
      personaId: selectedPersona.id
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const result = await chatWithPersona(
        selectedPersona,
        userMessage.content,
        [...chatMessages, userMessage]
      );

      if (result.error) {
        toast({
          title: "Chat error",
          description: result.error,
          variant: "destructive"
        });
      } else {
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.content,
          timestamp: new Date(),
          personaId: selectedPersona.id
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    } finally {
      setIsChatting(false);
    }
  }, [selectedPersona, chatInput, chatMessages, isChatting, toast]);

  const handleCreatePersona = useCallback(() => {
    if (!newPersona.name.trim() || !newPersona.personality.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in at least the name and personality.",
        variant: "destructive"
      });
      return;
    }

    const persona: Persona = {
      id: generateId(),
      name: newPersona.name,
      description: newPersona.description || `Custom persona: ${newPersona.name}`,
      avatar: newPersona.avatar || '👤',
      personality: newPersona.personality,
      writingStyle: newPersona.writingStyle || 'Natural and authentic',
      tone: newPersona.tone || 'Conversational',
      background: newPersona.background || '',
      expertise: newPersona.expertise ? newPersona.expertise.split(',').map(e => e.trim()) : [],
      catchphrases: newPersona.catchphrases ? newPersona.catchphrases.split(',').map(c => c.trim()) : undefined,
      color: newPersona.color,
      createdAt: new Date(),
      isDefault: false
    };

    setPersonas(prev => [...prev, persona]);
    setCreateDialogOpen(false);
    setNewPersona({
      name: '',
      description: '',
      avatar: '👤',
      personality: '',
      writingStyle: '',
      tone: '',
      background: '',
      expertise: '',
      catchphrases: '',
      color: 'from-gray-500 to-gray-700'
    });

    toast({
      title: "Persona Created!",
      description: `${persona.name} is ready to write and chat.`,
    });
  }, [newPersona, toast]);

  const handleDeletePersona = useCallback((personaId: string) => {
    setPersonas(prev => prev.filter(p => p.id !== personaId));
    if (selectedPersona?.id === personaId) {
      setSelectedPersona(null);
      setActiveMode('select');
    }
    toast({
      title: "Persona Deleted",
      description: "The persona has been removed.",
    });
  }, [selectedPersona, toast]);

  const handleCopyContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast({ title: "Copied!", description: "Content copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }, [generatedContent, toast]);

  const handleDownloadContent = useCallback(() => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPersona?.name}-${contentType}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Content saved as Markdown." });
  }, [generatedContent, selectedPersona, contentType, toast]);

  const handleExportChatPDF = useCallback(async () => {
    if (!selectedPersona || chatMessages.length === 0) return;

    const chatContent = chatMessages.map(m =>
      `**${m.role === 'user' ? 'You' : selectedPersona.name}:**\n${m.content}`
    ).join('\n\n---\n\n');

    try {
      await exportToPDF(chatContent, {
        filename: `Chat-with-${selectedPersona.name}-${new Date().toISOString().split('T')[0]}.pdf`,
        title: `Conversation with ${selectedPersona.name}`,
        subtitle: `${chatMessages.length} messages`,
        accentColor: '#8b5cf6'
      });
      toast({ title: "PDF Downloaded!", description: "Chat exported as PDF." });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }, [selectedPersona, chatMessages, toast]);

  const colorOptions = [
    'from-slate-600 to-slate-800',
    'from-red-500 to-rose-600',
    'from-orange-500 to-amber-600',
    'from-yellow-500 to-orange-500',
    'from-green-500 to-emerald-600',
    'from-teal-500 to-cyan-600',
    'from-blue-500 to-indigo-600',
    'from-indigo-500 to-purple-600',
    'from-purple-500 to-violet-600',
    'from-pink-500 to-rose-600'
  ];

  const avatarOptions = ['👔', '🎨', '🎓', '✨', '💪', '🌸', '🚀', '💡', '🎭', '📚', '🎯', '💼', '👤', '🌟', '🔥', '💎'];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page Hero */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeMode !== 'select' && (
              <Button variant="ghost" size="sm" onClick={() => setActiveMode('select')} className="mr-1 border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl opacity-60" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.35)]">
                <Users className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">Persona GPT</h1>
              <p className="text-sm text-[hsl(15,48%,35%)] font-semibold">{selectedPersona ? `Writing as ${selectedPersona.name}` : 'Write and converse through AI-crafted personas'}</p>
            </div>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50 transition-all duration-200">
                <Plus className="h-4 w-4" />
                Create Persona
              </Button>
            </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Create Custom Persona
                    </DialogTitle>
                    <DialogDescription>
                      Design a unique AI personality to write and chat as
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          placeholder="e.g., Sarah Mitchell"
                          value={newPersona.name}
                          onChange={(e) => setNewPersona(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Avatar</Label>
                        <div className="flex flex-wrap gap-1">
                          {avatarOptions.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => setNewPersona(prev => ({ ...prev, avatar: emoji }))}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-primary/10 transition-colors ${
                                newPersona.avatar === emoji ? 'bg-primary/15 ring-2 ring-primary' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="A brief description of who they are"
                        value={newPersona.description}
                        onChange={(e) => setNewPersona(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Personality *</Label>
                      <Textarea
                        placeholder="Describe their personality traits, how they interact, their values..."
                        value={newPersona.personality}
                        onChange={(e) => setNewPersona(prev => ({ ...prev, personality: e.target.value }))}
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Writing Style</Label>
                        <Input
                          placeholder="e.g., Concise and witty"
                          value={newPersona.writingStyle}
                          onChange={(e) => setNewPersona(prev => ({ ...prev, writingStyle: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tone</Label>
                        <Input
                          placeholder="e.g., Warm and encouraging"
                          value={newPersona.tone}
                          onChange={(e) => setNewPersona(prev => ({ ...prev, tone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Background</Label>
                      <Textarea
                        placeholder="Their history, experience, achievements..."
                        value={newPersona.background}
                        onChange={(e) => setNewPersona(prev => ({ ...prev, background: e.target.value }))}
                        className="min-h-[60px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expertise (comma separated)</Label>
                        <Input
                          placeholder="Marketing, Sales, Leadership"
                          value={newPersona.expertise}
                          onChange={(e) => setNewPersona(prev => ({ ...prev, expertise: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catchphrases (comma separated)</Label>
                        <Input
                          placeholder="Let me tell you, Here's the thing"
                          value={newPersona.catchphrases}
                          onChange={(e) => setNewPersona(prev => ({ ...prev, catchphrases: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Color Theme</Label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewPersona(prev => ({ ...prev, color }))}
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} ${
                              newPersona.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreatePersona} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Persona
                    </Button>
                  </DialogFooter>
                </DialogContent>
          </Dialog>
        </div>

          {/* Persona Selection */}
          {activeMode === 'select' && (
            <div className="space-y-6">
              {selectedPersona && (
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedPersona.color} shadow-lg text-3xl`}>
                        {selectedPersona.avatar}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-[hsl(15,48%,25%)]">{selectedPersona.name}</h2>
                        <p className="text-sm text-[hsl(15,48%,40%)] mb-3">{selectedPersona.description}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedPersona.expertise.map(exp => (
                            <Badge key={exp} variant="secondary" className="bg-primary/15 text-[hsl(21,58%,45%)] border-primary/20">{exp}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={handleStartWriting} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                            <PenTool className="h-4 w-4 mr-2" />
                            Write as {selectedPersona.name.split(' ')[0]}
                          </Button>
                          <Button onClick={handleStartChat} variant="outline" className="border-primary/30 text-[hsl(21,58%,45%)] hover:bg-primary/5 transition-all duration-200">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat with {selectedPersona.name.split(' ')[0]}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[hsl(15,48%,25%)]">
                  <Users className="h-5 w-5 text-primary" />
                  {selectedPersona ? 'Or choose another persona' : 'Choose a Persona'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personas.map((persona) => (
                    <Card
                      key={persona.id}
                      className={`cursor-pointer transition-all duration-200 bg-white/95 backdrop-blur-sm border-2 group ${
                        selectedPersona?.id === persona.id ? 'ring-2 ring-primary border-primary shadow-[0_4px_16px_rgba(208,126,59,0.2)]' : 'border-primary/20 hover:border-primary/50 hover:shadow-[0_3px_12px_rgba(208,126,59,0.1)]'
                      }`}
                      onClick={() => handleSelectPersona(persona)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${persona.color} shadow-sm text-2xl group-hover:scale-105 transition-transform`}>
                            {persona.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold truncate text-[hsl(15,48%,25%)]">{persona.name}</h4>
                              {!persona.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePersona(persona.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-[hsl(15,48%,40%)] line-clamp-2">{persona.description}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Badge variant="outline" className="text-xs py-0 border-primary/20 text-[hsl(21,58%,45%)]">{persona.tone}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Write Mode */}
          {activeMode === 'write' && selectedPersona && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                <CardHeader>
                  <CardTitle className="text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-primary" />
                    Write as {selectedPersona.name}
                  </CardTitle>
                  <CardDescription className="text-[hsl(15,48%,40%)]">Generate content in {selectedPersona.name}'s voice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger className="bg-white/80 border-primary/20 focus:border-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <span className="font-medium">{type.label}</span>
                              <span className="text-[hsl(15,48%,40%)] ml-2 text-xs">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Topic / Subject *</Label>
                    <Textarea
                      placeholder="What should the content be about?"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Context</Label>
                    <Textarea
                      placeholder="Any specific details, audience, or requirements..."
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Length</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {CONTENT_LENGTHS.map(len => (
                        <button
                          key={len.value}
                          onClick={() => setContentLength(len.value as 'short' | 'medium' | 'long')}
                          className={`p-2 rounded-lg border-2 transition-all text-center ${
                            contentLength === len.value
                              ? 'border-primary bg-gradient-to-br from-primary/8 to-accent/8 shadow-[0_4px_16px_rgba(208,126,59,0.2)]'
                              : 'border-primary/20 hover:border-primary/50 bg-white/80 hover:bg-primary/5'
                          }`}
                        >
                          <div className="font-medium text-sm text-[hsl(15,48%,25%)]">{len.label}</div>
                          <div className="text-xs text-[hsl(15,48%,40%)]">{len.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {selectedPersona.name} is writing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output Panel */}
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold">Generated Content</CardTitle>
                    <CardDescription className="text-[hsl(15,48%,40%)]">By {selectedPersona.name}</CardDescription>
                  </div>
                  {generatedContent && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/8" onClick={handleCopyContent}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/8" onClick={handleDownloadContent}>
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-3">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${selectedPersona.color} mx-auto text-3xl animate-pulse`}>
                          {selectedPersona.avatar}
                        </div>
                        <p className="text-sm text-[hsl(15,48%,40%)]">{selectedPersona.name} is crafting your content...</p>
                      </div>
                    </div>
                  ) : generatedContent ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-center">
                      <div className="space-y-2">
                        <Brain className="h-12 w-12 text-[hsl(15,48%,40%)]/50 mx-auto" />
                        <p className="text-[hsl(15,48%,40%)]">Enter a topic and click Generate to see {selectedPersona.name}'s writing</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat Mode */}
          {activeMode === 'chat' && selectedPersona && (
            <Card className="max-w-3xl mx-auto bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)]">
              <CardHeader className="border-b border-primary/15 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${selectedPersona.color} text-xl`}>
                    {selectedPersona.avatar}
                  </div>
                  <div>
                    <CardTitle className="text-lg text-[hsl(15,48%,25%)] font-bold">Chat with {selectedPersona.name}</CardTitle>
                    <CardDescription className="text-[hsl(15,48%,40%)]">{selectedPersona.tone}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={() => setChatMessages([])}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  {chatMessages.length > 0 && (
                    <Button variant="outline" size="sm" className="border-primary/30 text-[hsl(15,48%,25%)] hover:bg-primary/8 hover:border-primary/50" onClick={handleExportChatPDF}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <ScrollArea className="h-[500px] p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground text-sm'
                              : `bg-gradient-to-br ${selectedPersona.color}`
                          }`}>
                            {message.role === 'user' ? 'You' : selectedPersona.avatar}
                          </div>
                          <div className={`rounded-2xl px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/8'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${selectedPersona.color}`}>
                            {selectedPersona.avatar}
                          </div>
                          <div className="bg-primary/10 rounded-2xl px-4 py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t border-primary/15 p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Message ${selectedPersona.name}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={isChatting}
                      className="flex-1 bg-white/80 border-primary/20 focus:border-primary/50 focus-visible:ring-primary/20"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isChatting || !chatInput.trim()}
                      className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </Layout>
  );
}
