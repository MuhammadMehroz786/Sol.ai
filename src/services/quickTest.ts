import { supabase } from "@/integrations/supabase/client";

export const quickDatabaseTest = async () => {
  try {
    console.log('🧪 Quick database test...');

    // Test if signals table exists and is accessible
    const { data, error } = await supabase
      .from('signals_ranked')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('❌ Signals table error:', error);
      return false;
    }

    console.log('✅ Signals table is accessible');

    // Test inserting a sample signal
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      console.log('❌ User not authenticated');
      return false;
    }

    const testSignal = {
      headline: 'Database Test Signal',
      summary: 'This is a test signal to verify database functionality',
      score: 85,
      tag: ['test'],
      source: 'Database Test',
      published_at: new Date().toISOString(),
      analyzed_at: new Date().toISOString(),
      url: null,
      community_context: null,
      narrative_stakes: null,
      use_mode: null,
      rationale: null,
      confidence: null
    };

    const { data: insertData, error: insertError } = await supabase
      .from('signals_ranked')
      .insert([testSignal])
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      return false;
    }

    console.log('✅ Test signal created successfully');

    // Clean up test signal
    if (insertData && insertData.length > 0) {
      await supabase
        .from('signals_ranked')
        .delete()
        .eq('id', insertData[0].id);
      console.log('✅ Test signal cleaned up');
    }

    return true;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};

// Removed auto-run: call quickDatabaseTest() explicitly where needed