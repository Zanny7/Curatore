export type GestureActivationState =
  | "inactive"
  | "activation-hold"
  | "active-awaiting-neutral"
  | "active-ready"
  | "deactivation-hold";

export type GestureCommand =
  | "activate"
  | "deactivate"
  | "toggle-playback"
  | "previous"
  | "next"
  | "toggle-sidebars";

export type GestureLandmark = {
  x: number;
  y: number;
  z?: number;
};

export type GestureHandFrame = {
  closedFistScore: number;
  handedness: "Left" | "Right" | "Unknown";
  landmarks: GestureLandmark[];
  openPalmScore: number;
  pointingUpScore: number;
  victoryScore: number;
};

export type GestureFrame = {
  hand: GestureHandFrame | null;
  timestamp: number;
};

export type CannedGestureScores = {
  closedFist: number;
  openPalm: number;
  pointingUp: number;
  victory: number;
};

export type FingerExtensionState = {
  index: boolean;
  middle: boolean;
  pinky: boolean;
  ring: boolean;
  thumb: boolean;
};

type ScoreHistory = {
  [Key in keyof CannedGestureScores]: number[];
};

type PoseCommand = "previous" | "next" | "toggle-sidebars";

export type GestureEngineState = {
  activationHoldStartedAt: number | null;
  activationMissedSamples: number;
  activationPositiveSamples: number;
  activationState: GestureActivationState;
  cooldownUntil: number;
  currentFingerExtensions: FingerExtensionState;
  currentHandSize: number | null;
  currentPinchRatio: number | null;
  deactivationHoldStartedAt: number | null;
  deactivationMissedSamples: number;
  deactivationPositiveSamples: number;
  deactivationReturnState: "active-awaiting-neutral" | "active-ready";
  lastCancellationReason: string | null;
  lastProcessedAt: number;
  neutralStartedAt: number | null;
  pinchArmed: boolean;
  pinchHoldStartedAt: number | null;
  pinchMissedSamples: number;
  pinchPositiveSamples: number;
  poseArmed: boolean;
  poseCandidate: PoseCommand | null;
  poseHoldStartedAt: number | null;
  poseMissedSamples: number;
  posePositiveSamples: number;
  poseReleaseStartedAt: number | null;
  rawScores: CannedGestureScores;
  requiresFistRelease: boolean;
  scoreHistory: ScoreHistory;
  smoothedScores: CannedGestureScores;
};

export type GestureEngineResult = {
  command: GestureCommand | null;
  state: GestureEngineState;
};

export type GestureEngineDiagnostics = {
  candidate: GestureCommand | null;
  fingerExtensions: FingerExtensionState;
  handSize: number | null;
  holdProgress: number;
  lastCancellationReason: string | null;
  missedSamples: number;
  pinchRatio: number | null;
  positiveSamples: number;
  rawScores: CannedGestureScores;
  smoothedScores: CannedGestureScores;
};

export type GestureEngineConfig = {
  activationHoldMs: number;
  activationMinPositiveSamples: number;
  closedFistConfidence: number;
  commandCooldownMs: number;
  deactivationHoldMs: number;
  deactivationMinPositiveSamples: number;
  maxConsecutiveMisses: number;
  minHandSize: number;
  neutralHoldMs: number;
  openPalmConfidence: number;
  pinchCloseRatio: number;
  pinchHoldMs: number;
  pinchMinPositiveSamples: number;
  pinchReleaseRatio: number;
  pointingUpConfidence: number;
  poseHoldMs: number;
  poseMinPositiveSamples: number;
  poseReleaseMs: number;
  scoreHistorySize: number;
  scoreSmoothingAlpha: number;
  victoryConfidence: number;
};

