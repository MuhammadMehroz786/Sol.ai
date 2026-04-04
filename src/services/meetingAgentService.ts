/**
 * Action Meeting Agent Service
 * Uses OpenAI GPT-4 to generate professional meeting documents
 */

import { MeetingAgendaInput, MeetingMinutesInput, ActionItemsInput, FollowUpEmailInput, TranscriptInput, SavedMeeting, MeetingMode } from '@/types/meeting';

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

const MEETING_SYSTEM_PROMPT = `You are a world-class executive assistant and meeting facilitator with 20+ years of experience supporting C-suite executives at Fortune 500 companies. You are known for creating exceptionally clear, actionable, and professional meeting documentation.

CRITICAL WRITING RULES:
1. NEVER use em dashes (the long dash). Use commas, periods, or rewrite the sentence instead.
2. NEVER use robotic phrases like "Please be advised" or "Kindly note" or "As per our discussion"
3. NEVER use corporate jargon like "synergy", "circle back", "touch base", "bandwidth", "leverage"
4. Write like a smart professional talking to other smart professionals
5. Be clear, concise, and action-oriented
6. Use active voice, not passive
7. Every action item must have an owner and deadline
8. Be specific with names, dates, and deliverables
9. Use bullet points and tables for clarity
10. Structure documents for easy scanning

YOUR WRITING STYLE:
- Direct and professional
- Clear and unambiguous
- Action-oriented
- Time-conscious
- Results-focused`;

/**
 * Generate a meeting agenda
 */
