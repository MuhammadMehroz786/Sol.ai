// v1.1 Types - Strict schema alignment

export type SourceType = "raw_text" | "url" | "doc_id" | "transcript";

export type Platform = "x" | "linkedin" | "instagram_carousel" | "short_video";

export interface BrandVoice {
  voiceProfileId: string;
  voiceProfileName?: string;
  audience: string;
  doNotSay?: string[];
}

export interface Compliance {
  disclosureRequired: boolean;
  brandSafetyStrict: boolean;
}

// v1.1 Input Schema
export interface SocialAlchemistInput {
  sourceType: SourceType;
  source: string;
  targetPlatforms: Platform[];
  brandVoice: BrandVoice;
  keywords?: string[];
  cta?: string;
  maxOutputs?: number;
  compliance: Compliance;
  dryRun: boolean;
  seed?: number;
  idempotencyKey?: string;
}

// API Request (internal)
export interface SocialAlchemistRequest extends SocialAlchemistInput {
  user_id: string;
}

export interface PlatformResult {
  platform: Platform;
  content: string;
  compliance_warnings?: string[];
  validation_errors?: string[];
  status: "success" | "failed";
}

export interface SocialAlchemistResponse {
  request_id: string;
  results: PlatformResult[];
  error?: {
    code: "PARTIAL_FAILURE" | "FULL_FAILURE";
    message: string;
  };
  is_replay: boolean;
}

// Platform configuration with v1.1 constraints
export interface PlatformConfig {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  maxChars?: number;
  outputFormat: string;
  constraints: string[];
  accessibilityNote?: string;
}

export const platformConfig: Record<Platform, PlatformConfig> = {
  x: {
    label: "X (Thread)",
    shortLabel: "X",
    icon: "𝕏",
    color: "text-neutral-900 dark:text-neutral-100",
    bgColor: "bg-neutral-100 dark:bg-neutral-800",
    maxChars: 280,
    outputFormat: "6–20 tweets",
    constraints: ["280 chars per tweet", "Thread format"],
  },
  linkedin: {
    label: "LinkedIn",
    shortLabel: "LinkedIn",
    icon: "in",
    color: "text-[#0077B5]",
    bgColor: "bg-[#0077B5]/10",
    maxChars: 3000,
    outputFormat: "1 post",
    constraints: ["3,000 char limit", "Professional tone"],
  },
  instagram_carousel: {
    label: "Instagram Carousel",
    shortLabel: "Instagram",
    icon: "📸",
    color: "text-pink-600",
    bgColor: "bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-orange-500/10",
    outputFormat: "5–10 slides",
    constraints: ["10 slides max", "Visual-first"],
    accessibilityNote: "Alt text required",
  },
  short_video: {
    label: "Short-form Video",
    shortLabel: "Video",
    icon: "🎬",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    outputFormat: "30–60s script",
    constraints: ["Hook in 3s", "Vertical format"],
  }
};

export interface SourceTypeConfig {
  label: string;
  placeholder: string;
  icon: string;
  hint?: string;
}

export const sourceTypeConfig: Record<SourceType, SourceTypeConfig> = {
  raw_text: {
    label: "Raw Text",
    placeholder: "Paste your content, article, or ideas here...",
    icon: "📝",
    hint: "Direct text input",
  },
  url: {
    label: "URL",
    placeholder: "https://example.com/article",
    icon: "🔗",
    hint: "Link will be fetched & scanned",
  },
  doc_id: {
    label: "Doc ID",
    placeholder: "doc-abc123-xyz",
    icon: "📄",
    hint: "Reference an existing document",
  },
  transcript: {
    label: "Transcript",
    placeholder: "Paste your video/audio transcript here...",
    icon: "🎙️",
    hint: "Audio/video transcript",
  }
};

// Validation helpers
export interface ValidationStatus {
  isValid: boolean;
  completeness: number; // 0-100
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  type: "error" | "warning" | "info";
  message: string;
}

export function calculateReadTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes <= 1 ? "< 1 min read" : `~${minutes} min read`;
}

export function generateIdempotencyKey(): string {
  return `sa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
