"use client";

import { Check, ImagePlus, Moon, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ACCENT_PRESETS, applyAccent } from "@/lib/accent";
import { applyBackground, BACKGROUND_THEMES } from "@/lib/background";
import {
  DEFAULT_BACKGROUND,
  readStoredBackground,
  readStoredAccent,
  readStoredTheme,
  writeStoredBackground,
  writeStoredAccent,
  writeStoredTheme
} from "@/lib/storage";
import type {
  AccentPreference,
  BackgroundPreference,
  ThemePreference
} from "@/types";

export default function SettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [accent, setAccent] = useState<AccentPreference>("cyan");
  const [background, setBackground] =
    useState<BackgroundPreference>(DEFAULT_BACKGROUND);

  useEffect(() => {
    setTheme(readStoredTheme() ?? "dark");
    setAccent(readStoredAccent() ?? "cyan");
    setBackground(readStoredBackground());
  }, []);

  function applyTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    writeStoredTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  function applyAccentPreference(nextAccent: AccentPreference) {
    setAccent(nextAccent);
    writeStoredAccent(nextAccent);
    applyAccent(nextAccent);
  }

  function applyBackgroundPreference(nextBackground: BackgroundPreference) {
    setBackground(nextBackground);
    writeStoredBackground(nextBackground);
    applyBackground(nextBackground);
  }

  function applyBackgroundTheme(nextTheme: BackgroundPreference["theme"]) {
    const themePreset = BACKGROUND_THEMES.find((preset) => preset.id === nextTheme);
    applyBackgroundPreference({
      ...background,
      mode: background.imageDataUrl ? "image" : "theme",
      theme: nextTheme
    });

    if (themePreset) {
      applyAccentPreference(themePreset.recommendedAccent);
    }
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
    <section className="space-y-8">
      <div>
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
          Settings
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
          Preferences
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
          Appearance preferences are stored locally and applied globally across the app shell.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
          Shell theme
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Choose a coordinated background, sidebar, and control surface palette.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BACKGROUND_THEMES.map((preset) => (
            <button
              aria-pressed={background.theme === preset.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                background.theme === preset.id
                  ? "border-accent text-accent-strong"
                  : "border-zinc-200 text-zinc-700 hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white/10 dark:text-zinc-300"
              }`}
              key={preset.id}
              onClick={() => applyBackgroundTheme(preset.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10"
                style={{ background: preset.preview }}
              >
                {background.theme === preset.id ? (
                  <Check aria-hidden="true" className="h-5 w-5 text-white" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{preset.label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Pairs with {preset.recommendedAccent}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <ImagePlus
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-accent-strong"
                />
                <p className="font-semibold text-zinc-950 dark:text-white">
                  Background image
                </p>
              </div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Choose a local image to cover the page background while keeping the selected sidebar theme.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-accent hover:text-accent-strong dark:border-white/10 dark:text-zinc-300">
                  <ImagePlus aria-hidden="true" className="h-4 w-4" />
                  Upload image
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
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white/10 dark:text-zinc-300"
                    onClick={clearBackgroundImage}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                    Clear image
                  </button>
                ) : null}
              </div>
            </div>
            <div
              aria-hidden="true"
              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-cover bg-center dark:border-white/10"
              style={{
                backgroundImage:
                  background.mode === "image" && background.imageDataUrl
                    ? `url("${background.imageDataUrl}")`
                    : BACKGROUND_THEMES.find(
                        (preset) => preset.id === background.theme
                      )?.preview
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
          Appearance
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Choose the interface mode that fits your listening environment.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ThemeButton
            active={theme === "dark"}
            icon={<Moon aria-hidden="true" className="h-5 w-5" />}
            label="Dark mode"
            onClick={() => applyTheme("dark")}
          />
          <ThemeButton
            active={theme === "light"}
            icon={<Sun aria-hidden="true" className="h-5 w-5" />}
            label="Light mode"
            onClick={() => applyTheme("light")}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
          Accent color
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This controls highlighted text, active icons, focus rings, and soft icon backgrounds.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              aria-pressed={accent === preset.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                accent === preset.id
                  ? "border-accent text-accent-strong"
                  : "border-zinc-200 text-zinc-700 hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white/10 dark:text-zinc-300"
              }`}
              key={preset.id}
              onClick={() => applyAccentPreference(preset.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: preset.soft,
                  color: preset.base
                }}
              >
                {accent === preset.id ? (
                  <Check aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: preset.base }}
                  />
                )}
              </span>
              <span className="font-semibold">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThemeButton({
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
      className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
        active
          ? "border-accent text-accent-strong"
          : "border-zinc-200 text-zinc-700 hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white/10 dark:text-zinc-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
  );
}
