import { z } from "zod";

// v1.2 Schema - Voice Profile Integration
export const socialAlchemistSchema = z.object({
  // Source Section (Required)
  sourceType: z.enum(["raw_text", "url", "doc_id", "transcript"], {
    required_error: "Please select a source type",
  }),
  source: z.string()
    .min(1, "Source content is required")
    .max(50000, "Source content must be less than 50,000 characters"),

  // Target Platforms (Required - at least one)
  targetPlatforms: z.array(z.enum(["x", "linkedin", "instagram_carousel", "short_video"]))
    .min(1, "Select at least one platform"),

  // Brand Voice (Required) - Now uses Voice Profile
  brandVoice: z.object({
    voiceProfileId: z.string().min(1, "Please select a voice profile"),
    voiceProfileName: z.string().optional(), // For display/API
    audience: z.string().min(1, "Audience is required").max(150, "Audience must be under 150 characters"),
    doNotSay: z.array(z.string()).optional().default([]),
  }),

  // Strategic Controls (Optional)
  keywords: z.array(z.string()).optional().default([]),
  cta: z.string().max(200, "CTA must be under 200 characters").optional(),
  maxOutputs: z.number().min(1).max(4).default(4),

  // Compliance & Safety
  compliance: z.object({
    disclosureRequired: z.boolean().default(false),
    brandSafetyStrict: z.boolean().default(true),
  }),

  // Execution Controls
  dryRun: z.boolean().default(true),
  seed: z.number().int().positive().optional(),
}).refine((data) => {
  // URL validation
  if (data.sourceType === "url") {
    try {
      new URL(data.source);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "Please enter a valid URL",
  path: ["source"],
}).refine((data) => {
  // Doc ID validation (alphanumeric with dashes)
  if (data.sourceType === "doc_id") {
    return /^[a-zA-Z0-9-_]+$/.test(data.source);
  }
  return true;
}, {
  message: "Doc ID must be alphanumeric (dashes and underscores allowed)",
  path: ["source"],
}).refine((data) => {
  // Raw text minimum length
  if (data.sourceType === "raw_text" || data.sourceType === "transcript") {
    return data.source.length >= 10;
  }
  return true;
}, {
  message: "Content must be at least 10 characters",
  path: ["source"],
});

export type SocialAlchemistSchemaType = z.infer<typeof socialAlchemistSchema>;

// Default values for form initialization
export const socialAlchemistDefaults: Partial<SocialAlchemistSchemaType> = {
  sourceType: "raw_text",
  source: "",
  targetPlatforms: [],
  brandVoice: {
    voiceProfileId: "",
    voiceProfileName: "",
    audience: "",
    doNotSay: [],
  },
  keywords: [],
  cta: "",
  maxOutputs: 4,
  compliance: {
    disclosureRequired: false,
    brandSafetyStrict: true,
  },
  dryRun: true,
  seed: undefined,
};