export const GESTURE_CONFIG: GestureEngineConfig = {
  activationHoldMs: 600,
  activationMinPositiveSamples: 5,
  closedFistConfidence: 0.68,
  commandCooldownMs: 500,
  deactivationHoldMs: 600,
  deactivationMinPositiveSamples: 5,
  maxConsecutiveMisses: 2,
  minHandSize: 0.1,
  neutralHoldMs: 160,
  openPalmConfidence: 0.68,
  pinchCloseRatio: 0.22,
  pinchHoldMs: 300,
  pinchMinPositiveSamples: 3,
  pinchReleaseRatio: 0.34,
  pointingUpConfidence: 0.65,
  poseHoldMs: 400,
  poseMinPositiveSamples: 4,
  poseReleaseMs: 180,
  scoreHistorySize: 8,
  scoreSmoothingAlpha: 0.5,
  victoryConfidence: 0.65
};

export function createInitialGestureState(
  requiresFistRelease = false
): GestureEngineState {
  return {
    activationHoldStartedAt: null,
    activationMissedSamples: 0,
    activationPositiveSamples: 0,
    activationState: "inactive",
    cooldownUntil: 0,
    currentFingerExtensions: emptyFingerExtensions(),
    currentHandSize: null,
    currentPinchRatio: null,
    deactivationHoldStartedAt: null,
    deactivationMissedSamples: 0,
    deactivationPositiveSamples: 0,
    deactivationReturnState: "active-ready",
    lastCancellationReason: null,
    lastProcessedAt: 0,
    neutralStartedAt: null,
    pinchArmed: false,
    pinchHoldStartedAt: null,
    pinchMissedSamples: 0,
    pinchPositiveSamples: 0,
    poseArmed: false,
    poseCandidate: null,
    poseHoldStartedAt: null,
    poseMissedSamples: 0,
    posePositiveSamples: 0,
    poseReleaseStartedAt: null,
    rawScores: emptyScores(),
    requiresFistRelease,
    scoreHistory: emptyScoreHistory(),
    smoothedScores: emptyScores()
  };
}

export function gestureCommandsAreActive(state: GestureEngineState) {
  return (
    state.activationState === "active-awaiting-neutral" ||
    state.activationState === "active-ready" ||
    state.activationState === "deactivation-hold"
  );
}

