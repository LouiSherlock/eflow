import { create } from "zustand";

export type ReaderSettings = {
  fontScale: number;
  lineHeight: number;
  paragraphSpacing: number;
  justify: boolean;
  level: number;
  followSystem: boolean;
  warm: number;
};
const KEY = "eflow-reader-settings-v1";
const defaults: ReaderSettings = {
  fontScale: 1,
  lineHeight: 1.75,
  paragraphSpacing: 1,
  justify: true,
  level: 1,
  followSystem: true,
  warm: 0,
};
function read(): ReaderSettings {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
      return defaults;
    }
    const value = stored as Record<string, unknown>;
    const clamp = (number: unknown, fallback: number) =>
      typeof number === "number" && Number.isFinite(number)
        ? Math.min(1, Math.max(0, number))
        : fallback;
    return {
      ...defaults,
      fontScale: typeof value.fontScale === "number" ? value.fontScale : defaults.fontScale,
      lineHeight: typeof value.lineHeight === "number" ? value.lineHeight : defaults.lineHeight,
      paragraphSpacing: typeof value.paragraphSpacing === "number" ? value.paragraphSpacing : defaults.paragraphSpacing,
      justify: typeof value.justify === "boolean" ? value.justify : defaults.justify,
      level: clamp(value.level, defaults.level),
      followSystem: typeof value.followSystem === "boolean" ? value.followSystem : defaults.followSystem,
      warm: clamp(value.warm, defaults.warm),
    };
  } catch {
    return defaults;
  }
}
export const useReaderSettings = create<ReaderSettings & { update: (settings: Partial<ReaderSettings>) => void }>((set, get) => ({
  ...read(),
  update: (settings) => {
    const next = { ...get(), ...settings };
    localStorage.setItem(KEY, JSON.stringify({
      fontScale: next.fontScale,
      lineHeight: next.lineHeight,
      paragraphSpacing: next.paragraphSpacing,
      justify: next.justify,
      level: next.level,
      followSystem: next.followSystem,
      warm: next.warm,
    }));
    set(settings);
  },
}));
