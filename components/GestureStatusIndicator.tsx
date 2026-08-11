"use client";

import { useCuratoreGestures } from "@/context/GestureContext";

export function GestureStatusIndicator({
  className = "",
  variant = "player"
}: {
  className?: string;
  variant?: "global" | "player";
}) {
  const { cameraRunning, commandsActive } = useCuratoreGestures();
  if (!cameraRunning) {
    return null;
  }

  const label = commandsActive
    ? "Gesture controls active"
    : "Gesture controls inactive";
  const tip = commandsActive
    ? "Gesture controls active. Hold a closed fist to deactivate."
    : "Gesture controls inactive. Hold an open palm to activate.";

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center ${
        variant === "player" ? "gap-2" : ""
      } ${className}`}
      role="status"
      title={tip}
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full border border-black/20 shadow-sm ${
          commandsActive
            ? "bg-[var(--gesture-active)]"
            : "bg-[var(--gesture-inactive)]"
        }`}
      />
      {variant === "player" ? (
        <span className="text-[11px] font-medium text-[var(--theme-text-subtle)]">
          {commandsActive ? "Gestures active" : "Open palm to activate"}
        </span>
      ) : null}
    </span>
  );
}
