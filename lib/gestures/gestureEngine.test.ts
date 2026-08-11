import { describe, expect, it } from "vitest";
import {
  createInitialGestureState,
  getHandSize,
  getPinchRatio,
  isThreeFingerPose,
  processGestureFrame,
  smoothScoreHistory,
  type GestureEngineState,
  type GestureHandFrame,
  type GestureLandmark
} from "./gestureEngine";

describe("canned-gesture score smoothing", () => {
  it("applies an EMA to the latest eight successful samples", () => {
    expect(smoothScoreHistory([0.2, 0.4])).toBeCloseTo(0.3);
    expect(smoothScoreHistory([0.8, 0])).toBeCloseTo(0.4);
    expect(
      smoothScoreHistory([1, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8])
    ).toBeCloseTo(0.8);
  });

  it("starts recognition only after a smoothed score crosses its threshold", () => {
    let state = createInitialGestureState();
    state = frame(state, 0, openPalm(0.6)).state;
    expect(state.activationState).toBe("inactive");
    state = frame(state, 100, openPalm(0.8)).state;
    expect(state.smoothedScores.openPalm).toBeCloseTo(0.7);
    expect(state.activationState).toBe("activation-hold");
  });

  it("uses the lower pointing threshold independently of open palm", () => {
    const pointingState = frame(readyState(), 0, pointingUp(0.66)).state;
    expect(pointingState.poseCandidate).toBe("previous");

    const palmState = frame(
      createInitialGestureState(),
      0,
      openPalm(0.66)
    ).state;
    expect(palmState.activationState).toBe("inactive");
  });
});

describe("activation and deactivation stability", () => {
  it("requires both 600ms and five positive open-palm samples", () => {
    let state = createInitialGestureState();
    let result = run(state, [0, 100, 200, 300], openPalm());
    state = result.state;
    expect(result.command).toBeNull();
    result = frame(state, 600, openPalm());
    expect(result.command).toBe("activate");
  });

  it("does not let elapsed time alone trigger activation", () => {
    let state = createInitialGestureState();
    state = frame(state, 0, openPalm()).state;
    const result = frame(state, 800, openPalm());
    expect(result.command).toBeNull();
    expect(result.state.activationPositiveSamples).toBe(2);
  });

  it("does not let enough samples trigger before the hold duration", () => {
    const result = run(
      createInitialGestureState(),
      [0, 50, 100, 150, 200],
      openPalm()
    );
    expect(result.command).toBeNull();
    expect(result.state.activationState).toBe("activation-hold");
    expect(result.state.activationPositiveSamples).toBe(5);
  });

  it("does not cancel a stable hold after one confidence dip", () => {
    let state = run(
      createInitialGestureState(),
      [0, 100],
      openPalm(0.8)
    ).state;
    state = frame(state, 200, openPalm(0)).state;
    expect(state.activationState).toBe("activation-hold");
    expect(state.activationMissedSamples).toBe(1);
  });

  it("cancels after three consecutive smoothed misses", () => {
    let state = frame(createInitialGestureState(), 0, openPalm(0.8)).state;
    state = frame(state, 100, openPalm(0)).state;
    expect(state.activationMissedSamples).toBe(1);
    state = frame(state, 200, openPalm(0)).state;
    expect(state.activationMissedSamples).toBe(2);
    state = frame(state, 300, openPalm(0)).state;
    expect(state.activationState).toBe("inactive");
    expect(state.lastCancellationReason).toContain("3 samples");
  });

  it("requires five fist samples and 600ms to deactivate", () => {
    const result = run(
      readyState(),
      [1_000, 1_100, 1_200, 1_300, 1_600],
      closedFist()
    );
    expect(result.command).toBe("deactivate");
    expect(result.state.requiresFistRelease).toBe(true);
  });

  it("gates commands behind a stable neutral release after activation", () => {
    let state = run(
      createInitialGestureState(),
      [0, 100, 200, 300, 600],
      openPalm()
    ).state;
    expect(state.activationState).toBe("active-awaiting-neutral");
    state = frame(state, 700, neutralHand()).state;
    state = frame(state, 860, neutralHand()).state;
    expect(state.activationState).toBe("active-ready");
  });

  it("never runs playback commands while inactive", () => {
    const result = run(
      createInitialGestureState(),
      [0, 200, 400, 800],
      victory()
    );
    expect(result.command).toBeNull();
    expect(result.state.activationState).toBe("inactive");
  });
});

