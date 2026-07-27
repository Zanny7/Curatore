import { ArrowDownUp, Info, Repeat2, Tags } from "lucide-react";
import Link from "next/link";

export default function PlaylistSortingHelpPage() {
  return (
    <section className="space-y-8">
      <header>
        <Link
          className="text-sm font-semibold text-zinc-500 transition hover:text-accent-strong dark:text-zinc-400"
          href="/help"
        >
          Help Center
        </Link>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
          Playlist sorting &amp; frequency
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-300">
          Organize the playlist view without changing its songs, and control
          how often individual songs appear during playback.
        </p>
      </header>

      <div className="space-y-5">
        <HelpSection
          icon={<ArrowDownUp aria-hidden="true" className="h-5 w-5" />}
          title="Sorting a playlist"
        >
          <p>
            Select <strong>Song</strong>, <strong>Freq</strong>, or{" "}
            <strong>Rating</strong> to sort by that value. Select the same
            heading again to alternate between ascending and descending order.
            The arrow beside the heading shows the current direction.
          </p>
          <p>
            Sorting changes only the order you see. It does not remove songs
            or permanently rewrite the playlist&apos;s manual order. Manual
            drag-and-drop ordering is paused while a sorted view is active.
          </p>
        </HelpSection>

        <HelpSection
          icon={<Tags aria-hidden="true" className="h-5 w-5" />}
          title="Sorting by a tag"
        >
          <p>
            Use the small picker beside <strong>Tags</strong> to choose a tag,
            then select Tags to alternate between its lowest and highest match
            ratings. Songs without the selected tag remain at the end.
          </p>
          <p>
            The selected tag is highlighted on each matching song. Choose{" "}
            <strong>-</strong> in the picker to clear tag sorting and return
            every tag pill to its neutral color.
          </p>
        </HelpSection>

        <HelpSection
          icon={<Repeat2 aria-hidden="true" className="h-5 w-5" />}
          title="Play frequency"
        >
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
        </HelpSection>
      </div>
    </section>
  );
}

function HelpSection({
  children,
  icon,
  title
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-[var(--app-sidebar-border)] dark:bg-[var(--app-control-bg)] sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          {icon}
        </span>
        <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="mt-5 max-w-3xl space-y-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
        {children}
      </div>
    </article>
  );
}
