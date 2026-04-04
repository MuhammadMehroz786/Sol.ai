/**
 * Proposal Generator Service
 * Uses OpenAI GPT-4 to generate professional, humanized business proposals
 */

import { ProposalGeneratorInput } from '@/types/proposal';

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

const PROPOSAL_SYSTEM_PROMPT = `You are a world-class business proposal writer who has helped companies win billions of dollars in contracts. Your proposals are known for being compelling, clear, and genuinely human in their voice.

CRITICAL WRITING RULES:
1. NEVER use em dashes (the long dash). Use commas, periods, or rewrite the sentence instead.
2. NEVER use robotic phrases like "I hope this email finds you well" or "Please do not hesitate to contact us"
3. NEVER use corporate jargon like "synergy", "leverage", "circle back", "touch base", "bandwidth"
4. NEVER use filler phrases like "It is important to note that" or "It should be mentioned that"
5. Write like a smart human talking to another smart human
6. Be confident but not arrogant
7. Be specific, not vague
8. Use active voice, not passive
9. Keep sentences crisp and punchy
10. Tell a story when appropriate

YOUR WRITING STYLE:
- Direct and honest
- Warm but professional
- Confident without being pushy
- Specific with concrete examples
- Easy to read and understand
- Memorable and engaging

PROPOSAL STRUCTURE:
Every proposal should flow naturally and include:

# [Project Name]: Proposal for [Client Name]

## Executive Summary
A compelling 2-3 paragraph overview that hooks the reader and summarizes the key value proposition. This should be so good that a busy executive could read just this section and want to move forward.

## Understanding Your Challenge
Show that you truly understand the client's problem. Mirror their pain points back to them. Make them feel heard and understood.

## Our Proposed Solution
Clearly explain what you will do and how it solves their problem. Be specific about the approach, methodology, and what makes your solution the right choice.

## Why Work With Us
Your unique qualifications, relevant experience, and what sets you apart. Include brief case studies or success stories if relevant.

## Project Scope and Deliverables
Clear list of what the client will receive. Be specific about each deliverable.

## Timeline and Milestones
Realistic schedule with key milestones. Show you have thought through the execution.

## Investment
Present pricing in a way that emphasizes value, not just cost. Break down what they get for their investment.

## Next Steps
Clear, easy action items to move forward. Make it simple to say yes.

## About Us
Brief company overview that builds trust and credibility.

Remember: The goal is to make the client feel confident that you understand their needs and can deliver results. Write like you are having a conversation with a trusted advisor, not reading from a corporate script.`;

function buildProposalPrompt(input: ProposalGeneratorInput): string {
  const toneInstructions = {
    formal: 'Use a traditional, respectful business tone. Keep the language polished and dignified while still being clear and human.',
    professional: 'Use a balanced professional tone that is businesslike but approachable. Sound competent and trustworthy.',
    friendly: 'Use a warm, personable tone that builds rapport. Be conversational while maintaining professionalism.',
    persuasive: 'Use compelling, action-oriented language that motivates the reader. Focus on benefits and create urgency without being pushy.'
  };

  return `Create a professional business proposal with the following details:

PROJECT: ${input.projectName}
CLIENT: ${input.clientName}
CLIENT INDUSTRY: ${input.clientIndustry}
PROPOSAL TYPE: ${input.proposalType}

THE CHALLENGE:
${input.problemStatement}

PROPOSED SOLUTION:
${input.proposedSolution}

PROJECT DESCRIPTION:
${input.projectDescription}

${input.timeline ? `TIMELINE: ${input.timeline}` : ''}
${input.budget ? `BUDGET RANGE: ${input.budget}` : ''}
${input.deliverables ? `KEY DELIVERABLES: ${input.deliverables}` : ''}
${input.teamExperience ? `TEAM EXPERIENCE: ${input.teamExperience}` : ''}
${input.competitiveAdvantage ? `COMPETITIVE ADVANTAGE: ${input.competitiveAdvantage}` : ''}
${input.additionalContext ? `ADDITIONAL CONTEXT: ${input.additionalContext}` : ''}

TONE: ${input.tone}
${toneInstructions[input.tone]}

SPECIAL REQUIREMENTS:
${input.includeTimeline ? '- Include a detailed timeline section with milestones' : '- Skip detailed timeline (mention it briefly)'}
${input.includeBudget ? '- Include a comprehensive investment/pricing section' : '- Skip detailed pricing (mention that pricing will be discussed)'}
${input.includeTestimonials ? '- Include a section with placeholder testimonials from past clients' : ''}
${input.includeCaseStudies ? '- Include brief case study examples showing relevant past work' : ''}

REMEMBER:
- No em dashes anywhere in the document
- No robotic or corporate jargon
- Write like a human, not a machine
- Be specific and concrete
- Make it compelling and easy to read

Generate the proposal in clean markdown format.`;
}

export async function generateProposal(input: ProposalGeneratorInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
    { role: 'user', content: buildProposalPrompt(input) }
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
        max_tokens: 4000,
        temperature: 0.75,
        presence_penalty: 0.2,
        frequency_penalty: 0.1
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

    // Post-process to remove any em dashes that slipped through
    content = content.replace(/—/g, ', ').replace(/–/g, ', ');

    return { content };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { content: '', error: message };
  }
}

export async function refineProposal(
  currentProposal: string,
  refinementRequest: string
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
    { role: 'user', content: `Here is an existing proposal:\n\n${currentProposal}` },
    { role: 'assistant', content: 'I have reviewed the proposal. What changes would you like me to make?' },
    { role: 'user', content: `Please refine this proposal based on the following request:\n\n${refinementRequest}\n\nRemember: No em dashes, no robotic language, write like a human.\n\nReturn the complete updated proposal in markdown format.` }
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
        max_tokens: 4000,
        temperature: 0.6
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
