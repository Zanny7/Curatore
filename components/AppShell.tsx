"use client";

import { ListMusic, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, TouchEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalPlayerControls } from "@/components/GlobalPlayerControls";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightQueueSidebar } from "@/components/RightQueueSidebar";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { applyAppearance } from "@/lib/background";
import {
  readStoredBackground,
  readStoredTheme
} from "@/lib/storage";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"navigation" | "queue" | null>(
    null
  );
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPlayerRoute = pathname === "/player";

  useEffect(() => {
    const storedTheme = readStoredTheme() ?? "dark";
    const storedBackground = readStoredBackground();
    const updateAppearance = () =>
      applyAppearance(storedTheme, storedBackground);

    updateAppearance();

    if (storedTheme !== "system") {
      return;
    }

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", updateAppearance);
    return () => systemTheme.removeEventListener("change", updateAppearance);
  }, []);

  useEffect(() => {
    setMobilePanel(null);
  }, [pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeMobilePanelOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMobilePanel(null);
      }
    };

    if (desktopQuery.matches) {
      setMobilePanel(null);
    }

    desktopQuery.addEventListener("change", closeMobilePanelOnDesktop);
    return () =>
      desktopQuery.removeEventListener("change", closeMobilePanelOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobilePanel) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobilePanel(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePanel]);

  const mainClass = useMemo(() => {
    const left = leftOpen ? "lg:pl-[332px]" : "lg:pl-8";
    const right = rightOpen ? "lg:pr-[332px]" : "lg:pr-8";
    return `${left} ${right}`;
  }, [leftOpen, rightOpen]);
  const mainTopPadding = isPlayerRoute
    ? "pt-20 lg:pt-16"
    : "pt-20 lg:pt-6";

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch || window.innerWidth >= 1024) {
      swipeStartRef.current = null;
      return;
    }

    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    const touch = event.changedTouches[0];
    swipeStartRef.current = null;

    if (!start || !touch || window.innerWidth >= 1024) {
      return;
    }

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(horizontalDistance) >= 64 &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.2;

    if (!isHorizontalSwipe) {
      return;
    }

    if (mobilePanel === "navigation" && horizontalDistance < 0) {
      setMobilePanel(null);
      return;
    }

    if (mobilePanel === "queue" && horizontalDistance > 0) {
      setMobilePanel(null);
      return;
    }

    if (!mobilePanel && horizontalDistance > 0) {
      setMobilePanel("navigation");
    }

    if (!mobilePanel && horizontalDistance < 0) {
      setMobilePanel("queue");
    }
  }

  return (
    <div
      className="min-h-screen bg-[var(--theme-background)] bg-cover bg-center bg-fixed text-[var(--theme-text)]"
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      style={{ backgroundImage: "var(--app-background-image)" }}
    >
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--app-sidebar-border)] bg-[var(--app-sidebar-bg)] px-4 backdrop-blur lg:hidden">
        <button
          aria-controls="navigation-sidebar"
          aria-expanded={mobilePanel === "navigation"}
          aria-label="Open navigation"
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-200 transition hover:text-accent-strong active:text-accent-strong"
          onClick={() =>
            setMobilePanel((current) =>
              current === "navigation" ? null : "navigation"
            )
          }
          type="button"
        >
          <Menu aria-hidden="true" className="h-6 w-6" />
        </button>
        <Link
          aria-label="Curatore player"
          className="text-xl font-bold tracking-tight text-white"
          href="/player"
        >
          Curatore
        </Link>
        <button
          aria-controls="queue-sidebar"
          aria-expanded={mobilePanel === "queue"}
          aria-label="Open queue"
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-200 transition hover:text-accent-strong active:text-accent-strong"
          onClick={() =>
            setMobilePanel((current) => (current === "queue" ? null : "queue"))
          }
          type="button"
        >
          <ListMusic aria-hidden="true" className="h-6 w-6" />
        </button>
      </header>

      {mobilePanel ? (
        <button
          aria-label="Close open sidebar"
          className="fixed inset-0 z-[35] bg-[var(--theme-overlay)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobilePanel(null)}
          type="button"
        />
      ) : null}

      <LeftSidebar
        mobileOpen={mobilePanel === "navigation"}
        onMobileClose={() => setMobilePanel(null)}
        onToggle={() => setLeftOpen((value) => !value)}
        open={leftOpen}
      />
      <RightQueueSidebar
        mobileOpen={mobilePanel === "queue"}
        onMobileClose={() => setMobilePanel(null)}
        onToggle={() => setRightOpen((value) => !value)}
        open={rightOpen}
      />

      <main className={`min-h-screen px-4 pb-36 transition-all duration-300 sm:px-6 ${mainTopPadding} ${mainClass}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <YoutubePlayer visible={isPlayerRoute} />
          {children}
        </div>
      </main>

      <GlobalPlayerControls leftOpen={leftOpen} rightOpen={rightOpen} />
    </div>
  );
}
