import { supabase } from "@/integrations/supabase/client";

export interface ScoutGptSignal {
  headline: string;
  summary: string;
  url?: string;
  published_at: string;
  tag?: string[];
  score: number;
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

// Use proxy endpoint for development to avoid CORS issues
const SCOUT_GPT_ENDPOINT = process.env.NODE_ENV === 'development'
  ? '/api/scout-gpt'
  : 'https://soleai.app.n8n.cloud/webhook/e104c437-3b72-4de2-8fc7-535d30fb57fb';

export class ScoutGptService {

  static async fetchSignalsFromScoutGpt(): Promise<ScoutGptSignal[]> {
    try {
      console.log('🚀 Fetching signals from Scout GPT...');
      console.log('📡 Endpoint:', SCOUT_GPT_ENDPOINT);

      // Try POST first (n8n webhooks often expect POST)
      const response = await fetch(SCOUT_GPT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_signals',
          timestamp: new Date().toISOString()
        })
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // If POST fails, try GET
        console.log('⚠️ POST failed, trying GET...');
        const getResponse = await fetch(SCOUT_GPT_ENDPOINT, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!getResponse.ok) {
          throw new Error(`Scout GPT API error: POST ${response.status}, GET ${getResponse.status}`);
        }

        const getData = await getResponse.json();
        console.log('✅ Scout GPT GET response:', getData);
        return this.parseSignalsResponse(getData);
      }

      const data = await response.json();
      console.log('✅ Scout GPT POST response:', data);
      console.log('📝 Response type:', typeof data);
      console.log('📝 Is array:', Array.isArray(data));

