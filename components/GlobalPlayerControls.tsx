"use client";

import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, type FocusEvent, type ReactNode } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { GestureStatusIndicator } from "@/components/GestureStatusIndicator";

type GlobalPlayerControlsProps = {
  isPlayerRoute: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
};

export function GlobalPlayerControls({
  isPlayerRoute,
  leftOpen,
  rightOpen
}: GlobalPlayerControlsProps) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const {
    currentVideo,
    isPlaying,
    next,
    playerReady,
    previous,
    repeat,
    shuffle,
    togglePlayback,
    toggleRepeat,
    toggleShuffle
  } = usePlayer();

  const controlsColumnClass = useMemo(() => {
    const left = leftOpen ? "lg:pl-[332px]" : "lg:pl-8";
    const right = rightOpen ? "lg:pr-[332px]" : "lg:pr-8";
    return `${left} ${right}`;
  }, [leftOpen, rightOpen]);

  function handleTogglePlayback() {
    if (!currentVideo || !playerReady) {
      return;
    }

    togglePlayback();
  }

  function handleControlsBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setControlsOpen(false);
    }
  }

  return (
    <>
      <section
        aria-label="Global playback controls"
        className="theme-control fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-soft-dark backdrop-blur lg:hidden"
      >
        {!isPlayerRoute ? (
          <GestureStatusIndicator
            className="absolute left-4 top-1/2 -translate-y-1/2"
            variant="global"
          />
        ) : null}
        <div className="mx-auto flex max-w-md items-center justify-center gap-1">
          <ControlButton
            active={shuffle}
            label="Toggle shuffle"
            onClick={toggleShuffle}
          >
            <Shuffle aria-hidden="true" className="h-5 w-5" />
          </ControlButton>
          <ControlButton
            disabled={!currentVideo}
            label="Previous video"
            onClick={previous}
          >
            <SkipBack aria-hidden="true" className="h-5 w-5" />
          </ControlButton>
          <button
            aria-label={
              !playerReady
                ? "Player loading"
                : isPlaying
                  ? "Pause video"
                  : "Play video"
            }
            className={`mx-1 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-subtle)] transition hover:text-accent-strong active:text-accent-strong disabled:opacity-50 ${
              isPlaying ? "text-accent-strong" : "text-[var(--theme-text)]"
            }`}
            disabled={!currentVideo || !playerReady}
            onClick={handleTogglePlayback}
            type="button"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="h-6 w-6" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 h-6 w-6" />
            )}
          </button>
          <ControlButton
            disabled={!currentVideo}
            label="Next video"
            onClick={next}
          >
            <SkipForward aria-hidden="true" className="h-5 w-5" />
          </ControlButton>
          <ControlButton active={repeat} label="Toggle repeat" onClick={toggleRepeat}>
            <Repeat aria-hidden="true" className="h-5 w-5" />
          </ControlButton>
        </div>
      </section>

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden px-4 transition-all duration-[800ms] sm:px-6 lg:block ${controlsColumnClass}`}
      >
        <div
          className="pointer-events-auto mx-auto flex h-28 w-full max-w-5xl items-end justify-center"
          data-sidebar-toggle-background
          onBlur={handleControlsBlur}
          onFocusCapture={() => setControlsOpen(true)}
          onMouseEnter={() => setControlsOpen(true)}
          onMouseLeave={() => setControlsOpen(false)}
        >
          <motion.section
            animate={{ y: controlsOpen ? "0%" : "84%" }}
            aria-label="Global playback controls"
            className="theme-control pointer-events-auto relative rounded-t-2xl border-b-0 p-3 shadow-soft-dark backdrop-blur"
            data-sidebar-toggle-content
            initial={false}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {!isPlayerRoute ? (
              <GestureStatusIndicator
                className="absolute right-2 top-2"
                variant="global"
              />
            ) : null}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-1 w-12 -translate-x-1/2 rounded-full bg-zinc-500/70"
            />
            <div className="flex items-center justify-center gap-2">
            <ControlButton
              active={shuffle}
              label="Toggle shuffle"
              onClick={toggleShuffle}
            >
              <Shuffle aria-hidden="true" className="h-5 w-5" />
            </ControlButton>
            <ControlButton
              disabled={!currentVideo}
              label="Previous video"
              onClick={previous}
            >
              <SkipBack aria-hidden="true" className="h-5 w-5" />
            </ControlButton>
            <button
              aria-label={
                !playerReady
                  ? "Player loading"
                  : isPlaying
                    ? "Pause video"
                    : "Play video"
              }
              className={`flex h-12 w-12 items-center justify-center rounded-full transition hover:text-accent-strong active:text-accent-strong disabled:opacity-50 ${
                isPlaying
                  ? "text-accent-strong"
                  : "text-[var(--theme-text)]"
              }`}
              disabled={!currentVideo || !playerReady}
              onClick={handleTogglePlayback}
              type="button"
            >
              {isPlaying ? (
                <Pause aria-hidden="true" className="h-6 w-6" />
              ) : (
                <Play aria-hidden="true" className="ml-0.5 h-6 w-6" />
              )}
            </button>
            <ControlButton
              disabled={!currentVideo}
              label="Next video"
              onClick={next}
            >
              <SkipForward aria-hidden="true" className="h-5 w-5" />
            </ControlButton>
            <ControlButton active={repeat} label="Toggle repeat" onClick={toggleRepeat}>
              <Repeat aria-hidden="true" className="h-5 w-5" />
            </ControlButton>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}

function ControlButton({
  active,
  children,
  disabled,
  label,
  onClick
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`rounded-full p-3 transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "text-accent-strong"
          : "text-[var(--theme-text-muted)] hover:text-accent-strong active:text-accent-strong"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
