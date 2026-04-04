/**
 * SOP (Standard Operating Procedure) Types
 */

export interface SOPSection {
  title: string;
  content: string;
  subsections?: SOPSubsection[];
}

export interface SOPSubsection {
  title: string;
  content: string;
  steps?: string[];
}

export interface SOPDocument {
  id?: string;
  title: string;
  department: string;
  version: string;
  effectiveDate: string;
  reviewDate: string;
  purpose: string;
  scope: string;
  definitions?: { term: string; definition: string }[];
  responsibilities: { role: string; responsibility: string }[];
  procedures: SOPSection[];
  safetyConsiderations?: string[];
  qualityMetrics?: string[];
  references?: string[];
  revisionHistory?: { version: string; date: string; changes: string; author: string }[];
  approvals?: { role: string; name: string; date: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SOPGeneratorInput {
  processName: string;
  department: string;
  industry: string;
  processDescription: string;
  targetAudience: string;
  complianceRequirements?: string;
  safetyRequirements?: string;
  additionalContext?: string;
  outputFormat: 'detailed' | 'concise' | 'checklist';
  includeFlowchart?: boolean;
  complianceFramework?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  includeTraining?: boolean;
  includeTroubleshooting?: boolean;
  language?: string;
}

export interface SOPTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  icon: string;
  color: string;
}

export const SOP_TEMPLATES: SOPTemplate[] = [
  {
    id: 'manufacturing',
    name: 'Manufacturing Process',
    description: 'Production line operations, quality control, equipment handling',
    industry: 'Manufacturing',
    icon: 'Factory',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'healthcare',
    name: 'Healthcare Procedure',
    description: 'Clinical protocols, patient care, medical documentation',
    industry: 'Healthcare',
    icon: 'Heart',
    color: 'from-red-500 to-pink-500'
  },
  {
    id: 'it-operations',
    name: 'IT Operations',
    description: 'System administration, incident response, deployment procedures',
    industry: 'Technology',
    icon: 'Server',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'hr-onboarding',
    name: 'HR & Onboarding',
    description: 'Employee onboarding, training procedures, HR processes',
    industry: 'Human Resources',
    icon: 'Users',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'finance',
    name: 'Financial Operations',
    description: 'Accounting procedures, audit processes, compliance workflows',
    industry: 'Finance',
    icon: 'DollarSign',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'Support workflows, escalation procedures, quality assurance',
    industry: 'Customer Service',
    icon: 'Headphones',
    color: 'from-cyan-500 to-teal-500'
  },
  {
    id: 'safety',
    name: 'Safety & Compliance',
    description: 'Safety protocols, emergency procedures, regulatory compliance',
    industry: 'Safety',
    icon: 'Shield',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'custom',
    name: 'Custom SOP',
    description: 'Create a custom SOP for any process or procedure',
    industry: 'Any',
    icon: 'FileText',
    color: 'from-gray-500 to-gray-600'
  }
];

export const DEPARTMENTS = [
  'Operations',
  'Human Resources',
  'Finance',
  'IT/Technology',
  'Marketing',
  'Sales',
  'Customer Service',
  'Quality Assurance',
  'Research & Development',
  'Legal & Compliance',
  'Manufacturing',
  'Logistics',
  'Healthcare',
  'Administration',
  'Other'
];

export const OUTPUT_FORMATS = [
  { value: 'detailed', label: 'Detailed', description: 'Comprehensive with all sections' },
  { value: 'concise', label: 'Concise', description: 'Streamlined essential information' },
  { value: 'checklist', label: 'Checklist', description: 'Step-by-step actionable format' }
];

export const COMPLIANCE_FRAMEWORKS = [
  { value: 'iso-9001', label: 'ISO 9001', description: 'Quality Management' },
  { value: 'iso-14001', label: 'ISO 14001', description: 'Environmental Management' },
  { value: 'iso-45001', label: 'ISO 45001', description: 'Occupational Health & Safety' },
  { value: 'hipaa', label: 'HIPAA', description: 'Healthcare Privacy' },
  { value: 'gdpr', label: 'GDPR', description: 'Data Protection' },
  { value: 'soc2', label: 'SOC 2', description: 'Security & Availability' },
  { value: 'fda-21-cfr', label: 'FDA 21 CFR Part 11', description: 'Electronic Records' },
  { value: 'osha', label: 'OSHA', description: 'Workplace Safety' },
  { value: 'pci-dss', label: 'PCI DSS', description: 'Payment Card Security' },
  { value: 'none', label: 'None / General', description: 'No specific framework' }
];

export const RISK_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minimal impact if procedure fails', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', description: 'Moderate operational impact', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', description: 'Significant business/safety impact', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', description: 'Life safety or regulatory risk', color: 'bg-red-100 text-red-700' }
];

export const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'chinese', label: 'Chinese (Simplified)' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'arabic', label: 'Arabic' }
];