      return this.parseSignalsResponse(data);
    } catch (error) {
      console.error('❌ Error fetching signals from Scout GPT:', error);
      throw error;
    }
  }

  static parseSignalsResponse(data: any): ScoutGptSignal[] {
    console.log('🔍 Parsing signals response...');

    // Handle different response formats
    let signals: ScoutGptSignal[] = [];

    if (Array.isArray(data)) {
      console.log('📋 Response is array with', data.length, 'items');
      signals = data;
    } else if (data.signals && Array.isArray(data.signals)) {
      console.log('📋 Response has signals array with', data.signals.length, 'items');
      signals = data.signals;
    } else if (data.data && Array.isArray(data.data)) {
      console.log('📋 Response has data array with', data.data.length, 'items');
      signals = data.data;
    } else if (data.topic && data.summary) {
      console.log('📋 Response is single signal object');
      signals = [data];
    } else {
      console.log('⚠️ Unknown response format:', data);
      // Log all keys for debugging
      if (typeof data === 'object' && data !== null) {
        console.log('🔑 Available keys:', Object.keys(data));
      }
      signals = [];
    }

    console.log('🎯 Found', signals.length, 'raw signals');

    // Filter and validate signals
    const validSignals = signals.filter(signal => {
      const isValid = signal &&
                     (signal.headline || signal.topic || signal.title) &&
                     (signal.summary || signal.description);

      if (!isValid) {
        console.log('❌ Invalid signal:', signal);
      }

      return isValid;
    });

    console.log('✅ Valid signals:', validSignals.length);
    return validSignals;
  }

  static async saveSignalsToDatabase(signals: ScoutGptSignal[]): Promise<ProcessedSignal[]> {
    try {
      console.log('💾 Saving', signals.length, 'signals to database...');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      console.log('👤 User authenticated:', user.user.id);

      // Delete old signals before saving new ones
      console.log('🗑️ Deleting old signals from database...');
      const { error: deleteError } = await supabase
        .from('signals_ranked')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteError) {
        console.error('⚠️ Error deleting old signals:', deleteError);
        // Continue anyway - not critical if delete fails
      } else {
        console.log('✅ Old signals deleted');
      }

      const processedSignals = signals.map((signal, index) => {
        // Handle different field names from Scout GPT
        const headline = signal.headline || signal.topic || signal.title || 'Untitled Signal';
        const summary = signal.summary || signal.description || 'No summary available';

        // Convert score from 0-10 scale to 0-100 scale
        const rawScore = signal.score || 5;
        const score = rawScore * 10;

        // Convert single tag string to array
        const tag = signal.tag
          ? (typeof signal.tag === 'string' ? [signal.tag] : signal.tag)
          : [];

        const processed = {
          headline: headline,
          summary: summary,
          url: signal.url || null,
          published_at: signal.published_at || signal.date ? new Date(signal.published_at || signal.date).toISOString() : new Date().toISOString(),
          tag: tag,
          score: score,
          source: 'Scout GPT',
          analyzed_at: signal.analyzed_at ? new Date(signal.analyzed_at).toISOString() : new Date().toISOString(),
          community_context: signal.community_context || null,
          narrative_stakes: signal.narrative_stakes || null,
          use_mode: signal.use_mode || null,
          rationale: signal.rationale || null,
          confidence: signal.confidence || null,
        };

        console.log(`📝 Processed signal ${index + 1}:`, {
          headline: processed.headline,
          score: processed.score,
          source: processed.source,
          tags: tag
        });

        return processed;
      });

      console.log('💾 Inserting signals into database...');

      const { data, error } = await supabase
        .from('signals_ranked')
        .insert(processedSignals)
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Signals saved to database:', data?.length || 0, 'records');
      return this.convertToProcessedSignals(data || []);
    } catch (error) {
      console.error('❌ Error in saveSignalsToDatabase:', error);
      throw error;
    }
  }

  static async loadSignalsFromDatabase(): Promise<ProcessedSignal[]> {
    try {
      console.log('📥 Loading signals from database...');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('👤 User authenticated:', user.user.id);

      const { data, error } = await supabase
        .from('signals_ranked')
        .select('*')
        .order('score', { ascending: false })
        .order('analyzed_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('❌ Database query error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('📊 Database query result:', data?.length || 0, 'signals');

      if (data && data.length > 0) {
        console.log('📝 Sample signal from database:', data[0]);
      }

      return this.convertToProcessedSignals(data || []);
    } catch (error) {
      console.error('❌ Error in loadSignalsFromDatabase:', error);
      throw error;
    }
  }

  static convertToProcessedSignals(dbSignals: any[]): ProcessedSignal[] {
    return dbSignals.map((signal, index) => {
      const score = signal.score || 0;
      return {
        id: signal.id,
        rank: index + 1,
        headline: signal.headline,
        summary: signal.summary,
        tags: Array.isArray(signal.tag) ? signal.tag : [],
        priority: score >= 90 ? 'High' : score >= 70 ? 'Medium' : 'Low',
        timestamp: this.formatTimestamp(signal.published_at || signal.analyzed_at),
        source: signal.source || 'Scout GPT',
        score: score,
        engagement: `+${Math.floor(Math.random() * 50 + 20)}%`,
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

  static async fetchAndSaveSignals(): Promise<ProcessedSignal[]> {
    try {
      console.log('Starting fetchAndSaveSignals process...');

      // Fetch new signals from Scout GPT
      const scoutSignals = await this.fetchSignalsFromScoutGpt();

      if (scoutSignals.length === 0) {
        console.log('No new signals from Scout GPT, loading from database...');
        return await this.loadSignalsFromDatabase();
      }

      // Save to database and return processed signals
      const processedSignals = await this.saveSignalsToDatabase(scoutSignals);

      console.log('Successfully fetched and saved signals:', processedSignals.length);
      return processedSignals;

    } catch (error) {
      console.error('Error in fetchAndSaveSignals, falling back to database:', error);

      // Fallback to database signals
      try {
        const dbSignals = await this.loadSignalsFromDatabase();
        if (dbSignals.length > 0) {
          return dbSignals;
        }
      } catch (dbError) {
        console.error('Database fallback also failed:', dbError);
      }

      // If both API and database fail, create mock signals for testing
      console.log('Creating mock signals for testing...');
      const { createMockSignals } = await import('./mockSignals');
      return createMockSignals();
    }
  }
}

export class SignalScheduler {
  private static readonly STORAGE_KEY = 'signal_scheduler_config';
  private static readonly DEFAULT_HOUR = 9; // 9 AM
  private static timeoutId: NodeJS.Timeout | null = null;

  static initializeScheduler(): void {
    console.log('Initializing signal scheduler...');

    // Clear any existing scheduler
    this.clearScheduler();

    // Set up the next scheduled run
    this.scheduleNext();

    console.log('Signal scheduler initialized');
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

    console.log(`Next signal fetch scheduled for: ${scheduledTime.toLocaleString()}`);
    console.log(`Time until next fetch: ${Math.round(timeUntilNext / (1000 * 60 * 60))} hours`);

    this.timeoutId = setTimeout(async () => {
      console.log('Scheduled signal fetch triggered at:', new Date().toLocaleString());

      try {
        await ScoutGptService.fetchAndSaveSignals();

        // Trigger a refresh of the signals display if possible
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('signalsUpdated'));
        }

      } catch (error) {
        console.error('Scheduled signal fetch failed:', error);
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
      if (config) {
        return JSON.parse(config);
      }
    } catch (error) {
      console.error('Error reading scheduler config:', error);
    }

    return { nextRun: null, isEnabled: false };
  }

  static disableScheduler(): void {
    this.clearScheduler();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      nextRun: null,
      isEnabled: false
    }));
    console.log('Signal scheduler disabled');
  }

  static enableScheduler(): void {
    this.initializeScheduler();
    console.log('Signal scheduler enabled');
  }
}

// Initialize scheduler when the module loads (only in browser)
if (typeof window !== 'undefined') {
  // Wait a bit to ensure the app is loaded
  setTimeout(() => {
    SignalScheduler.initializeScheduler();
  }, 1000);
}