describe("pinch playback", () => {
  it("requires both 300ms and three positive samples", () => {
    let state = readyState();
    state = frame(state, 1_000, pinchHand()).state;
    state = frame(state, 1_100, pinchHand()).state;
    const result = frame(state, 1_300, pinchHand());
    expect(result.command).toBe("toggle-playback");
  });

  it("does not trigger from elapsed time without enough samples", () => {
    const state = frame(readyState(), 1_000, pinchHand()).state;
    const result = frame(state, 1_300, pinchHand());
    expect(result.command).toBeNull();
    expect(result.state.pinchPositiveSamples).toBe(2);
  });

  it("does not trigger from enough samples before 300ms", () => {
    const result = run(readyState(), [1_000, 1_100, 1_200], pinchHand());
    expect(result.command).toBeNull();
    expect(result.state.pinchPositiveSamples).toBe(3);
  });

  it("tolerates two misses and cancels on the third", () => {
    let state = frame(readyState(), 1_000, pinchHand()).state;
    state = frame(state, 1_100, null).state;
    expect(state.pinchHoldStartedAt).toBe(1_000);
    state = frame(state, 1_200, null).state;
    expect(state.pinchMissedSamples).toBe(2);
    state = frame(state, 1_300, null).state;
    expect(state.pinchHoldStartedAt).toBeNull();
    expect(state.lastCancellationReason).toContain("3 samples");
  });

  it("triggers once while held and requires hysteresis release", () => {
    let result = run(readyState(), [1_000, 1_100, 1_300], pinchHand());
    expect(result.command).toBe("toggle-playback");
    let state = result.state;

    for (const timestamp of [1_600, 1_900, 2_200]) {
      result = frame(state, timestamp, pinchHand());
      state = result.state;
      expect(result.command).toBeNull();
    }

    state = frame(state, 2_300, handWithPinchRatio(0.28)).state;
    expect(state.pinchArmed).toBe(false);
    state = frame(state, 2_400, neutralHand()).state;
    expect(state.pinchArmed).toBe(true);
  });
});

describe("held command poses", () => {
  it("maps four pointing samples over 400ms to previous", () => {
    const result = run(
      readyState(),
      [1_000, 1_100, 1_200, 1_400],
      pointingUp()
    );
    expect(result.command).toBe("previous");
  });

  it("maps four victory samples over 400ms to next", () => {
    const result = run(
      readyState(),
      [2_000, 2_100, 2_200, 2_400],
      victory()
    );
    expect(result.command).toBe("next");
  });

  it("maps four three-finger samples over 400ms to sidebars", () => {
    const result = run(
      readyState(),
      [3_000, 3_100, 3_200, 3_400],
      threeFingers()
    );
    expect(result.command).toBe("toggle-sidebars");
  });

  it("requires both pose samples and elapsed time", () => {
    let result = run(readyState(), [1_000, 1_400], pointingUp());
    expect(result.command).toBeNull();
    expect(result.state.posePositiveSamples).toBe(2);

    result = run(readyState(), [1_000, 1_100, 1_200, 1_300], victory());
    expect(result.command).toBeNull();
    expect(result.state.posePositiveSamples).toBe(4);
  });

  it("fires only once while held and rearms after release", () => {
    let result = run(
      readyState(),
      [1_000, 1_100, 1_200, 1_400],
      pointingUp()
    );
    expect(result.command).toBe("previous");
    let state = result.state;

    for (const timestamp of [1_600, 1_900, 2_200]) {
      result = frame(state, timestamp, pointingUp());
      state = result.state;
      expect(result.command).toBeNull();
    }

    state = frame(state, 2_300, neutralHand()).state;
    state = frame(state, 2_360, neutralHand()).state;
    state = frame(state, 2_540, neutralHand()).state;
    expect(state.poseArmed).toBe(true);
    let repeatedCommand = null;
    for (const timestamp of [2_600, 2_700, 2_800, 2_900, 3_000, 3_200]) {
      result = frame(state, timestamp, pointingUp());
      state = result.state;
      repeatedCommand ??= result.command;
    }
    expect(repeatedCommand).toBe("previous");
  });

  it("lets a fist preempt a pending song pose", () => {
    let state = frame(readyState(), 1_000, pointingUp()).state;
    state = run(state, [1_100, 1_200, 1_300], closedFist(0.95)).state;
    expect(state.activationState).toBe("deactivation-hold");
    expect(state.poseCandidate).toBeNull();
  });
});

describe("custom landmark guards", () => {
  it("accepts index, middle and ring but rejects two or four fingers", () => {
    expect(isThreeFingerPose(fingerPose(["index", "middle", "ring"]))).toBe(true);
    expect(isThreeFingerPose(fingerPose(["index", "middle"]))).toBe(false);
    expect(
      isThreeFingerPose(fingerPose(["index", "middle", "ring", "pinky"]))
    ).toBe(false);
  });

  it("prevents a below-minimum-size hand from triggering commands", () => {
    const tinyPalm = openPalm(0.95, scaleLandmarks(baseLandmarks(), 0.25));
    expect(getHandSize(tinyPalm.landmarks)).toBeLessThan(0.1);
    const result = run(
      createInitialGestureState(),
      [0, 100, 200, 300, 700, 800, 900],
      tinyPalm
    );
    expect(result.command).toBeNull();
    expect(result.state.activationState).toBe("inactive");

    const tinyPinch = handWithPinchRatio(0.12);
    tinyPinch.landmarks = scaleLandmarks(tinyPinch.landmarks, 0.25);
    const pinchResult = run(
      readyState(),
      [1_000, 1_100, 1_200, 1_300, 1_400],
      tinyPinch
    );
    expect(getHandSize(tinyPinch.landmarks)).toBeLessThan(0.1);
    expect(pinchResult.command).toBeNull();
  });
});

