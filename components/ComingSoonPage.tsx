import Link from "next/link";
import type { ReactNode } from "react";

type ComingSoonPageProps = {
  description: string;
  icon: ReactNode;
  title: string;
};

export function ComingSoonPage({
  description,
  icon,
  title
}: ComingSoonPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center py-10 text-center lg:py-20">
      <div className="bg-accent-soft text-accent flex h-16 w-16 items-center justify-center rounded-full">
        {icon}
      </div>
      <p className="text-accent mt-6 text-sm font-semibold uppercase tracking-[0.18em]">
        Coming soon
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
        {description}
      </p>
      <Link
        className="mt-8 inline-flex items-center justify-center rounded-xl border border-zinc-950 px-5 py-3 font-semibold text-zinc-950 transition hover:border-accent hover:text-accent-strong active:text-accent-strong dark:border-white dark:text-white"
        href="/playlists"
      >
        Browse playlists
      </Link>
    </section>
  );
}
