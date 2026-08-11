"use client";

import { Disc3, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { MarqueeText } from "@/components/MarqueeText";
import { PlayerSongControls } from "@/components/PlayerSongControls";
import { usePlayer } from "@/context/PlayerContext";

export default function PlayerPage() {
  const {
    currentVideo,
    isPlaying,
    queue,
    selectedPlaylist,
    setPlaylistVideoFrequency,
    songMetadata,
    tagDefinitions,
    updateSongMetadata
  } = usePlayer();
  const metadata = currentVideo
    ? (songMetadata[currentVideo.id] ?? { keywords: [] })
    : null;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="space-y-4">
        <h1 className="max-w-full text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          <MarqueeText
            isPlaying={isPlaying}
            text={currentVideo?.title ?? "Load a playlist to begin"}
            trigger={currentVideo ? "auto" : "static"}
          />
        </h1>
        {currentVideo && metadata ? (
          <PlayerSongControls
            frequency={currentVideo.playFrequency ?? 1}
            metadata={metadata}
            onSaveFrequency={(frequency) => {
              if (selectedPlaylist) {
                setPlaylistVideoFrequency(
                  selectedPlaylist.id,
                  [currentVideo.id],
                  frequency
                );
              }
            }}
            onSaveMetadata={(nextMetadata) =>
              updateSongMetadata(currentVideo.id, nextMetadata)
            }
            playlistId={selectedPlaylist?.id}
            song={currentVideo}
            tagDefinitions={tagDefinitions}
          />
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <InfoCard
              icon={<Radio aria-hidden="true" className="h-4 w-4" />}
              label="Channel"
              value={currentVideo?.channelTitle ?? "Waiting for playlist"}
            />
            <InfoCard
              icon={<Disc3 aria-hidden="true" className="h-4 w-4" />}
              label="Playlist"
              value={selectedPlaylist?.name ?? "No playlist selected"}
            />
          </div>
          <div className="theme-control shrink-0 rounded-full px-4 py-2 text-sm shadow-sm">
            {queue.length} {queue.length === 1 ? "video" : "videos"} in queue
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="theme-panel flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-white">
          {value}
        </p>
      </div>
      <div className="bg-accent-soft text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        {icon}
      </div>
    </div>
  );
}
