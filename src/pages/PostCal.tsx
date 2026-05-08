import { useState, useCallback, useEffect, useMemo } from "react";
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
import {
  loadPosts,
  createPost,
  updatePost,
  deletePost,
  duplicatePost,
  markAsPublished,
  getUpcomingPosts,
  getAnalytics,
  enhanceContent,
  generateHashtags
} from "@/services/postCalService";
import {
  ScheduledPost,
  Platform,
  PostStatus,
  PLATFORMS,
  POST_STATUSES,
  TIME_SLOTS,
  BEST_POSTING_TIMES,
  CONTENT_TEMPLATES
} from "@/types/postCal";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Hash,
  Wand2,
  MoreVertical,
  CalendarDays,
  TrendingUp,
  FileText,
  Loader2,
  X,
  AlertCircle,
  Image,
  Video,
  Upload,
  FileImage
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PostCal() {
  const { toast } = useToast();

  // Posts state
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  // View state
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dialog state
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    platform: 'twitter' as Platform,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '12:00',
    status: 'scheduled' as PostStatus,
    tags: '',
    notes: '',
    mediaUrls: [] as string[]
  });

  // Loading states
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);

  // Load posts on mount
  useEffect(() => {
    setPosts(loadPosts());
  }, []);

  // Calendar helpers
  const monthStart = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = monthStart.getDay();

    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }

    // Add days of current month
    for (let i = 1; i <= monthEnd.getDate(); i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    // Add days from next month to complete grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }, [monthStart, monthEnd, currentDate]);

  const getPostsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(p => p.scheduledDate === dateStr);
  }, [posts]);

  const analytics = useMemo(() => getAnalytics(), [posts]);
  const upcomingPosts = useMemo(() => getUpcomingPosts(), [posts]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleOpenNewPost = (date?: Date) => {
    setIsEditing(false);
    setSelectedPost(null);
    setFormData({
      title: '',
      content: '',
      platform: 'twitter',
      scheduledDate: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      scheduledTime: '12:00',
      status: 'scheduled',
      tags: '',
      notes: '',
      mediaUrls: []
    });
    setPostDialogOpen(true);
  };

  const handleOpenEditPost = (post: ScheduledPost) => {
    setIsEditing(true);
    setSelectedPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      platform: post.platform,
      scheduledDate: post.scheduledDate,
      scheduledTime: post.scheduledTime,
      status: post.status,
      tags: post.tags.join(', '),
      notes: post.notes || '',
      mediaUrls: post.mediaUrls || []
    });
    setPostDialogOpen(true);
  };

  const handleSavePost = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Missing fields", description: "Please fill in title and content.", variant: "destructive" });
      return;
    }

    const postData = {
      title: formData.title,
      content: formData.content,
      platform: formData.platform,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      status: formData.status,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: formData.notes,
      mediaUrls: formData.mediaUrls
    };

    if (isEditing && selectedPost) {
      updatePost(selectedPost.id, postData);
      toast({ title: "Post updated!", description: "Your post has been updated." });
    } else {
      createPost(postData);
      toast({ title: "Post scheduled!", description: `Scheduled for ${formData.scheduledDate} at ${formData.scheduledTime}` });
    }

    setPosts(loadPosts());
    setPostDialogOpen(false);
  };

  const handleDeletePost = () => {
    if (selectedPost) {
      deletePost(selectedPost.id);
      setPosts(loadPosts());
      setDeleteConfirmOpen(false);
      setSelectedPost(null);
      toast({ title: "Post deleted" });
    }
  };

  const handleDuplicatePost = (post: ScheduledPost) => {
    duplicatePost(post.id);
    setPosts(loadPosts());
    toast({ title: "Post duplicated", description: "A copy has been created as a draft." });
  };

  const handleMarkPublished = (post: ScheduledPost) => {
    markAsPublished(post.id);
    setPosts(loadPosts());
    toast({ title: "Marked as published!" });
  };

  const handleEnhanceContent = async () => {
    if (!formData.content.trim()) return;

    setIsEnhancing(true);
    const result = await enhanceContent(formData.content, formData.platform);

    if (result.error) {
      toast({ title: "Enhancement failed", description: result.error, variant: "destructive" });
    } else {
      setFormData(prev => ({ ...prev, content: result.content }));
      toast({ title: "Content enhanced!", description: `Optimized for ${formData.platform}` });
    }
    setIsEnhancing(false);
  };

  const handleGenerateHashtags = async () => {
    if (!formData.content.trim()) return;

    setIsGeneratingHashtags(true);
    const result = await generateHashtags(formData.content, formData.platform, 5);

    if (result.error) {
      toast({ title: "Failed", variant: "destructive" });
    } else if (result.hashtags.length > 0) {
      const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
      const newTags = [...new Set([...currentTags, ...result.hashtags.map(h => h.replace('#', ''))])];
      setFormData(prev => ({ ...prev, tags: newTags.join(', ') }));
      toast({ title: "Hashtags added!" });
    }
    setIsGeneratingHashtags(false);
  };

  const handleUseTemplate = (template: string) => {
    setFormData(prev => ({ ...prev, content: template }));
  };

  // Media upload handlers
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxFiles = 4;
    const currentCount = formData.mediaUrls.length;
    const allowedCount = maxFiles - currentCount;

    if (allowedCount <= 0) {
      toast({ title: "Limit reached", description: "Maximum 4 media files allowed.", variant: "destructive" });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, allowedCount);

    filesToProcess.forEach(file => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 5MB limit.`, variant: "destructive" });
        return;
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Invalid file type", description: "Only images (JPG, PNG, GIF, WebP) and videos (MP4, WebM) are allowed.", variant: "destructive" });
        return;
      }

      // Convert to base64 for localStorage storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, base64]
        }));
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }));
  };

  const isVideoUrl = (url: string) => {
    return url.includes('video/') || url.endsWith('.mp4') || url.endsWith('.webm');
  };

  const getPlatformInfo = (platform: Platform) => PLATFORMS.find(p => p.value === platform);
  const getStatusInfo = (status: PostStatus) => POST_STATUSES.find(s => s.value === status);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const charLimit = getPlatformInfo(formData.platform)?.charLimit;
  const charCount = formData.content.length;
  const isOverLimit = charLimit && charCount > charLimit;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Page Hero */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl opacity-60" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(26,47%,68%)] to-primary shadow-[0_4px_16px_rgba(208,126,59,0.35)]">
                <CalendarDays className="h-6 w-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">Post Calendar</h1>
              <p className="text-sm text-[hsl(15,48%,35%)] font-semibold">Schedule, plan and manage your social content</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-primary/8 border border-primary/20 rounded-lg p-1">
              <Button
                variant={activeView === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                className={activeView === 'calendar' ? 'bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white shadow-[0_4px_12px_rgba(208,126,59,0.3)]' : 'text-[hsl(15,48%,25%)] hover:bg-primary/10'}
                onClick={() => setActiveView('calendar')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className={activeView === 'list' ? 'bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white shadow-[0_4px_12px_rgba(208,126,59,0.3)]' : 'text-[hsl(15,48%,25%)] hover:bg-primary/10'}
                onClick={() => setActiveView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => handleOpenNewPost()} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeView === 'calendar' ? (
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-bold">
                          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h2>
                        <Button variant="outline" size="sm" onClick={handleNextMonth}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                        Today
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-px bg-primary/10 rounded-lg overflow-hidden">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="bg-white/95 p-2 text-center text-sm font-medium text-[hsl(15,48%,40%)]">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((date, idx) => {
                        const dayPosts = getPostsForDate(date);
                        const isCurrentDay = isToday(date);
                        const inMonth = isCurrentMonth(date);

                        return (
                          <div
                            key={idx}
                            className={`bg-white/95 min-h-[100px] p-1 cursor-pointer hover:bg-primary/5 transition-colors ${
                              !inMonth ? 'opacity-40' : ''
                            } ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}`}
                            onClick={() => handleOpenNewPost(date)}
                          >
                            <div className={`text-sm font-medium mb-1 ${
                              isCurrentDay ? 'text-primary' : ''
                            }`}>
                              {date.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayPosts.slice(0, 3).map(post => {
                                const platform = getPlatformInfo(post.platform);
                                return (
                                  <div
                                    key={post.id}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate ${platform?.color}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditPost(post);
                                    }}
                                    title={post.title}
                                  >
                                    {post.scheduledTime} {post.title}
                                  </div>
                                );
                              })}
                              {dayPosts.length > 3 && (
                                <div className="text-xs text-[hsl(15,48%,40%)] text-center">
                                  +{dayPosts.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.08)] hover:shadow-[0_6px_28px_rgba(208,126,59,0.14)] transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-[hsl(15,48%,25%)] font-bold">All Posts</CardTitle>
                    <CardDescription>{posts.length} total posts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-3">
                        {posts.length === 0 ? (
                          <div className="text-center py-12 text-[hsl(15,48%,40%)]">
                            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No posts scheduled yet</p>
                            <Button variant="outline" className="mt-4" onClick={() => handleOpenNewPost()}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create your first post
                            </Button>
                          </div>
                        ) : (
                          posts
                            .sort((a, b) => {
                              const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
                              if (dateCompare !== 0) return dateCompare;
                              return a.scheduledTime.localeCompare(b.scheduledTime);
                            })
                            .map(post => {
                              const platform = getPlatformInfo(post.platform);
                              const status = getStatusInfo(post.status);
                              return (
                                <div
                                  key={post.id}
                                  className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow"
                                >
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform?.color} text-lg shrink-0`}>
                                    {platform?.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium truncate">{post.title}</span>
                                      <Badge variant="outline" className={status?.color}>{status?.label}</Badge>
                                    </div>
                                    <p className="text-sm text-[hsl(15,48%,40%)] line-clamp-2 mb-2">{post.content}</p>
                                    <div className="flex items-center gap-3 text-xs text-[hsl(15,48%,40%)]">
                                      <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        {formatDate(post.scheduledDate)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {post.scheduledTime}
                                      </span>
                                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                                        <span className="flex items-center gap-1 text-primary">
                                          <Image className="h-3 w-3" />
                                          {post.mediaUrls.length} media
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenEditPost(post)}>
                                        <Edit className="h-4 w-4 mr-2" />Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDuplicatePost(post)}>
                                        <Copy className="h-4 w-4 mr-2" />Duplicate
                                      </DropdownMenuItem>
                                      {post.status === 'scheduled' && (
                                        <DropdownMenuItem onClick={() => handleMarkPublished(post)}>
                                          <CheckCircle2 className="h-4 w-4 mr-2" />Mark Published
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => { setSelectedPost(post); setDeleteConfirmOpen(true); }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(15,48%,40%)]">Total Posts</span>
                    <span className="font-medium">{analytics.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(15,48%,40%)]">Scheduled</span>
                    <span className="font-medium text-blue-600">{analytics.byStatus.scheduled}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(15,48%,40%)]">Published</span>
                    <span className="font-medium text-green-600">{analytics.byStatus.published}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(15,48%,40%)]">Drafts</span>
                    <span className="font-medium text-gray-600">{analytics.byStatus.draft}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingPosts.length === 0 ? (
                    <p className="text-sm text-[hsl(15,48%,40%)] text-center py-4">No upcoming posts</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingPosts.slice(0, 5).map(post => {
                        const platform = getPlatformInfo(post.platform);
                        return (
                          <div
                            key={post.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-primary/5 rounded p-1 -m-1"
                            onClick={() => handleOpenEditPost(post)}
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded ${platform?.color} text-sm`}>
                              {platform?.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{post.title}</p>
                              <p className="text-xs text-[hsl(15,48%,40%)]">
                                {formatDate(post.scheduledDate)} at {post.scheduledTime}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Templates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[hsl(15,48%,25%)] font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CONTENT_TEMPLATES.slice(0, 4).map(template => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleOpenNewPost();
                        setTimeout(() => handleUseTemplate(template.template), 100);
                      }}
                    >
                      {template.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Post Dialog */}
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {isEditing ? 'Edit Post' : 'Schedule New Post'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Platform & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={formData.platform} onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v as Platform }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <span className={`flex h-5 w-5 items-center justify-center rounded text-xs ${p.color}`}>
                              {p.icon}
                            </span>
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as PostStatus }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Give your post a title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnhanceContent}
                      disabled={isEnhancing || !formData.content}
                    >
                      {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      <span className="ml-1">Enhance</span>
                    </Button>
                    <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-[hsl(15,48%,40%)]'}`}>
                      {charCount}{charLimit && ` / ${charLimit}`}
                    </span>
                  </div>
                </div>
                <Textarea
                  placeholder="Write your post content..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className={`min-h-[150px] ${isOverLimit ? 'border-destructive' : ''}`}
                />
                {isOverLimit && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Content exceeds {charLimit} character limit for {formData.platform}
                  </p>
                )}
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-primary" />
                    Media ({formData.mediaUrls.length}/4)
                  </Label>
                  <span className="text-xs text-[hsl(15,48%,40%)]">JPG, PNG, GIF, WebP, MP4, WebM (max 5MB)</span>
                </div>

                {/* Media Preview Grid */}
                {formData.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {formData.mediaUrls.map((url, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-primary/10">
                        {isVideoUrl(url) ? (
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Video indicator */}
                        {isVideoUrl(url) && (
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Video className="h-3 w-3" />
                          </div>
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {formData.mediaUrls.length < 4 && (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-[hsl(15,48%,40%)]" />
                    <span className="text-sm text-[hsl(15,48%,40%)]">
                      Click to upload media or drag and drop
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                      multiple
                      className="hidden"
                      onChange={handleMediaUpload}
                    />
                  </label>
                )}
              </div>

              {/* Templates */}
              <div className="space-y-2">
                <Label>Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TEMPLATES.map(t => (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/5 border-primary/20 text-[hsl(21,58%,45%)]"
                      onClick={() => handleUseTemplate(t.template)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={formData.scheduledTime} onValueChange={(v) => setFormData(prev => ({ ...prev, scheduledTime: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                          {BEST_POSTING_TIMES[formData.platform]?.includes(time) && (
                            <span className="ml-2 text-green-600">★ Best time</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tags / Hashtags</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateHashtags}
                    disabled={isGeneratingHashtags || !formData.content}
                  >
                    {isGeneratingHashtags ? <Loader2 className="h-3 w-3 animate-spin" /> : <Hash className="h-3 w-3" />}
                    <span className="ml-1">Generate</span>
                  </Button>
                </div>
                <Input
                  placeholder="tag1, tag2, tag3"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (internal)</Label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePost} className="bg-gradient-to-r from-primary via-[hsl(26,47%,68%)] to-primary text-white hover:shadow-[0_6px_20px_rgba(208,126,59,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold">
                {isEditing ? 'Save Changes' : 'Schedule Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Post?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The post "{selectedPost?.title}" will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeletePost}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
