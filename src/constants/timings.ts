/**
 * Centralized timing constants for the application.
 * Prevents magic numbers scattered throughout the codebase.
 */

export const TIMING = {
  // Polling & refresh intervals
  HEALTH_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  STATS_REFRESH_INTERVAL: 30_000, // 30 seconds

  // Request timeouts
  REQUEST_TIMEOUT: 30_000, // 30 seconds
  SCOUT_TIMEOUT: 120_000, // 2 minutes
  SCOUT_TIMEOUT_EXTENDED: 300_000, // 5 minutes

  // Animation durations
  COUNT_UP_DURATION: 800, // 0.8 seconds

  // Retry delays
  RETRY_BASE_DELAY: 1000, // 1 second
  MAX_RETRIES: 2,

  // Cache durations
  QUERY_STALE_TIME: 30_000, // 30 seconds
} as const;

export const THRESHOLDS = {
  // Health check thresholds
  RESPONSE_TIME_OK: 2000, // 2 seconds
  RESPONSE_TIME_WARN: 5000, // 5 seconds

  // Failure thresholds
  CONSECUTIVE_FAILURES_FOR_FALLBACK: 3,
  FAILURE_WINDOW_MINUTES: 5,

  // Query limits
  RECENT_CHECKS_HOURS: 24,
} as const;
