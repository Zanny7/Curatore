"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  History,
  Library,
  ListMusic,
  PlayCircle,
  Settings,
  X
} from "lucide-react";
import { UserSection } from "@/components/UserSection";

const navItems = [
  { href: "/player", label: "Player", icon: PlayCircle },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/settings", label: "Settings", icon: Settings }
];

const upcomingItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/history", label: "History", icon: History }
];

type LeftSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
  open: boolean;
  onToggle: () => void;
};

export function LeftSidebar({
  mobileOpen,
  onMobileClose,
  open,
  onToggle
}: LeftSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 flex h-[100dvh] w-screen flex-col border-r border-[var(--app-sidebar-border)] bg-[var(--app-sidebar-bg)] shadow-sm backdrop-blur transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:h-screen lg:w-[300px] lg:duration-[800ms] ${
          mobileOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full"
        } ${
          open
            ? "lg:visible lg:translate-x-0"
            : "lg:invisible lg:-translate-x-full"
        }`}
        id="navigation-sidebar"
      >
        <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-[var(--app-sidebar-border)] px-4 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full text-zinc-200 transition hover:text-accent-strong active:text-accent-strong"
            onClick={onMobileClose}
            type="button"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
          <p className="text-xl font-semibold text-white">Navigation</p>
        </div>

        <div className="hidden items-start justify-between px-6 py-7 lg:flex">
          <div>
            <Link
              aria-label="Curatore player"
              className="text-3xl font-bold tracking-tight text-white transition hover:text-accent-strong active:text-accent-strong"
              href="/player"
            >
              Curatore
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Media Manager
            </p>
          </div>
        </div>
        <button
          aria-label="Hide navigation sidebar"
          className="absolute -right-4 top-[calc(50vh-1.5rem)] hidden h-12 w-12 items-center justify-center rounded-full text-zinc-400 transition hover:text-accent-strong active:text-accent-strong lg:flex"
          onClick={onToggle}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-6 w-6" />
        </button>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full w-full flex-col py-4 lg:py-0">
            <nav
              aria-label="Primary navigation"
              className="flex-1 space-y-1 lg:px-3"
            >
              {navItems.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    className={`group mx-4 grid w-auto grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-4 rounded-lg border-l-4 py-3 pl-[6.7px] pr-4 text-left text-base font-medium transition lg:mx-0 lg:w-full lg:grid-cols-[1.25rem_minmax(0,1fr)] lg:gap-3 lg:px-4 ${
                      active
                        ? "border-accent text-accent-strong"
                        : "border-transparent text-zinc-400 hover:border-accent hover:text-accent-strong active:text-accent-strong"
                    }`}
                    href={href}
                    key={href}
                    onClick={onMobileClose}
                  >
                    <span className="flex h-6 w-6 items-center justify-center lg:h-5 lg:w-5">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[var(--app-sidebar-border)] pt-4 lg:px-3 lg:py-4">
              <p className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400 lg:px-4 lg:text-left lg:text-xs">
                Coming Soon<span className="text-sm">™</span>
              </p>
              <nav aria-label="Upcoming navigation" className="space-y-0.5 lg:space-y-1">
                {upcomingItems.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      className={`mx-4 grid w-auto grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-4 rounded-lg border-l-4 py-2.5 pl-[6.7px] pr-4 text-left text-sm font-medium transition lg:mx-0 lg:w-full lg:grid-cols-[1.25rem_minmax(0,1fr)] lg:gap-3 lg:px-4 lg:py-3 lg:text-base ${
                        active
                          ? "border-accent text-accent-strong"
                          : "border-transparent text-zinc-500 hover:border-accent hover:text-accent-strong active:text-accent-strong"
                      }`}
                      href={href}
                      key={href}
                      onClick={onMobileClose}
                    >
                      <span className="flex h-6 w-6 items-center justify-center lg:h-5 lg:w-5">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        <UserSection />
      </aside>

      {!open ? (
        <button
          aria-label="Show navigation sidebar"
          className="fixed -left-4 top-[calc(50vh-1.5rem)] z-50 hidden h-12 w-12 items-center justify-center text-zinc-200 transition hover:text-accent-strong active:text-accent-strong lg:flex"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-6 w-6" />
        </button>
      ) : null}
    </>
  );
}
