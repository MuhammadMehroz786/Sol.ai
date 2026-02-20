/**
 * Centralized n8n webhook URL constants.
 * Update URLs here — every feature across the app imports from this file.
 *
 * Active workflows (5 total):
 *  1. WEBHOOK_SCOUT_GPT        — signal ingestion (general + topic search)
 *  2. WEBHOOK_EDITORIAL_GPT    — content generation (Editorial GPT)
 *  3. WEBHOOK_VOICE_PROFILE_CREATE — voice profile generation from sample articles
 *  4. WEBHOOK_SOCIAL_ALCHEMIST — social asset generation (TBD)
 *  5. (reserved for future workflow)
 */

if (!import.meta.env.VITE_N8N_BASE) {
  throw new Error('VITE_N8N_BASE environment variable is required');
}

const N8N_BASE = import.meta.env.VITE_N8N_BASE as string;

// ─── Workflow 1: Scout GPT (signal ingestion) ───
// Handles both general signals and topic-specific searches via the `topic` field
export const WEBHOOK_SCOUT_GPT = `${N8N_BASE}/e104c437-3b72-4de2-8fc7-535d30fb57fb`;

// ─── Workflow 2: Editorial GPT (content generation) ───
export const WEBHOOK_EDITORIAL_GPT = `${N8N_BASE}/ac317b82-2163-44ea-8324-5727d9d29a85`;

// ─── Workflow 3: Voice Profile Generator ───
export const WEBHOOK_VOICE_PROFILE_CREATE = `${N8N_BASE}/66bc4c62-262d-4a3c-8d18-098c97672ddd`;

// ─── Workflow 4: Social Alchemist ───
export const WEBHOOK_SOCIAL_ALCHEMIST = `${N8N_BASE}/ab4dc726-d881-46c6-bcc3-3b1bffd2c7c4`;
