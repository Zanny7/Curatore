import { ArrowRight, ListFilter } from "lucide-react";
import Link from "next/link";

export default function HelpCenterPage() {
  return (
    <section className="space-y-8">
      <header>
        <p className="text-accent text-sm font-semibold uppercase tracking-[0.18em]">
          Resources
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
          Help Center
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
          Learn how Curatore&apos;s controls shape your playlists and playback.
        </p>
      </header>

      <Link
        className="theme-card group flex max-w-2xl items-center gap-4 rounded-xl p-4 backdrop-blur transition hover:border-accent sm:p-5"
        href="/help/playlist-sorting"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <ListFilter aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-zinc-950 transition group-hover:text-accent-strong dark:text-white">
            Playlist sorting &amp; frequency
          </span>
          <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
            Understand sorting directions, tag sorting, and weighted play
            frequency.
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-accent-strong"
        />
      </Link>
    </section>
  );
}
