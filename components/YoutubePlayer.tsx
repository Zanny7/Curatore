"use client";

import { PlayCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent
} from "react";
import { usePlayer } from "@/context/PlayerContext";

type YoutubePlayerProps = {
  visible: boolean;
};

type YoutubeCommand =
  | "getCurrentTime"
  | "pauseVideo"
  | "playVideo"
  | "seekTo"
  | "setOption"
  | "setVolume"
  | "unloadModule";

declare global {
  interface Window {
    __curatoreYoutubeControl?: (playing: boolean) => void;
  }
}

const YOUTUBE_ORIGIN = "https://www.youtube.com";

export function YoutubePlayer({ visible }: YoutubePlayerProps) {
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeLoadedRef = useRef(false);
  const lastCommandRef = useRef<"pauseVideo" | "playVideo" | null>(null);
  const endReachedRef = useRef(false);
  const readyTimeoutRef = useRef<number | null>(null);
  const commandTimeoutsRef = useRef<number[]>([]);
  const captionTimeoutsRef = useRef<number[]>([]);
  const captionsDisabledOnPlaybackRef = useRef(false);
  const trimEndTimeoutRef = useRef<number | null>(null);
  const lastTapRef = useRef<number | null>(null);
  const { currentVideo, isPlaying, next, setPlayback, setPlayerReady, volume } =
    usePlayer();

  const embedUrl = useMemo(() => {
    if (!currentVideo || typeof window === "undefined") {
      return null;
    }

    const url = new URL(`${YOUTUBE_ORIGIN}/embed/${currentVideo.id}`);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("controls", "0");
    url.searchParams.set("disablekb", "1");
    url.searchParams.set("fs", "0");
    url.searchParams.set("iv_load_policy", "3");
    url.searchParams.set("cc_load_policy", "0");
    url.searchParams.set("rel", "0");
    if (currentVideo.startSeconds && currentVideo.startSeconds > 0) {
      url.searchParams.set("start", Math.floor(currentVideo.startSeconds).toString());
    }
    return url.toString();
  }, [currentVideo]);

  const sendCommand = useCallback(
    (func: YoutubeCommand, args: unknown[] = []) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args
        }),
        YOUTUBE_ORIGIN
      );
    },
    []
  );

  const clearCommandRetries = useCallback(() => {
    for (const timeout of commandTimeoutsRef.current) {
      window.clearTimeout(timeout);
    }

    commandTimeoutsRef.current = [];
  }, []);

  const clearCaptionRetries = useCallback(() => {
    for (const timeout of captionTimeoutsRef.current) {
      window.clearTimeout(timeout);
    }

    captionTimeoutsRef.current = [];
  }, []);

  const disableCaptionsWithRetry = useCallback(() => {
    clearCaptionRetries();

    for (const delay of [0, 250, 750, 1500, 3000]) {
      const timeout = window.setTimeout(() => {
        sendCommand("unloadModule", ["captions"]);
        sendCommand("setOption", ["captions", "track", {}]);
      }, delay);
      captionTimeoutsRef.current.push(timeout);
    }
  }, [clearCaptionRetries, sendCommand]);

  const clearTrimEndTimeout = useCallback(() => {
    if (trimEndTimeoutRef.current) {
      window.clearTimeout(trimEndTimeoutRef.current);
      trimEndTimeoutRef.current = null;
    }
  }, []);

  const sendCommandWithRetry = useCallback(
    (
      func: "pauseVideo" | "playVideo" | "setVolume" | "seekTo" | "getCurrentTime",
      args: unknown[] = []
    ) => {
      clearCommandRetries();

      for (const delay of [0, 150, 400, 900, 1600]) {
        const timeout = window.setTimeout(() => sendCommand(func, args), delay);
        commandTimeoutsRef.current.push(timeout);
      }
    },
    [clearCommandRetries, sendCommand]
  );

  const syncPlayback = useCallback(
    (playing: boolean) => {
      const command = playing ? "playVideo" : "pauseVideo";
      lastCommandRef.current = command;

      if (playing && !iframeLoadedRef.current && iframeRef.current?.src) {
        const url = new URL(iframeRef.current.src);
        url.searchParams.set("autoplay", "1");
        iframeRef.current.src = url.toString();
      }

      sendCommandWithRetry(command);
    },
    [sendCommandWithRetry]
  );

  const handleIframeLoad = useCallback(() => {
    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
    }

    readyTimeoutRef.current = window.setTimeout(() => {
      iframeLoadedRef.current = true;
      setPlayerReady(true);
      sendCommandWithRetry("setVolume", [volume]);
      disableCaptionsWithRetry();

      if (currentVideo?.startSeconds && currentVideo.startSeconds > 0) {
        sendCommand("seekTo", [currentVideo.startSeconds, true]);
      }

      if (isPlaying) {
        syncPlayback(true);
      }
    }, 300);
  }, [
    currentVideo?.startSeconds,
    disableCaptionsWithRetry,
    isPlaying,
    sendCommand,
    sendCommandWithRetry,
    setPlayerReady,
    syncPlayback,
    volume
  ]);

  useEffect(() => {
    window.__curatoreYoutubeControl = syncPlayback;

    return () => {
      delete window.__curatoreYoutubeControl;
    };
  }, [syncPlayback]);

  useEffect(() => {
    lastCommandRef.current = null;
    endReachedRef.current = false;
    iframeLoadedRef.current = false;
    captionsDisabledOnPlaybackRef.current = false;
    setPlayerReady(false);
    clearCommandRetries();
    clearCaptionRetries();
    clearTrimEndTimeout();

    if (readyTimeoutRef.current) {
      window.clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
  }, [
    clearCaptionRetries,
    clearCommandRetries,
    clearTrimEndTimeout,
    currentVideo?.id,
    setPlayerReady
  ]);

  useEffect(() => {
    sendCommandWithRetry("setVolume", [volume]);
  }, [sendCommandWithRetry, volume]);

  useEffect(() => {
    if (!currentVideo) {
      return;
    }

    syncPlayback(isPlaying);
  }, [currentVideo, isPlaying, syncPlayback]);

  useEffect(() => {
    clearTrimEndTimeout();

    if (
      !isPlaying ||
      !currentVideo?.endSeconds ||
      currentVideo.endSeconds <= (currentVideo.startSeconds ?? 0)
    ) {
      return;
    }

    const trimDurationMs =
      (currentVideo.endSeconds - (currentVideo.startSeconds ?? 0)) * 1000;

    trimEndTimeoutRef.current = window.setTimeout(() => {
      if (endReachedRef.current) {
        return;
      }

      endReachedRef.current = true;
      next();
    }, trimDurationMs);

    return clearTrimEndTimeout;
  }, [
    clearTrimEndTimeout,
    currentVideo?.endSeconds,
    currentVideo?.id,
    currentVideo?.startSeconds,
    isPlaying,
    next
  ]);

  useEffect(() => {
    if (
      !currentVideo?.endSeconds ||
      currentVideo.endSeconds <= (currentVideo.startSeconds ?? 0)
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      sendCommand("getCurrentTime");
    }, 500);

    return () => window.clearInterval(interval);
  }, [
    currentVideo?.endSeconds,
    currentVideo?.id,
    currentVideo?.startSeconds,
    sendCommand
  ]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== YOUTUBE_ORIGIN) {
        return;
      }

      let payload: { event?: string; info?: unknown } | null = null;

      try {
        payload =
          typeof event.data === "string"
            ? (JSON.parse(event.data) as { event?: string; info?: unknown })
            : null;
      } catch {
        return;
      }

      if (payload?.event !== "infoDelivery") {
        return;
      }

      if (typeof payload.info === "number") {
        if (
          currentVideo?.endSeconds &&
          currentVideo.endSeconds > (currentVideo.startSeconds ?? 0) &&
          payload.info >= currentVideo.endSeconds &&
          !endReachedRef.current
        ) {
          endReachedRef.current = true;
          next();
        }

        return;
      }

      if (!payload.info || typeof payload.info !== "object") {
        return;
      }

      const info = payload.info as {
        currentTime?: number;
        playerState?: number;
      };

      if (info.playerState === 0) {
        endReachedRef.current = true;
        next();
      }

      if (info.playerState === 1) {
        if (!captionsDisabledOnPlaybackRef.current) {
          captionsDisabledOnPlaybackRef.current = true;
          disableCaptionsWithRetry();
        }
        setPlayback(true);
      }

      if (info.playerState === 2 && lastCommandRef.current === "pauseVideo") {
        setPlayback(false);
      }

      if (
        currentVideo?.endSeconds &&
        currentVideo.endSeconds > (currentVideo.startSeconds ?? 0) &&
        typeof info.currentTime === "number" &&
        info.currentTime >= currentVideo.endSeconds &&
        !endReachedRef.current
      ) {
        endReachedRef.current = true;
        next();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    currentVideo?.endSeconds,
    currentVideo?.id,
    currentVideo?.startSeconds,
    disableCaptionsWithRetry,
    next,
    setPlayback
  ]);

  useEffect(() => {
    return () => {
      clearCommandRetries();
      clearCaptionRetries();
      clearTrimEndTimeout();
      setPlayerReady(false);

      if (readyTimeoutRef.current) {
        window.clearTimeout(readyTimeoutRef.current);
      }
    };
  }, [
    clearCaptionRetries,
    clearCommandRetries,
    clearTrimEndTimeout,
    setPlayerReady
  ]);

  const shellClass = visible
    ? "relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-black shadow-sm"
    : "fixed -left-[200vw] top-0 h-[180px] w-[320px] overflow-hidden opacity-0 pointer-events-none";

  const enterFullscreen = useCallback(() => {
    const shell = playerShellRef.current;
    if (!shell || document.fullscreenElement) {
      return;
    }

    void shell.requestFullscreen().catch(() => undefined);
  }, []);

  function handlePlayerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      return;
    }

    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < 320) {
      lastTapRef.current = null;
      enterFullscreen();
      return;
    }

    lastTapRef.current = now;
  }

  return (
    <div className={shellClass} aria-hidden={!visible} ref={playerShellRef}>
      {embedUrl ? (
        <>
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="pointer-events-none h-full w-full"
            onLoad={handleIframeLoad}
            ref={iframeRef}
            src={embedUrl}
            tabIndex={-1}
            title={currentVideo?.title ?? "YouTube player"}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 touch-manipulation"
            onContextMenu={(event) => event.preventDefault()}
            onDoubleClick={(event) => {
              event.preventDefault();
              enterFullscreen();
            }}
            onPointerDown={(event) => event.preventDefault()}
            onPointerUp={handlePlayerPointerUp}
          />
        </>
      ) : (
        <div className="media-on-dark flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,var(--accent-soft),transparent_40%),linear-gradient(135deg,#09090b,#18181b)] px-4 py-3 text-center sm:px-6">
          <div className="text-accent mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-sm sm:mb-4 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
            <PlayCircle aria-hidden="true" className="h-7 w-7 sm:h-9 sm:w-9 lg:h-11 lg:w-11" />
          </div>
          <p className="text-base font-semibold text-white sm:text-lg">
            No playlist loaded
          </p>
          <p className="mt-1 max-w-md text-xs leading-5 text-zinc-400 sm:mt-2 sm:text-sm sm:leading-6">
            Choose a playlist to start playback.
          </p>
        </div>
      )}
    </div>
  );
}
