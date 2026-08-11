import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PlayerProvider } from "@/context/PlayerContext";
import { GestureProvider } from "@/context/GestureContext";
import {
  createThemeBootstrapScript,
  createThemeStyleSheet
} from "@/lib/background";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Curatore",
  description: "A YouTube playlist-based music and video player."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      data-curatore-theme="true"
      data-mode="dark"
      data-shell-theme="midnight"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: createThemeStyleSheet() }}
          id="curatore-theme-tokens"
        />
        <script
          dangerouslySetInnerHTML={{ __html: createThemeBootstrapScript() }}
          id="curatore-theme-bootstrap"
        />
      </head>
      <body
        className={`${inter.variable} bg-[var(--theme-background)] font-sans text-[var(--theme-text)] antialiased`}
      >
        <PlayerProvider>
          <GestureProvider>
            <AppShell>{children}</AppShell>
          </GestureProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
