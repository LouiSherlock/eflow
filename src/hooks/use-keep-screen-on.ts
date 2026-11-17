import { useEffect } from "react";
import { hasNativeSystemBars, setKeepScreenOn } from "../services/system-bars";

/**
 * Keeps the screen awake while a reading page is mounted.
 *
 * On Android the local system-bars plugin sets `FLAG_KEEP_SCREEN_ON`; elsewhere
 * the Screen Wake Lock API is used, and re-requested when the tab becomes
 * visible again (the browser drops the lock in the background).
 */
export function useKeepScreenOn(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if (hasNativeSystemBars()) {
        void setKeepScreenOn(true);
        return;
      }
      if (!("wakeLock" in navigator)) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        wakeLock = sentinel;
      } catch (error) {
        // Refused under battery saver or low power; reading still works.
        console.warn("Screen wake lock was refused:", error);
      }
    };

    void requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (hasNativeSystemBars()) void setKeepScreenOn(false);
      void wakeLock?.release();
      wakeLock = null;
    };
  }, [enabled]);
}
