"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  Info,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  SlidersHorizontal,
  Square,
  Star,
  Tags,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePlayer } from "@/context/PlayerContext";
import {
  formatTagPill,
  getTagPillClasses,
  TAG_PILL_VISIBLE_LENGTH
} from "@/lib/tags";
import type {
  Playlist,
  RemovedPlaylistVideo,
  SongMetadata,
  TagDefinition,
  VideoItem
} from "@/types";

type TransferMode = "copy" | "move";
type InlineEditorKind = "frequency" | "rating" | "tags";
type SortKey = "song" | "frequency" | "rating" | "tags";
type SortDirection = "asc" | "desc";

export default function PlaylistDetailPage() {
  const router = useRouter();
  const params = useParams<{ playlistId: string }>();
  const {
    allPlaylists,
    copyPlaylistVideos,
    createCuratedPlaylist,
    curatedPlaylists,
    deletePlaylist,
    loadPlaylist,
    movePlaylistVideos,
    playlistsLoaded,
    refreshImportedPlaylist,
    renamePlaylist,
    removePlaylistVideos,
    reorderPlaylistVideos,
    restorePlaylistVideos,
    setPlaylistVideoFrequency,
    songMetadata,
    tagDefinitions,
    updatePlaylistVideo,
    updateSongMetadata
  } = usePlayer();
  const playlistId = decodeURIComponent(params.playlistId);
  const playlist = useMemo(
    () => allPlaylists.find((item) => item.id === playlistId) ?? null,
    [allPlaylists, playlistId]
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inlineEditor, setInlineEditor] = useState<{
    kind: InlineEditorKind;
    videoId: string;
  } | null>(null);
  const [transfer, setTransfer] = useState<{
    ids: string[];
    mode: TransferMode;
  } | null>(null);
  const [removeIds, setRemoveIds] = useState<string[] | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBulkMetadata, setShowBulkMetadata] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedSortTag, setSelectedSortTag] = useState<string | null>(null);
  const [sort, setSort] = useState<{
    direction: SortDirection;
    key: SortKey;
  } | null>(null);
  const [undoRemoval, setUndoRemoval] = useState<{
    playlistId: string;
    removed: RemovedPlaylistVideo[];
  } | null>(null);
  const playlistTags = useMemo(
    () =>
      Array.from(
        new Set(
          (playlist?.videos ?? []).flatMap((video) =>
            (songMetadata[video.id]?.keywords ?? []).map(
              (keyword) => keyword.name
            )
          )
        )
      ).sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: "base" })
      ),
    [playlist, songMetadata]
  );

  useEffect(() => {
    if (!undoRemoval) {
      return;
    }
    const timeout = window.setTimeout(() => setUndoRemoval(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [undoRemoval]);

  useEffect(() => {
    if (!inlineEditor && !openMenuId) {
      return;
    }

    function dismissOpenSongControls(event: PointerEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (inlineEditor) {
        const editorRoot = event.target.closest("[data-song-editor-root]");
        const activeEditor = `${inlineEditor.videoId}:${inlineEditor.kind}`;
        if (editorRoot?.getAttribute("data-song-editor-root") !== activeEditor) {
          setInlineEditor(null);
        }
      }

      if (openMenuId) {
        const menuRoot = event.target.closest("[data-song-menu-root]");
        if (menuRoot?.getAttribute("data-song-menu-root") !== openMenuId) {
          setOpenMenuId(null);
        }
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setInlineEditor(null);
        setOpenMenuId(null);
      }
    }

    document.addEventListener("pointerdown", dismissOpenSongControls);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOpenSongControls);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [inlineEditor, openMenuId]);

  if (!playlistsLoaded) {
    return <p className="text-sm text-zinc-500">Loading playlist…</p>;
  }

  if (!playlist) {
    return (
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <BackButton onClick={() => router.push("/playlists")} />
        <div className="theme-card rounded-xl border-dashed p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
            Playlist not found
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            This playlist is no longer available in Curatore.
          </p>
        </div>
      </section>
    );
  }

  const selected = Array.from(selectedIds);
  const allSelected =
    playlist.videos.length > 0 && selectedIds.size === playlist.videos.length;
  const displayedVideos = sort
    ? [...playlist.videos].sort((left, right) => {
        let comparison = 0;

        if (sort.key === "song") {
          comparison = left.title.localeCompare(right.title, undefined, {
            numeric: true,
            sensitivity: "base"
          });
        } else if (sort.key === "frequency") {
          comparison =
            (left.playFrequency ?? 1) - (right.playFrequency ?? 1);
        } else if (sort.key === "rating") {
          const leftRating = songMetadata[left.id]?.rating;
          const rightRating = songMetadata[right.id]?.rating;

          if (leftRating == null && rightRating == null) {
            comparison = 0;
          } else if (leftRating == null) {
            return 1;
          } else if (rightRating == null) {
            return -1;
          } else {
            comparison = leftRating - rightRating;
          }
        } else {
          const leftTagRating = songMetadata[left.id]?.keywords.find(
            (keyword) =>
              keyword.name.toLocaleLowerCase() ===
              selectedSortTag?.toLocaleLowerCase()
          )?.rating;
          const rightTagRating = songMetadata[right.id]?.keywords.find(
            (keyword) =>
              keyword.name.toLocaleLowerCase() ===
              selectedSortTag?.toLocaleLowerCase()
          )?.rating;

          if (leftTagRating == null && rightTagRating == null) {
            comparison = 0;
          } else if (leftTagRating == null) {
            return 1;
          } else if (rightTagRating == null) {
            return -1;
          } else {
            comparison = leftTagRating - rightTagRating;
          }
        }

        return sort.direction === "asc" ? comparison : -comparison;
      })
    : playlist.videos;

  function toggleSong(videoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      allSelected
        ? new Set()
        : new Set(playlist?.videos.map((video) => video.id) ?? [])
    );
  }

  function toggleInlineEditor(videoId: string, kind: InlineEditorKind) {
    setInlineEditor((current) =>
      current?.videoId === videoId && current.kind === kind
        ? null
        : { kind, videoId }
    );
  }

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
      key
    }));
    setDragIndex(null);
  }

  function selectSortTag(tag: string | null) {
    setSelectedSortTag(tag);
    if (!tag) {
      setSort((current) => (current?.key === "tags" ? null : current));
    }
  }

  function playFrom(videoId?: string) {
    if (!playlist || playlist.videos.length === 0) {
      return;
    }
    loadPlaylist(playlist, videoId);
    router.push("/player");
  }

  function finishBulkAction() {
    setSelectedIds(new Set());
    setTransfer(null);
    setRemoveIds(null);
  }

  async function refreshPlaylist() {
    if (!playlist?.url || playlist.source !== "imported") {
      return;
    }

    setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/youtube/playlist", {
        body: JSON.stringify({ name: playlist.name, url: playlist.url }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = (await response.json()) as {
        playlist?: Playlist;
        error?: string;
      };
      if (!response.ok || !result.playlist) {
        throw new Error(result.error ?? "Unable to refresh playlist.");
      }
      const added = refreshImportedPlaylist(playlist.id, result.playlist);
      setNotice(
        added === 0
          ? "Playlist is already up to date."
          : `${added} new ${added === 1 ? "song" : "songs"} added.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to refresh playlist."
      );
    } finally {
      setRefreshing(false);
    }
  }

  function confirmRemoval(ids: string[]) {
    if (!playlist) {
      return;
    }
    const selectedIds = new Set(ids);
    const removed = playlist.videos.flatMap((video, index) =>
      selectedIds.has(video.id) ? [{ index, video }] : []
    );
    removePlaylistVideos(playlist.id, ids);
    setUndoRemoval({ playlistId: playlist.id, removed });
    finishBulkAction();
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-7">
      <div>
        <BackButton onClick={() => router.push("/playlists")} />
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              aria-label={`Play ${playlist.name}`}
              className="media-on-dark group relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-zinc-200 shadow-sm transition focus:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 sm:h-24 sm:w-40"
              disabled={playlist.videos.length === 0}
              onClick={() => playFrom()}
              type="button"
            >
              <img
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                src={playlist.thumbnailUrl}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/35">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg transition group-hover:scale-105 group-hover:bg-black/70">
                  <Play
                    aria-hidden="true"
                    className="ml-0.5 h-5 w-5 fill-current"
                  />
                </span>
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
                {playlist.source === "imported"
                  ? "Imported playlist"
                  : "My playlist"}
              </p>
              <h1 className="mt-2 line-clamp-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
                {playlist.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {playlist.videoCount}{" "}
                {playlist.videoCount === 1 ? "song" : "songs"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {playlist.source === "imported" ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 transition hover:border-accent hover:text-accent-strong disabled:opacity-40 dark:border-white/10 dark:text-zinc-300"
                disabled={refreshing}
                onClick={refreshPlaylist}
                type="button"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            ) : null}
            <button
              aria-label="Rename playlist"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-accent hover:text-accent-strong dark:border-white/10 dark:text-zinc-300"
              onClick={() => setShowRename(true)}
              type="button"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Delete playlist"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/25 text-red-500 transition hover:bg-red-500/10"
              onClick={() => setShowDelete(true)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="theme-panel mt-5 flex flex-wrap gap-x-5 gap-y-2 rounded-xl px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            {playlist.source === "imported"
              ? `Last refreshed ${formatDate(playlist.lastRefreshedAt)}`
              : `Created ${formatDate(playlist.createdAt)}`}
          </span>
          {playlist.source === "imported" ? (
            <span>
              {(playlist.excludedVideoIds ?? []).length} locally excluded
            </span>
          ) : null}
          <span>
            {playlist.videos.reduce(
              (total, video) => total + (video.playFrequency ?? 1),
              0
            )}{" "}
            plays per cycle
          </span>
          {notice ? (
            <span className="font-medium text-accent-strong" role="status">
              {notice}
            </span>
          ) : null}
        </div>
      </div>

      <BulkToolbar
        allSelected={allSelected}
        count={selected.length}
        disabled={selected.length === 0}
        onClear={() => setSelectedIds(new Set())}
        onCopy={() => setTransfer({ ids: selected, mode: "copy" })}
        onEdit={() => setShowBulkMetadata(true)}
        onMove={() => setTransfer({ ids: selected, mode: "move" })}
        onRemove={() => setRemoveIds(selected)}
        onToggleAll={toggleAll}
      />

      {playlist.videos.length > 0 ? (
        <div className="theme-card overflow-visible rounded-xl shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:border-white/10 2xl:hidden">
            <SortButton
              active={sort?.key === "song"}
              direction={sort?.key === "song" ? sort.direction : undefined}
              label="Song"
              onClick={() => toggleSort("song")}
            />
            <SortButton
              active={sort?.key === "frequency"}
              direction={
                sort?.key === "frequency" ? sort.direction : undefined
              }
              label="Freq"
              onClick={() => toggleSort("frequency")}
            />
            <SortButton
              active={sort?.key === "rating"}
              direction={sort?.key === "rating" ? sort.direction : undefined}
              label="Rating"
              onClick={() => toggleSort("rating")}
            />
            <TagSortControl
              active={sort?.key === "tags"}
              direction={sort?.key === "tags" ? sort.direction : undefined}
              onSelect={selectSortTag}
              onToggle={() =>
                selectedSortTag ? toggleSort("tags") : undefined
              }
              selectedTag={selectedSortTag}
              tags={playlistTags}
            />
            <SortingHelpLink />
          </div>
          <div className="hidden grid-cols-[minmax(0,1fr)_5rem_5rem_8rem_2.5rem] items-center gap-x-2 border-b border-zinc-200 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:border-white/10 2xl:grid">
            <div className="grid grid-cols-[1.25rem_2rem_6rem_minmax(0,1fr)] items-center gap-x-3">
              <span />
              <span />
              <span />
              <SortButton
                active={sort?.key === "song"}
                className="justify-center"
                direction={sort?.key === "song" ? sort.direction : undefined}
                label="Song"
                onClick={() => toggleSort("song")}
              />
            </div>
            <SortButton
              active={sort?.key === "frequency"}
              className="pl-2"
              direction={
                sort?.key === "frequency" ? sort.direction : undefined
              }
              label="Freq"
              onClick={() => toggleSort("frequency")}
            />
            <SortButton
              active={sort?.key === "rating"}
              className="pl-2"
              direction={sort?.key === "rating" ? sort.direction : undefined}
              label="Rating"
              onClick={() => toggleSort("rating")}
            />
            <TagSortControl
              active={sort?.key === "tags"}
              className="pl-2"
              direction={sort?.key === "tags" ? sort.direction : undefined}
              onSelect={selectSortTag}
              onToggle={() =>
                selectedSortTag ? toggleSort("tags") : undefined
              }
              selectedTag={selectedSortTag}
              tags={playlistTags}
            />
            <SortingHelpLink />
          </div>
          {displayedVideos.map((video, index) => {
            const metadata = songMetadata[video.id] ?? { keywords: [] };
            const isSelected = selectedIds.has(video.id);
            const editorKind =
              inlineEditor?.videoId === video.id ? inlineEditor.kind : null;
            const editor = editorKind ? (
              <SongInlineEditor
                frequency={video.playFrequency ?? 1}
                kind={editorKind}
                metadata={metadata}
                onClose={() => setInlineEditor(null)}
                onSaveFrequency={(frequency) => {
                  setPlaylistVideoFrequency(
                    playlist.id,
                    [video.id],
                    frequency
                  );
                  setInlineEditor(null);
                }}
                onSaveRating={(rating) => {
                  updateSongMetadata(video.id, { ...metadata, rating });
                  setInlineEditor(null);
                }}
                onSaveTags={(keywords) => {
                  updateSongMetadata(video.id, { ...metadata, keywords });
                  setInlineEditor(null);
                }}
                tagDefinitions={tagDefinitions}
              />
            ) : null;
            return (
              <div
                className={`relative flex items-center gap-3 border-b border-zinc-200 p-3 transition last:border-b-0 dark:border-white/10 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_5rem_5rem_8rem_2.5rem] 2xl:gap-x-2 ${
                  isSelected ? "bg-accent-subtle" : "hover:bg-zinc-50/80 dark:hover:bg-white/[0.025]"
                }`}
                draggable={!sort}
                key={video.id}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) {
                    reorderPlaylistVideos(playlist.id, dragIndex, index);
                  }
                  setDragIndex(null);
                }}
              >
                <div className="contents 2xl:grid 2xl:grid-cols-[1.25rem_2rem_6rem_minmax(0,1fr)] 2xl:items-center 2xl:gap-x-3">
                <span
                  aria-label={`Drag to reorder ${video.title}`}
                  className={`hidden h-10 w-5 shrink-0 items-center justify-center text-zinc-400 sm:flex ${
                    sort
                      ? "cursor-default opacity-35"
                      : "cursor-grab active:cursor-grabbing"
                  }`}
                  role="img"
                >
                  <GripVertical aria-hidden="true" className="h-5 w-5" />
                </span>
                <label className="flex h-10 w-8 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    checked={isSelected}
                    className="h-4 w-4 accent-[var(--accent)]"
                    onChange={() => toggleSong(video.id)}
                    type="checkbox"
                  />
                </label>
                <button
                  aria-label={`Play ${video.title}`}
                  className="media-on-dark group relative h-12 w-20 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-24"
                  onClick={() => playFrom(video.id)}
                  type="button"
                >
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={video.thumbnailUrl}
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <Play aria-hidden="true" className="h-5 w-5 text-white" />
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    className="block max-w-full text-left"
                    onClick={() => playFrom(video.id)}
                    type="button"
                  >
                    <p className="truncate text-sm font-semibold text-zinc-950 transition hover:text-accent-strong dark:text-white">
                      {video.title}
                    </p>
                  </button>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {video.channelTitle}
                    {video.duration ? ` · ${video.duration}` : ""}
                  </p>
                  <div className="relative mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 2xl:hidden">
                    <CompactSongControl
                      ariaLabel={`Set play frequency for ${video.title}`}
                      controlKey={`${video.id}:frequency`}
                      editor={editorKind === "frequency" ? editor : null}
                      icon={Repeat2}
                      label={`${video.playFrequency ?? 1}x`}
                      labelInside
                      onClick={() =>
                        toggleInlineEditor(video.id, "frequency")
                      }
                    />
                    <CompactSongControl
                      active={Boolean(metadata.rating)}
                      ariaLabel={`Rate ${video.title}`}
                      controlKey={`${video.id}:rating`}
                      editor={editorKind === "rating" ? editor : null}
                      icon={Star}
                      label={metadata.rating ? `${metadata.rating}/5` : null}
                      labelInside
                      onClick={() => toggleInlineEditor(video.id, "rating")}
                    />
                    <CompactSongControl
                      active={metadata.keywords.length > 0}
                      ariaLabel={`Edit tags for ${video.title}`}
                      controlKey={`${video.id}:tags`}
                      editor={editorKind === "tags" ? editor : null}
                      icon={Tags}
                      label={
                        <TagPills
                          keywords={metadata.keywords}
                          selectedTag={selectedSortTag}
                        />
                      }
                      onClick={() => toggleInlineEditor(video.id, "tags")}
                    />
                  </div>
                </div>
                </div>
                <div className="hidden 2xl:contents">
                  <div
                    className="relative flex w-full items-center"
                    data-song-editor-root={`${video.id}:frequency`}
                  >
                    <button
                      aria-label={`Set play frequency for ${video.title}`}
                      className="inline-flex h-8 min-w-[4.25rem] items-center gap-1.5 rounded-lg px-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
                      onClick={() =>
                        toggleInlineEditor(video.id, "frequency")
                      }
                      type="button"
                    >
                      <Repeat2 aria-hidden="true" className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {video.playFrequency ?? 1}x
                      </span>
                    </button>
                    {editorKind === "frequency" ? editor : null}
                  </div>
                  <div
                    className="relative flex w-full items-center"
                    data-song-editor-root={`${video.id}:rating`}
                  >
                    <button
                      aria-label={`Rate ${video.title}`}
                      className="inline-flex h-8 min-w-[4.25rem] items-center gap-1.5 rounded-lg px-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
                      onClick={() => toggleInlineEditor(video.id, "rating")}
                      type="button"
                    >
                      <Star
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                          metadata.rating
                            ? "fill-[var(--accent)] text-[var(--accent)]"
                            : ""
                        }`}
                      />
                      {metadata.rating ? (
                        <span className="text-sm font-medium">
                          {metadata.rating}/5
                        </span>
                      ) : null}
                    </button>
                    {editorKind === "rating" ? editor : null}
                  </div>
                  <div
                    className="relative flex w-full items-center gap-1"
                    data-song-editor-root={`${video.id}:tags`}
                  >
                    <button
                      aria-label={`Edit tags for ${video.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
                      onClick={() => toggleInlineEditor(video.id, "tags")}
                      type="button"
                    >
                      <Tags aria-hidden="true" className="h-4 w-4 shrink-0" />
                    </button>
                    <TagPills
                      keywords={metadata.keywords}
                      selectedTag={selectedSortTag}
                    />
                    {editorKind === "tags" ? editor : null}
                  </div>
                </div>
                <div
                  className="relative shrink-0 2xl:justify-self-center"
                  data-song-menu-root={video.id}
                >
                  <button
                    aria-label={`More actions for ${video.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === video.id ? null : video.id
                      )
                    }
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
                  </button>
                  {openMenuId === video.id ? (
                    <SongMenu
                      onClose={() => setOpenMenuId(null)}
                      onCopy={() => {
                        setTransfer({ ids: [video.id], mode: "copy" });
                        setOpenMenuId(null);
                      }}
                      onMove={() => {
                        setTransfer({ ids: [video.id], mode: "move" });
                        setOpenMenuId(null);
                      }}
                      onRemove={() => {
                        setRemoveIds([video.id]);
                        setOpenMenuId(null);
                      }}
                      onTrim={(updates) =>
                        updatePlaylistVideo(playlist.id, video.id, updates)
                      }
                      video={video}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="theme-card rounded-xl border-dashed p-8 text-center">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            This playlist is empty
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Copy songs here from one of your imported playlists.
          </p>
        </div>
      )}

      {showBulkMetadata ? (
        <BulkMetadataDialog
          count={selected.length}
          onClose={() => setShowBulkMetadata(false)}
          onSave={({ frequency, rating, tag }) => {
            for (const videoId of selected) {
              const current = songMetadata[videoId] ?? { keywords: [] };
              const withoutTag = tag
                ? current.keywords.filter(
                    (keyword) =>
                      keyword.tagId !== tag.tagId &&
                      keyword.name.toLocaleLowerCase() !==
                        tag.name.toLocaleLowerCase()
                  )
                : current.keywords;
              const keywords =
                tag && withoutTag.length < 3
                  ? [...withoutTag, tag]
                  : current.keywords;
              updateSongMetadata(videoId, {
                rating: rating ?? current.rating,
                keywords
              });
            }
            if (frequency) {
              setPlaylistVideoFrequency(playlist.id, selected, frequency);
            }
            setShowBulkMetadata(false);
            setSelectedIds(new Set());
            setNotice(`${selected.length} songs updated.`);
          }}
          tagDefinitions={tagDefinitions}
        />
      ) : null}

      {transfer ? (
        <TransferDialog
          count={transfer.ids.length}
          destinations={curatedPlaylists.filter(
            (item) => item.id !== playlist.id
          )}
          mode={transfer.mode}
          onClose={() => setTransfer(null)}
          onCreate={(name) => createCuratedPlaylist(name)}
          onSubmit={(destinationId) => {
            if (transfer.mode === "copy") {
              copyPlaylistVideos(playlist.id, destinationId, transfer.ids);
            } else {
              movePlaylistVideos(playlist.id, destinationId, transfer.ids);
            }
            finishBulkAction();
          }}
        />
      ) : null}

      {removeIds ? (
        <ConfirmRemoveDialog
          count={removeIds.length}
          onCancel={() => setRemoveIds(null)}
          onConfirm={() => confirmRemoval(removeIds)}
        />
      ) : null}

      {showRename ? (
        <RenamePlaylistDialog
          initialName={playlist.name}
          onCancel={() => setShowRename(false)}
          onConfirm={(name) => {
            renamePlaylist(playlist.id, name);
            setShowRename(false);
            setNotice("Playlist renamed.");
          }}
        />
      ) : null}

      {showDelete ? (
        <DeletePlaylistDialog
          name={playlist.name}
          onCancel={() => setShowDelete(false)}
          onConfirm={() => {
            deletePlaylist(playlist.id);
            router.push("/playlists");
          }}
        />
      ) : null}

      {undoRemoval ? (
        <div
          className="theme-control fixed bottom-24 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-4 rounded-xl px-4 py-3 text-sm shadow-2xl backdrop-blur-xl"
          role="status"
        >
          <span className="min-w-0 flex-1">
            {undoRemoval.removed.length}{" "}
            {undoRemoval.removed.length === 1 ? "song" : "songs"} removed.
          </span>
          <button
            className="font-semibold text-accent-strong"
            onClick={() => {
              restorePlaylistVideos(
                undoRemoval.playlistId,
                undoRemoval.removed
              );
              setUndoRemoval(null);
              setNotice("Removal undone.");
            }}
            type="button"
          >
            Undo
          </button>
        </div>
      ) : null}
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-accent-strong dark:text-zinc-300"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Back to playlists
    </button>
  );
}

