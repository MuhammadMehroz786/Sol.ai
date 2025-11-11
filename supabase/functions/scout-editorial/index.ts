import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topN = 5, persona = "Malcolm", tone = "Data-driven", outputType = "Article" } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // PHASE 1: Scout - Retrieve and rank signals
    console.log('Phase 1: Scout - Retrieving signals...');
    const { data: signals, error: signalsError } = await supabase
      .from('signals_ranked')
      .select('*')
      .order('score', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(topN);

    if (signalsError) {
      throw new Error(`Failed to fetch signals: ${signalsError.message}`);
    }

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No signals found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${signals.length} top signals`);

    // PHASE 2: Editorial - Generate content from top signals
    console.log('Phase 2: Editorial - Generating content...');
    
    const systemPrompt = buildEditorialSystemPrompt(persona, tone, outputType);
    const userPrompt = buildSignalsPrompt(signals);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || '';

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    // Return combined result
    const result = {
      success: true,
      signals: signals.map(s => ({
        headline: s.headline,
        summary: s.summary,
        url: s.url,
        source: s.source,
        score: s.score,
        published_at: s.published_at,
      })),
      generatedContent: {
        persona,
        tone,
        outputType,
        content: generatedContent,
        markdown: generatedContent,
      },
      metadata: {
        signalsCount: signals.length,
        generatedAt: new Date().toISOString(),
      }
    };

    console.log('Scout → Editorial chain completed successfully');

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Scout-Editorial error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildEditorialSystemPrompt(persona: string, tone: string, outputType: string): string {
  const personaContext = {
    "Malcolm": "You are Malcolm Gladwell, renowned for pattern recognition, cultural narratives, and storytelling that reveals the unexpected. Write with curiosity and intellectual depth.",
    "Ana": "You are Ana Kasparian, known for direct, passionate political commentary. Write with conviction, clarity, and urgency about social issues.",
    "Winston": "You are Winston Churchill, masterful orator and strategist. Write with gravitas, historical perspective, and powerful rhetoric.",
    "Custom": "You are a versatile writer adapting to the topic and audience."
  };

  const toneGuidance = {
    "Poetic": "Use evocative language, metaphors, and lyrical prose.",
    "Urgent": "Write with immediacy and compelling calls to action.",
    "Data-driven": "Focus on statistics, evidence, and analytical insights.",
    "Cultural": "Emphasize social trends, cultural shifts, and human stories."
  };

  const outputGuidance = {
    "Article": "Write a comprehensive article (800-1200 words) with clear structure, introduction, body paragraphs, and conclusion.",
    "Tweet thread": "Create a compelling Twitter thread (8-12 tweets, 280 chars each) with hooks and engagement.",
    "Script": "Write a video/podcast script with clear sections, timing cues, and conversational flow.",
    "Prompt": "Generate a detailed AI prompt for further content generation.",
    "Longform": "Develop an in-depth analysis (2000+ words) with extensive research and citations."
  };

  return `${personaContext[persona] || personaContext.Custom}

TONE: ${toneGuidance[tone] || "Maintain clarity and engagement."}

OUTPUT FORMAT: ${outputGuidance[outputType] || outputGuidance.Article}

INSTRUCTIONS:
- Synthesize insights from multiple signals into cohesive content
- Include specific references to sources and data points
- Maintain the specified persona voice throughout
- Apply the requested tone consistently
- Format appropriately for the output type
- Cite sources when referencing specific signals`;
}

function buildSignalsPrompt(signals: any[]): string {
  const signalsText = signals.map((s, i) => `
Signal ${i + 1} (Score: ${s.score})
Headline: ${s.headline}
Summary: ${s.summary}
Source: ${s.source}
URL: ${s.url || 'N/A'}
Tags: ${s.tag || 'N/A'}
Stakes: ${s.narrative_stakes ? JSON.stringify(s.narrative_stakes) : 'N/A'}
---`).join('\n');

  return `Based on these top signals, create compelling content that connects the dots and reveals deeper patterns:

${signalsText}

Generate content that synthesizes these signals into a cohesive narrative. Reference specific data points and sources. Make it engaging and insightful.`;
}
