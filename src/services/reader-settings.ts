import { create } from "zustand";

export type ReaderSettings = { fontScale: number; lineHeight: number; paragraphSpacing: number; justify: boolean };
const KEY = "eflow-reader-settings-v1";
const defaults: ReaderSettings = { fontScale: 1, lineHeight: 1.75, paragraphSpacing: 1, justify: true };
function read(): ReaderSettings { try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return defaults; } }
export const useReaderSettings = create<ReaderSettings & { update: (settings: Partial<ReaderSettings>) => void }>((set, get) => ({
  ...read(),
  update: (settings) => { const next = { ...get(), ...settings }; localStorage.setItem(KEY, JSON.stringify({ fontScale: next.fontScale, lineHeight: next.lineHeight, paragraphSpacing: next.paragraphSpacing, justify: next.justify })); set(settings); },
}));