describe("webcam reset", () => {
  it("clears smoothing and hold state", () => {
    const reset = createInitialGestureState();
    expect(reset.activationState).toBe("inactive");
    expect(reset.activationPositiveSamples).toBe(0);
    expect(reset.poseCandidate).toBeNull();
    expect(reset.scoreHistory).toEqual({
      closedFist: [],
      openPalm: [],
      pointingUp: [],
      victory: []
    });
    expect(reset.currentHandSize).toBeNull();
  });
});

function frame(
  state: GestureEngineState,
  timestamp: number,
  hand: GestureHandFrame | null
) {
  return processGestureFrame(state, { hand, timestamp });
}

function run(
  initialState: GestureEngineState,
  timestamps: number[],
  hand: GestureHandFrame
) {
  let result = { command: null, state: initialState } as ReturnType<
    typeof processGestureFrame
  >;
  for (const timestamp of timestamps) {
    result = frame(result.state, timestamp, hand);
  }
  return result;
}

function readyState(): GestureEngineState {
  return {
    ...createInitialGestureState(),
    activationState: "active-ready",
    pinchArmed: true,
    poseArmed: true
  };
}

function openPalm(
  score = 0.8,
  landmarks: GestureLandmark[] = baseLandmarks()
): GestureHandFrame {
  return hand({ landmarks, openPalmScore: score });
}

function closedFist(score = 0.8): GestureHandFrame {
  return hand({ closedFistScore: score });
}

function neutralHand(): GestureHandFrame {
  return hand();
}

function pointingUp(score = 0.8): GestureHandFrame {
  return hand({ pointingUpScore: score });
}

function victory(score = 0.8): GestureHandFrame {
  return hand({ victoryScore: score });
}

function threeFingers(): GestureHandFrame {
  return hand({ landmarks: fingerPose(["index", "middle", "ring"]) });
}

function pinchHand(): GestureHandFrame {
  return handWithPinchRatio(0.12);
}

function handWithPinchRatio(targetRatio: number): GestureHandFrame {
  const points = baseLandmarks();
  const currentRatio = getPinchRatio(points) ?? 1;
  const currentDistance = Math.abs(points[8].x - points[4].x);
  points[8] = {
    ...points[8],
    x: points[4].x + (currentDistance * targetRatio) / currentRatio
  };
  return hand({ landmarks: points });
}

function hand(overrides: Partial<GestureHandFrame> = {}): GestureHandFrame {
  return {
    closedFistScore: 0.03,
    handedness: "Right",
    landmarks: baseLandmarks(),
    openPalmScore: 0.03,
    pointingUpScore: 0.03,
    victoryScore: 0.03,
    ...overrides
  };
}

type Finger = "index" | "middle" | "ring" | "pinky";

function fingerPose(extended: Finger[]): GestureLandmark[] {
  const points = baseLandmarks();
  const fingers: Array<{
    name: Finger;
    mcp: number;
    pip: number;
    tip: number;
    x: number;
  }> = [
    { name: "index", mcp: 5, pip: 6, tip: 8, x: 0.44 },
    { name: "middle", mcp: 9, pip: 10, tip: 12, x: 0.49 },
    { name: "ring", mcp: 13, pip: 14, tip: 16, x: 0.54 },
    { name: "pinky", mcp: 17, pip: 18, tip: 20, x: 0.59 }
  ];

  for (const finger of fingers) {
    points[finger.mcp] = { x: finger.x, y: 0.61, z: 0 };
    if (extended.includes(finger.name)) {
      points[finger.pip] = { x: finger.x, y: 0.45, z: 0 };
      points[finger.tip] = { x: finger.x, y: 0.22, z: 0 };
    } else {
      points[finger.pip] = { x: finger.x + 0.01, y: 0.53, z: 0 };
      points[finger.tip] = { x: finger.x - 0.02, y: 0.59, z: 0 };
    }
  }

  points[2] = { x: 0.45, y: 0.68, z: 0 };
  points[3] = { x: 0.43, y: 0.64, z: 0 };
  points[4] = { x: 0.47, y: 0.61, z: 0 };
  return points;
}

function scaleLandmarks(points: GestureLandmark[], scale: number) {
  return points.map((point) => ({
    ...point,
    x: 0.5 + (point.x - 0.5) * scale,
    y: 0.5 + (point.y - 0.5) * scale
  }));
}

function baseLandmarks(): GestureLandmark[] {
  const points = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.55,
    z: 0
  }));
  points[0] = { x: 0.5, y: 0.78, z: 0 };
  points[5] = { x: 0.43, y: 0.59, z: 0 };
  points[9] = { x: 0.49, y: 0.55, z: 0 };
  points[13] = { x: 0.55, y: 0.58, z: 0 };
  points[17] = { x: 0.61, y: 0.62, z: 0 };
  points[4] = { x: 0.4, y: 0.38, z: 0 };
  points[8] = { x: 0.6, y: 0.38, z: 0 };
  return points;
}
