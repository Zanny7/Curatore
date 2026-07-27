"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Import, ListMusic, Plus, X } from "lucide-react";
import { PlaylistCard } from "@/components/PlaylistCard";
import { usePlayer } from "@/context/PlayerContext";
import type { Playlist } from "@/types";

type PlaylistView = "curated" | "imported";

export default function PlaylistsPage() {
  const router = useRouter();
  const {
    addImportedPlaylist,
    createCuratedPlaylist,
    curatedPlaylists,
    importedPlaylists,
    loadPlaylist,
    playlistsLoaded
  } = usePlayer();
  const [view, setView] = useState<PlaylistView>("curated");
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [importName, setImportName] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      playlistsLoaded &&
      curatedPlaylists.length === 0 &&
      importedPlaylists.length === 0
    ) {
      setView("imported");
      setShowImport(true);
    }
  }, [curatedPlaylists.length, importedPlaylists.length, playlistsLoaded]);

  const playlists =
    view === "curated" ? curatedPlaylists : importedPlaylists;
  const title = view === "curated" ? "My Playlists" : "Imported Playlists";

  function openPlaylist(playlist: Playlist) {
    router.push(`/playlists/${encodeURIComponent(playlist.id)}`);
  }

  function playPlaylist(playlist: Playlist) {
    loadPlaylist(playlist);
    router.push("/player");
  }

  function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playlistName.trim()) {
      return;
    }

    const playlist = createCuratedPlaylist(playlistName);
    setPlaylistName("");
    setShowCreate(false);
    openPlaylist(playlist);
  }

  async function importPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!importName.trim() || !url.trim()) {
      setStatus("Add a playlist name and YouTube playlist URL.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/youtube/playlist", {
        body: JSON.stringify({ name: importName, url }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = (await response.json()) as {
        playlist?: Playlist;
        error?: string;
      };

      if (!response.ok || !result.playlist) {
        throw new Error(result.error ?? "Unable to import playlist.");
      }
      if (
        importedPlaylists.some(
          (playlist) => playlist.id === result.playlist?.id
        )
      ) {
        throw new Error(
          "This playlist is already imported. Open it and use Refresh instead."
        );
      }

      addImportedPlaylist(result.playlist);
      setImportName("");
      setUrl("");
      setStatus("Playlist imported successfully.");
      setShowImport(false);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to import playlist."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5">
        <div className="theme-control inline-flex w-fit rounded-lg p-1 shadow-sm backdrop-blur">
          <ViewButton
            active={view === "curated"}
            count={curatedPlaylists.length}
            label="Playlists"
            onClick={() => setView("curated")}
          />
          <ViewButton
            active={view === "imported"}
            count={importedPlaylists.length}
            label="Imported"
            onClick={() => setView("imported")}
          />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
              Collection
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
              {view === "curated"
                ? "Shape your own collections from the music you have imported."
                : "Your editable local snapshots of YouTube playlists."}
            </p>
          </div>
          <button
            className="theme-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition"
            onClick={() =>
              view === "curated"
                ? setShowCreate(true)
                : setShowImport((current) => !current)
            }
            type="button"
          >
            {view === "curated" ? (
              <FolderPlus aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Import aria-hidden="true" className="h-5 w-5" />
            )}
            {view === "curated" ? "Create playlist" : "Import playlist"}
          </button>
        </div>
      </div>

      {view === "imported" && showImport ? (
        <form
          className="theme-card rounded-xl p-4 shadow-lg backdrop-blur sm:p-5"
          onSubmit={importPlaylist}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
                Import from YouTube
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Curatore creates an editable local snapshot of the playlist.
              </p>
            </div>
            {importedPlaylists.length > 0 ? (
              <button
                aria-label="Close import form"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:text-accent-strong"
                onClick={() => setShowImport(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_auto]">
            <Field
              label="Playlist name"
              onChange={setImportName}
              placeholder="Late night rotation"
              value={importName}
            />
            <Field
              label="YouTube playlist URL"
              onChange={setUrl}
              placeholder="https://www.youtube.com/playlist?list=..."
              type="url"
              value={url}
            />
            <button
            className="theme-button-primary mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
              {submitting ? "Importing" : "Import"}
            </button>
          </div>
          {status ? (
            <p
              className="mt-4 text-sm text-zinc-600 dark:text-zinc-300"
              role="status"
            >
              {status}
            </p>
          ) : null}
        </form>
      ) : null}

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4 2xl:grid-cols-5">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              onOpen={openPlaylist}
              onPlay={playPlaylist}
              playlist={playlist}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          imported={view === "imported"}
          onAction={() =>
            view === "imported" ? setShowImport(true) : setShowCreate(true)
          }
        />
      )}

      {showCreate ? (
        <div
          className="theme-overlay fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
          role="presentation"
        >
          <form
            aria-label="Create playlist"
            className="theme-dialog w-full max-w-md rounded-xl p-5"
            onSubmit={createPlaylist}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
                  New collection
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Create playlist
                </h2>
              </div>
              <button
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:text-white"
                onClick={() => setShowCreate(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-6 block space-y-2">
              <span className="text-sm font-medium text-zinc-300">
                Playlist name
              </span>
              <input
                autoFocus
                className="theme-field h-10 w-full rounded-lg px-3 text-sm"
                onChange={(event) => setPlaylistName(event.target.value)}
                placeholder="My new playlist"
                value={playlistName}
              />
            </label>
            <button
              className="theme-button-primary mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition"
              type="submit"
            >
              Create playlist
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function ViewButton({
  active,
  count,
  label,
  onClick
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[var(--theme-accent)] text-[var(--theme-on-accent)] shadow-sm"
          : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/15 dark:bg-black/10" : "bg-zinc-100 dark:bg-white/5"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "url";
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <input
        className="theme-field h-10 w-full rounded-lg px-3 text-sm transition"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function EmptyState({
  imported,
  onAction
}: {
  imported: boolean;
  onAction: () => void;
}) {
  return (
    <div className="theme-card flex min-h-56 flex-col items-center justify-center rounded-xl border-dashed px-6 py-10 text-center shadow-sm backdrop-blur">
      <div className="bg-accent-soft text-accent flex h-14 w-14 items-center justify-center rounded-full">
        <ListMusic aria-hidden="true" className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-zinc-950 dark:text-white">
        {imported ? "Import your first playlist" : "Create your first playlist"}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {imported
          ? "Bring in a YouTube playlist to start building your Curatore collection."
          : "Create a clean, personal collection and fill it with songs from your imports."}
      </p>
      <button
        className="theme-button-secondary mt-5 h-10 rounded-lg px-4 text-sm font-semibold transition"
        onClick={onAction}
        type="button"
      >
        {imported ? "Import playlist" : "Create playlist"}
      </button>
    </div>
  );
}
