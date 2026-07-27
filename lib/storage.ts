import type {
  AccentPreference,
  BackgroundPreference,
  BackgroundThemeId,
  Playlist,
  ThemePreference
} from "@/types";

const IMPORTED_PLAYLISTS_KEY = "curatore.importedPlaylists";
const THEME_KEY = "curatore.theme";
const ACCENT_KEY = "curatore.accent";
const BACKGROUND_KEY = "curatore.background";
const LEGACY_IMPORTED_PLAYLISTS_KEY = "ontrack.importedPlaylists";
const LEGACY_THEME_KEY = "ontrack.theme";
const LEGACY_ACCENT_KEY = "ontrack.accent";
const LEGACY_BACKGROUND_KEY = "ontrack.background";
export const DEFAULT_BACKGROUND: BackgroundPreference = {
  mode: "theme",
  theme: "midnight"
};
const BACKGROUND_THEMES: BackgroundThemeId[] = [
  "midnight",
  "graphite",
  "deepSea",
  "forest",
  "plum",
  "ember"
];
const ACCENTS: AccentPreference[] = [
  "cyan",
  "emerald",
  "violet",
  "rose",
  "amber",
  "slate"
];

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readStoredValue(key: string, legacyKey: string) {
  const currentValue = window.localStorage.getItem(key);
  if (currentValue !== null) {
    return currentValue;
  }

  const legacyValue = window.localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    window.localStorage.setItem(key, legacyValue);
  }

  return legacyValue;
}

export function readStoredPlaylists(): Playlist[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const value = readStoredValue(
      IMPORTED_PLAYLISTS_KEY,
      LEGACY_IMPORTED_PLAYLISTS_KEY
    );
    return value ? (JSON.parse(value) as Playlist[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredPlaylists(playlists: Playlist[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(IMPORTED_PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function readStoredTheme(): ThemePreference | null {
  if (!canUseStorage()) {
    return null;
  }

  const value = readStoredValue(THEME_KEY, LEGACY_THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function writeStoredTheme(theme: ThemePreference) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(THEME_KEY, theme);
}

export function readStoredAccent(): AccentPreference | null {
  if (!canUseStorage()) {
    return null;
  }

  const value = readStoredValue(ACCENT_KEY, LEGACY_ACCENT_KEY);
  return ACCENTS.includes(value as AccentPreference)
    ? (value as AccentPreference)
    : null;
}

export function writeStoredAccent(accent: AccentPreference) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCENT_KEY, accent);
}

function isBackgroundPreference(value: unknown): value is BackgroundPreference {
  if (!value || typeof value !== "object") {
    return false;
  }

  const background = value as Partial<BackgroundPreference>;
  const hasValidMode = background.mode === "theme" || background.mode === "image";
  const hasValidTheme = BACKGROUND_THEMES.includes(
    background.theme as BackgroundThemeId
  );
  const hasValidImage =
    background.imageDataUrl === undefined ||
    (typeof background.imageDataUrl === "string" &&
      background.imageDataUrl.startsWith("data:image/"));

  return hasValidMode && hasValidTheme && hasValidImage;
}

export function readStoredBackground(): BackgroundPreference {
  if (!canUseStorage()) {
    return DEFAULT_BACKGROUND;
  }

  try {
    const value = readStoredValue(BACKGROUND_KEY, LEGACY_BACKGROUND_KEY);
    if (!value) {
      return DEFAULT_BACKGROUND;
    }

    const parsed = JSON.parse(value) as unknown;
    return isBackgroundPreference(parsed) ? parsed : DEFAULT_BACKGROUND;
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

export function writeStoredBackground(background: BackgroundPreference) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(BACKGROUND_KEY, JSON.stringify(background));
  } catch {
    // Large uploaded images can exceed localStorage quota. Keep the current setting.
  }
}
