"use client";

import { useEffect, useRef, useState } from "react";

type CuratoreCubeLogoProps = {
  size?: "compact" | "brand";
};

const cubeFaces = ["front", "back", "right", "left", "top", "bottom"] as const;
const spinDuration = 10_000;
const snapInterval = 60;
const snapOffset = 30;

type CubeMotion = "spinning" | "settling" | "stopped";

export function CuratoreCubeLogo({
  size = "brand"
}: CuratoreCubeLogoProps) {
  const [motion, setMotion] = useState<CubeMotion>("spinning");
  const spinnerRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const spinStartAngleRef = useRef(0);
  const stoppedAngleRef = useRef(0);

  function startSpinning(angle: number) {
    const spinner = spinnerRef.current;

    if (!spinner) {
      return;
    }

    animationRef.current?.cancel();
    spinStartAngleRef.current = angle;
    animationRef.current = spinner.animate(
      [
        { transform: `rotateY(${angle}deg)` },
        { transform: `rotateY(${angle + 360}deg)` }
      ],
      {
        duration: spinDuration,
        easing: "linear",
        iterations: Infinity
      }
    );
  }

  useEffect(() => {
    startSpinning(0);

    return () => {
      animationRef.current?.cancel();
    };
  }, []);

  function handleToggle() {
    const spinner = spinnerRef.current;
    const animation = animationRef.current;

    if (!spinner || !animation || motion === "settling") {
      return;
    }

    if (motion === "stopped") {
      startSpinning(stoppedAngleRef.current);
      setMotion("spinning");
      return;
    }

    const currentTime =
      typeof animation.currentTime === "number" ? animation.currentTime : 0;
    const turnProgress =
      ((currentTime % spinDuration) + spinDuration) % spinDuration;
    const currentAngle =
      spinStartAngleRef.current + (turnProgress / spinDuration) * 360;
    const nextStopIndex = Math.ceil(
      (currentAngle - snapOffset) / snapInterval + 0.0001
    );
    const targetAngle = snapOffset + nextStopIndex * snapInterval;
    const distance = targetAngle - currentAngle;
    const settleDuration = Math.max(
      280,
      Math.min(1_450, 240 + (distance / snapInterval) * 1_200)
    );

    animation.cancel();
    const settlingAnimation = spinner.animate(
      [
        { transform: `rotateY(${currentAngle}deg)` },
        { transform: `rotateY(${targetAngle}deg)` }
      ],
      {
        duration: settleDuration,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards"
      }
    );

    animationRef.current = settlingAnimation;
    setMotion("settling");

    void settlingAnimation.finished
      .then(() => {
        if (animationRef.current !== settlingAnimation) {
          return;
        }

        stoppedAngleRef.current =
          ((targetAngle % 360) + 360) % 360;
        setMotion("stopped");
      })
      .catch(() => undefined);
  }

  const label =
    motion === "spinning"
      ? "Stop Curatore cube"
      : motion === "settling"
        ? "Curatore cube aligning"
        : "Spin Curatore cube";

  return (
    <button
      aria-label={label}
      aria-pressed={motion === "stopped"}
      className={`curatore-cube-button curatore-cube-button-${size}`}
      disabled={motion === "settling"}
      onClick={handleToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="curatore-cube-spinner"
        ref={spinnerRef}
      >
        <span className="curatore-cube">
          {cubeFaces.map((face) => (
            <span
              className={`curatore-cube-face curatore-cube-face-${face}`}
              key={face}
            />
          ))}
        </span>
      </span>
    </button>
  );
}
