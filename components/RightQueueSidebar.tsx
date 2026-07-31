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

type RemovalConfirmation = {
  item: VideoItem;
  queueIndex: number;
};

type DragState = {
  sourceIndex: number;
  targetIndex: number;
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
  const [confirmation, setConfirmation] =
    useState<RemovalConfirmation | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const confirmationRef = useRef<HTMLDivElement | null>(null);
  const confirmationButtonRef = useRef<HTMLButtonElement | null>(null);
  const suppressClickAfterDragRef = useRef(false);
  const scrollEndTimeoutRef = useRef<number | null>(null);
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
    };
  }, []);

  useEffect(() => {
    if (!confirmation) {
      return;
    }

    if (
      confirmation.queueIndex <= currentIndex ||
      queue[confirmation.queueIndex] !== confirmation.item
    ) {
      setConfirmation(null);
      return;
    }

    confirmationButtonRef.current?.focus();

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        confirmationRef.current &&
        !confirmationRef.current.contains(event.target as Node)
      ) {
        setConfirmation(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmation(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmation, currentIndex, queue]);

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
    if (confirmation || event.target !== event.currentTarget) {
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
    if (confirmation) {
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

        <div
          aria-label="Upcoming songs"
          className={`queue-scroll-area min-h-0 flex-1 overscroll-contain overflow-y-auto px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-focus-ring)] lg:px-3 lg:py-5 ${
            isScrolling ? "queue-scroll-area-active" : ""
          }`}
          onKeyDown={handleQueueKeyDown}
          onScroll={handleScroll}
          tabIndex={0}
        >
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 lg:hidden">
              Up next
            </p>
            {upcoming.length > 0 ? (
              <ol aria-label="Upcoming queue" className="space-y-2">
                {upcoming.map(({ item, queueIndex }) => {
                  const isDragSource =
                    dragState?.sourceIndex === queueIndex;
                  const isDragTarget =
                    dragState?.targetIndex === queueIndex &&
                    dragState.sourceIndex !== queueIndex;
                  const isConfirming =
                    confirmation?.queueIndex === queueIndex &&
                    confirmation.item === item;

                  return (
                    <li
                      aria-label={`Play ${item.title} by ${item.channelTitle}`}
                      className={`group relative flex items-center gap-3 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)] ${
                        isDragSource
                          ? "border-[var(--theme-accent)] opacity-55"
                          : isDragTarget
                            ? "border-[var(--theme-accent)] bg-[var(--theme-accent-subtle)]"
                            : "border-transparent hover:bg-[var(--theme-surface-hover)]"
                      }`}
                      data-queue-index={queueIndex}
                      data-queue-song={queueIndex}
                      draggable={!confirmation}
                      key={`${item.id}-${queueIndex}`}
                      onClick={(event) => {
                        if (
                          confirmation ||
                          suppressClickAfterDragRef.current ||
                          (event.target as Element).closest(
                            "[data-queue-confirmation]"
                          )
                        ) {
                          return;
                        }
                        playQueueItem(queueIndex);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDragState(null);
                        setConfirmation({ item, queueIndex });
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
                      role="button"
                      tabIndex={0}
                      title="Click to play. Drag to reorder."
                    >
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

                      {isConfirming ? (
                        <div
                          aria-label="Remove queue item"
                          className="absolute inset-y-1 right-1 z-20 flex min-w-40 flex-col justify-center rounded-lg border border-[var(--theme-border-strong)] bg-[var(--theme-surface-raised)] px-3 py-2 shadow-xl"
                          data-queue-confirmation
                          onContextMenu={(event) =>
                            event.preventDefault()
                          }
                          onDragStart={(event) =>
                            event.preventDefault()
                          }
                          ref={confirmationRef}
                          role="dialog"
                        >
                          <p className="text-xs font-semibold text-[var(--theme-text)]">
                            Remove from Queue?
                          </p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              className="rounded px-2 py-1 text-xs font-semibold text-[var(--theme-destructive)] transition hover:bg-[var(--theme-destructive-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)]"
                              onClick={() => {
                                removeQueueItem(queueIndex);
                                setConfirmation(null);
                              }}
                              ref={confirmationButtonRef}
                              type="button"
                            >
                              OK
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs font-semibold text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-focus-ring)]"
                              onClick={() => setConfirmation(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
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
    </>
  );
}