export function processGestureFrame(
  previous: GestureEngineState,
  frame: GestureFrame,
  config: GestureEngineConfig = GESTURE_CONFIG
): GestureEngineResult {
  const state = cloneState(previous);
  state.lastProcessedAt = frame.timestamp;
  updateRecognitionMeasurements(state, frame.hand, config);

  const hand = frame.hand;
  const handIsReliable =
    state.currentHandSize !== null &&
    state.currentHandSize >= config.minHandSize;
  const openPalm =
    handIsReliable &&
    state.smoothedScores.openPalm >= config.openPalmConfidence;
  const closedFist =
    handIsReliable &&
    state.smoothedScores.closedFist >= config.closedFistConfidence;

  if (
    state.activationState === "inactive" ||
    state.activationState === "activation-hold"
  ) {
    if (state.requiresFistRelease) {
      if (!handIsReliable || closedFist) {
        return { command: null, state };
      }
      state.requiresFistRelease = false;
    }

    if (openPalm && !closedFist) {
      if (state.activationState !== "activation-hold") {
        state.activationState = "activation-hold";
        state.activationHoldStartedAt = frame.timestamp;
        state.activationPositiveSamples = 1;
      } else {
        state.activationPositiveSamples += 1;
      }
      state.activationMissedSamples = 0;

      const elapsed =
        frame.timestamp - (state.activationHoldStartedAt ?? frame.timestamp);
      if (
        elapsed >= config.activationHoldMs &&
        state.activationPositiveSamples >= config.activationMinPositiveSamples
      ) {
        state.activationState = "active-awaiting-neutral";
        clearActivationHold(state);
        state.neutralStartedAt = null;
        state.pinchArmed = false;
        state.poseArmed = false;
        return { command: "activate", state };
      }

      return { command: null, state };
    }

    if (state.activationState === "activation-hold") {
      state.activationMissedSamples += 1;
      if (state.activationMissedSamples > config.maxConsecutiveMisses) {
        const reason = describeMiss("Open palm", hand, handIsReliable);
        state.activationState = "inactive";
        clearActivationHold(state);
        state.lastCancellationReason = reason;
      }
    }

    return { command: null, state };
  }

  if (state.activationState === "deactivation-hold") {
    if (closedFist) {
      state.deactivationPositiveSamples += 1;
      state.deactivationMissedSamples = 0;
      const elapsed =
        frame.timestamp - (state.deactivationHoldStartedAt ?? frame.timestamp);
      if (
        elapsed >= config.deactivationHoldMs &&
        state.deactivationPositiveSamples >=
          config.deactivationMinPositiveSamples
      ) {
        return {
          command: "deactivate",
          state: createInitialGestureState(true)
        };
      }
      return { command: null, state };
    }

    state.deactivationMissedSamples += 1;
    if (state.deactivationMissedSamples <= config.maxConsecutiveMisses) {
      return { command: null, state };
    }

    const reason = describeMiss("Closed fist", hand, handIsReliable);
    state.activationState = state.deactivationReturnState;
    clearDeactivationHold(state);
    state.lastCancellationReason = reason;
    return { command: null, state };
  }

  // A fist always preempts release gating, pinch recognition, and pose holds.
  if (closedFist) {
    state.deactivationReturnState = state.activationState;
    state.activationState = "deactivation-hold";
    state.deactivationHoldStartedAt = frame.timestamp;
    state.deactivationPositiveSamples = 1;
    state.deactivationMissedSamples = 0;
    state.neutralStartedAt = null;
    cancelPendingCommands(state, "Playback hold preempted by closed fist");
    return { command: null, state };
  }

  if (state.activationState === "active-awaiting-neutral") {
    const neutral =
      handIsReliable &&
      !openPalm &&
      state.currentPinchRatio !== null &&
      state.currentPinchRatio > config.pinchReleaseRatio;

    if (!neutral) {
      state.neutralStartedAt = null;
      return { command: null, state };
    }

    const neutralStart = state.neutralStartedAt ?? frame.timestamp;
    state.neutralStartedAt = neutralStart;
    if (frame.timestamp - neutralStart < config.neutralHoldMs) {
      return { command: null, state };
    }

    state.activationState = "active-ready";
    state.neutralStartedAt = null;
    state.pinchArmed = true;
    state.poseArmed = true;
    return { command: null, state };
  }

  const pose = handIsReliable
    ? getPoseCommand(state.currentFingerExtensions, state.smoothedScores, config)
    : null;
  updatePinchRelease(state, state.currentPinchRatio, config);
  updatePoseRelease(
    state,
    pose,
    state.currentPinchRatio,
    frame.timestamp,
    config
  );

  const pinchPositive =
    handIsReliable &&
    state.pinchArmed &&
    frame.timestamp >= state.cooldownUntil &&
    state.currentPinchRatio !== null &&
    state.currentPinchRatio <= config.pinchCloseRatio;

  if (state.pinchHoldStartedAt !== null) {
    if (pinchPositive) {
      state.pinchPositiveSamples += 1;
      state.pinchMissedSamples = 0;
    } else {
      state.pinchMissedSamples += 1;
      if (state.pinchMissedSamples <= config.maxConsecutiveMisses) {
        return { command: null, state };
      }

      const reason = describeMiss("Pinch", hand, handIsReliable);
      clearPinchHold(state);
      state.lastCancellationReason = reason;
    }
  } else if (pinchPositive) {
    state.pinchHoldStartedAt = frame.timestamp;
    state.pinchPositiveSamples = 1;
    state.pinchMissedSamples = 0;
  }

  if (state.pinchHoldStartedAt !== null) {
    const elapsed = frame.timestamp - state.pinchHoldStartedAt;
    if (
      elapsed >= config.pinchHoldMs &&
      state.pinchPositiveSamples >= config.pinchMinPositiveSamples
    ) {
      state.pinchArmed = false;
      clearPinchHold(state);
      state.poseArmed = false;
      state.poseReleaseStartedAt = null;
      state.cooldownUntil = frame.timestamp + config.commandCooldownMs;
      return { command: "toggle-playback", state };
    }
    return { command: null, state };
  }

  if (
    !state.poseArmed ||
    frame.timestamp < state.cooldownUntil
  ) {
    clearPoseHold(state);
    return { command: null, state };
  }

  if (state.poseCandidate !== null) {
    if (pose === state.poseCandidate) {
      state.posePositiveSamples += 1;
      state.poseMissedSamples = 0;
    } else {
      const previousCandidate = state.poseCandidate;
      state.poseMissedSamples += 1;
      if (state.poseMissedSamples <= config.maxConsecutiveMisses) {
        return { command: null, state };
      }

      clearPoseHold(state);
      state.lastCancellationReason = pose
        ? `${previousCandidate} replaced by ${pose}`
        : describeMiss(previousCandidate, hand, handIsReliable);

      if (pose !== null) {
        state.poseCandidate = pose;
        state.poseHoldStartedAt = frame.timestamp;
        state.posePositiveSamples = 1;
      }
      return { command: null, state };
    }
  } else if (pose !== null) {
    state.poseCandidate = pose;
    state.poseHoldStartedAt = frame.timestamp;
    state.posePositiveSamples = 1;
    state.poseMissedSamples = 0;
    return { command: null, state };
  } else {
    return { command: null, state };
  }

  const poseHoldStart = state.poseHoldStartedAt ?? frame.timestamp;
  if (
    frame.timestamp - poseHoldStart < config.poseHoldMs ||
    state.posePositiveSamples < config.poseMinPositiveSamples
  ) {
    return { command: null, state };
  }

  const command = state.poseCandidate;
  state.poseArmed = false;
  clearPoseHold(state);
  state.poseReleaseStartedAt = null;
  state.cooldownUntil = frame.timestamp + config.commandCooldownMs;
  return { command, state };
}

