/**
 * Post Cal Service
 * Manages scheduled posts with localStorage persistence.
 * AI features call the openai-proxy Edge Function — the API key never touches the browser.
 */

import { ScheduledPost, Platform, PostStatus, PostFilter } from '@/types/postCal';
import { callOpenAI } from '@/lib/openaiProxy';

const STORAGE_KEY = 'postCal_scheduledPosts';

const generateId = () => crypto.randomUUID();

export function loadPosts(): ScheduledPost[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // localStorage unavailable
  }
  return [];
}

export function savePosts(posts: ScheduledPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // localStorage unavailable
  }
}

export function createPost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'updatedAt'>): ScheduledPost {
  const now = new Date().toISOString();
  const newPost: ScheduledPost = { ...post, id: generateId(), createdAt: now, updatedAt: now };
  const posts = loadPosts();
  posts.push(newPost);
  savePosts(posts);
  return newPost;
}

export function updatePost(id: string, updates: Partial<ScheduledPost>): ScheduledPost | null {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  posts[index] = { ...posts[index], ...updates, updatedAt: new Date().toISOString() };
  savePosts(posts);
  return posts[index];
}

export function deletePost(id: string): boolean {
  const posts = loadPosts();
  const filtered = posts.filter(p => p.id !== id);
  if (filtered.length === posts.length) return false;
  savePosts(filtered);
  return true;
}

export function getPostsForDate(date: string): ScheduledPost[] {
  return loadPosts().filter(p => p.scheduledDate === date);
}

export function getPostsInRange(startDate: string, endDate: string): ScheduledPost[] {
  return loadPosts().filter(p => p.scheduledDate >= startDate && p.scheduledDate <= endDate);
}

export function getPostsByStatus(status: PostStatus): ScheduledPost[] {
  return loadPosts().filter(p => p.status === status);
}

export function getPostsByPlatform(platform: Platform): ScheduledPost[] {
  return loadPosts().filter(p => p.platform === platform);
}

export function filterPosts(filter: PostFilter): ScheduledPost[] {
  let posts = loadPosts();
  if (filter.platforms.length > 0) posts = posts.filter(p => filter.platforms.includes(p.platform));
  if (filter.statuses.length > 0) posts = posts.filter(p => filter.statuses.includes(p.status));
  if (filter.dateRange) {
    posts = posts.filter(p =>
      p.scheduledDate >= filter.dateRange!.start && p.scheduledDate <= filter.dateRange!.end
    );
  }
  return posts;
}