function SortingHelpLink() {
  return (
    <Link
      aria-label="Learn how playlist sorting works"
      className="flex h-6 w-6 shrink-0 items-center justify-center justify-self-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-accent-strong dark:hover:bg-white/5"
      href="/help/playlist-sorting"
      title="Learn how playlist sorting works"
    >
      <Info aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

function SortButton({
  active,
  className = "",
  direction,
  label,
  onClick
}: {
  active: boolean;
  className?: string;
  direction?: SortDirection;
  label: string;
  onClick: () => void;
}) {
  const SortIcon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <button
      aria-label={`Sort by ${label}${
        direction === "asc"
          ? ", currently ascending"
          : direction === "desc"
            ? ", currently descending"
            : ""
      }`}
      aria-pressed={active}
      className={`flex items-center gap-1 transition hover:text-zinc-700 dark:hover:text-zinc-200 ${
        active ? "text-accent-strong" : ""
      } ${className}`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <SortIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
    </button>
  );
}

function TagSortControl({
  active,
  className = "",
  direction,
  onSelect,
  onToggle,
  selectedTag,
  tags
}: {
  active: boolean;
  className?: string;
  direction?: SortDirection;
  onSelect: (tag: string | null) => void;
  onToggle: () => void;
  selectedTag: string | null;
  tags: string[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function dismissTagMenu(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function dismissTagMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", dismissTagMenu);
    document.addEventListener("keydown", dismissTagMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissTagMenu);
      document.removeEventListener("keydown", dismissTagMenuOnEscape);
    };
  }, [open]);

  return (
    <div
      className={`relative flex min-w-0 items-center gap-1 ${className}`}
      ref={rootRef}
    >
      <SortButton
        active={active}
        direction={direction}
        label="Tags"
        onClick={() => {
          if (selectedTag) {
            onToggle();
          } else {
            setOpen(true);
          }
        }}
      />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={
          selectedTag
            ? `Choose tag to sort by, currently ${selectedTag}`
            : "Choose tag to sort by"
        }
        className={`flex h-6 w-16 items-center justify-center gap-0.5 rounded-md border px-1 text-[10px] normal-case tracking-normal transition ${
          selectedTag
            ? "border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-white/10 dark:bg-white/5"
            : "border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/25 dark:hover:bg-white/5"
        }`}
        disabled={tags.length === 0}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selectedTag ? (
          <span className="min-w-0 flex-1 truncate text-center">
            {formatTagPill(selectedTag)}
          </span>
        ) : (
          <span>-</span>
        )}
        <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0" />
      </button>
      {open ? (
        <div
          aria-label="Tags used in this playlist"
          className="theme-menu absolute right-0 top-[calc(100%+0.4rem)] z-[80] w-44 overflow-hidden rounded-xl p-1.5 text-left normal-case tracking-normal backdrop-blur-xl"
          role="listbox"
        >
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Sort by tag
          </p>
          <div className="max-h-48 overflow-y-auto">
            <button
              aria-selected={!selectedTag}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition ${
                !selectedTag
                  ? "bg-accent-soft text-accent-strong"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span>-</span>
              {!selectedTag ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              ) : null}
            </button>
            {tags.map((tag) => {
              const selected =
                tag.toLocaleLowerCase() === selectedTag?.toLocaleLowerCase();
              return (
                <button
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs transition ${
                    selected
                      ? "bg-accent-soft text-accent-strong"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`}
                  key={tag}
                  onClick={() => {
                    onSelect(tag);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="truncate">{tag}</span>
                  {selected ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompactSongControl({
  active = false,
  ariaLabel,
  controlKey,
  editor,
  icon: Icon,
  label,
  labelInside = false,
  onClick
}: {
  active?: boolean;
  ariaLabel: string;
  controlKey: string;
  editor?: React.ReactNode;
  icon: typeof Star;
  label: React.ReactNode;
  labelInside?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="relative inline-flex min-w-0 shrink-0 items-center gap-0.5"
      data-song-editor-root={controlKey}
    >
      <button
        aria-label={ariaLabel}
        className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition hover:bg-zinc-100 hover:text-accent-strong dark:hover:bg-white/5 ${
          labelInside ? "min-w-7" : "w-7"
        } ${
          active
            ? "text-accent-strong"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
        onClick={onClick}
        type="button"
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {labelInside ? label : null}
      </button>
      {!labelInside ? (
        <span className="min-w-0 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      ) : null}
      {editor}
    </div>
  );
}

function TagPills({
  keywords,
  selectedTag
}: {
  keywords: SongMetadata["keywords"];
  selectedTag: string | null;
}) {
  if (keywords.length === 0) {
    return null;
  }

  const sortedKeywords = [...keywords]
    .slice(0, 3)
    .sort(
      (left, right) =>
        right.rating - left.rating ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    );

  return (
    <span className="inline-flex min-w-0 flex-col items-stretch gap-1">
      {sortedKeywords.map((keyword) => {
        const highlighted =
          keyword.name.toLocaleLowerCase() ===
          selectedTag?.toLocaleLowerCase();
        const pillColors = getTagPillClasses(
          keyword.color ?? "theme",
          highlighted
        );
        return (
          <span
            aria-label={`${keyword.name}, ${keyword.rating} out of 10 match`}
            className={`group/tag relative inline-flex min-h-5 max-w-28 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${pillColors}`}
            key={keyword.name}
            tabIndex={0}
          >
            <ExpandableTagName
              expandedClassName={pillColors}
              name={keyword.name}
            />
            <span className="theme-tooltip pointer-events-none absolute bottom-[calc(100%+0.3rem)] left-1/2 z-[70] hidden h-6 -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-md px-2 text-[9px] leading-none shadow-lg group-hover/tag:flex group-focus/tag:flex">
              {keyword.rating}/10
            </span>
          </span>
        );
      })}
    </span>
  );
}

function ExpandableTagName({
  expandedClassName,
  name
}: {
  expandedClassName: string;
  name: string;
}) {
  const truncated = name.length > TAG_PILL_VISIBLE_LENGTH;

  return (
    <>
      <span className="truncate">{formatTagPill(name)}</span>
      {truncated ? (
        <span
          className={`pointer-events-none absolute left-0 top-1/2 z-[60] hidden min-h-5 w-max -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 text-center leading-none shadow-md group-hover/tag:inline-flex group-focus/tag:inline-flex ${expandedClassName}`}
        >
          {name}
        </span>
      ) : null}
    </>
  );
}

function BulkToolbar({
  allSelected,
  count,
  disabled,
  onClear,
  onCopy,
  onEdit,
  onMove,
  onRemove,
  onToggleAll
}: {
  allSelected: boolean;
  count: number;
  disabled: boolean;
  onClear: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onMove: () => void;
  onRemove: () => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="theme-control sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl p-2.5 shadow-lg backdrop-blur lg:top-3">
      <button
        className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
        onClick={onToggleAll}
        type="button"
      >
        {allSelected ? (
          <X aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Square aria-hidden="true" className="h-4 w-4" />
        )}
        {allSelected ? "Deselect all" : "Select all"}
      </button>
      <span className="mr-auto text-xs font-medium text-zinc-400">
        {count > 0 ? `${count} selected` : "Select songs to manage"}
      </span>
      <ToolbarButton disabled={disabled} icon={Copy} label="Copy" onClick={onCopy} />
      <ToolbarButton
        disabled={disabled}
        icon={SlidersHorizontal}
        label="Edit"
        onClick={onEdit}
      />
      <ToolbarButton
        disabled={disabled}
        icon={MoveRight}
        label="Move"
        onClick={onMove}
      />
      <ToolbarButton
        danger
        disabled={disabled}
        icon={Trash2}
        label="Remove"
        onClick={onRemove}
      />
      <button
        className="h-10 rounded-lg px-3 text-sm text-zinc-500 transition hover:text-zinc-950 disabled:opacity-30 dark:hover:text-white"
        disabled={disabled}
        onClick={onClear}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}

function ToolbarButton({
  danger = false,
  disabled,
  icon: Icon,
  label,
  onClick
}: {
  danger?: boolean;
  disabled: boolean;
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-red-500/30 text-red-500 hover:bg-red-500/10"
          : "border-zinc-200 text-zinc-700 hover:border-accent hover:text-accent-strong dark:border-white/10 dark:text-zinc-200"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SongMenu({
  onClose,
  onCopy,
  onMove,
  onRemove,
  onTrim,
  video
}: {
  onClose: () => void;
  onCopy: () => void;
  onMove: () => void;
  onRemove: () => void;
  onTrim: (updates: Partial<VideoItem>) => void;
  video: VideoItem;
}) {
  return (
    <div
      aria-label="Song actions"
      className="theme-menu absolute right-0 top-11 z-30 w-72 rounded-xl p-2 backdrop-blur-xl"
      role="menu"
    >
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5"
        onClick={onCopy}
        role="menuitem"
        type="button"
      >
        <Copy aria-hidden="true" className="h-4 w-4" />
        Copy to playlist
      </button>
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/5"
        onClick={onMove}
        role="menuitem"
        type="button"
      >
        <MoveRight aria-hidden="true" className="h-4 w-4" />
        Move to playlist
      </button>
      <div className="my-1 border-t border-zinc-200 px-3 py-2 dark:border-white/10">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Playback trim
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TrimField
            label="Start"
            onChange={(startSeconds) => onTrim({ startSeconds })}
            value={video.startSeconds}
          />
          <TrimField
            label="End"
            onChange={(endSeconds) => onTrim({ endSeconds })}
            value={video.endSeconds}
          />
        </div>
      </div>
      <div className="mx-3 my-1 border-t border-zinc-200 dark:border-white/10" />
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-500/10"
        onClick={onRemove}
        role="menuitem"
        type="button"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
        Remove from this playlist
      </button>
      <button
        aria-label="Close song menu"
        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow dark:border-[var(--app-sidebar-border)] dark:bg-[var(--app-control-bg)]"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TrimField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: number | undefined) => void;
  value?: number;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <input
        className="theme-field h-9 w-full rounded-lg px-2 text-xs"
        defaultValue={formatTime(value)}
        onBlur={(event) => onChange(parseTime(event.target.value))}
        placeholder="00:00"
      />
    </label>
  );
}

function SongInlineEditor({
  frequency,
  kind,
  metadata,
  onClose,
  onSaveFrequency,
  onSaveRating,
  onSaveTags,
  tagDefinitions
}: {
  frequency: number;
  kind: InlineEditorKind;
  metadata: SongMetadata;
  onClose: () => void;
  onSaveFrequency: (frequency: number) => void;
  onSaveRating: (rating: number) => void;
  onSaveTags: (keywords: SongMetadata["keywords"]) => void;
  tagDefinitions: TagDefinition[];
}) {
  const [keywords, setKeywords] = useState(metadata.keywords);
  const [tagSearch, setTagSearch] = useState("");
  const atTagLimit = keywords.length >= 3;
  const visibleTags = [...tagDefinitions]
    .filter((tag) =>
      tag.name.toLocaleLowerCase().includes(tagSearch.toLocaleLowerCase())
    )
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    );

  function findAssignment(tag: TagDefinition) {
    return keywords.find(
      (keyword) =>
        keyword.tagId === tag.id ||
        (!keyword.tagId &&
          keyword.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase())
    );
  }

  function toggleTag(tag: TagDefinition) {
    setKeywords((current) => {
      const assigned = current.some(
        (keyword) =>
          keyword.tagId === tag.id ||
          (!keyword.tagId &&
            keyword.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase())
      );
      if (assigned) {
        return current.filter(
          (keyword) =>
            keyword.tagId !== tag.id &&
            !(
              !keyword.tagId &&
              keyword.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase()
            )
        );
      }
      if (current.length >= 3) {
        return current;
      }
      return [
        ...current,
        {
          tagId: tag.id,
          name: tag.name,
          color: tag.color,
          rating: 5
        }
      ];
    });
  }

  function updateTagRating(tag: TagDefinition, rating: number) {
    setKeywords((current) =>
      current.map((keyword) =>
        keyword.tagId === tag.id ||
        (!keyword.tagId &&
          keyword.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase())
          ? {
              ...keyword,
              tagId: tag.id,
              name: tag.name,
              color: tag.color,
              rating
            }
          : keyword
      )
    );
  }

  const tagEditor = (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Created tags
        </p>
        <span className="text-[10px] text-zinc-500">
          {keywords.length}/3 assigned
        </span>
      </div>

      {tagDefinitions.length > 0 ? (
        <>
          <input
            aria-label="Search created tags"
            className="theme-field h-9 w-full rounded-lg px-2.5 text-xs"
            onChange={(event) => setTagSearch(event.target.value)}
            placeholder="Search tags"
            value={tagSearch}
          />
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {visibleTags.length > 0 ? (
              visibleTags.map((tag) => {
                const assignment = findAssignment(tag);
                const selected = Boolean(assignment);
                return (
                  <div
                    className="flex min-h-9 items-center gap-2 rounded-lg px-1 py-0.5"
                    key={tag.id}
                  >
                    <button
                      aria-pressed={selected}
                      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${getTagPillClasses(
                        tag.color,
                        selected
                      )}`}
                      disabled={!selected && atTagLimit}
                      onClick={() => toggleTag(tag)}
                      type="button"
                    >
                      {selected ? (
                        <Check
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0"
                        />
                      ) : null}
                      <span className="truncate">{tag.name}</span>
                    </button>
                    {assignment ? (
                      <select
                        aria-label={`${tag.name} match rating`}
                        className="theme-field ml-auto h-8 w-[4.5rem] rounded-lg px-1 text-xs"
                        onChange={(event) =>
                          updateTagRating(tag, Number(event.target.value))
                        }
                        value={assignment.rating}
                      >
                        {Array.from(
                          { length: 10 },
                          (_, index) => index + 1
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value}/10
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="py-5 text-center text-xs text-zinc-500">
                No tags match your search.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--app-sidebar-border)] p-4 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No tags have been created yet.
          </p>
          <Link
            className="mt-2 inline-flex text-xs font-semibold text-accent-strong hover:underline"
            href="/tags"
          >
            Open Tags
          </Link>
        </div>
      )}

      <button
        className="h-9 w-full rounded-lg border border-[var(--accent)] bg-accent-soft text-xs font-semibold text-accent-strong transition hover:bg-[var(--accent)] hover:text-black"
        onClick={() => onSaveTags(keywords)}
        type="button"
      >
        Done
      </button>
    </div>
  );

  return (
    <div
      className={`theme-menu absolute z-50 overflow-hidden rounded-xl text-left backdrop-blur-xl ${
        kind === "tags"
          ? "right-0 top-[calc(100%+0.35rem)] w-[min(18rem,calc(100vw-2rem))] p-3"
          : "left-0 top-[calc(100%+0.35rem)] w-[4.25rem] p-1"
      }`}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onDragStart={(event) => event.preventDefault()}
    >
      {kind === "tags" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">
            Assign Tags
          </p>
          <button
            aria-label="Close editor"
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-white/5 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {kind === "frequency" ? (
        <div aria-label="Set Frequency" className="flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-pressed={frequency === value}
              className={`h-8 w-full rounded-lg border px-1.5 text-xs font-semibold transition ${
                frequency === value
                  ? "border-[var(--accent)] bg-accent-soft text-accent-strong"
                  : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
              key={value}
              onClick={() => onSaveFrequency(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
      ) : null}

      {kind === "rating" ? (
        <div aria-label="Set Rating" className="flex flex-col gap-1">
          {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
            <button
              aria-pressed={metadata.rating === value}
              className={`h-8 w-full rounded-lg border px-1.5 text-xs font-semibold transition ${
                metadata.rating === value
                  ? "border-[var(--accent)] bg-accent-soft text-accent-strong"
                  : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
              key={value}
              onClick={() => onSaveRating(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {kind === "tags" ? tagEditor : null}
    </div>
  );
}

function TransferDialog({
  count,
  destinations,
  mode,
  onClose,
  onCreate,
  onSubmit
}: {
  count: number;
  destinations: Playlist[];
  mode: TransferMode;
  onClose: () => void;
  onCreate: (name: string) => Playlist;
  onSubmit: (destinationId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    destinations[0]?.id ?? null
  );
  const [newName, setNewName] = useState("");

  function createAndSelect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) {
      return;
    }
    const playlist = onCreate(newName);
    setSelectedId(playlist.id);
    setNewName("");
  }

  return (
    <Modal onClose={onClose}>
      <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
        {mode === "copy" ? "Copy songs" : "Move songs"}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        Choose a destination
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        {count} {count === 1 ? "song" : "songs"} selected
      </p>
      <div className="mt-5 max-h-52 space-y-2 overflow-y-auto">
        {destinations.map((playlist) => (
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
              selectedId === playlist.id
                ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                : "border-[var(--app-sidebar-border)] hover:bg-white/5"
            }`}
            key={playlist.id}
          >
            <input
              checked={selectedId === playlist.id}
              className="accent-[var(--accent)]"
              name="destination"
              onChange={() => setSelectedId(playlist.id)}
              type="radio"
            />
            <img
              alt=""
              className="h-10 w-16 rounded-md object-cover"
              src={playlist.thumbnailUrl}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {playlist.name}
            </span>
            <span className="text-xs text-zinc-500">
              {playlist.videoCount}
            </span>
          </label>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2 border-t border-[var(--app-sidebar-border)] pt-4"
        onSubmit={createAndSelect}
      >
        <input
          className="theme-field h-10 min-w-0 flex-1 rounded-lg px-3 text-sm"
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Create a new playlist"
          value={newName}
        />
        <button
          className="theme-button-secondary h-10 rounded-lg px-3 text-sm font-semibold transition"
          type="submit"
        >
          Create
        </button>
      </form>
      <div className="mt-6 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-button-primary h-10 flex-1 rounded-lg text-sm font-semibold transition disabled:opacity-40"
          disabled={!selectedId}
          onClick={() => selectedId && onSubmit(selectedId)}
          type="button"
        >
          {mode === "copy" ? "Copy here" : "Move here"}
        </button>
      </div>
    </Modal>
  );
}

function BulkMetadataDialog({
  count,
  onClose,
  onSave,
  tagDefinitions
}: {
  count: number;
  onClose: () => void;
  onSave: (updates: {
    frequency?: number;
    rating?: number;
    tag?: SongMetadata["keywords"][number];
  }) => void;
  tagDefinitions: TagDefinition[];
}) {
  const [rating, setRating] = useState("");
  const [frequency, setFrequency] = useState("");
  const [tagId, setTagId] = useState("");
  const [tagRating, setTagRating] = useState(5);
  const selectedTag = tagDefinitions.find((tag) => tag.id === tagId);
  const hasChanges = Boolean(rating || frequency || selectedTag);

  return (
    <Modal onClose={onClose}>
      <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
        Bulk edit
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        Edit {count} {count === 1 ? "song" : "songs"}
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Only the fields you choose below will be changed.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Overall rating"
          onChange={setRating}
          options={Array.from({ length: 5 }, (_, index) => ({
            label: `${index + 1}/5`,
            value: String(index + 1)
          }))}
          placeholder="Leave unchanged"
          value={rating}
        />
        <SelectField
          label="Play frequency"
          onChange={setFrequency}
          options={[1, 2, 3, 4, 5].map((value) => ({
            label: `${value}× per cycle`,
            value: String(value)
          }))}
          placeholder="Leave unchanged"
          value={frequency}
        />
      </div>
      <div className="mt-5 rounded-xl border border-[var(--app-sidebar-border)] bg-white/[0.025] p-4">
        <p className="text-sm font-semibold text-zinc-200">
          Add the same tag
        </p>
        {tagDefinitions.length > 0 ? (
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
            <select
              aria-label="Created tag"
              className="theme-field h-10 rounded-lg px-2 text-sm"
              onChange={(event) => setTagId(event.target.value)}
              value={tagId}
            >
              <option value="">Leave unchanged</option>
              {[...tagDefinitions]
                .sort((left, right) =>
                  left.name.localeCompare(right.name, undefined, {
                    sensitivity: "base"
                  })
                )
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
            <select
              aria-label="Tag match"
              className="theme-field h-10 rounded-lg px-2 text-sm"
              disabled={!selectedTag}
              onChange={(event) => setTagRating(Number(event.target.value))}
              value={tagRating}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}/10
                  </option>
                )
              )}
            </select>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--app-sidebar-border)] p-3 text-center">
            <p className="text-xs text-zinc-400">
              Create a tag before assigning it to songs.
            </p>
            <Link
              className="mt-2 inline-flex text-xs font-semibold text-accent-strong hover:underline"
              href="/tags"
            >
              Open Tags
            </Link>
          </div>
        )}
      </div>
      <div className="mt-7 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-button-primary h-10 flex-1 rounded-lg text-sm font-semibold transition disabled:opacity-40"
          disabled={!hasChanges}
          onClick={() =>
            onSave({
              frequency: frequency ? Number(frequency) : undefined,
              rating: rating ? Number(rating) : undefined,
              tag: selectedTag
                ? {
                    tagId: selectedTag.id,
                    color: selectedTag.color,
                    name: selectedTag.name,
                    rating: tagRating
                  }
                : undefined
            })
          }
          type="button"
        >
          Apply changes
        </button>
      </div>
    </Modal>
  );
}

function SelectField({
  label,
  onChange,
  options,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-zinc-200">{label}</span>
      <select
        className="theme-field h-10 w-full rounded-lg px-3 text-sm"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RenamePlaylistDialog({
  initialName,
  onCancel,
  onConfirm
}: {
  initialName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <Modal onClose={onCancel}>
      <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
        Playlist settings
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">Rename playlist</h2>
      <label className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-zinc-200">
          Playlist name
        </span>
        <input
          autoFocus
          className="theme-field h-10 w-full rounded-lg px-3 text-sm"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      <div className="mt-7 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-button-primary h-10 flex-1 rounded-lg text-sm font-semibold transition disabled:opacity-40"
          disabled={!name.trim() || name.trim() === initialName}
          onClick={() => onConfirm(name)}
          type="button"
        >
          Save name
        </button>
      </div>
    </Modal>
  );
}

function DeletePlaylistDialog({
  name,
  onCancel,
  onConfirm
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
        Delete playlist
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        Are you sure you want to delete &ldquo;{name}&rdquo;?
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        This cannot be undone. Songs and their ratings or tags remain anywhere
        else they are used. Imported refresh exclusions for this playlist are
        removed with it.
      </p>
      <div className="mt-7 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-destructive-solid h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onConfirm}
          type="button"
        >
          Delete playlist
        </button>
      </div>
    </Modal>
  );
}

function ConfirmRemoveDialog({
  count,
  onCancel,
  onConfirm
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
        Remove from playlist
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">
        Remove {count} {count === 1 ? "song" : "songs"}?
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        This only removes the selected songs from this playlist. Ratings,
        tags, and copies in other playlists remain untouched.
      </p>
      <div className="mt-7 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-destructive-solid h-10 flex-1 rounded-lg text-sm font-semibold transition"
          onClick={onConfirm}
          type="button"
        >
          Remove
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="theme-overlay fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-modal="true"
        className="theme-dialog relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl p-5 backdrop-blur-xl sm:p-6"
        role="dialog"
      >
        <button
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function parseTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parts = trimmed.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return undefined;
  }
  if (parts.length === 1) {
    return Math.floor(parts[0]);
  }
  if (parts.length === 2 && parts[1] < 60) {
    return Math.floor(parts[0] * 60 + parts[1]);
  }
  return undefined;
}

function formatTime(value?: number) {
  if (value === undefined) {
    return "";
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "not recorded";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "not recorded";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
