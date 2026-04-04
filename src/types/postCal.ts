/**
 * Post Cal Types
 * Content scheduling and calendar management
 */

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platform: Platform;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // HH:mm format
  status: PostStatus;
  tags: string[];
  mediaUrls?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type Platform =
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'tiktok'
  | 'youtube'
  | 'blog'
  | 'newsletter'
  | 'other';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface PostCalendarView {
  month: number;
  year: number;
}

export interface PostFilter {
  platforms: Platform[];
  statuses: PostStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export const PLATFORMS: { value: Platform; label: string; icon: string; color: string; charLimit?: number }[] = [
  { value: 'twitter', label: 'Twitter/X', icon: '𝕏', color: 'bg-black text-white', charLimit: 280 },
  { value: 'linkedin', label: 'LinkedIn', icon: 'in', color: 'bg-blue-700 text-white', charLimit: 3000 },
  { value: 'instagram', label: 'Instagram', icon: '📷', color: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white', charLimit: 2200 },
  { value: 'facebook', label: 'Facebook', icon: 'f', color: 'bg-blue-600 text-white', charLimit: 63206 },
  { value: 'threads', label: 'Threads', icon: '@', color: 'bg-black text-white', charLimit: 500 },
  { value: 'tiktok', label: 'TikTok', icon: '♪', color: 'bg-black text-white', charLimit: 2200 },
  { value: 'youtube', label: 'YouTube', icon: '▶', color: 'bg-red-600 text-white' },
  { value: 'blog', label: 'Blog', icon: '📝', color: 'bg-emerald-600 text-white' },
  { value: 'newsletter', label: 'Newsletter', icon: '📧', color: 'bg-amber-600 text-white' },
  { value: 'other', label: 'Other', icon: '📌', color: 'bg-gray-600 text-white' }
];

export const POST_STATUSES: { value: PostStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'published', label: 'Published', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-amber-100 text-amber-700 border-amber-300' }
];

export const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
];

export const BEST_POSTING_TIMES: Record<Platform, string[]> = {
  twitter: ['09:00', '12:00', '17:00'],
  linkedin: ['08:00', '10:00', '12:00'],
  instagram: ['11:00', '14:00', '19:00'],
  facebook: ['09:00', '13:00', '16:00'],
  threads: ['10:00', '14:00', '20:00'],
  tiktok: ['19:00', '21:00', '22:00'],
  youtube: ['14:00', '16:00', '21:00'],
  blog: ['10:00', '14:00'],
  newsletter: ['08:00', '10:00'],
  other: ['12:00']
};

export const CONTENT_TEMPLATES = [
  { id: 'announcement', name: 'Announcement', template: '📢 [Announcement Title]\n\n[Details here]\n\n#announcement' },
  { id: 'tip', name: 'Quick Tip', template: '💡 Quick Tip:\n\n[Your tip here]\n\n#tips #productivity' },
  { id: 'question', name: 'Engagement Question', template: '🤔 [Question to ask your audience?]\n\nDrop your thoughts below! 👇' },
  { id: 'thread', name: 'Thread Starter', template: '🧵 Thread: [Topic]\n\n1/ [First point]\n\n[Continue below...]' },
  { id: 'promo', name: 'Promotion', template: '🚀 [Product/Service Name]\n\n✅ [Benefit 1]\n✅ [Benefit 2]\n✅ [Benefit 3]\n\n[Call to action] 👉 [Link]' },
  { id: 'story', name: 'Story/Update', template: '[Opening hook]\n\n[The story/update]\n\n[Key takeaway]\n\n#story' },
  { id: 'quote', name: 'Quote', template: '"[Quote here]"\n\n— [Author]\n\n[Your thoughts on this quote]' },
  { id: 'blank', name: 'Blank', template: '' }
];
