/**
 * Centralized n8n webhook URL constants.
 * Update URLs here — every feature across the app imports from this file.
 */

const N8N_BASE = 'https://soleai.app.n8n.cloud/webhook';

// ─── Scout GPT ───
export const WEBHOOK_SCOUT_GPT_SIGNALS = `${N8N_BASE}/e104c437-3b72-4de2-8fc7-535d30fb57fb`;
export const WEBHOOK_SCOUT_GPT_TOPIC_SEARCH = `${N8N_BASE}/f95c5ec4-91b5-42f3-91d5-fce635b46e58`;
export const WEBHOOK_SCOUT_GPT_TEST = `${N8N_BASE}/301d63b0-3049-420d-857e-d9dbcbdc7eaf`;

// ─── Social Alchemist / Content Generation ───
export const WEBHOOK_SOCIAL_ALCHEMIST_GENERATE = `${N8N_BASE}/ab4dc726-d881-46c6-bcc3-3b1bffd2c7c4`;

// ─── Voice Profiles ───
export const WEBHOOK_VOICE_PROFILE_CREATE = `${N8N_BASE}/66bc4c62-262d-4a3c-8d18-098c97672ddd`;
export const WEBHOOK_VOICE_PROFILE_DELETE = `${N8N_BASE}/4d473f2d-67af-4144-b217-0cb9440124a8`;

// ─── Content Publishing ───
export const WEBHOOK_CONTENT_PUBLISH = `${N8N_BASE}/ac317b82-2163-44ea-8324-5727d9d29a85`;
