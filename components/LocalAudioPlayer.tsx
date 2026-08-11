"use client";

import { AlertTriangle, Music2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import {
  createAudioAnalysisGraph,
  type AudioAnalysisGraph
} from "@/lib/audioAnalysis";
import { createLocalTrackObjectUrl } from "@/lib/localMusicStorage";

export function LocalAudioPlayer({ visible }: { visible: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef<AudioAnalysisGraph | null>(null);
  const frameRef = useRef<number | null>(null);
  const leaseRef = useRef<{ release: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);
  const {
    advanceAfterNaturalEnd,
    currentVideo,
    isPlaying,
    playbackRevision,
    setPlayback,
    setPlayerReady,
    volume
  } = usePlayer();

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.23;
    const samples = new Uint8Array(graph?.analyser.frequencyBinCount ?? 64);
    if (graph && isPlaying) {
      graph.analyser.getByteFrequencyData(samples);
    } else {
      samples.fill(18);
    }
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--theme-accent").trim() || "#a78bfa";
    const muted = styles.getPropertyValue("--theme-text-muted").trim() || "#71717a";
    const bars = Math.min(72, samples.length);
    context.lineCap = "round";
    for (let index = 0; index < bars; index += 1) {
      const angle = (Math.PI * 2 * index) / bars - Math.PI / 2;
      const value = samples[Math.floor((index / bars) * samples.length)] / 255;
      const length = Math.max(3 * pixelRatio, value * radius * 0.72);
      context.strokeStyle = isPlaying ? accent : muted;
      context.globalAlpha = isPlaying ? 0.45 + value * 0.55 : 0.38;
      context.lineWidth = Math.max(2, 3 * pixelRatio);
      context.beginPath();
      context.moveTo(
        centerX + Math.cos(angle) * (radius + 6 * pixelRatio),
        centerY + Math.sin(angle) * (radius + 6 * pixelRatio)
      );
      context.lineTo(
        centerX + Math.cos(angle) * (radius + length + 6 * pixelRatio),
        centerY + Math.sin(angle) * (radius + length + 6 * pixelRatio)
      );
      context.stroke();
    }
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = accent;
    context.globalAlpha = isPlaying ? 0.85 : 0.4;
    context.lineWidth = 2 * pixelRatio;
    context.stroke();
    context.globalAlpha = 1;

    if (isPlaying && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frameRef.current = requestAnimationFrame(draw);
    }
  }, [isPlaying]);

  useEffect(() => {
    cancelFrame();
    frameRef.current = requestAnimationFrame(draw);
    return cancelFrame;
  }, [cancelFrame, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      cancelFrame();
      frameRef.current = requestAnimationFrame(draw);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [cancelFrame, draw]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    let cancelled = false;
    setError(null);
    setPlayerReady(false);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    leaseRef.current?.release();
    leaseRef.current = null;

    if (!currentVideo?.storagePath) {
      setError("This track is missing its local storage reference.");
      return;
    }

    void createLocalTrackObjectUrl(currentVideo.storagePath)
      .then((lease) => {
        if (cancelled) {
          lease.release();
          return;
        }
        leaseRef.current = lease;
        audio.src = lease.url;
        audio.load();
      })
      .catch(() => {
        if (!cancelled) {
          setError("This local file is missing or unreadable. Remove the track or import the file again.");
          setPlayback(false);
        }
      });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      leaseRef.current?.release();
      leaseRef.current = null;
    };
  }, [currentVideo?.id, currentVideo?.storagePath, playbackRevision, setPlayback, setPlayerReady]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src || error) {
      return;
    }
    if (isPlaying) {
      void graphRef.current?.resume();
      void audio.play().catch(() => {
        setError("Playback was blocked. Press play again to continue.");
        setPlayback(false);
      });
    } else {
      audio.pause();
    }
  }, [error, isPlaying, setPlayback]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    const initialize = () => {
      if (!audioRef.current || graphRef.current) {
        return;
      }
      try {
        graphRef.current = createAudioAnalysisGraph(audioRef.current);
        void graphRef.current.resume();
      } catch {
        setAnalysisWarning(
          "Audio analysis is unavailable, but the track can still play."
        );
      }
    };
    window.addEventListener("pointerdown", initialize, { once: true });
    window.addEventListener("keydown", initialize, { once: true });
    return () => {
      window.removeEventListener("pointerdown", initialize);
      window.removeEventListener("keydown", initialize);
      const graph = graphRef.current;
      graphRef.current = null;
      void graph?.dispose();
    };
  }, []);

  const shellClass = visible
    ? "relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-black shadow-sm"
    : "fixed -left-[200vw] top-0 h-[180px] w-[320px] overflow-hidden opacity-0 pointer-events-none";

  return (
    <div className={shellClass}>
      <audio
        onCanPlay={() => setPlayerReady(true)}
        onEnded={() => advanceAfterNaturalEnd(playbackRevision)}
        onError={() => {
          setError("This local file could not be decoded by the browser.");
          setPlayback(false);
        }}
        preload="metadata"
        ref={audioRef}
      />
      <div className="media-on-dark relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,var(--accent-soft),transparent_58%),linear-gradient(145deg,#09090b,#18181b)]">
        <canvas aria-label="Circular audio visualizer" className="h-[82%] w-[82%] max-h-[34rem] max-w-[34rem]" ref={canvasRef} role="img" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-accent-soft text-accent flex h-16 w-16 items-center justify-center rounded-full border border-white/10 backdrop-blur sm:h-20 sm:w-20">
            {error || analysisWarning ? <AlertTriangle className="h-7 w-7" /> : <Music2 className="h-7 w-7" />}
          </div>
        </div>
        {error || analysisWarning ? <p className="absolute bottom-4 left-1/2 w-[min(90%,36rem)] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-2 text-center text-xs text-zinc-200 backdrop-blur" role={error ? "alert" : "status"}>{error ?? analysisWarning}</p> : null}
      </div>
    </div>
  );
}