export function getUpcomingPosts(): ScheduledPost[] {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return loadPosts()
    .filter(p =>
      p.status === 'scheduled' &&
      p.scheduledDate >= today.toISOString().split('T')[0] &&
      p.scheduledDate <= nextWeek.toISOString().split('T')[0]
    )
    .sort((a, b) => {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
}

export function markAsPublished(id: string): ScheduledPost | null {
  return updatePost(id, { status: 'published', publishedAt: new Date().toISOString() });
}

export function duplicatePost(id: string, newDate?: string, newTime?: string): ScheduledPost | null {
  const original = loadPosts().find(p => p.id === id);
  if (!original) return null;

  const now = new Date().toISOString();
  const duplicate: ScheduledPost = {
    ...original,
    id: generateId(),
    title: `${original.title} (Copy)`,
    status: 'draft',
    scheduledDate: newDate || original.scheduledDate,
    scheduledTime: newTime || original.scheduledTime,
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined
  };

  const posts = loadPosts();
  posts.push(duplicate);
  savePosts(posts);
  return duplicate;
}

export function getAnalytics(): {
  total: number;
  byStatus: Record<PostStatus, number>;
  byPlatform: Record<Platform, number>;
  thisWeek: number;
  thisMonth: number;
} {
  const posts = loadPosts();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const byStatus: Record<PostStatus, number> = { draft: 0, scheduled: 0, published: 0, failed: 0, cancelled: 0 };
  const byPlatform: Record<Platform, number> = {
    twitter: 0, linkedin: 0, instagram: 0, facebook: 0, threads: 0,
    tiktok: 0, youtube: 0, blog: 0, newsletter: 0, other: 0
  };

  posts.forEach(post => {
    byStatus[post.status]++;
    byPlatform[post.platform]++;
  });

  return {
    total: posts.length,
    byStatus,
    byPlatform,
    thisWeek: posts.filter(p => p.scheduledDate >= weekStart.toISOString().split('T')[0]).length,
    thisMonth: posts.filter(p => p.scheduledDate >= monthStart.toISOString().split('T')[0]).length,
  };
}

// ─── AI features ───

const platformInstructions: Record<Platform, string> = {
  twitter: 'Optimize for Twitter/X. Keep under 280 characters. Make it punchy, engaging, and shareable. Use relevant hashtags sparingly (1-2 max).',
  linkedin: 'Optimize for LinkedIn. Professional yet personable tone. Add line breaks for readability. Include a call to action.',
  instagram: 'Optimize for Instagram. Engaging caption with emojis. Include relevant hashtags at the end (5-10). Start with a hook.',
  facebook: 'Optimize for Facebook. Conversational and engaging. Encourage comments and shares. Medium length.',
  threads: 'Optimize for Threads. Conversational, authentic voice. Keep under 500 characters. Trendy but not forced.',
  tiktok: 'Optimize for TikTok caption. Very short, catchy, with trending hooks. Use Gen-Z friendly language naturally.',
  youtube: 'Optimize for YouTube description. Include key points, timestamps suggestion, and call to action for likes/subscribes.',
  blog: 'Optimize for blog post. Well-structured with clear paragraphs. Professional yet accessible tone.',
  newsletter: 'Optimize for email newsletter. Personal tone, clear value proposition, strong subject line suggestion included.',
  other: 'Enhance for general social media. Make it engaging and shareable.'
};

export async function enhanceContent(content: string, platform: Platform): Promise<{ content: string; error?: string }> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a social media expert. Enhance the given content for maximum engagement.

RULES:
- NEVER use em dashes. Use commas or periods instead.
- Keep the core message intact
- Make it natural and human, not robotic
- Match the platform's style and best practices
- Return ONLY the enhanced content, no explanations`
    },
    {
      role: 'user' as const,
      content: `${platformInstructions[platform]}\n\nOriginal content:\n${content}\n\nReturn the enhanced version only.`
    },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 500, temperature: 0.8 });
  if (error || !raw) return { content: '', error: error || 'No content generated' };

  return { content: raw.replace(/—/g, ', ').replace(/–/g, ', ') };
}

export async function generateHashtags(content: string, platform: Platform, count = 5): Promise<{ hashtags: string[]; error?: string }> {
  const messages = [
    {
      role: 'system' as const,
      content: 'Generate relevant, trending hashtags for social media content. Return ONLY hashtags separated by spaces, nothing else.'
    },
    {
      role: 'user' as const,
      content: `Generate ${count} relevant hashtags for this ${platform} content:\n\n${content}`
    },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 100, temperature: 0.7 });
  if (error || !raw) return { hashtags: [], error: error || 'No hashtags generated' };

  const hashtags = raw.match(/#\w+/g) || [];
  return { hashtags };
}

export async function generateContentIdeas(topic: string, platform: Platform, count = 5): Promise<{ ideas: string[]; error?: string }> {
  const messages = [
    {
      role: 'system' as const,
      content: `Generate creative, engaging content ideas for social media. Be specific and actionable. Return as a numbered list.

RULES:
- No em dashes
- Ideas should be ready to develop
- Match the platform style
- Be creative and trendy`
    },
    {
      role: 'user' as const,
      content: `Generate ${count} content ideas about "${topic}" for ${platform}.`
    },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 500, temperature: 0.9 });
  if (error || !raw) return { ideas: [], error: error || 'No ideas generated' };

  const ideas = raw
    .split('\n')
    .filter((line: string) => line.match(/^\d+[.)]/) )
    .map((line: string) => line.replace(/^\d+[.)]\s*/, '').trim());

  return { ideas };
}
