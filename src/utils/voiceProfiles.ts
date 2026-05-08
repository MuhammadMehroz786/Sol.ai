import { supabase } from "@/integrations/supabase/client";

export async function fetchVoiceProfileDbId(userId: string, name: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (import.meta.env.DEV) console.error('[voice_profiles fetch]', error);
      return undefined;
    }
    return data?.id;
  } catch (e) {
    if (import.meta.env.DEV) console.error('[voice_profiles fetch] exception', e);
    return undefined;
  }
}
