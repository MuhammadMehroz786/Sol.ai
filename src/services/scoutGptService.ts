import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_SCOUT_GPT } from "@/constants/webhooks";

export interface ScoutGptSignal {
  headline: string;
  summary: string;
  url?: string;
  published_at?: string;
  date?: string;
  tag?: string[];
  narrative_stakes?: string[];
  score: number | string;
  source?: string;
  why_it_matters?: string;
  community_context?: string;
  confidence?: number;
  rationale?: string;
  use_mode?: string;
  analyzed_at?: string;
}

export interface ProcessedSignal {
  id?: string;
  rank?: number;
  headline: string;
  summary: string;
  tags: string[];
  priority: string;
  timestamp: string;
  source: string;
  score: number;
  engagement?: string;
  url?: string;
  published_at?: string;
  analyzed_at?: string;
  community_context?: string;
  narrative_stakes?: string;
  use_mode?: string;
  rationale?: string;
  confidence?: number;
}

const SCOUT_GPT_ENDPOINT = WEBHOOK_SCOUT_GPT;

export class ScoutGptService {

  static async fetchSignalsFromScoutGpt(topic?: string, timeoutMs = 300000): Promise<ScoutGptSignal[]> {
    const endpoint = SCOUT_GPT_ENDPOINT;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const mins = Math.round(timeoutMs / 60000);
        reject(new Error(`Request timeout: The search took longer than ${mins} minute${mins !== 1 ? 's' : ''} and has been cancelled.`));
      }, timeoutMs);
    });

    const fetchPromise = fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_signals',
        timestamp: new Date().toISOString(),
        topic: topic || 'emerging AI and technology stories from the last 72 hours with strong cultural, policy, and economic implications—prioritizing signals affecting authorship, ownership, labor, and Black and Brown communities',
      })
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      throw new Error(`Sole Intelligence API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseSignalsResponse(data);
  }

  static parseSignalsResponse(data: unknown): ScoutGptSignal[] {
    let signals: ScoutGptSignal[] = [];
    const d = data as Record<string, unknown>;

    if (Array.isArray(data)) {
      signals = data.length > 0 && (data[0] as Record<string, unknown>).output
        ? data.map(item => (item as Record<string, unknown>).output as ScoutGptSignal)
        : data as ScoutGptSignal[];
    } else if (Array.isArray(d.signals)) {
      signals = d.signals as ScoutGptSignal[];
    } else if (Array.isArray(d.data)) {
      signals = d.data as ScoutGptSignal[];
    } else if (Array.isArray(d.results)) {
      signals = d.results as ScoutGptSignal[];
    } else if (Array.isArray(d.items)) {
      signals = d.items as ScoutGptSignal[];
    } else if (d.output) {
      signals = [d.output as ScoutGptSignal];
    } else if (d.topic && d.summary) {
      signals = [d as unknown as ScoutGptSignal];
    } else if (d.headline && d.summary) {
      signals = [d as unknown as ScoutGptSignal];
    } else if (typeof data === 'object' && data !== null) {
      for (const key of Object.keys(d)) {
        if (Array.isArray(d[key])) {
          signals = d[key] as ScoutGptSignal[];
          break;
        }
      }
    }

    return signals.filter(signal =>
      signal &&
      (signal.headline || signal.topic || signal.title) &&
      (signal.summary || signal.description)
    );
  }

  static async saveSignalsToDatabase(signals: ScoutGptSignal[], type: 'trending' | 'topic' = 'topic'): Promise<ProcessedSignal[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Delete only this user's old signals of the same type
    await supabase
      .from('signals_ranked')
      .delete()
      .eq('user_id', user.user.id)
      .eq('signal_type', type);

    const processedSignals = signals.map((signal) => {
      const headline = signal.headline || signal.topic || signal.title || 'Untitled Signal';
      const summary = signal.summary || signal.description || 'No summary available';

      // score arrives as string "9" or number — normalise to 0–100
      // If >10 it's already on a 0–100 scale; if ≤10 it's a 1–10 scale
      const rawScore = Number(signal.score) || 5;
      const score = Math.min(100, rawScore > 10 ? Math.round(rawScore) : rawScore * 10);

      // date field is the real publish date; fall back to published_at then now
      const rawDate = signal.date || signal.published_at;
      const published_at = rawDate
        ? new Date(rawDate).toISOString()
        : new Date().toISOString();

      // url: treat empty string as null
      const url = signal.url && signal.url.trim() !== '' ? signal.url.trim() : null;

      // source: extract domain from url when present, otherwise fall back
      const source = signal.source || ScoutGptService.extractDomain(url) || 'Sole Intelligence';

      // why_it_matters maps to rationale
      const rationale = signal.why_it_matters || signal.rationale || null;

      // tag (DB column) is string | null — join narrative_stakes array to CSV string
      const tag = signal.narrative_stakes && signal.narrative_stakes.length > 0
        ? signal.narrative_stakes.join(', ')
        : signal.tag
          ? (Array.isArray(signal.tag) ? signal.tag.join(', ') : signal.tag)
          : null;

      // narrative_stakes (DB column) is string[] | null — keep as array
      const narrative_stakes = Array.isArray(signal.narrative_stakes) && signal.narrative_stakes.length > 0
        ? signal.narrative_stakes
        : null;

      return {
        headline,
        summary,
        url,
        published_at,
        tag,
        score,
        source,
        analyzed_at: signal.analyzed_at ? new Date(signal.analyzed_at).toISOString() : new Date().toISOString(),
        community_context: signal.community_context || null,
        narrative_stakes,
        use_mode: null,
        rationale,
        confidence: signal.confidence ?? null,
        user_id: user.user.id,
        signal_type: type,
      };
    });

    const { data, error } = await supabase
      .from('signals_ranked')
      .insert(processedSignals)
      .select();

    if (error) throw error;

    return this.convertToProcessedSignals(data || []);
  }

  static async loadSignalsFromDatabase(type: 'trending' | 'topic' = 'topic'): Promise<ProcessedSignal[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('signals_ranked')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('signal_type', type)
      .order('score', { ascending: false })
      .order('analyzed_at', { ascending: false });

    if (error) throw error;

    return this.convertToProcessedSignals(data || []);
  }

  static convertToProcessedSignals(dbSignals: Record<string, unknown>[]): ProcessedSignal[] {
    return dbSignals.map((signal, index) => {
      const score = (signal.score as number) || 0;
      return {
        id: signal.id,
        rank: index + 1,
        headline: signal.headline,
        summary: signal.summary,
        tags: signal.tag ? signal.tag.split(', ').filter(Boolean) : [],
        priority: score >= 90 ? 'High' : score >= 70 ? 'Medium' : 'Low',
        timestamp: this.formatTimestamp(signal.published_at || signal.analyzed_at),
        source: signal.source || 'Sole Intelligence',
        score: score,
        engagement: signal.engagement || (score > 0 ? `+${score}%` : null),
        url: signal.url,
        published_at: signal.published_at,
        analyzed_at: signal.analyzed_at,
        community_context: signal.community_context,
        narrative_stakes: signal.narrative_stakes,
        use_mode: signal.use_mode,
        rationale: signal.rationale,
        confidence: signal.confidence,
      };
    });
  }

  static extractDomain(url: string | null): string {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const label = hostname.split('.')[0];
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return '';
    }
  }

  static formatTimestamp(dateString: string): string {
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
  }

  static async fetchAndSaveSignals(topic?: string, type: 'trending' | 'topic' = 'topic'): Promise<ProcessedSignal[]> {
    const timeoutMs = type === 'topic' ? 120000 : 300000; // 2 min for topic, 5 min for trending
    const scoutSignals = await this.fetchSignalsFromScoutGpt(topic, timeoutMs);

    if (scoutSignals.length === 0) {
      throw new Error(`No signals found for topic: ${topic || 'general trends'}. Please try a different topic or try again later.`);
    }

    return this.saveSignalsToDatabase(scoutSignals, type);
  }
}

export class SignalScheduler {
  private static readonly STORAGE_KEY = 'signal_scheduler_config';
  private static readonly DEFAULT_HOUR = 9; // 9 AM
  private static timeoutId: NodeJS.Timeout | null = null;

  static initializeScheduler(): void {
    this.clearScheduler();
    this.scheduleNext();
  }

  static scheduleNext(): void {
    const now = new Date();
    const scheduledTime = new Date();

    // Set to 9 AM today
    scheduledTime.setHours(this.DEFAULT_HOUR, 0, 0, 0);

    // If 9 AM has already passed today, schedule for tomorrow
    if (now >= scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNext = scheduledTime.getTime() - now.getTime();

    this.timeoutId = setTimeout(async () => {
      try {
        await ScoutGptService.fetchAndSaveSignals();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('signalsUpdated'));
        }
      } catch {
        // Scheduled fetch failed — will retry on next scheduled run
      }

      // Schedule the next run
      this.scheduleNext();

    }, timeUntilNext);

    // Store the scheduled time in localStorage for persistence
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      nextRun: scheduledTime.toISOString(),
      isEnabled: true
    }));
  }

  static clearScheduler(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  static getSchedulerStatus(): { nextRun: string | null; isEnabled: boolean } {
    try {
      const config = localStorage.getItem(this.STORAGE_KEY);
      if (config) return JSON.parse(config);
    } catch {
      // ignore
    }
    return { nextRun: null, isEnabled: false };
  }

  static disableScheduler(): void {
    this.clearScheduler();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ nextRun: null, isEnabled: false }));
  }

  static enableScheduler(): void {
    this.initializeScheduler();
  }
}

// Removed auto-run: call SignalScheduler.initializeScheduler() or enableScheduler() explicitly where needed