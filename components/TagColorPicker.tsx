"use client";

import { Check } from "lucide-react";
import { TAG_COLOR_OPTIONS } from "@/lib/tags";
import type { TagColor } from "@/types";

export function TagColorPicker({
  disabled = false,
  onChange,
  value
}: {
  disabled?: boolean;
  onChange: (color: TagColor) => void;
  value: TagColor;
}) {
  const selectedLabel =
    TAG_COLOR_OPTIONS.find((option) => option.color === value)?.label ??
    "Theme";

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Tag color</legend>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        Color
        <span className="ml-1.5 normal-case tracking-normal text-zinc-500 dark:text-zinc-300">
          {selectedLabel}
        </span>
      </p>
      <div className="flex items-center gap-1.5">
        {TAG_COLOR_OPTIONS.map((option) => {
          const selected = option.color === value;
          return (
            <button
              aria-label={`${option.label} tag color`}
              aria-pressed={selected}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "ring-2 ring-[var(--accent)]"
                  : "hover:ring-2 hover:ring-zinc-400/40"
              }`}
              key={option.color}
              onClick={() => onChange(option.color)}
              title={option.label}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`h-5 w-5 rounded-full ${option.swatchClassName}`}
              />
              {selected ? (
                <Check
                  aria-hidden="true"
                  className="absolute h-3 w-3 text-white drop-shadow"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
