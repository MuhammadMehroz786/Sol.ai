/**
 * Persona GPT Service
 * Uses OpenAI GPT-4 to generate content and chat as different personas
 */

import { Persona, ChatMessage, PersonaWritingRequest } from '@/types/persona';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Build the system prompt for a persona
 */
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

/**
 * Generate content as a specific persona
 */
export async function generatePersonaContent(
  persona: Persona,
  request: PersonaWritingRequest
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.'
    };
  }

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

  const messages: OpenAIMessage[] = [
    { role: 'system', content: buildPersonaSystemPrompt(persona) },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2000,
        temperature: 0.8,
        presence_penalty: 0.3,
        frequency_penalty: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Post-process to remove any em dashes
    content = content.replace(/—/g, ', ').replace(/–/g, ', ');

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { content: '', error: message };
  }
}

/**
 * Chat with a persona while maintaining conversation context
 */
export async function chatWithPersona(
  persona: Persona,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured.'
    };
  }

  // Build conversation context from history
  const historyMessages: OpenAIMessage[] = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const systemPrompt = `${buildPersonaSystemPrompt(persona)}

CONVERSATION CONTEXT:
You are having a natural conversation. Respond as ${persona.name} would in a real chat.
- Be conversational and engaging
- Remember and reference previous messages in this conversation
- Stay in character throughout
- Keep responses focused but feel free to elaborate when relevant
- Ask follow-up questions when appropriate to keep the conversation flowing`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: 0.85,
        presence_penalty: 0.4,
        frequency_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response generated');
    }

    // Post-process to remove any em dashes
    content = content.replace(/—/g, ', ').replace(/–/g, ', ');

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { content: '', error: message };
  }
}

/**
 * Generate a creative introduction from a persona
 */
export async function getPersonaIntroduction(persona: Persona): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: buildPersonaSystemPrompt(persona) },
    { role: 'user', content: `Introduce yourself in 2-3 sentences. Be warm, authentic, and let your personality shine through. This is your first message to someone who wants to chat with you or have you write content for them.` }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 200,
        temperature: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { content: '', error: message };
  }
}
