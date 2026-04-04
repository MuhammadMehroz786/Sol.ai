/**
 * SOP Generator Service
 * Uses OpenAI GPT-4 to generate professional Standard Operating Procedures
 */

import { SOPGeneratorInput, SOPDocument } from '@/types/sop';

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

const SOP_SYSTEM_PROMPT = `You are an elite SOP (Standard Operating Procedure) consultant with 25+ years of experience creating enterprise-grade documentation for Fortune 500 companies, government agencies, and healthcare organizations. You are certified in ISO 9001, ISO 14001, ISO 45001, OSHA, HIPAA, FDA 21 CFR Part 11, and Six Sigma methodologies.

Your SOPs are renowned for being:
- Crystal clear with zero ambiguity
- Legally defensible and audit-ready
- Immediately actionable by any trained employee
- Compliant with all relevant regulatory frameworks
- Written in natural, human language (not robotic or corporate-speak)

CRITICAL WRITING RULES:
1. NEVER use em dashes (the long dash). Use commas, periods, or rewrite the sentence instead.
2. NEVER use robotic phrases like "Please ensure" or "It is imperative that" or "Please do not hesitate"
3. NEVER use corporate jargon like "synergy", "leverage", "circle back", "touch base", "bandwidth"
4. NEVER use filler phrases like "It is important to note that" or "It should be mentioned that"
5. Write like a smart professional talking to another smart professional
6. Be direct and clear, not stuffy or bureaucratic
7. Use active voice, not passive (say "Press the button" not "The button should be pressed")
8. Keep sentences crisp and readable
9. Be specific with concrete details, not vague

MANDATORY STRUCTURE (Always include ALL sections):

# [PROCESS NAME] - Standard Operating Procedure

## Document Control
| Field | Value |
|-------|-------|
| Document ID | SOP-[DEPT]-[NUMBER] |
| Version | 1.0 |
| Effective Date | [DATE] |
| Review Date | [DATE + 1 YEAR] |
| Classification | [Internal/Confidential/Public] |
| Owner | [Department Head] |

## 1. Purpose
[Clear statement of WHY this SOP exists - 2-3 sentences max]

## 2. Scope
[WHO this applies to, WHAT processes/equipment it covers, WHERE it applies]

## 3. Definitions & Acronyms
| Term | Definition |
|------|------------|
[Include all technical terms, abbreviations, role titles]

## 4. Roles & Responsibilities
| Role | Responsibilities |
|------|------------------|
[RACI matrix style - who is Responsible, Accountable, Consulted, Informed]

## 5. Prerequisites
- Required training/certifications
- Required equipment/materials
- Required access/permissions
- Required PPE (if applicable)

## 6. Procedure
### 6.1 [Phase/Section Name]
**Estimated Time:** [X minutes]
**Performed By:** [Role]

1. [Action verb] [specific action] [expected outcome]
   - Sub-step if needed
   - **CAUTION:** [Safety note if applicable]
   - **NOTE:** [Important information]

2. [Next step...]

### 6.2 [Next Phase...]
[Continue with numbered steps]

## 7. Quality Checkpoints
| Checkpoint | Acceptance Criteria | Verification Method |
|------------|---------------------|---------------------|
[Measurable quality gates throughout the process]

## 8. Safety & Compliance
### 8.1 Safety Precautions
- [Specific hazards and mitigations]

### 8.2 Regulatory Requirements
- [Applicable regulations: OSHA, FDA, HIPAA, etc.]

### 8.3 Environmental Considerations
- [Waste disposal, emissions, sustainability]

## 9. Troubleshooting
| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
[Common problems and solutions]

## 10. References
- [Related SOPs, work instructions, forms]
- [External standards and regulations]

## 11. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [DATE] | [Author] | Initial release |

## 12. Approval Signatures
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Author | _____________ | _____________ | _____ |
| Reviewer | _____________ | _____________ | _____ |
| Approver | _____________ | _____________ | _____ |

---

WRITING RULES:
1. ALWAYS use active voice and imperative mood ("Press the button" not "The button should be pressed")
2. Each step = ONE action only
3. Include time estimates for each major section
4. Add CAUTION/WARNING/NOTE callouts for critical information
5. Use tables for structured data
6. Include specific quantities, measurements, and thresholds
7. Never use vague terms like "appropriate", "sufficient", "as needed" - be SPECIFIC
8. Every procedure must have a verification/quality check
9. Format for MAXIMUM readability and scannability`;