export function getGestureEngineDiagnostics(
  state: GestureEngineState,
  config: GestureEngineConfig = GESTURE_CONFIG
): GestureEngineDiagnostics {
  let candidate: GestureCommand | null = null;
  let holdStartedAt: number | null = null;
  let holdDuration = 1;
  let positiveSamples = 0;
  let missedSamples = 0;

  if (state.activationState === "activation-hold") {
    candidate = "activate";
    holdStartedAt = state.activationHoldStartedAt;
    holdDuration = config.activationHoldMs;
    positiveSamples = state.activationPositiveSamples;
    missedSamples = state.activationMissedSamples;
  } else if (state.activationState === "deactivation-hold") {
    candidate = "deactivate";
    holdStartedAt = state.deactivationHoldStartedAt;
    holdDuration = config.deactivationHoldMs;
    positiveSamples = state.deactivationPositiveSamples;
    missedSamples = state.deactivationMissedSamples;
  } else if (state.pinchHoldStartedAt !== null) {
    candidate = "toggle-playback";
    holdStartedAt = state.pinchHoldStartedAt;
    holdDuration = config.pinchHoldMs;
    positiveSamples = state.pinchPositiveSamples;
    missedSamples = state.pinchMissedSamples;
  } else if (state.poseCandidate !== null) {
    candidate = state.poseCandidate;
    holdStartedAt = state.poseHoldStartedAt;
    holdDuration = config.poseHoldMs;
    positiveSamples = state.posePositiveSamples;
    missedSamples = state.poseMissedSamples;
  }

  const holdProgress =
    holdStartedAt === null
      ? 0
      : Math.min(1, Math.max(0, (state.lastProcessedAt - holdStartedAt) / holdDuration));

  return {
    candidate,
    fingerExtensions: { ...state.currentFingerExtensions },
    handSize: state.currentHandSize,
    holdProgress,
    lastCancellationReason: state.lastCancellationReason,
    missedSamples,
    pinchRatio: state.currentPinchRatio,
    positiveSamples,
    rawScores: { ...state.rawScores },
    smoothedScores: { ...state.smoothedScores }
  };
}

