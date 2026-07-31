"use client";

import { useEffect, useRef, useState } from "react";

type MarqueeTextProps = {
  isPlaying?: boolean;
  resetKey?: number | string;
  text: string;
  trigger?: "auto" | "hover" | "static";
};

export function MarqueeText({
  isPlaying = false,
  resetKey,
  text,
  trigger = "auto"
}: MarqueeTextProps) {
  const [running, setRunning] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const delayRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const isHoverTrigger = trigger === "hover";
  const shouldAutoScroll =
    trigger === "auto" &&
    isOverflowing &&
    (isPlaying || hasAutoStarted);
  const triggerClass =
    trigger === "hover"
      ? "marquee-text-hover"
      : shouldAutoScroll
        ? "marquee-text-auto"
        : "marquee-text-static";

  useEffect(() => {
    return () => {
      if (delayRef.current) {
        window.clearTimeout(delayRef.current);
      }

      if (animationRef.current) {
        window.clearTimeout(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setRunning(false);
    setIsOverflowing(false);
    setHasAutoStarted(false);
    clearDelay();
    if (animationRef.current) {
      window.clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  }, [resetKey, text]);

  useEffect(() => {
    if (trigger === "auto" && isPlaying && isOverflowing) {
      setHasAutoStarted(true);
    }
  }, [isOverflowing, isPlaying, trigger]);

  useEffect(() => {
    const measureOverflow = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const textWidth = textRef.current?.getBoundingClientRect().width ?? 0;
      const nextIsOverflowing = textWidth > containerWidth + 1;

      setIsOverflowing((current) =>
        current === nextIsOverflowing ? current : nextIsOverflowing
      );
    };

    measureOverflow();

    const observer = new ResizeObserver(measureOverflow);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [resetKey, text]);

  function clearDelay() {
    if (!delayRef.current) {
      return;
    }

    window.clearTimeout(delayRef.current);
    delayRef.current = null;
  }

  function handlePointerEnter() {
    if (!isHoverTrigger || !isOverflowing || running || delayRef.current) {
      return;
    }

    delayRef.current = window.setTimeout(() => {
      delayRef.current = null;
      setRunning(true);

      animationRef.current = window.setTimeout(() => {
        animationRef.current = null;
        setRunning(false);
      }, 8000);
    }, 650);
  }

  function handlePointerLeave() {
    clearDelay();
  }

  return (
    <span
      aria-label={text}
      className={`marquee-text ${triggerClass} ${
        running ? "marquee-text-running" : ""
      } ${shouldAutoScroll && !isPlaying ? "marquee-text-paused" : ""}`}
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handlePointerEnter}
      onBlur={handlePointerLeave}
      tabIndex={isHoverTrigger ? 0 : undefined}
    >
      <span
        aria-hidden="true"
        className={`marquee-track ${
          running ? "marquee-track-running" : ""
        }`}
        key={`${text}-${resetKey ?? ""}`}
      >
        <span ref={textRef}>{text}</span>
        {isHoverTrigger ? <span>{text}</span> : null}
      </span>
    </span>
  );
}