export async function generateAgenda(input: MeetingAgendaInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const toneInstructions = {
    formal: 'Use formal, executive-level language appropriate for board meetings or senior leadership.',
    professional: 'Use standard professional business language.',
    casual: 'Use a more relaxed, conversational tone while maintaining professionalism.'
  };

  const userPrompt = `Create a professional meeting agenda with the following details:

MEETING: ${input.meetingTitle}
TYPE: ${input.meetingType}
DURATION: ${input.duration}
ATTENDEES: ${input.attendees}

OBJECTIVES:
${input.objectives}

${input.previousActionItems ? `PREVIOUS ACTION ITEMS TO REVIEW:\n${input.previousActionItems}` : ''}
${input.additionalTopics ? `ADDITIONAL TOPICS:\n${input.additionalTopics}` : ''}

TONE: ${input.tone}
${toneInstructions[input.tone]}

FORMAT REQUIREMENTS:
- Include a clear meeting header with date/time placeholder, location, and attendees
- Break down the agenda into timed sections (allocate realistic time for each)
- Include "Welcome & Introductions" at start
- Include "Action Items & Next Steps" before close
- Include "Meeting Close" at end
- Add any pre-read or preparation requirements
- Use a clean, professional markdown table or structured format

Generate a complete, ready-to-send meeting agenda.`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate meeting minutes
 */
export async function generateMinutes(input: MeetingMinutesInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const userPrompt = `Transform these meeting notes into professional meeting minutes:

MEETING: ${input.meetingTitle}
DATE: ${input.meetingDate}
ATTENDEES: ${input.attendees}
${input.absentees ? `ABSENT: ${input.absentees}` : ''}

DISCUSSION NOTES:
${input.discussionNotes}

${input.decisions ? `KEY DECISIONS:\n${input.decisions}` : ''}
${input.additionalContext ? `ADDITIONAL CONTEXT:\n${input.additionalContext}` : ''}

FORMAT REQUIREMENTS:
- Professional header with meeting title, date, attendees, and absentees
- "Meeting Called to Order" with time
- Organized discussion summary by topic (not just raw notes)
- Clear "Decisions Made" section with numbered items
- "Action Items" table with columns: Action | Owner | Deadline | Status
- "Next Meeting" section with date/time if applicable
- "Meeting Adjourned" with time
- Professional, third-person tone

Generate complete, formal meeting minutes ready for distribution.`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
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
        max_tokens: 2500,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Extract action items from meeting notes
 */
export async function extractActionItems(input: ActionItemsInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const priorityInstructions = {
    standard: 'Assign reasonable deadlines based on complexity (typically 1-2 weeks).',
    urgent: 'Assign tight deadlines (within this week) for critical items.',
    critical: 'Assign immediate deadlines (24-48 hours) for all high-impact items.'
  };

  const userPrompt = `Extract and organize all action items from these meeting notes:

MEETING NOTES:
${input.meetingNotes}

ATTENDEES (potential owners):
${input.attendees}

${input.projectContext ? `PROJECT CONTEXT:\n${input.projectContext}` : ''}

PRIORITY LEVEL: ${input.priorityLevel}
${priorityInstructions[input.priorityLevel]}

OUTPUT FORMAT:
Create a comprehensive action items document with:

1. **Summary Header** - Brief overview of total action items and priority breakdown

2. **Action Items Table** with columns:
   | # | Action Item | Owner | Deadline | Priority | Dependencies |

3. **Grouped by Owner** - Same items reorganized by person for easy distribution

4. **Timeline View** - Items sorted by deadline

5. **Notes** - Any blockers, risks, or important context

RULES:
- Every action item must have a clear, specific deliverable
- Every item needs an owner (assign based on context if not explicit)
- Every item needs a realistic deadline
- Flag any items that need clarification
- Identify dependencies between items
- Mark items that are blocked or at risk

Generate a complete, actionable document.`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
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
        max_tokens: 2500,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate follow-up email
 */
export async function generateFollowUpEmail(input: FollowUpEmailInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const toneInstructions = {
    formal: 'Use formal business email etiquette. Address recipients formally.',
    professional: 'Use standard professional email tone. Warm but businesslike.',
    friendly: 'Use a warm, personable tone while covering all business points.'
  };

  const userPrompt = `Write a professional follow-up email for this meeting:

MEETING: ${input.meetingTitle}
DATE: ${input.meetingDate}
ATTENDEES: ${input.attendees}

KEY DECISIONS MADE:
${input.keyDecisions}

ACTION ITEMS:
${input.actionItems}

${input.nextSteps ? `NEXT STEPS:\n${input.nextSteps}` : ''}

TONE: ${input.tone}
${toneInstructions[input.tone]}

EMAIL REQUIREMENTS:
- Clear, concise subject line
- Brief thank you and meeting recap (2-3 sentences max)
- Bullet-point summary of key decisions
- Action items table or list with owners and deadlines
- Next steps and upcoming milestones
- Offer to clarify anything
- Professional sign-off
- Total length: concise but complete (aim for skimmable in 30 seconds)

Generate a complete, ready-to-send email with subject line.`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
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
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Refine any meeting document
 */
export async function refineMeetingDocument(
  currentDocument: string,
  refinementRequest: string
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
    { role: 'user', content: `Here is a meeting document:\n\n${currentDocument}` },
    { role: 'assistant', content: 'I have reviewed the document. What changes would you like?' },
    { role: 'user', content: `Please refine this document:\n\n${refinementRequest}\n\nReturn the complete updated document.` }
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
        max_tokens: 2500,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process meeting transcript and generate requested documents
 */
export async function processTranscript(input: TranscriptInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { content: '', error: 'OpenAI API key not configured.' };
  }

  const outputInstructions = {
    minutes: `Generate professional meeting minutes with:
- Header with meeting title, date, and attendees (extract from transcript)
- Discussion summary organized by topic
- Decisions made section
- Action items table with Owner, Deadline, Status columns
- Next steps`,
    actions: `Generate a comprehensive action items document with:
- Summary header with total items and priority breakdown
- Action items table: # | Action | Owner | Deadline | Priority | Dependencies
- Items grouped by owner
- Timeline view sorted by deadline
- Blockers and risks notes`,
    summary: `Generate a brief executive summary with:
- Meeting overview (2-3 sentences)
- Key decisions (bullet points)
- Critical action items (top 3-5)
- Next steps
- Keep it skimmable in under 60 seconds`,
    all: `Generate a complete meeting package with THREE clearly separated sections:

## SECTION 1: MEETING MINUTES
[Full professional minutes with header, discussion summary, decisions, and action items table]

---

## SECTION 2: ACTION ITEMS
[Comprehensive action items document with owner grouping and timeline view]

---

## SECTION 3: EXECUTIVE SUMMARY
[Brief summary for stakeholders who need the highlights quickly]`
  };

  const userPrompt = `Process this meeting transcript/notes and generate the requested document(s):

MEETING: ${input.meetingTitle}
DATE: ${input.meetingDate}
${input.additionalContext ? `CONTEXT: ${input.additionalContext}` : ''}

TRANSCRIPT/NOTES:
${input.transcript}

OUTPUT TYPE: ${input.outputType}

${outputInstructions[input.outputType]}

IMPORTANT:
- Extract attendees, decisions, and action items from the transcript
- Assign owners to action items based on who is mentioned or context
- Create realistic deadlines based on discussed timelines
- If information is unclear, flag it for clarification
- Keep the tone professional but natural`;

  const messages: OpenAIMessage[] = [
    { role: 'system', content: MEETING_SYSTEM_PROMPT },
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
        max_tokens: input.outputType === 'all' ? 4000 : 2500,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    let content = data.choices[0]?.message?.content;

    if (!content) throw new Error('No content generated');

    content = content.replace(/—/g, ', ').replace(/–/g, ', ');
    return { content };
  } catch (error) {
    return { content: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// SAVED MEETINGS STORAGE
// ============================================

const STORAGE_KEY = 'meetingAgent_savedMeetings';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

/**
 * Load all saved meetings from localStorage
 */
export function loadSavedMeetings(): SavedMeeting[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load saved meetings:', error);
  }
  return [];
}

/**
 * Save a meeting to localStorage
 */
export function saveMeeting(title: string, date: string, type: MeetingMode, content: string): SavedMeeting {
  const meeting: SavedMeeting = {
    id: generateId(),
    title,
    date,
    type,
    content,
    createdAt: new Date().toISOString()
  };

  const meetings = loadSavedMeetings();
  meetings.unshift(meeting);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  } catch (error) {
    console.error('Failed to save meeting:', error);
  }

  return meeting;
}

/**
 * Delete a saved meeting
 */
export function deleteSavedMeeting(id: string): boolean {
  const meetings = loadSavedMeetings();
  const filtered = meetings.filter(m => m.id !== id);

  if (filtered.length === meetings.length) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete meeting:', error);
    return false;
  }

  return true;
}

/**
 * Get a specific saved meeting
 */
export function getSavedMeeting(id: string): SavedMeeting | null {
  const meetings = loadSavedMeetings();
  return meetings.find(m => m.id === id) || null;
}
