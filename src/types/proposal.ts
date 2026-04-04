/**
 * Proposal Generator Types
 */

export interface ProposalGeneratorInput {
  projectName: string;
  clientName: string;
  clientIndustry: string;
  proposalType: string;
  projectDescription: string;
  problemStatement: string;
  proposedSolution: string;
  timeline?: string;
  budget?: string;
  deliverables?: string;
  teamExperience?: string;
  competitiveAdvantage?: string;
  additionalContext?: string;
  tone: 'formal' | 'professional' | 'friendly' | 'persuasive';
  includeTimeline?: boolean;
  includeBudget?: boolean;
  includeTestimonials?: boolean;
  includeCaseStudies?: boolean;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'business',
    name: 'Business Proposal',
    description: 'General business proposals for partnerships, services, or products',
    icon: 'Briefcase',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'project',
    name: 'Project Proposal',
    description: 'Detailed project plans with scope, timeline, and deliverables',
    icon: 'FolderKanban',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'sales',
    name: 'Sales Proposal',
    description: 'Persuasive proposals to win new clients and close deals',
    icon: 'TrendingUp',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'consulting',
    name: 'Consulting Proposal',
    description: 'Professional services and consulting engagement proposals',
    icon: 'Users',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'grant',
    name: 'Grant Proposal',
    description: 'Funding requests for non-profits, research, or community projects',
    icon: 'Heart',
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'software',
    name: 'Software Development',
    description: 'Technical proposals for software projects and IT solutions',
    icon: 'Code',
    color: 'from-cyan-500 to-teal-500'
  },
  {
    id: 'marketing',
    name: 'Marketing Proposal',
    description: 'Marketing campaigns, branding, and digital strategy proposals',
    icon: 'Megaphone',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'custom',
    name: 'Custom Proposal',
    description: 'Create a custom proposal tailored to your specific needs',
    icon: 'FileText',
    color: 'from-gray-500 to-gray-600'
  }
];

export const PROPOSAL_TYPES = [
  'Business Partnership',
  'Service Agreement',
  'Project Development',
  'Consulting Engagement',
  'Software Development',
  'Marketing Campaign',
  'Grant Application',
  'Research Collaboration',
  'Product Launch',
  'Event Sponsorship',
  'Training Program',
  'Maintenance Contract',
  'Custom Solution'
];

export const CLIENT_INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance & Banking',
  'Retail & E-commerce',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Legal Services',
  'Non-Profit',
  'Government',
  'Media & Entertainment',
  'Hospitality',
  'Transportation',
  'Energy & Utilities',
  'Agriculture',
  'Construction',
  'Other'
];

export const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Traditional corporate style with professional language' },
  { value: 'professional', label: 'Professional', description: 'Business appropriate but approachable' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and personable while remaining professional' },
  { value: 'persuasive', label: 'Persuasive', description: 'Compelling and action-oriented language' }
];
