import { Info, Repeat2 } from "lucide-react";

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
          Clear explanations of Curatore&apos;s controls and how they affect
          your playlists.
        </p>
      </header>

      <article
        className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-[var(--app-sidebar-border)] dark:bg-[var(--app-control-bg)] sm:p-7"
        id="frequency"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
            <Repeat2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-accent text-xs font-semibold uppercase tracking-[0.16em]">
              Playlist behavior
            </p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-950 dark:text-white">
              Play frequency
            </h2>
          </div>
        </div>

        <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
          <p>
            Frequency controls how many times a song appears during one
            complete playlist cycle. Every song starts at <strong>1x</strong>,
            meaning it plays once before that cycle is complete.
          </p>
          <p>
            Setting a song to <strong>3x</strong> gives it three plays in the
            cycle. Compared with the standard 1x setting, that adds{" "}
            <strong>two extra plays</strong>—not three.
          </p>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-[var(--app-sidebar-border)] dark:bg-white/[0.035]">
            <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-100">
              <Info aria-hidden="true" className="h-4 w-4 text-accent-strong" />
              Example
            </div>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              A playlist with 20 songs at 1x contains 20 plays per cycle. If
              one song changes to 3x, the cycle contains 22 plays: that song
              plays three times, while each of the other 19 songs plays once.
            </p>
          </div>

          <p>
            Frequency does not change playback speed or create another copy of
            the song. It only changes how often the song is included when
            Curatore builds the playback cycle.
          </p>
        </div>
      </article>
    </section>
  );
}
