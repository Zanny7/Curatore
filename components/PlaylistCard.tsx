"use client";

import { Pencil } from "lucide-react";
import type { Playlist } from "@/types";

type PlaylistCardProps = {
  playlist: Playlist;
  onEdit: (playlist: Playlist) => void;
  onLoad: (playlist: Playlist) => void;
};

export function PlaylistCard({ playlist, onEdit, onLoad }: PlaylistCardProps) {
  return (
    <article className="group grid min-w-0 grid-rows-[auto_3.75rem] text-left">
      <button
        className="block min-w-0 text-left"
        onClick={() => onLoad(playlist)}
        type="button"
      >
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-accent dark:border-white/10 dark:bg-neutral-800">
          <img
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            src={playlist.thumbnailUrl}
          />
        </div>
      </button>
      <div className="mt-3 flex min-w-0 items-start gap-3 overflow-hidden text-left">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onLoad(playlist)}
          type="button"
        >
          <h2 className="playlist-card-text line-clamp-2 text-lg font-bold leading-6 text-zinc-950 transition dark:text-white">
            {playlist.name}
          </h2>
        </button>
        <button
          aria-label={`Edit ${playlist.name}`}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:text-accent-strong active:text-accent-strong dark:text-zinc-400"
          onClick={() => onEdit(playlist)}
          type="button"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