function buildSOPPrompt(input: SOPGeneratorInput): string {
  const formatInstructions = {
    detailed: 'Create a comprehensive SOP with ALL sections fully developed, including detailed step-by-step procedures, extensive safety considerations, quality checkpoints, and complete documentation. Leave nothing out.',
    concise: 'Create a streamlined SOP focusing on essential information. Keep procedures clear but brief. Include only critical safety notes. Aim for maximum clarity with minimum verbosity.',
    checklist: 'Create an action-oriented SOP in checklist format. Each procedure step should be a checkable item [ ]. Focus on actionability and quick reference.'
  };

  const riskInstructions = {
    low: 'This is a LOW RISK procedure. Basic safety notes are sufficient.',
    medium: 'This is a MEDIUM RISK procedure. Include standard safety precautions and verification steps.',
    high: 'This is a HIGH RISK procedure. Include detailed safety protocols, mandatory checkpoints, supervisor approvals, and emergency procedures.',
    critical: 'This is a CRITICAL RISK procedure. Include comprehensive safety protocols, multiple verification steps, mandatory supervisor sign-offs, emergency response procedures, and regulatory compliance checkpoints. This SOP may be subject to audit.'
  };

  const complianceInstructions = input.complianceFramework && input.complianceFramework !== 'none'
    ? `\n**COMPLIANCE FRAMEWORK:** This SOP must comply with ${input.complianceFramework.toUpperCase()} requirements. Include relevant compliance checkpoints, documentation requirements, and regulatory references.\n`
    : '';

  return `Generate a PROFESSIONAL, ENTERPRISE-GRADE Standard Operating Procedure (SOP) document with the following specifications:

**Process Name:** ${input.processName}
**Department:** ${input.department}
**Industry:** ${input.industry}
**Target Audience:** ${input.targetAudience}
**Risk Level:** ${input.riskLevel?.toUpperCase() || 'MEDIUM'}
${complianceInstructions}
**Process Description:**
${input.processDescription}

${input.complianceRequirements ? `**Additional Compliance Requirements:**\n${input.complianceRequirements}\n` : ''}
${input.safetyRequirements ? `**Safety Requirements:**\n${input.safetyRequirements}\n` : ''}
${input.additionalContext ? `**Additional Context:**\n${input.additionalContext}\n` : ''}

**RISK ASSESSMENT:** ${riskInstructions[input.riskLevel || 'medium']}

**OUTPUT FORMAT:** ${input.outputFormat}
${formatInstructions[input.outputFormat]}

**SPECIAL REQUIREMENTS:**
${input.includeTraining ? '- INCLUDE a detailed Training Requirements section with certifications and competencies needed' : '- Skip training section'}
${input.includeTroubleshooting ? '- INCLUDE a comprehensive Troubleshooting Guide with common issues and solutions in table format' : '- Skip troubleshooting section'}

**QUALITY STANDARDS:**
- Every procedure step must be actionable and verifiable
- Include time estimates for each major section
- Add CAUTION/WARNING boxes for safety-critical steps
- Include quality checkpoints with acceptance criteria
- Use tables for structured information
- Be SPECIFIC - no vague language like "appropriate" or "as needed"

Generate the SOP in clean, professional markdown format. This document should be audit-ready and immediately usable in a professional environment.`;
}

export async function generateSOP(input: SOPGeneratorInput): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SOP_SYSTEM_PROMPT },
    { role: 'user', content: buildSOPPrompt(input) }
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
        temperature: 0.7,
        presence_penalty: 0.1,
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

export async function refineSOP(
  currentSOP: string,
  refinementRequest: string
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SOP_SYSTEM_PROMPT },
    { role: 'user', content: `Here is an existing SOP document:\n\n${currentSOP}` },
    { role: 'assistant', content: 'I have reviewed the SOP document. What changes would you like me to make?' },
    { role: 'user', content: `Please refine this SOP based on the following request:\n\n${refinementRequest}\n\nReturn the complete updated SOP in markdown format.` }
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
        temperature: 0.5
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

export async function generateSOPSection(
  sectionType: string,
  context: string
): Promise<{ content: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return {
      content: '',
      error: 'OpenAI API key not configured.'
    };
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SOP_SYSTEM_PROMPT },
    { role: 'user', content: `Generate only the "${sectionType}" section for an SOP with this context:\n\n${context}\n\nReturn only this section in proper markdown format.` }
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
