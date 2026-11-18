import { useEffect, type ReactNode } from "react";

import { updateNativeTheme, useThemeStore } from "../services/theme";

interface ThemeModeContextValue {
  theme: "light" | "dark";
}

/**
 * Owns the app's single resolved theme.
 *
 * `gothic` only defines a dark palette, so the app is dark-only; this provider
 * keeps the html classes, `color-scheme`, and the Android system-bar icons in
 * step with that one value.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  // Keep Tailwind's `dark:` variant and native form controls in step.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = theme;
  }, [theme]);

  // Keep the Android status and navigation bar icons readable. The activity
  // owns the bars, so re-apply when the app returns to the foreground instead
  // of trusting the state left behind.
  useEffect(() => {
    void updateNativeTheme(theme);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void updateNativeTheme(theme);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [theme]);

  return children;
}

export function useThemeMode(): ThemeModeContextValue {
  const theme = useThemeStore((state) => state.theme);
  return { theme };
}
