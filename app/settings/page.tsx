"use client";

import {
  Camera,
  Check,
  Hand,
  ImagePlus,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyAppearance,
  BACKGROUND_THEMES,
  getThemePreview,
  resolveThemeMode,
  type BackgroundTheme,
  type ResolvedThemeMode
} from "@/lib/background";
import {
  DEFAULT_BACKGROUND,
  readStoredBackground,
  readStoredTheme,
  writeStoredBackground,
  writeStoredTheme
} from "@/lib/storage";
import type {
  BackgroundPreference,
  BackgroundThemeId,
  ThemePreference
} from "@/types";
import {
  type CameraGestureStatus,
  useCuratoreGestures
} from "@/context/GestureContext";

export default function SettingsPage() {
  const {
    cameraRunning,
    commandsActive,
    disable: disableWebcamGestures,
    enable: enableWebcamGestures,
    previewEnabled,
    requested: webcamRequested,
    setPreviewEnabled,
    status: webcamStatus
  } = useCuratoreGestures();
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [resolvedMode, setResolvedMode] =
    useState<ResolvedThemeMode>("dark");
  const [background, setBackground] =
    useState<BackgroundPreference>(DEFAULT_BACKGROUND);
  const [loaded, setLoaded] = useState(false);
  const currentThemes = useMemo(
    () => BACKGROUND_THEMES.filter((preset) => preset.section === "current"),
    []
  );
  const newThemes = useMemo(
    () => BACKGROUND_THEMES.filter((preset) => preset.section === "new"),
    []
  );

  useEffect(() => {
    setTheme(readStoredTheme() ?? "dark");
    setBackground(readStoredBackground());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const apply = () => {
      setResolvedMode(applyAppearance(theme, background));
    };

    apply();

    if (theme !== "system") {
      return;
    }

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", apply);
    return () => systemTheme.removeEventListener("change", apply);
  }, [background, loaded, theme]);

  function applyTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    setResolvedMode(resolveThemeMode(nextTheme));
    writeStoredTheme(nextTheme);
  }

  function applyBackgroundPreference(nextBackground: BackgroundPreference) {
    setBackground(nextBackground);
    writeStoredBackground(nextBackground);
  }

  function applyBackgroundTheme(nextTheme: BackgroundThemeId) {
    applyBackgroundPreference({
      ...background,
      mode: background.imageDataUrl ? "image" : "theme",
      theme: nextTheme
    });
  }

  function applyBackgroundImage(file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        return;
      }

      applyBackgroundPreference({
        ...background,
        mode: "image",
        imageDataUrl: reader.result
      });
    });
    reader.readAsDataURL(file);
  }

  function clearBackgroundImage() {
    applyBackgroundPreference({
      mode: "theme",
      theme: background.theme
    });
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          Preferences
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Choose a coordinated Curatore appearance. Preferences stay on this
          device and apply throughout the interface.
        </p>
      </header>

      <section className="theme-card rounded-xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Camera
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-accent-strong"
              />
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Webcam gesture controls
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Opt in for this browser session to control music with one hand.
              Curatore will not request camera permission until you enable it,
              and it starts disabled again after a full page reload.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="hidden text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:block">
              Enable webcam gestures
            </span>
            <button
              aria-checked={webcamRequested}
              aria-controls="webcam-gesture-details"
              aria-expanded={webcamRequested}
              aria-label="Enable webcam gestures"
              className={`relative h-7 w-12 rounded-full border transition ${
                webcamRequested
                  ? "border-accent bg-[var(--theme-accent)]"
                  : "border-[var(--theme-border-strong)] bg-[var(--theme-surface-subtle)]"
              }`}
              onClick={() => {
                if (webcamRequested) {
                  disableWebcamGestures();
                } else {
                  void enableWebcamGestures();
                }
              }}
              role="switch"
              type="button"
            >
              <span
                aria-hidden="true"
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  webcamRequested ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {webcamRequested ? (
          <div id="webcam-gesture-details">
            <div className="theme-panel mt-4 flex items-center justify-between gap-4 rounded-xl p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Show camera preview
                </p>
                <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  Development aid. Shows the existing local camera feed at the
                  bottom of the navigation sidebar for this session only.
                </p>
              </div>
              <button
                aria-checked={previewEnabled}
                aria-label="Show camera preview in navigation sidebar"
                className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  previewEnabled
                    ? "border-accent bg-[var(--theme-accent)]"
                    : "border-[var(--theme-border-strong)] bg-[var(--theme-surface-subtle)]"
                }`}
                disabled={!cameraRunning}
                onClick={() => setPreviewEnabled(!previewEnabled)}
                role="switch"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    previewEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div
              aria-live="polite"
              className="theme-panel mt-4 flex items-start gap-3 rounded-xl p-3"
              role="status"
            >
              <span
                aria-hidden="true"
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  webcamStatus === "enabled"
                    ? commandsActive
                      ? "bg-[var(--gesture-active)]"
                      : "bg-[var(--gesture-inactive)]"
                    : webcamStatus === "starting"
                      ? "bg-[var(--gesture-inactive)]"
                      : "bg-[var(--theme-text-subtle)]"
                }`}
              />
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                  {getWebcamStatusCopy(webcamStatus).title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {getWebcamStatusCopy(webcamStatus).description}
                  {webcamStatus === "enabled"
                    ? commandsActive
                      ? " Gesture commands are active."
                      : " Gesture commands are inactive."
                    : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="theme-panel rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
                  <Hand
                    aria-hidden="true"
                    className="h-4 w-4 text-accent-strong"
                  />
                  Gesture guide
                </div>
                <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  Hold an open palm to activate controls, then release it. Hold
                  a closed fist to deactivate. Pinch thumb and index finger to
                  play or pause. Hold one raised index finger for the previous
                  song, a two-finger victory sign for the next song, or three
                  raised fingers to show or hide both side panels.
                </p>
              </div>
              <div className="theme-panel rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-white">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4 text-accent-strong"
                  />
                  Local and private
                </div>
                <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  Recognition runs inside your browser. Curatore does not
                  record, upload, store, transmit, or log camera frames or hand
                  landmarks. Camera access requires HTTPS or localhost; a LAN
                  HTTP address may not be supported by your browser.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="theme-card rounded-xl p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
              Appearance
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Follow your device or choose a consistent light or dark mode.
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Showing {resolvedMode}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <AppearanceButton
            active={theme === "system"}
            icon={<Monitor aria-hidden="true" className="h-4 w-4" />}
            label="System"
            onClick={() => applyTheme("system")}
          />
          <AppearanceButton
            active={theme === "dark"}
            icon={<Moon aria-hidden="true" className="h-4 w-4" />}
            label="Dark"
            onClick={() => applyTheme("dark")}
          />
          <AppearanceButton
            active={theme === "light"}
            icon={<Sun aria-hidden="true" className="h-4 w-4" />}
            label="Light"
            onClick={() => applyTheme("light")}
          />
        </div>
      </section>

      <section className="theme-card rounded-xl p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
            Shell theme
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:text-sm">
            Each palette coordinates the canvas, sidebars, surfaces, controls,
            text, focus states, and accent in both modes.
          </p>
        </div>

        <ThemeSection
          background={background}
          mode={resolvedMode}
          onSelect={applyBackgroundTheme}
          themes={currentThemes}
          title="Current themes"
        />
        <ThemeSection
          background={background}
          mode={resolvedMode}
          onSelect={applyBackgroundTheme}
          themes={newThemes}
          title="New themes"
        />

        <div className="theme-panel mt-5 flex items-center gap-3 rounded-xl p-3">
          <div
            aria-hidden="true"
            className="theme-preview h-12 w-12 shrink-0 rounded-lg border border-[var(--theme-border)] bg-cover bg-center"
            style={{
              backgroundImage:
                background.mode === "image" && background.imageDataUrl
                  ? `url(${JSON.stringify(background.imageDataUrl)})`
                  : getThemePreview(background.theme, resolvedMode)
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ImagePlus
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-accent-strong"
              />
              <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                Background image
              </p>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Add a local image behind a readability-preserving theme scrim.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <label className="theme-button-secondary inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition">
              <ImagePlus aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Choose</span>
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  applyBackgroundImage(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
            {background.imageDataUrl ? (
              <button
                aria-label="Clear background image"
                className="theme-button-secondary flex h-9 w-9 items-center justify-center rounded-lg transition"
                onClick={clearBackgroundImage}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
}

function getWebcamStatusCopy(status: CameraGestureStatus) {
  const copy: Record<
    CameraGestureStatus,
    { description: string; title: string }
  > = {
    disabled: {
      title: "Webcam gestures off",
      description: "No camera access is active."
    },
    starting: {
      title: "Camera starting",
      description: "Waiting for camera permission and local gesture recognition."
    },
    enabled: {
      title: "Camera enabled",
      description: "Recognition is running locally in this browser session."
    },
    "permission-denied": {
      title: "Permission denied",
      description:
        "Camera access was blocked. Update this site's camera permission and try again."
    },
    "no-camera": {
      title: "No camera available",
      description: "No usable camera or browser camera API was found."
    },
    "insecure-context": {
      title: "Camera unavailable in this context",
      description:
        "Open Curatore over HTTPS or on localhost before enabling webcam gestures."
    },
    "device-error": {
      title: "Camera/device error",
      description:
        "The camera could not start or disconnected. Check that another app is not using it, then try again."
    },
    "model-error": {
      title: "Gesture-recognition/model error",
      description:
        "The local recognition model could not start. Disable and try again."
    }
  };
  return copy[status];
}

function ThemeSection({
  background,
  mode,
  onSelect,
  themes,
  title
}: {
  background: BackgroundPreference;
  mode: ResolvedThemeMode;
  onSelect: (theme: BackgroundThemeId) => void;
  themes: BackgroundTheme[];
  title: string;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((preset) => {
          const active = background.theme === preset.id;
          return (
            <button
              aria-pressed={active}
              className={`group flex min-h-14 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? "border-accent bg-accent-subtle text-accent-strong"
                  : "theme-button-secondary"
              }`}
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="theme-preview flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15"
                style={{ background: getThemePreview(preset.id, mode) }}
              >
                {active ? (
                  <Check aria-hidden="true" className="h-4 w-4 text-white" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {preset.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {preset.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppearanceButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
        active
          ? "border-accent bg-accent-subtle text-accent-strong"
          : "theme-button-secondary"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
