"use client";

import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  X
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { MarqueeText } from "@/components/MarqueeText";
import { usePlayer } from "@/context/PlayerContext";
import type { VideoItem } from "@/types";

type RightQueueSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  open: boolean;
  onToggle: () => void;
};

type PendingRemoval = {
  item: VideoItem;
  phase: "pending" | "finalizing";
  queueIndex: number;
  runId: number;
};

type DragState = {
  sourceIndex: number;
  targetIndex: number;
};

type QueueIdentity = {
  items: VideoItem[];
  keys: string[];
};

export function RightQueueSidebar({
  mobileOpen,
  onMobileClose,
  open,
  onToggle
}: RightQueueSidebarProps) {
  const {
    currentIndex,
    currentVideo,
    isPlaying,
    playbackRevision,
    playQueueItem,
    queue,
    removeQueueItem,
    reorderQueueItem
  } = usePlayer();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pendingRemovals, setPendingRemovals] = useState<PendingRemoval[]>(
    []
  );
  const currentIndexRef = useRef(currentIndex);
  const pendingRemovalsRef = useRef<PendingRemoval[]>([]);
  const queueRef = useRef(queue);
  const queueIdentityRef = useRef<QueueIdentity>({
    items: [],
    keys: []
  });
  const queueKeyCounterRef = useRef(0);
  const removalRunRef = useRef(0);
  const removalTimeoutsRef = useRef(new Map<number, number>());
  const suppressClickAfterDragRef = useRef(false);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  currentIndexRef.current = currentIndex;
  queueRef.current = queue;
  const queueOccurrenceKeys = syncQueueIdentity(queue);
  const upcoming = queue
    .slice(currentIndex + 1)
    .map((item, offset) => ({
      item,
      queueIndex: currentIndex + offset + 1
    }));

  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
      removalTimeoutsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId)
      );
      removalTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const invalidRunIds = pendingRemovals
      .filter(
        ({ item, queueIndex }) =>
          queueIndex <= currentIndex || queue[queueIndex] !== item
      )
      .map(({ runId }) => runId);

    if (invalidRunIds.length === 0) {
      return;
    }

    invalidRunIds.forEach((runId) => {
      const timeoutId = removalTimeoutsRef.current.get(runId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      removalTimeoutsRef.current.delete(runId);
    });

    const nextPendingRemovals = pendingRemovals.filter(
      ({ runId }) => !invalidRunIds.includes(runId)
    );
    pendingRemovalsRef.current = nextPendingRemovals;
    setPendingRemovals(nextPendingRemovals);
  }, [currentIndex, pendingRemovals, queue]);

  function handleScroll() {
    setIsScrolling(true);
    if (scrollEndTimeoutRef.current) {
      window.clearTimeout(scrollEndTimeoutRef.current);
    }
    scrollEndTimeoutRef.current = window.setTimeout(() => {
      scrollEndTimeoutRef.current = null;
      setIsScrolling(false);
    }, 900);
  }

  function handleQueueKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const scroller = event.currentTarget;
    const pageDistance = Math.max(80, scroller.clientHeight * 0.8);
    const distances: Partial<Record<string, number>> = {
      ArrowDown: 48,
      ArrowUp: -48,
      PageDown: pageDistance,
      PageUp: -pageDistance
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      scroller.scrollTop =
        event.key === "Home" ? 0 : scroller.scrollHeight;
      return;
    }

    const distance = distances[event.key];
    if (distance !== undefined) {
      event.preventDefault();
      scroller.scrollBy({ top: distance });
    }
  }

  function announceMove(item: VideoItem, targetIndex: number) {
    const position = targetIndex - currentIndex;
    setAnnouncement(
      `Moved ${item.title} to position ${position} of the upcoming queue.`
    );
  }

  function moveQueueItem(
    item: VideoItem,
    sourceIndex: number,
    targetIndex: number
  ) {
    if (sourceIndex === targetIndex) {
      return;
    }
    reorderQueueIdentity(sourceIndex, targetIndex);
    reorderQueueItem(sourceIndex, targetIndex);
    announceMove(item, targetIndex);
  }

  function focusQueueSong(queueIndex: number) {
    window.requestAnimationFrame(() => {
      const song = document.querySelector<HTMLLIElement>(
        `[data-queue-song="${queueIndex}"]`
      );
      song?.focus();
    });
  }

  function handleKeyboardReorder(
    event: React.KeyboardEvent<HTMLLIElement>,
    item: VideoItem,
    queueIndex: number
  ) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      !event.altKey
    ) {
      event.preventDefault();
      playQueueItem(queueIndex);
      return;
    }

    if (pendingRemovals.length > 0) {
      return;
    }

    if (
      !event.altKey ||
      (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    ) {
      return;
    }

    event.preventDefault();
    const targetIndex =
      event.key === "ArrowUp" ? queueIndex - 1 : queueIndex + 1;
    if (targetIndex <= currentIndex || targetIndex >= queue.length) {
      return;
    }

    moveQueueItem(item, queueIndex, targetIndex);
    focusQueueSong(targetIndex);
  }

  function handleDragStart(
    event: DragEvent<HTMLLIElement>,
    queueIndex: number
  ) {
    if (pendingRemovals.length > 0) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", queueIndex.toString());
    suppressClickAfterDragRef.current = true;
    setDragState({ sourceIndex: queueIndex, targetIndex: queueIndex });
  }

  function handleDrop(
    event: DragEvent<HTMLLIElement>,
    item: VideoItem,
    targetIndex: number
  ) {
    event.preventDefault();
    const sourceIndex = dragState?.sourceIndex;
    setDragState(null);
    if (sourceIndex === undefined) {
      return;
    }
    moveQueueItem(queue[sourceIndex] ?? item, sourceIndex, targetIndex);
  }

  function updatePendingRemovals(nextPendingRemovals: PendingRemoval[]) {
    pendingRemovalsRef.current = nextPendingRemovals;
    setPendingRemovals(nextPendingRemovals);
  }

  function createQueueOccurrenceKey(item: VideoItem) {
    queueKeyCounterRef.current += 1;
    return `${item.id}-queue-${queueKeyCounterRef.current}`;
  }

  function syncQueueIdentity(nextQueue: VideoItem[]) {
    const current = queueIdentityRef.current;
    if (
      current.items.length === nextQueue.length &&
      current.items.every((item, index) => item === nextQueue[index])
    ) {
      return current.keys;
    }

    const usedIndexes = new Set<number>();
    const nextKeys = nextQueue.map((item, nextIndex) => {
      let matchedIndex =
        current.items[nextIndex] === item &&
        !usedIndexes.has(nextIndex)
          ? nextIndex
          : -1;

      if (matchedIndex < 0) {
        matchedIndex = current.items.findIndex(
          (candidate, candidateIndex) =>
            candidate === item && !usedIndexes.has(candidateIndex)
        );
      }

      if (matchedIndex >= 0) {
        usedIndexes.add(matchedIndex);
        return current.keys[matchedIndex];
      }

      return createQueueOccurrenceKey(item);
    });

    queueIdentityRef.current = {
      items: nextQueue,
      keys: nextKeys
    };
    return nextKeys;
  }

  function removeQueueIdentity(
    queueIndex: number,
    nextQueue: VideoItem[]
  ) {
    const nextKeys = [...queueIdentityRef.current.keys];
    nextKeys.splice(queueIndex, 1);
    queueIdentityRef.current = {
      items: nextQueue,
      keys: nextKeys
    };
  }

  function reorderQueueIdentity(
    sourceIndex: number,
    targetIndex: number
  ) {
    const nextItems = [...queueIdentityRef.current.items];
    const nextKeys = [...queueIdentityRef.current.keys];
    const [movedItem] = nextItems.splice(sourceIndex, 1);
    const [movedKey] = nextKeys.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    nextKeys.splice(targetIndex, 0, movedKey);
    queueIdentityRef.current = {
      items: nextItems,
      keys: nextKeys
    };
  }

  function commitRemoval(runId: number) {
    const pendingRemoval = pendingRemovalsRef.current.find(
      (entry) => entry.runId === runId
    );

    removalTimeoutsRef.current.delete(runId);
    if (!pendingRemoval) {
      return;
    }

    const { item, queueIndex } = pendingRemoval;
    const canRemove =
      queueIndex > currentIndexRef.current &&
      queueRef.current[queueIndex] === item;
    const nextPendingRemovals = pendingRemovalsRef.current
      .filter((entry) => entry.runId !== runId)
      .map((entry) =>
        canRemove && entry.queueIndex > queueIndex
          ? { ...entry, queueIndex: entry.queueIndex - 1 }
          : entry
      );
    updatePendingRemovals(nextPendingRemovals);

    if (canRemove) {
      const nextQueue = [
        ...queueRef.current.slice(0, queueIndex),
        ...queueRef.current.slice(queueIndex + 1)
      ];
      queueRef.current = nextQueue;
      removeQueueIdentity(queueIndex, nextQueue);
      removeQueueItem(queueIndex);
      setAnnouncement(`Removed ${item.title} from the upcoming queue.`);
    }
  }

  function finalizeRemoval(runId: number) {
    const pendingRemoval = pendingRemovalsRef.current.find(
      (entry) => entry.runId === runId
    );

    if (!pendingRemoval || pendingRemoval.phase === "finalizing") {
      return;
    }

    updatePendingRemovals(
      pendingRemovalsRef.current.map((entry) =>
        entry.runId === runId
          ? { ...entry, phase: "finalizing" }
          : entry
      )
    );

    const timeoutId = window.setTimeout(() => commitRemoval(runId), 1_160);
    removalTimeoutsRef.current.set(runId, timeoutId);
  }

  function beginRemoval(item: VideoItem, queueIndex: number) {
    if (
      pendingRemovalsRef.current.some(
        (entry) =>
          entry.queueIndex === queueIndex && entry.item === item
      )
    ) {
      return;
    }

    const runId = removalRunRef.current + 1;
    removalRunRef.current = runId;
    setDragState(null);
    const pendingRemoval: PendingRemoval = {
      item,
      phase: "pending",
      queueIndex,
      runId
    };
    updatePendingRemovals([
      ...pendingRemovalsRef.current,
      pendingRemoval
    ]);
    setAnnouncement(
      `${item.title} will be removed in 3 seconds. Undo is available.`
    );

    const timeoutId = window.setTimeout(
      () => finalizeRemoval(runId),
      3_000
    );
    removalTimeoutsRef.current.set(runId, timeoutId);
  }

  function undoRemoval(pendingRemoval: PendingRemoval) {
    if (pendingRemoval.phase !== "pending") {
      return;
    }

    const timeoutId = removalTimeoutsRef.current.get(pendingRemoval.runId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    removalTimeoutsRef.current.delete(pendingRemoval.runId);
    updatePendingRemovals(
      pendingRemovalsRef.current.filter(
        (entry) => entry.runId !== pendingRemoval.runId
      )
    );
    setAnnouncement(
      `Kept ${pendingRemoval.item.title} in the upcoming queue.`
    );
  }

  return (
    <>
      <aside
        className={`fixed right-0 top-0 z-40 flex h-[100dvh] w-screen flex-col border-l border-[var(--app-sidebar-border)] bg-[var(--app-sidebar-bg)] shadow-sm backdrop-blur transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:h-screen lg:w-[300px] lg:duration-[800ms] ${
          mobileOpen
            ? "visible translate-x-0"
            : "invisible translate-x-full"
        } ${
          open
            ? "lg:visible lg:translate-x-0"
            : "lg:invisible lg:translate-x-full"
        }`}
        id="queue-sidebar"
      >
        <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-[var(--app-sidebar-border)] px-4 lg:hidden">
          <p className="text-xl font-semibold text-white">Queue</p>
          <button
            aria-label="Close queue"
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full text-zinc-200 transition hover:text-accent-strong active:text-accent-strong"
            onClick={onMobileClose}
            type="button"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>

        <div className="hidden shrink-0 items-center justify-between border-b border-[var(--app-sidebar-border)] px-5 py-6 lg:flex">
          <div>
            <p className="text-xl font-semibold text-white">Queue</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Up next
            </p>
          </div>
        </div>
        <button
          aria-label="Hide queue sidebar"
          className="absolute -left-4 top-[calc(50vh-1.5rem)] hidden h-12 w-12 items-center justify-center rounded-full text-zinc-400 transition hover:text-accent-strong active:text-accent-strong lg:flex"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-6 w-6" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col">
          <p className="shrink-0 pt-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 lg:hidden">
            Up next
          </p>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              aria-label="Upcoming songs"
              className={`queue-scroll-area h-full overscroll-contain overflow-x-hidden overflow-y-auto px-5 pb-4 pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-focus-ring)] lg:px-3 lg:py-5 ${
                isScrolling ? "queue-scroll-area-active" : ""
              }`}
              onKeyDown={handleQueueKeyDown}
              onScroll={handleScroll}
              tabIndex={0}
            >
              <div className="mx-auto w-full max-w-md lg:max-w-none">
                {upcoming.length > 0 ? (
                  <ol aria-label="Upcoming queue" className="space-y-2">
                    {upcoming.map(({ item, queueIndex }) => {
                      const isDragSource =
                        dragState?.sourceIndex === queueIndex;
                      const isDragTarget =
                        dragState?.targetIndex === queueIndex &&
                        dragState.sourceIndex !== queueIndex;
                      const pendingRemoval = pendingRemovals.find(
                        (entry) =>
                          entry.queueIndex === queueIndex &&
                          entry.item === item
                      );
                      const isFinalizing =
                        pendingRemoval?.phase === "finalizing";
                      const isFirstUpcoming =
                        queueIndex === currentIndex + 1;

                      return (
                        <li
                          aria-label={
                            pendingRemoval
                              ? undefined
                              : `Play ${item.title} by ${item.channelTitle}`
                          }
                          className={`group relative flex items-center gap-3 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)] ${
                            isFinalizing
                              ? `queue-row-removing pointer-events-none border-transparent bg-transparent ${
                                  isFirstUpcoming
                                    ? "queue-row-removing-first"
                                    : ""
                                }`
                              : pendingRemoval
                                ? "border-transparent bg-transparent"
                              : isDragSource
                                ? "border-[var(--theme-accent)] opacity-55"
                                : isDragTarget
                                  ? "border-[var(--theme-accent)] bg-[var(--theme-accent-subtle)]"
                                  : "border-transparent hover:bg-[var(--theme-surface-hover)]"
                          }`}
                          data-queue-index={queueIndex}
                          data-queue-song={queueIndex}
                          draggable={pendingRemovals.length === 0}
                          key={
                            queueOccurrenceKeys[queueIndex] ??
                            `${item.id}-${queueIndex}`
                          }
                          onClick={(event) => {
                            if (
                              pendingRemoval ||
                              suppressClickAfterDragRef.current ||
                              event.target !== event.currentTarget &&
                                (event.target as Element).closest("button")
                            ) {
                              return;
                            }
                            playQueueItem(queueIndex);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (pendingRemoval) {
                              return;
                            }
                            beginRemoval(item, queueIndex);
                          }}
                          onDragEnd={() => {
                            setDragState(null);
                            window.setTimeout(() => {
                              suppressClickAfterDragRef.current = false;
                            }, 0);
                          }}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            setDragState((current) =>
                              current
                                ? { ...current, targetIndex: queueIndex }
                                : current
                            );
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDragStart={(event) =>
                            handleDragStart(event, queueIndex)
                          }
                          onKeyDown={(event) =>
                            handleKeyboardReorder(
                              event,
                              item,
                              queueIndex
                            )
                          }
                          onDrop={(event) =>
                            handleDrop(event, item, queueIndex)
                          }
                          role={pendingRemoval ? undefined : "button"}
                          tabIndex={pendingRemoval ? -1 : 0}
                        >
                          {pendingRemoval ? (
                            <>
                              <span
                                aria-hidden="true"
                                className={`queue-removal-card-surface pointer-events-none absolute inset-0 ${
                                  isFinalizing
                                    ? "queue-removal-wipe"
                                    : ""
                                }`}
                              />
                              <div
                                className={`relative z-[1] flex min-h-14 w-full items-center justify-center ${
                                  isFinalizing
                                    ? "queue-removal-wipe"
                                    : ""
                                }`}
                              >
                                <button
                                  aria-label={`Undo removal of ${item.title}`}
                                  autoFocus
                                  className="rounded-lg border border-[var(--theme-border-strong)] bg-[var(--theme-surface-raised)] px-5 py-2 text-sm font-semibold text-[var(--theme-text)] shadow-sm transition hover:border-[var(--theme-accent)] hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)] disabled:cursor-default disabled:opacity-70"
                                  disabled={isFinalizing}
                                  onClick={() =>
                                    undoRemoval(pendingRemoval)
                                  }
                                  type="button"
                                >
                                  Undo
                                </button>
                              </div>
                              {isFinalizing ? (
                                <span
                                  aria-hidden="true"
                                  className="queue-card-removal-scrim pointer-events-none absolute z-10"
                                />
                              ) : null}
                            </>
                          ) : (
                            <>
                              <img
                                alt=""
                                className="h-14 w-20 shrink-0 rounded-md object-cover"
                                draggable={false}
                                src={item.thumbnailUrl}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">
                                  {item.title}
                                </p>
                                <p className="truncate text-xs text-zinc-400">
                                  {item.channelTitle}
                                </p>
                                {item.duration ? (
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {item.duration}
                                  </p>
                                ) : null}
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-zinc-400 lg:h-40">
                    <ListMusic
                      aria-hidden="true"
                      className="mb-2 h-6 w-6"
                    />
                    The queue is empty.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          {announcement}
        </div>

        <div className="h-28 shrink-0 overflow-hidden border-t border-[var(--app-sidebar-border)] px-5 py-3 lg:h-56 lg:p-4">
          <div className="mx-auto flex h-full w-full max-w-md flex-col text-center lg:max-w-none lg:text-left">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 lg:mb-3 lg:text-xs">
              Now playing
            </p>
            {currentVideo ? (
              <>
                <div className="flex min-h-0 flex-1 items-center gap-3 rounded-lg text-left lg:hidden">
                  <img
                    alt=""
                    className="h-12 w-[4.5rem] shrink-0 rounded-md object-cover"
                    src={currentVideo.thumbnailUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      <MarqueeText
                        isPlaying={isPlaying}
                        key={`mobile-${playbackRevision}`}
                        resetKey={playbackRevision}
                        text={currentVideo.title}
                      />
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {currentVideo.channelTitle}
                    </p>
                    {currentVideo.duration ? (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {currentVideo.duration}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="hidden min-h-0 flex-1 flex-col gap-2 lg:flex">
                  <img
                    alt=""
                    className="mx-auto h-28 w-full max-w-none shrink-0 rounded-lg object-cover"
                    src={currentVideo.thumbnailUrl}
                  />
                  <div className="min-h-0">
                    <p className="font-semibold text-white">
                      <MarqueeText
                        isPlaying={isPlaying}
                        key={`desktop-${playbackRevision}`}
                        resetKey={playbackRevision}
                        text={currentVideo.title}
                      />
                    </p>
                    <p className="truncate text-sm text-zinc-400">
                      {currentVideo.channelTitle}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center lg:items-start lg:justify-start">
                <p className="text-sm text-zinc-400">
                  Load a playlist to start.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {!open ? (
        <button
          aria-label="Show queue sidebar"
          className="fixed -right-4 top-[calc(50vh-1.5rem)] z-50 hidden h-12 w-12 items-center justify-center text-zinc-200 transition hover:text-accent-strong active:text-accent-strong lg:flex"
          onClick={onToggle}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-6 w-6" />
        </button>
      ) : null}
      <style jsx>{`
        .queue-row-removing {
          --queue-row-gap: 0.5rem;
          animation: queue-row-remove 1160ms linear forwards;
          height: 4.625rem;
          min-height: 0;
          overflow: visible;
        }

        .queue-row-removing-first {
          --queue-row-gap: 0rem;
        }

        .queue-removal-card-surface {
          background: var(--theme-surface-subtle);
          border: 1px solid var(--theme-border);
          border-radius: 0.5rem;
        }

        .queue-removal-wipe {
          animation: queue-removal-card-wipe 900ms
            cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: clip-path;
        }

        .queue-card-removal-scrim {
          animation: queue-card-scrim-sweep 900ms
            cubic-bezier(0.4, 0, 0.2, 1) forwards;
          background: linear-gradient(
            to right,
            transparent 0%,
            color-mix(
                in srgb,
                var(--theme-accent) 5%,
                transparent
              )
              12%,
            color-mix(
                in srgb,
                var(--theme-accent) 14%,
                transparent
              )
              74%,
            color-mix(
                in srgb,
                var(--theme-accent-hover) 30%,
                transparent
              )
              94%,
            transparent 100%
          );
          bottom: -0.5rem;
          left: -1.25rem;
          top: -0.5rem;
          width: calc(72% + 1.25rem);
          will-change: opacity, transform;
        }

        @keyframes queue-row-remove {
          0%,
          77.58% {
            height: 4.625rem;
            margin-top: var(--queue-row-gap);
            opacity: 1;
            overflow: visible;
            padding-bottom: 0.5rem;
            padding-top: 0.5rem;
          }
          77.59% {
            animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            height: 4.625rem;
            margin-top: var(--queue-row-gap);
            opacity: 1;
            overflow: hidden;
            padding-bottom: 0.5rem;
            padding-top: 0.5rem;
          }
          100% {
            border-width: 0;
            height: 0;
            margin-top: 0;
            opacity: 0;
            overflow: hidden;
            padding-bottom: 0;
            padding-top: 0;
          }
        }

        @keyframes queue-removal-card-wipe {
          0% {
            clip-path: inset(0 0 0 0);
            opacity: 1;
          }
          100% {
            clip-path: inset(0 0 0 100%);
            opacity: 0;
          }
        }

        @keyframes queue-card-scrim-sweep {
          0% {
            opacity: 0;
            transform: translateX(-95%);
          }
          12% {
            opacity: 1;
          }
          82% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(145%);
          }
        }
      `}</style>
    </>
  );
}
