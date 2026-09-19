"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/api";

interface UseInactivityTimerOptions {
  timeoutMs?: number; // Inactivity timeout in ms (default: 5 minutes = 300,000 ms)
  enabled?: boolean;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 2000; // Throttle activity updates to storage every 2s

export function useInactivityTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  enabled = true,
}: UseInactivityTimerOptions = {}) {
  const router = useRouter();
  const lastThrottleRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  // Perform auto-logout and redirect to login page
  const handleAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    }

    if (typeof window !== "undefined") {
      router.replace("/?reason=inactivity");
    }
  }, [router]);

  // Record user activity
  const recordActivity = useCallback(() => {
    if (!enabled || typeof window === "undefined" || isLoggingOutRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastThrottleRef.current > THROTTLE_MS) {
      lastThrottleRef.current = now;
      sessionStorage.setItem("insure_last_activity", now.toString());
      localStorage.setItem("insure_last_activity", now.toString());
    }
  }, [enabled]);

  // Check if session has exceeded timeout
  const checkInactivity = useCallback(() => {
    if (isLoggingOutRef.current || typeof window === "undefined") return;

    const storedActivity =
      sessionStorage.getItem("insure_last_activity") ||
      localStorage.getItem("insure_last_activity");
    const lastActivityTime = storedActivity
      ? parseInt(storedActivity, 10)
      : 0;

    const elapsed = Date.now() - lastActivityTime;

    if (!lastActivityTime || elapsed >= timeoutMs) {
      handleAutoLogout();
    }
  }, [timeoutMs, handleAutoLogout]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Check if token exists in sessionStorage
    const token = sessionStorage.getItem("insure_token");
    if (!token) return;

    // Check inactivity immediately on hook mount
    checkInactivity();

    // User interaction events to detect active usage
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
    ];

    const handleUserActivity = () => {
      recordActivity();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Detect when laptop lid opens, phone is unlocked, or tab returns to view
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Detect window focus (switching back to browser)
    const handleFocus = () => {
      checkInactivity();
    };
    window.addEventListener("focus", handleFocus);

    // Detect page restored from background/bfcache
    const handlePageShow = () => {
      checkInactivity();
    };
    window.addEventListener("pageshow", handlePageShow);

    // Cross-tab sync via storage event
    const handleStorage = (event: StorageEvent) => {
      if (
        (event.key === "insure_token" && !event.newValue) ||
        (event.key === "insure_logout_event" && event.newValue)
      ) {
        router.replace("/");
      }
    };
    window.addEventListener("storage", handleStorage);

    // Periodic check every 1 second
    const interval = setInterval(() => {
      checkInactivity();
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [enabled, checkInactivity, recordActivity, router]);
}
