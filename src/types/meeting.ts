/**
 * Action Meeting Agent Types
 */

export interface MeetingAgendaInput {
  meetingTitle: string;
  meetingType: string;
  attendees: string;
  duration: string;
  objectives: string;
  previousActionItems?: string;
  additionalTopics?: string;
  tone: 'formal' | 'professional' | 'casual';
}

export interface MeetingMinutesInput {
  meetingTitle: string;
  meetingDate: string;
  attendees: string;
  absentees?: string;
  discussionNotes: string;
  decisions?: string;
  additionalContext?: string;
}

export interface ActionItemsInput {
  meetingNotes: string;
  attendees: string;
  projectContext?: string;
  priorityLevel: 'standard' | 'urgent' | 'critical';
}

export interface FollowUpEmailInput {
  meetingTitle: string;
  meetingDate: string;
  attendees: string;
  keyDecisions: string;
  actionItems: string;
  nextSteps?: string;
  tone: 'formal' | 'professional' | 'friendly';
}

export interface TranscriptInput {
  meetingTitle: string;
  meetingDate: string;
  transcript: string;
  outputType: 'minutes' | 'actions' | 'summary' | 'all';
  additionalContext?: string;
}

export interface SavedMeeting {
  id: string;
  title: string;
  date: string;
  type: MeetingMode;
  content: string;
  createdAt: string;
}

export type MeetingMode = 'agenda' | 'minutes' | 'actions' | 'followup' | 'transcript';

export const MEETING_TYPES = [
  'Team Standup',
  'Project Kickoff',
  'Sprint Planning',
  'Sprint Retrospective',
  'Client Meeting',
  'Board Meeting',
  'One-on-One',
  'Brainstorming Session',
  'Strategy Planning',
  'Budget Review',
  'Performance Review',
  'Training Session',
  'All-Hands Meeting',
  'Sales Pipeline Review',
  'Product Demo',
  'Stakeholder Update',
  'Crisis Management',
  'Custom'
];

export const MEETING_DURATIONS = [
  '15 minutes',
  '30 minutes',
  '45 minutes',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '3 hours',
  'Half day',
  'Full day'
];

export const MEETING_TONES = [
  { value: 'formal', label: 'Formal', description: 'Board meetings, executive briefings' },
  { value: 'professional', label: 'Professional', description: 'Standard business meetings' },
  { value: 'casual', label: 'Casual', description: 'Team standups, brainstorms' }
];

export const PRIORITY_LEVELS = [
  { value: 'standard', label: 'Standard', description: 'Normal timeline', color: 'bg-blue-100 text-blue-700' },
  { value: 'urgent', label: 'Urgent', description: 'Needs attention this week', color: 'bg-amber-100 text-amber-700' },
  { value: 'critical', label: 'Critical', description: 'Immediate action required', color: 'bg-red-100 text-red-700' }
];

export const MEETING_TEMPLATES = [
  {
    id: 'agenda',
    name: 'Meeting Agenda',
    description: 'Create structured agendas with time allocations and objectives',
    icon: 'Calendar',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'minutes',
    name: 'Meeting Minutes',
    description: 'Generate professional minutes from your discussion notes',
    icon: 'FileText',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'actions',
    name: 'Action Items',
    description: 'Extract and organize action items with owners and deadlines',
    icon: 'CheckSquare',
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'followup',
    name: 'Follow-up Email',
    description: 'Craft professional follow-up emails summarizing the meeting',
    icon: 'Mail',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: 'transcript',
    name: 'From Transcript',
    description: 'Paste meeting notes or transcript and generate any document type',
    icon: 'Mic',
    color: 'from-rose-500 to-pink-600'
  }
];

export const TRANSCRIPT_OUTPUT_TYPES = [
  { value: 'minutes', label: 'Meeting Minutes', description: 'Formal minutes with decisions and action items' },
  { value: 'actions', label: 'Action Items', description: 'Extracted tasks with owners and deadlines' },
  { value: 'summary', label: 'Quick Summary', description: 'Brief summary for stakeholders' },
  { value: 'all', label: 'Full Package', description: 'Minutes + Action Items + Summary' }
];
