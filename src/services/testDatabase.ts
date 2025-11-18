import { supabase } from "@/integrations/supabase/client";

export class DatabaseTest {
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing database connection...');

      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      return false;
    }
  }

  static async testSignalsTable(): Promise<boolean> {
    try {
      console.log('🧪 Testing signals table...');

      // Try to query the signals table (this will fail if table doesn't exist)
      const { data, error } = await supabase
        .from('signals_ranked')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Signals table test failed:', error);
        console.error('❌ This likely means the signals table does not exist yet');
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        return false;
      }

      console.log('✅ Signals table exists and is accessible');
      return true;
    } catch (error) {
      console.error('❌ Signals table error:', error);
      return false;
    }
  }

  static async testUserAuth(): Promise<boolean> {
    try {
      console.log('🧪 Testing user authentication...');

      const { data: user, error } = await supabase.auth.getUser();

      if (error || !user.user) {
        console.error('❌ User not authenticated:', error);
        return false;
      }

      console.log('✅ User authenticated:', user.user.id);
      return true;
    } catch (error) {
      console.error('❌ Auth error:', error);
      return false;
    }
  }

  static async runAllTests(): Promise<{
    connection: boolean;
    auth: boolean;
    signalsTable: boolean;
  }> {
    console.log('🧪 Running database tests...');

    const connection = await this.testConnection();
    const auth = await this.testUserAuth();
    const signalsTable = await this.testSignalsTable();

    const results = { connection, auth, signalsTable };

    console.log('📊 Test Results:', results);

    if (!connection) {
      console.error('❌ Database connection failed - check Supabase configuration');
    }
    if (!auth) {
      console.error('❌ User authentication failed - user may need to log in');
    }
    if (!signalsTable) {
      console.error('❌ Signals table missing - run the create-signals-table.sql script');
    }

    return results;
  }

  static async createMockSignal(): Promise<boolean> {
    try {
      console.log('🧪 Creating mock signal for testing...');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const mockSignal = {
        headline: 'Test Signal from Database Test',
        summary: 'This is a test signal created to verify database functionality',
        url: 'https://example.com',
        published_at: new Date().toISOString(),
        tag: ['test', 'database'],
        score: 95,
        source: 'Database Test',
        analyzed_at: new Date().toISOString(),
        community_context: null,
        narrative_stakes: null,
        use_mode: null,
        rationale: null,
        confidence: null
      };

      const { data, error } = await supabase
        .from('signals_ranked')
        .insert([mockSignal])
        .select();

      if (error) {
        console.error('❌ Failed to create mock signal:', error);
        return false;
      }

      console.log('✅ Mock signal created successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error creating mock signal:', error);
      return false;
    }
  }
}