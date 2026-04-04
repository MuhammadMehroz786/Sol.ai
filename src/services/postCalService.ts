/**
 * Post Cal Service
 * Manages scheduled posts with localStorage persistence
 * Also includes AI-powered content enhancement
 */

import { ScheduledPost, Platform, PostStatus, PostFilter } from '@/types/postCal';

const STORAGE_KEY = 'postCal_scheduledPosts';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

/**
 * Load all posts from localStorage
 */
export function loadPosts(): ScheduledPost[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load posts:', error);
  }
  return [];
}

/**
 * Save posts to localStorage
 */
export function savePosts(posts: ScheduledPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error('Failed to save posts:', error);
  }
}

/**
 * Create a new post
 */
export function createPost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'updatedAt'>): ScheduledPost {
  const now = new Date().toISOString();
  const newPost: ScheduledPost = {
    ...post,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };

  const posts = loadPosts();
  posts.push(newPost);
  savePosts(posts);

  return newPost;
}

/**
 * Update an existing post
 */
export function updatePost(id: string, updates: Partial<ScheduledPost>): ScheduledPost | null {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  savePosts(posts);
  return posts[index];
}

/**
 * Delete a post
 */
export function deletePost(id: string): boolean {
  const posts = loadPosts();
  const filtered = posts.filter(p => p.id !== id);

  if (filtered.length === posts.length) return false;

  savePosts(filtered);
  return true;
}

/**
 * Get posts for a specific date
 */
export function getPostsForDate(date: string): ScheduledPost[] {
  const posts = loadPosts();
  return posts.filter(p => p.scheduledDate === date);
}

/**
 * Get posts for a date range
 */
export function getPostsInRange(startDate: string, endDate: string): ScheduledPost[] {
  const posts = loadPosts();
  return posts.filter(p => p.scheduledDate >= startDate && p.scheduledDate <= endDate);
}

/**
 * Get posts by status
 */
export function getPostsByStatus(status: PostStatus): ScheduledPost[] {
  const posts = loadPosts();
  return posts.filter(p => p.status === status);
}

/**
 * Get posts by platform
 */
export function getPostsByPlatform(platform: Platform): ScheduledPost[] {
  const posts = loadPosts();
  return posts.filter(p => p.platform === platform);
}

/**
 * Filter posts with multiple criteria
 */
export function filterPosts(filter: PostFilter): ScheduledPost[] {
  let posts = loadPosts();

  if (filter.platforms.length > 0) {
    posts = posts.filter(p => filter.platforms.includes(p.platform));
  }

  if (filter.statuses.length > 0) {
    posts = posts.filter(p => filter.statuses.includes(p.status));
  }

  if (filter.dateRange) {
    posts = posts.filter(p =>
      p.scheduledDate >= filter.dateRange!.start &&
      p.scheduledDate <= filter.dateRange!.end
    );
  }

  return posts;
}

/**
 * Get upcoming posts (next 7 days)
 */
export function getUpcomingPosts(): ScheduledPost[] {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const posts = loadPosts();
  return posts
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

/**
 * Mark post as published
 */
export function markAsPublished(id: string): ScheduledPost | null {
  return updatePost(id, {
    status: 'published',
    publishedAt: new Date().toISOString()
  });
}

/**
 * Duplicate a post
 */
export function duplicatePost(id: string, newDate?: string, newTime?: string): ScheduledPost | null {
  const posts = loadPosts();
  const original = posts.find(p => p.id === id);

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

  posts.push(duplicate);
  savePosts(posts);

  return duplicate;
}

/**
 * Get analytics summary
 */
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

  const byStatus: Record<PostStatus, number> = {
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
    cancelled: 0
  };

  const byPlatform: Record<Platform, number> = {
    twitter: 0,
    linkedin: 0,
    instagram: 0,
    facebook: 0,
    threads: 0,
    tiktok: 0,
    youtube: 0,
    blog: 0,
    newsletter: 0,
    other: 0
  };

  posts.forEach(post => {
    byStatus[post.status]++;
    byPlatform[post.platform]++;
  });

  const thisWeek = posts.filter(p =>
    p.scheduledDate >= weekStart.toISOString().split('T')[0]
  ).length;

  const thisMonth = posts.filter(p =>
    p.scheduledDate >= monthStart.toISOString().split('T')[0]
  ).length;

  return {
    total: posts.length,
    byStatus,
    byPlatform,
    thisWeek,
    thisMonth
  };
}

/**
 * AI: Enhance content for a specific platform
 */
export async function enhanceContent(
  content: string,
  platform: Platform
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

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
      content: `${platformInstructions[platform]}

Original content:
${content}

Return the enhanced version only.`
    }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    let enhanced = data.choices[0]?.message?.content;

    if (!enhanced) throw new Error('No content generated');

    // Remove em dashes
    enhanced = enhanced.replace(/—/g, ', ').replace(/–/g, ', ');

    return { content: enhanced };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * AI: Generate hashtags for content
 */
export async function generateHashtags(
  content: string,
  platform: Platform,
  count: number = 5
): Promise<{ hashtags: string[]; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { hashtags: [], error: 'OpenAI API key not configured.' };
  }

  const messages = [
    {
      role: 'system' as const,
      content: 'Generate relevant, trending hashtags for social media content. Return ONLY hashtags separated by spaces, nothing else.'
    },
    {
      role: 'user' as const,
      content: `Generate ${count} relevant hashtags for this ${platform} content:\n\n${content}`
    }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const result = data.choices[0]?.message?.content || '';
    const hashtags = result.match(/#\w+/g) || [];

    return { hashtags };
  } catch (error) {
    return { hashtags: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * AI: Generate content ideas
 */
export async function generateContentIdeas(
  topic: string,
  platform: Platform,
  count: number = 5
): Promise<{ ideas: string[]; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { ideas: [], error: 'OpenAI API key not configured.' };
  }

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
    }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 500,
        temperature: 0.9
      })
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const result = data.choices[0]?.message?.content || '';
    const ideas = result
      .split('\n')
      .filter((line: string) => line.match(/^\d+[.)]/))
      .map((line: string) => line.replace(/^\d+[.)]\s*/, '').trim());

    return { ideas };
  } catch (error) {
    return { ideas: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
