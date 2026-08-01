import { describe, expect, it } from "vitest";
import { MediaFrameClock } from "./mediaFrameClock";

describe("MediaFrameClock", () => {
  it("skips duplicate camera frames", () => {
    const clock = new MediaFrameClock();
    expect(clock.next(0.1, 1_000)).toBe(1_000);
    expect(clock.next(0.1, 1_100)).toBeUndefined();
    expect(clock.next(0.2, 1_200)).toBe(1_200);
  });

  it("always supplies MediaPipe with increasing integer timestamps", () => {
    const clock = new MediaFrameClock();
    expect(clock.next(0.1, 10.4)).toBe(10);
    expect(clock.next(0.2, 10.4)).toBe(11);
    expect(clock.next(0.3, 9.2)).toBe(12);
  });
});