export function smoothScoreHistory(
  scores: number[],
  windowSize = 8,
  alpha = 0.5
) {
  const recentScores = scores.slice(-windowSize);
  if (recentScores.length === 0) {
    return 0;
  }

  return recentScores.slice(1).reduce(
    (smoothed, score) => alpha * score + (1 - alpha) * smoothed,
    recentScores[0]
  );
}

export function getHandSize(landmarks: GestureLandmark[]) {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  if (!wrist || !middleMcp || !indexMcp || !pinkyMcp) {
    return null;
  }

  const handLength = distance(wrist, middleMcp);
  const handWidth = distance(indexMcp, pinkyMcp);
  const handSize = (handLength + handWidth) / 2;
  return handSize > 0.0001 ? handSize : null;
}

export function getPinchRatio(landmarks: GestureLandmark[]) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const handSize = getHandSize(landmarks);
  if (!thumbTip || !indexTip || handSize === null) {
    return null;
  }
  return distance(thumbTip, indexTip) / handSize;
}

export function getFingerExtensionState(
  landmarks: GestureLandmark[]
): FingerExtensionState {
  return {
    index: isFingerExtended(landmarks, 5, 6, 8),
    middle: isFingerExtended(landmarks, 9, 10, 12),
    pinky: isFingerExtended(landmarks, 17, 18, 20),
    ring: isFingerExtended(landmarks, 13, 14, 16),
    thumb: isFingerExtended(landmarks, 2, 3, 4)
  };
}

export function isThreeFingerPose(landmarks: GestureLandmark[]) {
  return isThreeFingerExtensionState(getFingerExtensionState(landmarks));
}

function isThreeFingerExtensionState(fingers: FingerExtensionState) {
  return (
    fingers.index &&
    fingers.middle &&
    fingers.ring &&
    !fingers.pinky &&
    !fingers.thumb
  );
}

function getPoseCommand(
  fingers: FingerExtensionState,
  scores: CannedGestureScores,
  config: GestureEngineConfig
): PoseCommand | null {
  if (isThreeFingerExtensionState(fingers)) {
    return "toggle-sidebars";
  }
  if (scores.pointingUp >= config.pointingUpConfidence) {
    return "previous";
  }
  if (scores.victory >= config.victoryConfidence) {
    return "next";
  }
  return null;
}

function isFingerExtended(
  landmarks: GestureLandmark[],
  mcpIndex: number,
  pipIndex: number,
  tipIndex: number
) {
  const wrist = landmarks[0];
  const mcp = landmarks[mcpIndex];
  const pip = landmarks[pipIndex];
  const tip = landmarks[tipIndex];
  const handSize = getHandSize(landmarks);
  if (!wrist || !mcp || !pip || !tip || handSize === null) {
    return false;
  }

  const proximalX = mcp.x - pip.x;
  const proximalY = mcp.y - pip.y;
  const distalX = tip.x - pip.x;
  const distalY = tip.y - pip.y;
  const lengths =
    Math.hypot(proximalX, proximalY) * Math.hypot(distalX, distalY);
  if (lengths <= 0.0001) {
    return false;
  }

  const bendCosine =
    (proximalX * distalX + proximalY * distalY) / lengths;
  return (
    bendCosine < -0.55 &&
    distance(tip, wrist) > distance(pip, wrist) + handSize * 0.1
  );
}

function updateRecognitionMeasurements(
  state: GestureEngineState,
  hand: GestureHandFrame | null,
  config: GestureEngineConfig
) {
  state.rawScores = hand
    ? {
        closedFist: hand.closedFistScore,
        openPalm: hand.openPalmScore,
        pointingUp: hand.pointingUpScore,
        victory: hand.victoryScore
      }
    : emptyScores();

  for (const key of Object.keys(state.rawScores) as Array<
    keyof CannedGestureScores
  >) {
    state.scoreHistory[key] = [
      ...state.scoreHistory[key],
      state.rawScores[key]
    ].slice(-config.scoreHistorySize);
    state.smoothedScores[key] = smoothScoreHistory(
      state.scoreHistory[key],
      config.scoreHistorySize,
      config.scoreSmoothingAlpha
    );
  }

  state.currentHandSize = hand ? getHandSize(hand.landmarks) : null;
  state.currentPinchRatio = hand ? getPinchRatio(hand.landmarks) : null;
  state.currentFingerExtensions = hand
    ? getFingerExtensionState(hand.landmarks)
    : emptyFingerExtensions();
}

