import type {
  BackgroundPreference,
  BackgroundThemeId,
  ThemePreference
} from "@/types";

export type ResolvedThemeMode = "light" | "dark";

type ThemeAnchors = {
  background: string;
  surface: string;
  accent: string;
};

export type ThemeTokens = {
  background: string;
  sidebar: string;
  control: string;
  surface: string;
  surfaceRaised: string;
  surfaceSubtle: string;
  surfaceHover: string;
  input: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSubtle: string;
  onAccent: string;
  focusRing: string;
  overlay: string;
  imageScrim: string;
  destructive: string;
  destructiveHover: string;
  destructiveSoft: string;
};

export type BackgroundTheme = {
  id: BackgroundThemeId;
  label: string;
  description: string;
  section: "current" | "new";
  dark: ThemeTokens;
  light: ThemeTokens;
};

type ThemeDefinition = Omit<BackgroundTheme, "dark" | "light"> & {
  dark: ThemeAnchors;
  light: ThemeAnchors;
};

const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: "midnight",
    label: "Midnight cyan",
    description: "True black, soft charcoal, and crisp cyan.",
    section: "current",
    dark: {
      background: "#0a0a0a",
      surface: "#171717",
      accent: "#22d3ee"
    },
    light: {
      background: "#f2f8fa",
      surface: "#ffffff",
      accent: "#0e7490"
    }
  },
  {
    id: "graphite",
    label: "Graphite slate",
    description: "Restrained neutral layers with a cool slate accent.",
    section: "current",
    dark: {
      background: "#18181b",
      surface: "#27272a",
      accent: "#cbd5e1"
    },
    light: {
      background: "#f4f4f5",
      surface: "#ffffff",
      accent: "#475569"
    }
  },
  {
    id: "deepSea",
    label: "Deep sea",
    description: "Blue-black depth with clear aquatic highlights.",
    section: "current",
    dark: {
      background: "#06131f",
      surface: "#081f2d",
      accent: "#22d3ee"
    },
    light: {
      background: "#eef8fb",
      surface: "#ffffff",
      accent: "#0e7490"
    }
  },
  {
    id: "forest",
    label: "Forest emerald",
    description: "Deep evergreen surfaces with lively emerald detail.",
    section: "current",
    dark: {
      background: "#071710",
      surface: "#0c2319",
      accent: "#34d399"
    },
    light: {
      background: "#f1f8f3",
      surface: "#ffffff",
      accent: "#047857"
    }
  },
  {
    id: "plum",
    label: "Plum violet",
    description: "Aubergine depth with a softened violet signal.",
    section: "current",
    dark: {
      background: "#170b1f",
      surface: "#241233",
      accent: "#a78bfa"
    },
    light: {
      background: "#faf5ff",
      surface: "#ffffff",
      accent: "#6d28d9"
    }
  },
  {
    id: "ember",
    label: "Ember amber",
    description: "Warm umber layers with a clear golden accent.",
    section: "current",
    dark: {
      background: "#1c1208",
      surface: "#2b1b0c",
      accent: "#fbbf24"
    },
    light: {
      background: "#fff8ed",
      surface: "#ffffff",
      accent: "#b45309"
    }
  },
  {
    id: "polarNight",
    label: "Polar night",
    description: "Inky navy and ice blue in a calm analogous pairing.",
    section: "new",
    dark: {
      background: "#08111f",
      surface: "#101c2c",
      accent: "#7dd3fc"
    },
    light: {
      background: "#f4f8fc",
      surface: "#ffffff",
      accent: "#0369a1"
    }
  },
  {
    id: "rosewoodGold",
    label: "Rosewood gold",
    description: "Rich burgundy neutrals balanced by restrained gold.",
    section: "new",
    dark: {
      background: "#1a0d13",
      surface: "#2a151f",
      accent: "#fde68a"
    },
    light: {
      background: "#fff7f8",
      surface: "#ffffff",
      accent: "#92400e"
    }
  },
  {
    id: "mossLinen",
    label: "Moss & linen",
    description: "Organic olive depth with a clean botanical highlight.",
    section: "new",
    dark: {
      background: "#10150e",
      surface: "#1b2417",
      accent: "#bef264"
    },
    light: {
      background: "#f7f8f2",
      surface: "#ffffff",
      accent: "#4d7c0f"
    }
  },
  {
    id: "cobaltTangerine",
    label: "Cobalt tangerine",
    description: "Cool cobalt structure energized by warm orange.",
    section: "new",
    dark: {
      background: "#0c1024",
      surface: "#151b36",
      accent: "#fdba74"
    },
    light: {
      background: "#f6f7fc",
      surface: "#ffffff",
      accent: "#9a3412"
    }
  },
  {
    id: "lavenderSteel",
    label: "Lavender steel",
    description: "Soft violet set against cool, composed neutrals.",
    section: "new",
    dark: {
      background: "#12111c",
      surface: "#201e2c",
      accent: "#c4b5fd"
    },
    light: {
      background: "#f8f7fc",
      surface: "#ffffff",
      accent: "#6d28d9"
    }
  },
  {
    id: "sepiaTeal",
    label: "Sepia teal",
    description: "Warm sepia surfaces with a complementary teal signal.",
    section: "new",
    dark: {
      background: "#17120f",
      surface: "#261d18",
      accent: "#5eead4"
    },
    light: {
      background: "#faf7f2",
      surface: "#fffefc",
      accent: "#0f766e"
    }
  }
];

