"use client";

import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { Playlist } from "@/types";

export default function EditPlaylistPage() {
  const router = useRouter();
  const params = useParams<{ playlistId: string }>();
  const {
    allPlaylists,
    loadPlaylist,
    playlistsLoaded,
    removePlaylistVideo,
    updatePlaylistVideo
  } = usePlayer();
  const playlistId = decodeURIComponent(params.playlistId);
  const playlist = useMemo(
    () => allPlaylists.find((item) => item.id === playlistId) ?? null,
    [allPlaylists, playlistId]
  );

  function handleLoad(currentPlaylist: Playlist) {
    loadPlaylist(currentPlaylist);
    router.push("/player");
  }

  if (!playlistsLoaded) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading playlist...</p>
      </section>
    );
  }

  if (!playlist) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <button
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-accent-strong active:text-accent-strong dark:text-zinc-300"
          onClick={() => router.push("/playlists")}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to playlists
        </button>
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
            Playlist not found
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            This playlist is not available in local storage.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0">
          <button
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-accent-strong active:text-accent-strong dark:text-zinc-300"
            onClick={() => router.push("/playlists")}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to playlists
          </button>
          <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
            Edit Playlist
          </p>
          <h1 className="mt-3 line-clamp-2 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
            {playlist.name}
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            Remove songs from this playlist. Changes are stored locally.
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-950 px-5 py-3 font-semibold text-zinc-950 transition hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white dark:text-white"
          onClick={() => handleLoad(playlist)}
          type="button"
        >
          <Play aria-hidden="true" className="h-5 w-5" />
          Load playlist
        </button>
      </div>

      {playlist.videos.length > 0 ? (
        <div className="space-y-3">
          {playlist.videos.map((video) => (
            <div
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900 md:flex-row md:items-center"
              key={`${video.id}-${video.title}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <img
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-lg object-cover"
                  src={video.thumbnailUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-950 dark:text-white">
                    {video.title}
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {video.channelTitle}
                  </p>
                  {video.duration ? (
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      {video.duration}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-end gap-2 md:shrink-0">
                <TrimInput
                  label="Start"
                  onChange={(value) =>
                    updatePlaylistVideo(playlist.id, video.id, {
                      startSeconds: value
                    })
                  }
                  value={video.startSeconds}
                />
                <TrimInput
                  label="End"
                  onChange={(value) =>
                    updatePlaylistVideo(playlist.id, video.id, {
                      endSeconds: value
                    })
                  }
                  value={video.endSeconds}
                />
                <button
                  aria-label={`Remove ${video.title}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:text-accent-strong active:text-accent-strong dark:text-zinc-400"
                  onClick={() => removePlaylistVideo(playlist.id, video.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
            No songs left
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            This playlist is empty after your edits.
          </p>
        </div>
      )}
    </section>
  );
}

function TrimInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: number | undefined) => void;
  value?: number;
}) {
  const [draftValue, setDraftValue] = useState(formatTrimTime(value));

  useEffect(() => {
    setDraftValue(formatTrimTime(value));
  }, [value]);

  function commitValue(rawValue: string) {
    const nextValue = parseTrimTime(rawValue);
    onChange(nextValue);
    setDraftValue(formatTrimTime(nextValue));
  }

  return (
    <label className="block w-20">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <input
        aria-label={`${label} time`}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none transition focus:border-accent focus:ring-4 focus:ring-[var(--accent-ring)] dark:border-white/10 dark:bg-neutral-950 dark:text-white"
        inputMode="decimal"
        onBlur={(event) => commitValue(event.target.value)}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        placeholder="0:00"
        type="text"
        value={draftValue}
      />
    </label>
  );
}

function parseTrimTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parts = trimmed.split(/[:.]/);
  if (parts.length === 1) {
    const seconds = Number(parts[0]);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : undefined;
  }

  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      minutes >= 0 &&
      seconds >= 0 &&
      seconds < 60
    ) {
      return Math.floor(minutes * 60 + seconds);
    }
  }

  return undefined;
}

function formatTrimTime(value?: number) {
  if (value === undefined) {
    return "";
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
