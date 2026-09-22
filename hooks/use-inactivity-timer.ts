"use client";

interface UseInactivityTimerOptions {
  timeoutMs?: number;
  enabled?: boolean;
}

/**
 * Inactivity timer hook.
 * Auto-logout timer has been disabled so users are not interrupted while working.
 * Session lifecycle is tied to the browser tab (sessionStorage).
 */
export function useInactivityTimer({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeoutMs,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enabled = false,
}: UseInactivityTimerOptions = {}) {
  // No-op: auto-logout timer is disabled
}
