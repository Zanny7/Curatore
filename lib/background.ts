import type {
  AccentPreference,
  BackgroundPreference,
  BackgroundThemeId
} from "@/types";

export type BackgroundTheme = {
  id: BackgroundThemeId;
  label: string;
  background: string;
  sidebar: string;
  border: string;
  control: string;
  preview: string;
  recommendedAccent: AccentPreference;
};

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: "midnight",
    label: "Midnight cyan",
    background: "#0a0a0a",
    sidebar: "rgba(23, 23, 23, 0.95)",
    border: "rgba(255, 255, 255, 0.1)",
    control: "rgba(23, 23, 23, 0.95)",
    preview: "linear-gradient(135deg, #0a0a0a, #164e63)",
    recommendedAccent: "cyan"
  },
  {
    id: "graphite",
    label: "Graphite slate",
    background: "#18181b",
    sidebar: "rgba(39, 39, 42, 0.95)",
    border: "rgba(212, 212, 216, 0.16)",
    control: "rgba(39, 39, 42, 0.95)",
    preview: "linear-gradient(135deg, #18181b, #52525b)",
    recommendedAccent: "slate"
  },
  {
    id: "deepSea",
    label: "Deep sea",
    background: "#06131f",
    sidebar: "rgba(8, 31, 45, 0.95)",
    border: "rgba(103, 232, 249, 0.16)",
    control: "rgba(8, 31, 45, 0.95)",
    preview: "linear-gradient(135deg, #06131f, #0e7490)",
    recommendedAccent: "cyan"
  },
  {
    id: "forest",
    label: "Forest emerald",
    background: "#071710",
    sidebar: "rgba(12, 35, 25, 0.95)",
    border: "rgba(110, 231, 183, 0.16)",
    control: "rgba(12, 35, 25, 0.95)",
    preview: "linear-gradient(135deg, #071710, #047857)",
    recommendedAccent: "emerald"
  },
  {
    id: "plum",
    label: "Plum violet",
    background: "#170b1f",
    sidebar: "rgba(36, 18, 51, 0.95)",
    border: "rgba(196, 181, 253, 0.18)",
    control: "rgba(36, 18, 51, 0.95)",
    preview: "linear-gradient(135deg, #170b1f, #7c3aed)",
    recommendedAccent: "violet"
  },
  {
    id: "ember",
    label: "Ember amber",
    background: "#1c1208",
    sidebar: "rgba(43, 27, 12, 0.95)",
    border: "rgba(251, 191, 36, 0.18)",
    control: "rgba(43, 27, 12, 0.95)",
    preview: "linear-gradient(135deg, #1c1208, #b45309)",
    recommendedAccent: "amber"
  }
];

export function getBackgroundTheme(id: BackgroundThemeId) {
  return (
    BACKGROUND_THEMES.find((theme) => theme.id === id) ?? BACKGROUND_THEMES[0]
  );
}

export function applyBackground(background: BackgroundPreference) {
  if (typeof document === "undefined") {
    return;
  }

  const theme = getBackgroundTheme(background.theme);
  const root = document.documentElement;
  root.style.setProperty("--app-background-color", theme.background);
  root.style.setProperty("--app-sidebar-bg", theme.sidebar);
  root.style.setProperty("--app-sidebar-border", theme.border);
  root.style.setProperty("--app-control-bg", theme.control);
  root.style.setProperty(
    "--app-background-image",
    background.mode === "image" && background.imageDataUrl
      ? `url("${background.imageDataUrl}")`
      : "none"
  );
}
