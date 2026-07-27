"use client";

import { ChevronLeft, ChevronRight, ListMusic, X } from "lucide-react";
import { MarqueeText } from "@/components/MarqueeText";
import { usePlayer } from "@/context/PlayerContext";

type RightQueueSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  open: boolean;
  onToggle: () => void;
};

export function RightQueueSidebar({
  mobileOpen,
  onMobileClose,
  open,
  onToggle
}: RightQueueSidebarProps) {
  const { currentIndex, currentVideo, isPlaying, queue } = usePlayer();
  const nextItems = queue.slice(currentIndex + 1, currentIndex + 6);

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

        <div className="hidden items-center justify-between border-b border-[var(--app-sidebar-border)] px-5 py-6 lg:flex">
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

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-4 lg:py-5">
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center lg:block lg:max-w-none">
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 lg:hidden">
              Up next
            </p>
            {nextItems.length > 0 ? (
              <div className="space-y-2 lg:space-y-3">
              {nextItems.map((item, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg p-2 text-left transition hover:text-accent-strong active:text-accent-strong"
                  key={`${item.id}-${currentIndex + index + 1}`}
                >
                  <img
                    alt=""
                    className="h-14 w-20 rounded-md object-cover"
                    src={item.thumbnailUrl}
                  />
                  <div className="min-w-0">
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
                </div>
              ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-zinc-400 lg:h-40">
                <ListMusic aria-hidden="true" className="mb-2 h-6 w-6" />
                The queue is empty.
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--app-sidebar-border)] px-5 py-4 lg:p-5">
          <div className="mx-auto w-full max-w-md text-center lg:max-w-none lg:text-left">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 lg:mb-3 lg:text-xs">
              Now playing
            </p>
            {currentVideo ? (
              <>
                <div className="flex items-center gap-3 rounded-lg p-2 text-left lg:hidden">
                  <img
                    alt=""
                    className="h-14 w-20 shrink-0 rounded-md object-cover"
                    src={currentVideo.thumbnailUrl}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      <MarqueeText
                        isPlaying={isPlaying}
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
                <div className="hidden space-y-3 lg:block">
                  <img
                    alt=""
                    className="mx-auto aspect-video w-full max-w-none rounded-lg object-cover"
                    src={currentVideo.thumbnailUrl}
                  />
                  <div>
                    <p className="font-semibold text-white">
                      <MarqueeText text={currentVideo.title} />
                    </p>
                    <p className="text-sm text-zinc-400">
                      {currentVideo.channelTitle}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Load a playlist to start.
              </p>
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
