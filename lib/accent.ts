import type { AccentPreference } from "@/types";

type AccentPreset = {
  id: AccentPreference;
  label: string;
  base: string;
  soft: string;
  subtle: string;
  text: string;
  darkText: string;
  ring: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "cyan",
    label: "Cyan",
    base: "#06b6d4",
    soft: "rgba(6, 182, 212, 0.16)",
    subtle: "rgba(6, 182, 212, 0.08)",
    text: "#0e7490",
    darkText: "#67e8f9",
    ring: "rgba(6, 182, 212, 0.22)"
  },
  {
    id: "emerald",
    label: "Emerald",
    base: "#10b981",
    soft: "rgba(16, 185, 129, 0.16)",
    subtle: "rgba(16, 185, 129, 0.08)",
    text: "#047857",
    darkText: "#6ee7b7",
    ring: "rgba(16, 185, 129, 0.22)"
  },
  {
    id: "violet",
    label: "Violet",
    base: "#8b5cf6",
    soft: "rgba(139, 92, 246, 0.16)",
    subtle: "rgba(139, 92, 246, 0.08)",
    text: "#6d28d9",
    darkText: "#c4b5fd",
    ring: "rgba(139, 92, 246, 0.22)"
  },
  {
    id: "rose",
    label: "Rose",
    base: "#f43f5e",
    soft: "rgba(244, 63, 94, 0.16)",
    subtle: "rgba(244, 63, 94, 0.08)",
    text: "#be123c",
    darkText: "#fda4af",
    ring: "rgba(244, 63, 94, 0.22)"
  },
  {
    id: "amber",
    label: "Amber",
    base: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.18)",
    subtle: "rgba(245, 158, 11, 0.09)",
    text: "#b45309",
    darkText: "#fcd34d",
    ring: "rgba(245, 158, 11, 0.24)"
  },
  {
    id: "slate",
    label: "Slate",
    base: "#64748b",
    soft: "rgba(100, 116, 139, 0.18)",
    subtle: "rgba(100, 116, 139, 0.1)",
    text: "#475569",
    darkText: "#cbd5e1",
    ring: "rgba(100, 116, 139, 0.24)"
  }
];

export function applyAccent(accent: AccentPreference) {
  const preset =
    ACCENT_PRESETS.find((candidate) => candidate.id === accent) ??
    ACCENT_PRESETS[0];

  const root = document.documentElement;
  root.style.setProperty("--accent", preset.base);
  root.style.setProperty("--accent-soft", preset.soft);
  root.style.setProperty("--accent-subtle", preset.subtle);
  root.style.setProperty("--accent-text", preset.text);
  root.style.setProperty("--accent-dark-text", preset.darkText);
  root.style.setProperty("--accent-ring", preset.ring);
}