export const BACKGROUND_THEMES: BackgroundTheme[] = THEME_DEFINITIONS.map(
  (theme) => ({
    ...theme,
    dark: createThemeTokens("dark", theme.dark),
    light: createThemeTokens("light", theme.light)
  })
);

export const BACKGROUND_THEME_IDS = BACKGROUND_THEMES.map(
  (theme) => theme.id
);

const TOKEN_PROPERTIES: Record<keyof ThemeTokens, string> = {
  background: "--theme-background",
  sidebar: "--theme-sidebar",
  control: "--theme-control",
  surface: "--theme-surface",
  surfaceRaised: "--theme-surface-raised",
  surfaceSubtle: "--theme-surface-subtle",
  surfaceHover: "--theme-surface-hover",
  input: "--theme-input",
  border: "--theme-border",
  borderStrong: "--theme-border-strong",
  text: "--theme-text",
  textMuted: "--theme-text-muted",
  textSubtle: "--theme-text-subtle",
  accent: "--theme-accent",
  accentHover: "--theme-accent-hover",
  accentSoft: "--theme-accent-soft",
  accentSubtle: "--theme-accent-subtle",
  onAccent: "--theme-on-accent",
  focusRing: "--theme-focus-ring",
  overlay: "--theme-overlay",
  imageScrim: "--theme-image-scrim",
  destructive: "--theme-destructive",
  destructiveHover: "--theme-destructive-hover",
  destructiveSoft: "--theme-destructive-soft"
};

export function getBackgroundTheme(id: BackgroundThemeId) {
  return (
    BACKGROUND_THEMES.find((theme) => theme.id === id) ?? BACKGROUND_THEMES[0]
  );
}

export function getThemeTokens(
  id: BackgroundThemeId,
  mode: ResolvedThemeMode
) {
  return getBackgroundTheme(id)[mode];
}

export function getThemePreview(
  id: BackgroundThemeId,
  mode: ResolvedThemeMode
) {
  const tokens = getThemeTokens(id, mode);
  return `linear-gradient(135deg, ${tokens.background}, ${tokens.surface} 58%, ${tokens.accent})`;
}

export function resolveThemeMode(
  preference: ThemePreference
): ResolvedThemeMode {
  if (
    preference === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia
  ) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return preference === "light" ? "light" : "dark";
}

