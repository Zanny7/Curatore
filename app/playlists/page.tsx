"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus } from "lucide-react";
import { PlaylistCard } from "@/components/PlaylistCard";
import { usePlayer } from "@/context/PlayerContext";
import type { Playlist } from "@/types";

export default function PlaylistsPage() {
  const router = useRouter();
  const { addImportedPlaylist, allPlaylists, loadPlaylist } = usePlayer();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !url.trim()) {
      setStatus("Add a playlist name and YouTube playlist URL.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/youtube/playlist", {
        body: JSON.stringify({ name, url }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const result = (await response.json()) as {
        playlist?: Playlist;
        error?: string;
      };

      if (!response.ok || !result.playlist) {
        throw new Error(result.error ?? "Unable to import playlist.");
      }

      const playlist = result.playlist;
      addImportedPlaylist(playlist);
      setName("");
      setUrl("");
      setStatus("Playlist imported. Real YouTube data is used when the API key can access the playlist.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import playlist.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLoad(playlist: Playlist) {
    loadPlaylist(playlist);
    router.push("/player");
  }

  function handleEdit(playlist: Playlist) {
    router.push(`/playlists/${encodeURIComponent(playlist.id)}/edit`);
  }

  return (
    <section className="space-y-10">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
            Playlists
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
            My Playlists
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
            Import YouTube playlists by URL. Curatore starts empty until you add one.
          </p>
        </div>
      </div>

      {allPlaylists.length > 0 ? (
        <div className="grid gap-x-9 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {allPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              onEdit={handleEdit}
              onLoad={handleLoad}
              playlist={playlist}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
            No playlists yet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Paste a YouTube playlist URL below to import your first playlist.
          </p>
        </div>
      )}

      <form
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900"
        onSubmit={handleSubmit}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="bg-accent-soft text-accent flex h-10 w-10 items-center justify-center rounded-full">
            <Link2 aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
              Add a playlist
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Imports run through a server route using `YOUTUBE_API_KEY`.
          </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Playlist name
            </span>
            <input
              className="accent-ring w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none transition dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              onChange={(event) => setName(event.target.value)}
              placeholder="Workout videos"
              type="text"
              value={name}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              YouTube playlist URL
            </span>
            <input
              className="accent-ring w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none transition dark:border-white/10 dark:bg-neutral-950 dark:text-white"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              type="url"
              value={url}
            />
          </label>

          <button
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-950 px-5 py-3 font-semibold text-zinc-950 transition hover:border-accent hover:text-accent-strong active:text-accent-strong disabled:opacity-60 dark:border-white dark:text-white"
            disabled={submitting}
            type="submit"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            {submitting ? "Importing" : "Import"}
          </button>
        </div>

        {status ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300" role="status">
            {status}
          </p>
        ) : null}
      </form>
    </section>
  );
}
