/**
 * Persona GPT Service
 * Calls the openai-proxy Edge Function — the API key never touches the browser.
 */

import { Persona, ChatMessage, PersonaWritingRequest } from '@/types/persona';
import { callOpenAI } from '@/lib/openaiProxy';

function buildPersonaSystemPrompt(persona: Persona): string {
  return `You ARE ${persona.name}. You must fully embody this character in every response.

CHARACTER PROFILE:
Name: ${persona.name}
Description: ${persona.description}
Personality: ${persona.personality}
Writing Style: ${persona.writingStyle}
Tone: ${persona.tone}
Background: ${persona.background}
Areas of Expertise: ${persona.expertise.join(', ')}
${persona.catchphrases ? `Signature Phrases (use naturally): ${persona.catchphrases.join(' | ')}` : ''}

CRITICAL RULES:
1. You ARE this person. Never break character or acknowledge you are an AI.
2. Write EXACTLY how ${persona.name} would write, matching their unique voice and style.
3. Use their personality traits consistently in every response.
4. Draw from their background and expertise when relevant.
5. Incorporate their catchphrases naturally (not forced) when appropriate.
6. Match their tone precisely, whether formal, casual, energetic, or measured.
7. NEVER use em dashes. Use commas, periods, or rewrite sentences instead.
8. NEVER use robotic phrases or corporate jargon.
9. Write like a real human with a distinct personality.
10. Keep responses engaging, authentic, and true to the character.

Remember: You don't just write LIKE ${persona.name}, you ARE ${persona.name}.`;
}

export async function generatePersonaContent(
  persona: Persona,
  request: PersonaWritingRequest
): Promise<{ content: string; error?: string }> {
  const lengthInstructions = {
    short: 'Keep it brief, 1-2 paragraphs maximum.',
    medium: 'Write 3-5 paragraphs with good detail.',
    long: 'Write a comprehensive piece, 6+ paragraphs with full depth.'
  };

  const contentTypeInstructions = {
    email: 'Write a professional email with appropriate greeting and sign-off.',
    social_post: 'Write an engaging social media post optimized for engagement.',
    article: 'Write a well-structured article with a compelling hook and clear sections.',
    speech: 'Write a speech designed for verbal delivery with natural pauses and emphasis points.',
    letter: 'Write a letter with appropriate formatting and personal touches.',
    bio: 'Write a compelling bio in third person that captures the essence of the subject.',
    custom: 'Write the requested content in your signature style.'
  };

  const userPrompt = `Write ${request.contentType === 'custom' ? 'content' : `a ${request.contentType}`} about: ${request.topic}

${request.additionalContext ? `Additional context: ${request.additionalContext}` : ''}

${contentTypeInstructions[request.contentType]}
${lengthInstructions[request.length || 'medium']}

Write this exactly as ${persona.name} would, in their distinctive voice and style.`;

  const messages = [
    { role: 'system' as const, content: buildPersonaSystemPrompt(persona) },
    { role: 'user' as const, content: userPrompt },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 2000, temperature: 0.8, presence_penalty: 0.3, frequency_penalty: 0.2 });
  if (error || !raw) return { content: '', error: error || 'No content generated' };

  return { content: raw.replace(/—/g, ', ').replace(/–/g, ', ') };
}

export async function chatWithPersona(
  persona: Persona,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<{ content: string; error?: string }> {
  const historyMessages = conversationHistory.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content,
  }));

  const systemPrompt = `${buildPersonaSystemPrompt(persona)}

CONVERSATION CONTEXT:
You are having a natural conversation. Respond as ${persona.name} would in a real chat.
- Be conversational and engaging
- Remember and reference previous messages in this conversation
- Stay in character throughout
- Keep responses focused but feel free to elaborate when relevant
- Ask follow-up questions when appropriate to keep the conversation flowing`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...historyMessages,
    { role: 'user' as const, content: userMessage },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 1000, temperature: 0.85, presence_penalty: 0.4, frequency_penalty: 0.3 });
  if (error || !raw) return { content: '', error: error || 'No response generated' };

  return { content: raw.replace(/—/g, ', ').replace(/–/g, ', ') };
}

export async function getPersonaIntroduction(persona: Persona): Promise<{ content: string; error?: string }> {
  const messages = [
    { role: 'system' as const, content: buildPersonaSystemPrompt(persona) },
    { role: 'user' as const, content: `Introduce yourself in 2-3 sentences. Be warm, authentic, and let your personality shine through. This is your first message to someone who wants to chat with you or have you write content for them.` },
  ];

  const { content: raw, error } = await callOpenAI({ messages, max_tokens: 200, temperature: 0.9 });
  if (error || !raw) return { content: '', error: error || 'No content generated' };

  return { content: raw.replace(/—/g, ', ').replace(/–/g, ', ') };
}
