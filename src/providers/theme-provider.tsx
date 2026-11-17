import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { updateNativeTheme, type ResolvedTheme } from "../services/theme";

interface ThemeModeContextValue {
  /** The app ships one dark theme, so this is always "dark". */
  theme: ResolvedTheme;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/**
 * Owns the app's single resolved theme.
 *
 * `gothic` only defines a dark palette, so the app is dark-only; this provider
 * keeps the html classes, `color-scheme`, and the Android system-bar icons in
 * step with that one value.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: ResolvedTheme = "dark";

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

  const value = useMemo(() => ({ theme }), [theme]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeProvider");
  }

  return context;
}
