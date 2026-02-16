// Scout GPT API response types
export interface ScoutGptSignal {
  topic: string;
  summary: string;
  url?: string;
  date: string;
  hashtag?: string[];
  score: number;
  headline?: string;
  title?: string;
  description?: string;
}

// Processed signal with optional ID for flexibility
export interface ProcessedSignal {
  id?: string;
  rank: number;
  headline: string;
  summary: string;
  tags: string[];
  priority: 'High' | 'Medium' | 'Low';
  timestamp: string;
  source: string;
  score: number;
  engagement: string;
  url?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Internal signal representation for the app
export interface Signal {
  id: string;
  rank: number;
  headline: string;
  summary: string;
  tags: string[];
  priority: 'High' | 'Medium' | 'Low';
  timestamp: string;
  source: string;
  score: number;
  engagement: string;
  url?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// Database signal schema
export interface SignalDbRow {
  id: string;
  user_id: string;
  topic: string;
  summary: string;
  url: string | null;
  date: string;
  hashtag: string[] | null;
  score: number;
  rank: number | null;
  source: string;
  priority: string;
  engagement: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalDbInsert {
  user_id: string;
  topic: string;
  summary: string;
  url?: string | null;
  date: string;
  hashtag?: string[] | null;
  score: number;
  rank?: number | null;
  source?: string;
  priority?: string;
  engagement?: string | null;
}

export interface SignalDbUpdate {
  topic?: string;
  summary?: string;
  url?: string | null;
  date?: string;
  hashtag?: string[] | null;
  score?: number;
  rank?: number | null;
  source?: string;
  priority?: string;
  engagement?: string | null;
  updated_at?: string;
}

// API response wrapper
export interface SignalsResponse {
  signals: Signal[];
  total: number;
  page: number;
  limit: number;
}

// Priority levels for signals
export const SIGNAL_PRIORITIES = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
} as const;

export type SignalPriority = typeof SIGNAL_PRIORITIES[keyof typeof SIGNAL_PRIORITIES];

// Helper functions for signal processing
export const getSignalPriority = (score: number): SignalPriority => {
  if (score >= 90) return SIGNAL_PRIORITIES.HIGH;
  if (score >= 70) return SIGNAL_PRIORITIES.MEDIUM;
  return SIGNAL_PRIORITIES.LOW;
};

export const formatSignalTimestamp = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m` : 'now';
    }
  } catch {
    return 'recently';
  }
};

