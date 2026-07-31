"use client";

import {
  ExternalLink,
  ListMusic,
  MoreHorizontal,
  Repeat2
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SegmentedStarRating } from "@/components/SegmentedStarRating";
import { SongControlButton } from "@/components/SongControlButton";
import { SongQuickTagExperiment } from "@/components/SongQuickTagExperiment";
import type { SongMetadata, TagDefinition, VideoItem } from "@/types";

type OpenControl = "frequency" | "rating" | "more" | null;

type PlayerSongControlsProps = {
  frequency: number;
  metadata: SongMetadata;
  onSaveFrequency: (frequency: number) => void;
  onSaveMetadata: (metadata: SongMetadata) => void;
  playlistId?: string;
  song: VideoItem;
  tagDefinitions: TagDefinition[];
};

export function PlayerSongControls({
  frequency,
  metadata,
  onSaveFrequency,
  onSaveMetadata,
  playlistId,
  song,
  tagDefinitions
}: PlayerSongControlsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openControl, setOpenControl] = useState<OpenControl>(null);

  useEffect(() => {
    if (!openControl) {
      return;
    }

    function closeOnOutsidePress(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpenControl(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenControl(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [openControl]);

  return (
    <div className="flex min-h-10 flex-wrap items-start gap-2" ref={rootRef}>
      <SongQuickTagExperiment
        controlKey={`${song.id}:player-tags`}
        interactionId={`${song.id}:player`}
        keywords={metadata.keywords}
        layout="player"
        onFloatingStateChange={() => undefined}
        onOpenQuick={() => setOpenControl(null)}
        onSaveTags={(keywords) =>
          onSaveMetadata({
            ...metadata,
            keywords
          })
        }
        selectedTag={null}
        showDetailed={false}
        songTitle={song.title}
        tagDefinitions={tagDefinitions}
      />

      <div className="ml-auto flex shrink-0 items-start gap-1">
        <div className="relative">
          <SongControlButton
            aria-expanded={openControl === "frequency"}
            aria-label={`Set play frequency for ${song.title}`}
            onClick={() =>
              setOpenControl((current) =>
                current === "frequency" ? null : "frequency"
              )
            }
          >
            {frequency === 1 ? (
              <Repeat2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <span className="text-sm font-medium">{frequency}x</span>
            )}
          </SongControlButton>
          {openControl === "frequency" ? (
            <ValueMenu
              ariaLabel="Set Frequency"
              onSelect={(value) => {
                onSaveFrequency(value);
                setOpenControl(null);
              }}
              selected={frequency}
              suffix="x"
            />
          ) : null}
        </div>

        <div className="relative">
          <SongControlButton
            aria-expanded={openControl === "rating"}
            aria-label={`Rate ${song.title}: ${metadata.rating ?? 0} out of 5`}
            onClick={() =>
              setOpenControl((current) =>
                current === "rating" ? null : "rating"
              )
            }
          >
            <SegmentedStarRating
              className="h-[1.125rem] w-[1.125rem] shrink-0"
              onSelect={(rating) =>
                onSaveMetadata({
                  ...metadata,
                  rating
                })
              }
              rating={metadata.rating}
            />
          </SongControlButton>
          {openControl === "rating" ? (
            <ValueMenu
              ariaLabel="Set Rating"
              onSelect={(rating) => {
                onSaveMetadata({
                  ...metadata,
                  rating
                });
                setOpenControl(null);
              }}
              selected={metadata.rating}
            />
          ) : null}
        </div>

        <div className="relative">
          <SongControlButton
            aria-expanded={openControl === "more"}
            aria-label={`More actions for ${song.title}`}
            onClick={() =>
              setOpenControl((current) =>
                current === "more" ? null : "more"
              )
            }
            tone="neutral"
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </SongControlButton>
          {openControl === "more" ? (
            <div
              aria-label="Song actions"
              className="theme-menu absolute right-0 top-[calc(100%+0.35rem)] z-[90] w-56 rounded-xl p-2 backdrop-blur-xl"
              role="menu"
            >
              {playlistId ? (
                <Link
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5"
                  href={`/playlists/${encodeURIComponent(playlistId)}`}
                  onClick={() => setOpenControl(null)}
                  role="menuitem"
                >
                  <ListMusic aria-hidden="true" className="h-4 w-4" />
                  Open playlist
                </Link>
              ) : null}
              <a
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5"
                href={`https://www.youtube.com/watch?v=${encodeURIComponent(song.id)}`}
                rel="noreferrer"
                role="menuitem"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                Open on YouTube
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ValueMenu({
  ariaLabel,
  onSelect,
  selected,
  suffix = ""
}: {
  ariaLabel: string;
  onSelect: (value: number) => void;
  selected?: number;
  suffix?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="theme-menu absolute left-1/2 top-[calc(100%+0.35rem)] z-[90] w-[4.25rem] -translate-x-1/2 overflow-hidden rounded-xl p-1 text-left backdrop-blur-xl"
      role="group"
    >
      {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
        <button
          aria-pressed={selected === value}
          className={`h-8 w-full rounded-lg border px-1.5 text-xs font-semibold transition ${
            selected === value
              ? "border-[var(--accent)] bg-accent-soft text-accent-strong"
              : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
          }`}
          key={value}
          onClick={() => onSelect(value)}
          type="button"
        >
          {value}
          {suffix}
        </button>
      ))}
    </div>
  );
}
