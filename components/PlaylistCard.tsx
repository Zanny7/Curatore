"use client";

import { ArrowUpRight, Play } from "lucide-react";
import type { Playlist } from "@/types";

type PlaylistCardProps = {
  playlist: Playlist;
  onOpen: (playlist: Playlist) => void;
  onPlay: (playlist: Playlist) => void;
};

export function PlaylistCard({ playlist, onOpen, onPlay }: PlaylistCardProps) {
  return (
    <article className="group min-w-0 text-left">
      <button
        className="media-on-dark relative block aspect-video w-full overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-subtle)] text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-xl"
        onClick={() => onOpen(playlist)}
        type="button"
      >
        <img
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={playlist.thumbnailUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10 opacity-80" />
        <div className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
          {playlist.videoCount} {playlist.videoCount === 1 ? "song" : "songs"}
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="absolute right-3 top-3 h-5 w-5 text-white opacity-0 transition group-hover:opacity-100"
        />
      </button>
      <div className="mt-3 flex min-w-0 items-start gap-2 text-left">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(playlist)}
          type="button"
        >
          <h2 className="playlist-card-text truncate text-base font-bold leading-6 text-zinc-950 transition dark:text-white">
            {playlist.name}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {playlist.source === "imported" ? "Imported playlist" : "My playlist"}
          </p>
        </button>
        <button
          aria-label={`Play ${playlist.name}`}
          className="theme-button-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition"
          disabled={playlist.videos.length === 0}
          onClick={() => onPlay(playlist)}
          type="button"
        >
          <Play aria-hidden="true" className="ml-0.5 h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
