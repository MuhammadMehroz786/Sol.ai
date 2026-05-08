/**
 * Centralized n8n webhook URL constants.
 * All URLs are built from VITE_N8N_BASE — set it in .env, never hardcode IDs.
 *
 * ─── Request / Response Schemas ────────────────────────────────────────────
 *
 * WEBHOOK_SCOUT_GPT
 *   POST { action: "get_signals", timestamp: string, topic?: string }
 *   → ScoutGptSignal[] or { signals: ScoutGptSignal[] } or { output: ScoutGptSignal }
 *   (see scoutGptService.ts → parseSignalsResponse for all accepted shapes)
 *
 * WEBHOOK_EDITORIAL_GPT
 *   POST {
 *     topic: string,
 *     signal: { headline: string, summary: string },
 *     voice_id: string,          // voice profile DB UUID
 *     output_type: string,       // "article" | "thread" | "newsletter" | …
 *     guardrails: Guardrails,
 *     content_size?: string,     // "short" | "medium" | "long" (articles only)
 *
 *     // Quick-action variant (GeneratedContentModal)
 *     content?: string,          // existing content to refine
 *     voice_name?: string,
 *     quickAction?: string,      // "simplify" | "expand" | "professional" | …
 *   }
 *   → string | { text_output: string } | { content_markdown: string }
 *     | { headline, body, tldr, caption, hashtags }
 *
 * WEBHOOK_VOICE_PROFILE_CREATE
 *   POST FormData { articles: File[], voice_name: string, user_id: string }
 *   → { voice_id: string, description?: string }
 *
 * WEBHOOK_SOCIAL_ALCHEMIST
 *   POST {
 *     idempotencyKey: string,
 *     userId: string,
 *     payload: {
 *       voiceProfile: string,
 *       sourceType: "raw_text" | "url" | "doc_id" | "transcript",
 *       source: string,
 *       targetPlatforms: ("x" | "linkedin" | "instagram_carousel" | "short_video")[],
 *     }
 *   }
 *   → { ok: boolean, runId: string, status: string,
 *       outputs: Record<platform, PlatformResult>,
 *       errors?: { platform: string, error: string }[] }
 *
 * WEBHOOK_CONTENT_REFINEMENT
 *   POST { content: string, voice_name: string, signal: { headline, summary },
 *          output_type: string, quickAction: string }
 *   → same shape as WEBHOOK_EDITORIAL_GPT response
 */

const N8N_BASE = (import.meta.env.VITE_N8N_BASE as string) || '';
if (!N8N_BASE && import.meta.env.DEV) console.warn('[webhooks] VITE_N8N_BASE is not set — all webhook calls will fail');

// ─── Workflow 1: Scout GPT (signal ingestion) ───
export const WEBHOOK_SCOUT_GPT = `${N8N_BASE}/f95c5ec4-91b5-42f3-91d5-fce635b46e58`;

// ─── Workflow 2: Editorial GPT (content generation) ───
export const WEBHOOK_EDITORIAL_GPT = `${N8N_BASE}/ac317b82-2163-44ea-8324-5727d9d29a85`;

// ─── Workflow 3: Voice Profile Generator ───
export const WEBHOOK_VOICE_PROFILE_CREATE = `${N8N_BASE}/66bc4c62-262d-4a3c-8d18-098c97672ddd`;

// ─── Workflow 4: Social Alchemist ───
export const WEBHOOK_SOCIAL_ALCHEMIST = `${N8N_BASE}/ab4dc726-d881-46c6-bcc3-3b1bffd2c7c4`;

// ─── Workflow 5: Content Refinement (quick actions + custom modifiers) ───
export const WEBHOOK_CONTENT_REFINEMENT = `${N8N_BASE}/9487a6d7-b909-4ace-87de-5609027ddf6e`;