function updatePinchRelease(
  state: GestureEngineState,
  pinchRatio: number | null,
  config: GestureEngineConfig
) {
  if (pinchRatio !== null && pinchRatio > config.pinchReleaseRatio) {
    state.pinchArmed = true;
  }
}

function updatePoseRelease(
  state: GestureEngineState,
  pose: PoseCommand | null,
  pinchRatio: number | null,
  timestamp: number,
  config: GestureEngineConfig
) {
  if (state.poseArmed) {
    return;
  }

  const released =
    pose === null &&
    pinchRatio !== null &&
    pinchRatio > config.pinchReleaseRatio;
  if (!released) {
    state.poseReleaseStartedAt = null;
    return;
  }

  const releaseStart = state.poseReleaseStartedAt ?? timestamp;
  state.poseReleaseStartedAt = releaseStart;
  if (timestamp - releaseStart >= config.poseReleaseMs) {
    state.poseArmed = true;
    state.poseReleaseStartedAt = null;
  }
}

function cancelPendingCommands(state: GestureEngineState, reason: string) {
  if (state.pinchHoldStartedAt !== null || state.poseCandidate !== null) {
    state.lastCancellationReason = reason;
  }
  clearPinchHold(state);
  clearPoseHold(state);
}

function clearActivationHold(state: GestureEngineState) {
  state.activationHoldStartedAt = null;
  state.activationPositiveSamples = 0;
  state.activationMissedSamples = 0;
}

function clearDeactivationHold(state: GestureEngineState) {
  state.deactivationHoldStartedAt = null;
  state.deactivationPositiveSamples = 0;
  state.deactivationMissedSamples = 0;
}

function clearPinchHold(state: GestureEngineState) {
  state.pinchHoldStartedAt = null;
  state.pinchPositiveSamples = 0;
  state.pinchMissedSamples = 0;
}

function clearPoseHold(state: GestureEngineState) {
  state.poseCandidate = null;
  state.poseHoldStartedAt = null;
  state.posePositiveSamples = 0;
  state.poseMissedSamples = 0;
}

function describeMiss(
  candidate: string,
  hand: GestureHandFrame | null,
  handIsReliable: boolean
) {
  if (!hand) {
    return `${candidate}: no hand detected for 3 samples`;
  }
  if (!handIsReliable) {
    return `${candidate}: hand below minimum size for 3 samples`;
  }
  return `${candidate}: confidence or pose missed for 3 samples`;
}

function cloneState(state: GestureEngineState): GestureEngineState {
  return {
    ...state,
    currentFingerExtensions: { ...state.currentFingerExtensions },
    rawScores: { ...state.rawScores },
    scoreHistory: {
      closedFist: [...state.scoreHistory.closedFist],
      openPalm: [...state.scoreHistory.openPalm],
      pointingUp: [...state.scoreHistory.pointingUp],
      victory: [...state.scoreHistory.victory]
    },
    smoothedScores: { ...state.smoothedScores }
  };
}

function emptyScores(): CannedGestureScores {
  return { closedFist: 0, openPalm: 0, pointingUp: 0, victory: 0 };
}

function emptyScoreHistory(): ScoreHistory {
  return { closedFist: [], openPalm: [], pointingUp: [], victory: [] };
}

function emptyFingerExtensions(): FingerExtensionState {
  return { index: false, middle: false, pinky: false, ring: false, thumb: false };
}

function distance(a: GestureLandmark, b: GestureLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
