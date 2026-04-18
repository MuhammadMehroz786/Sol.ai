import { supabase } from '@/integrations/supabase/client';

interface OpenAICallParams {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export async function callOpenAI(params: OpenAICallParams): Promise<{ content: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('openai-proxy', { body: params });

  if (error) return { content: null, error: error.message };

  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) return { content: null, error: 'No content generated' };

  return { content };
}