export function applyAppearance(
  preference: ThemePreference,
  background: BackgroundPreference
) {
  if (typeof document === "undefined") {
    return "dark" as const;
  }

  const resolvedMode = resolveThemeMode(preference);
  const root = document.documentElement;
  root.dataset.curatoreTheme = "true";
  root.dataset.mode = resolvedMode;
  root.dataset.shellTheme = background.theme;
  root.classList.toggle("dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;

  root.style.setProperty(
    "--app-background-image",
    background.mode === "image" && background.imageDataUrl
      ? `var(--theme-image-scrim), url(${JSON.stringify(
          background.imageDataUrl
        )})`
      : "none"
  );

  return resolvedMode;
}

export function createThemeStyleSheet() {
  return BACKGROUND_THEMES.flatMap((theme) =>
    (["dark", "light"] as const).map((mode) => {
      const declarations = Object.entries(theme[mode])
        .map(
          ([key, value]) =>
            `${TOKEN_PROPERTIES[key as keyof ThemeTokens]}:${value}`
        )
        .join(";");

      return `html[data-shell-theme="${theme.id}"][data-mode="${mode}"]{${declarations}}`;
    })
  ).join("");
}

export function createThemeBootstrapScript() {
  const themeIds = JSON.stringify(BACKGROUND_THEME_IDS);

  return `(()=>{try{const r=document.documentElement,ids=${themeIds};const read=(key,legacy)=>localStorage.getItem(key)??localStorage.getItem(legacy);const pref=read("curatore.theme","ontrack.theme");const preference=pref==="light"||pref==="dark"||pref==="system"?pref:"dark";const mode=preference==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):preference;let background={mode:"theme",theme:"midnight"};const raw=read("curatore.background","ontrack.background");if(raw){try{const value=JSON.parse(raw);if((value.mode==="theme"||value.mode==="image")&&ids.includes(value.theme)){background=value}}catch{}}r.dataset.curatoreTheme="true";r.dataset.mode=mode;r.dataset.shellTheme=background.theme;r.classList.toggle("dark",mode==="dark");r.style.colorScheme=mode;if(background.mode==="image"&&typeof background.imageDataUrl==="string"&&background.imageDataUrl.startsWith("data:image/")){r.style.setProperty("--app-background-image","var(--theme-image-scrim), url("+JSON.stringify(background.imageDataUrl)+")")}}catch{}})();`;
}

function createThemeTokens(
  mode: ResolvedThemeMode,
  anchors: ThemeAnchors
): ThemeTokens {
  const isDark = mode === "dark";
  const text = isDark ? "#f8fafc" : "#18181b";
  const accentHover = mix(
    anchors.accent,
    isDark ? "#ffffff" : "#000000",
    0.13
  );

  return {
    background: anchors.background,
    sidebar: mix(anchors.surface, anchors.accent, isDark ? 0.025 : 0.04),
    control: rgba(anchors.surface, isDark ? 0.96 : 0.97),
    surface: anchors.surface,
    surfaceRaised: mix(
      anchors.surface,
      isDark ? "#ffffff" : anchors.accent,
      isDark ? 0.05 : 0.018
    ),
    surfaceSubtle: mix(
      isDark ? anchors.surface : anchors.background,
      isDark ? "#ffffff" : anchors.accent,
      isDark ? 0.027 : 0.035
    ),
    surfaceHover: mix(
      isDark ? anchors.surface : anchors.background,
      anchors.accent,
      isDark ? 0.12 : 0.1
    ),
    input: mix(
      isDark ? anchors.surface : anchors.background,
      "#ffffff",
      isDark ? 0.045 : 0.6
    ),
    border: mix(anchors.surface, text, isDark ? 0.15 : 0.14),
    borderStrong: mix(anchors.surface, text, isDark ? 0.43 : 0.5),
    text,
    textMuted: isDark ? "#d4d4d8" : "#52525b",
    textSubtle: isDark ? "#a1a1aa" : "#71717a",
    accent: anchors.accent,
    accentHover,
    accentSoft: rgba(anchors.accent, isDark ? 0.17 : 0.13),
    accentSubtle: rgba(anchors.accent, isDark ? 0.09 : 0.075),
    onAccent: bestContrastingText(anchors.accent),
    focusRing: rgba(anchors.accent, isDark ? 0.42 : 0.34),
    overlay: isDark ? "rgba(0, 0, 0, 0.76)" : "rgba(9, 9, 11, 0.58)",
    imageScrim: isDark
      ? "linear-gradient(rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.72))"
      : "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.78))",
    destructive: isDark ? "#f87171" : "#b91c1c",
    destructiveHover: isDark ? "#fca5a5" : "#991b1b",
    destructiveSoft: isDark
      ? "rgba(239, 68, 68, 0.16)"
      : "rgba(185, 28, 28, 0.1)"
  };
}

function rgba(hex: string, alpha: number) {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mix(first: string, second: string, amount: number) {
  const from = hexToRgb(first);
  const to = hexToRgb(second);
  const result = from.map((value, index) =>
    Math.round(value * (1 - amount) + to[index] * amount)
  );
  return rgbToHex(result);
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16)
  );
}

function rgbToHex(rgb: number[]) {
  return `#${rgb
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function bestContrastingText(background: string) {
  const rgb = hexToRgb(background);
  const blackContrast = contrastRatio(rgb, [9, 9, 11]);
  const whiteContrast = contrastRatio(rgb, [255, 255, 255]);
  return blackContrast >= whiteContrast ? "#09090b" : "#ffffff";
}

function contrastRatio(first: number[], second: number[]) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance(rgb: number[]) {
  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
