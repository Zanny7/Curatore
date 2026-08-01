"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePlayer } from "@/context/PlayerContext";
import {
  acceptCameraStream,
  CameraRequestGate
} from "@/lib/gestures/cameraRequestGate";
import {
  createInitialGestureState,
  getGestureEngineDiagnostics,
  gestureCommandsAreActive,
  processGestureFrame,
  type GestureActivationState,
  type GestureCommand,
  type GestureEngineDiagnostics,
  type GestureEngineState
} from "@/lib/gestures/gestureEngine";
import { GESTURE_DIAGNOSTICS_ENABLED } from "@/lib/gestures/diagnostics";
import {
  createMediaPipeGestureAdapter,
  MEDIAPIPE_FRAME_ERROR,
  type MediaPipeGestureAdapter
} from "@/lib/gestures/mediapipeAdapter";

export type CameraGestureStatus =
  | "disabled"
  | "starting"
  | "enabled"
  | "permission-denied"
  | "no-camera"
  | "insecure-context"
  | "device-error"
  | "model-error";

type GestureContextValue = {
  activationState: GestureActivationState;
  cameraRunning: boolean;
  commandsActive: boolean;
  diagnostics: GestureDiagnostics | null;
  disable: () => void;
  enable: () => Promise<void>;
  previewEnabled: boolean;
  previewStream: MediaStream | null;
  registerSidebarToggle: (
    handler: (() => "shown" | "hidden") | null
  ) => void;
  requested: boolean;
  setPreviewEnabled: (enabled: boolean) => void;
  status: CameraGestureStatus;
};

export type GestureDiagnostics = GestureEngineDiagnostics & {
  recognitionFps: number;
};

const GestureContext = createContext<GestureContextValue | null>(null);
const BASE_INFERENCE_INTERVAL_MS = 1000 / 15;
const MAX_INFERENCE_INTERVAL_MS = 125;
const VIDEO_READY_TIMEOUT_MS = 8_000;

type Feedback = {
  id: number;
  message: string;
};

export function GestureProvider({ children }: { children: ReactNode }) {
  const {
    currentVideo,
    isPlaying,
    next,
    playerReady,
    previous,
    togglePlayback
  } = usePlayer();
  const [status, setStatus] = useState<CameraGestureStatus>("disabled");
  const [requested, setRequested] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [previewEnabled, setPreviewEnabledState] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [commandsActive, setCommandsActive] = useState(false);
  const [diagnostics, setDiagnostics] = useState<GestureDiagnostics | null>(null);
  const [activationState, setActivationState] =
    useState<GestureActivationState>("inactive");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const adapterRef = useRef<MediaPipeGestureAdapter | null>(null);
  const engineRef = useRef<GestureEngineState>(createInitialGestureState());
  const feedbackIdRef = useRef(0);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const inferenceBusyRef = useRef(false);
  const inferenceErrorCountRef = useRef(0);
  const inferenceIntervalRef = useRef(BASE_INFERENCE_INTERVAL_MS);
  const lastInferenceAtRef = useRef(0);
  const mediaDeviceChangeHandlerRef = useRef<(() => void) | null>(null);
  const permissionGateRef = useRef(new CameraRequestGate());
  const publishedActivationStateRef = useRef<GestureActivationState>("inactive");
  const publishedCommandsActiveRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const requestedRef = useRef(false);
  const recognitionTimestampsRef = useRef<number[]>([]);
  const sidebarToggleRef = useRef<(() => "shown" | "hidden") | null>(null);
  const shuttingDownRef = useRef(false);
  const startInferenceLoopRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackEndedHandlerRef = useRef<(() => void) | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackActionsRef = useRef({
    currentVideo,
    isPlaying,
    next,
    playerReady,
    previous,
    togglePlayback
  });

  useEffect(() => {
    playbackActionsRef.current = {
      currentVideo,
      isPlaying,
      next,
      playerReady,
      previous,
      togglePlayback
    };
  }, [currentVideo, isPlaying, next, playerReady, previous, togglePlayback]);

  const announce = useCallback((message: string) => {
    feedbackIdRef.current += 1;
    setFeedback({ id: feedbackIdRef.current, message });
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 2_200);
  }, []);

  const publishEngineState = useCallback((nextState: GestureEngineState) => {
    const nextCommandsActive = gestureCommandsAreActive(nextState);
    if (publishedCommandsActiveRef.current !== nextCommandsActive) {
      publishedCommandsActiveRef.current = nextCommandsActive;
      setCommandsActive(nextCommandsActive);
    }
    if (publishedActivationStateRef.current !== nextState.activationState) {
      publishedActivationStateRef.current = nextState.activationState;
      setActivationState(nextState.activationState);
    }
  }, []);

  const resetEngine = useCallback(() => {
    engineRef.current = createInitialGestureState();
    publishedCommandsActiveRef.current = false;
    publishedActivationStateRef.current = "inactive";
    setCommandsActive(false);
    setActivationState("inactive");
    setDiagnostics(null);
  }, []);

  const stopResources = useCallback(
    (nextStatus: CameraGestureStatus, updateUi = true) => {
      shuttingDownRef.current = true;
      requestedRef.current = false;
      permissionGateRef.current.cancel();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (videoFrameCallbackRef.current !== null) {
        videoRef.current?.cancelVideoFrameCallback(
          videoFrameCallbackRef.current
        );
        videoFrameCallbackRef.current = null;
      }
      startInferenceLoopRef.current = null;
      inferenceBusyRef.current = false;
      inferenceErrorCountRef.current = 0;
      inferenceIntervalRef.current = BASE_INFERENCE_INTERVAL_MS;
      lastInferenceAtRef.current = 0;
      recognitionTimestampsRef.current = [];

      const mediaDevices = navigator.mediaDevices;
      const deviceChangeHandler = mediaDeviceChangeHandlerRef.current;
      if (mediaDevices && deviceChangeHandler) {
        mediaDevices.removeEventListener("devicechange", deviceChangeHandler);
      }
      mediaDeviceChangeHandlerRef.current = null;

      const stream = streamRef.current;
      const trackEndedHandler = trackEndedHandlerRef.current;
      if (stream && trackEndedHandler) {
        for (const track of stream.getTracks()) {
          track.removeEventListener("ended", trackEndedHandler);
        }
      }
      trackEndedHandlerRef.current = null;

      adapterRef.current?.close();
      adapterRef.current = null;

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
        video.removeAttribute("src");
        video.load();
      }
      videoRef.current = null;

      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      streamRef.current = null;
      engineRef.current = createInitialGestureState();
      publishedCommandsActiveRef.current = false;
      publishedActivationStateRef.current = "inactive";

      if (updateUi) {
        setRequested(false);
        setCameraRunning(false);
        setPreviewEnabledState(false);
        setPreviewStream(null);
        setCommandsActive(false);
        setActivationState("inactive");
        setDiagnostics(null);
        setStatus(nextStatus);
      }
      shuttingDownRef.current = false;
    },
    []
  );

  const registerSidebarToggle = useCallback(
    (handler: (() => "shown" | "hidden") | null) => {
      sidebarToggleRef.current = handler;
    },
    []
  );

  const setPreviewEnabled = useCallback((enabled: boolean) => {
    setPreviewEnabledState(Boolean(enabled && streamRef.current));
  }, []);

  const executeCommand = useCallback(
    (command: GestureCommand) => {
      const actions = playbackActionsRef.current;
      switch (command) {
        case "activate":
          announce("Gesture controls activated");
          return;
        case "deactivate":
          announce("Gesture controls deactivated");
          return;
        case "toggle-playback":
          if (!actions.currentVideo || !actions.playerReady) {
            return;
          }
          actions.togglePlayback();
          announce(actions.isPlaying ? "Playback paused" : "Playback started");
          return;
        case "previous":
          if (!actions.currentVideo) {
            return;
          }
          actions.previous();
          announce("Previous song");
          return;
        case "next":
          if (!actions.currentVideo) {
            return;
          }
          actions.next();
          announce("Next song");
          return;
        case "toggle-sidebars": {
          const visibility = sidebarToggleRef.current?.();
          if (visibility) {
            announce(`Side panels ${visibility}`);
          }
          return;
        }
      }
    },
    [announce]
  );

  const disable = useCallback(() => {
    stopResources("disabled");
  }, [stopResources]);

  const enable = useCallback(async () => {
    if (requestedRef.current) {
      return;
    }

    requestedRef.current = true;
    setRequested(true);
    setStatus("starting");
    resetEngine();
    const request = permissionGateRef.current.begin();

    if (!window.isSecureContext) {
      stopResources("insecure-context");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      stopResources("no-camera");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          frameRate: { ideal: 15, max: 20 },
          height: { ideal: 480 },
          width: { ideal: 640 }
        }
      });
    } catch (error) {
      if (!permissionGateRef.current.isCurrent(request)) {
        return;
      }
      stopResources(mapCameraError(error));
      return;
    }

    if (!acceptCameraStream(permissionGateRef.current, request, stream)) {
      return;
    }

    streamRef.current = stream;
    setCameraRunning(true);
    setPreviewStream(stream);
    const trackEndedHandler = () => {
      if (!shuttingDownRef.current && requestedRef.current) {
        stopResources("device-error");
      }
    };
    trackEndedHandlerRef.current = trackEndedHandler;
    for (const track of stream.getTracks()) {
      track.addEventListener("ended", trackEndedHandler);
    }

    const deviceChangeHandler = () => {
      const activeStream = streamRef.current;
      if (
        activeStream &&
        activeStream.getVideoTracks().every((track) => track.readyState !== "live")
      ) {
        stopResources("device-error");
      }
    };
    mediaDeviceChangeHandlerRef.current = deviceChangeHandler;
    navigator.mediaDevices.addEventListener("devicechange", deviceChangeHandler);

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    videoRef.current = video;

    try {
      await waitForVideo(video);
      await video.play();
    } catch {
      if (permissionGateRef.current.isCurrent(request)) {
        stopResources("device-error");
      }
      return;
    }

    if (
      !permissionGateRef.current.isCurrent(request) ||
      !requestedRef.current
    ) {
      return;
    }

    let adapter: MediaPipeGestureAdapter;
    try {
      adapter = await createMediaPipeGestureAdapter();
    } catch {
      if (permissionGateRef.current.isCurrent(request)) {
        stopResources("model-error");
      }
      return;
    }

    if (
      !permissionGateRef.current.isCurrent(request) ||
      !requestedRef.current
    ) {
      adapter.close();
      return;
    }

    adapterRef.current = adapter;
    setStatus("enabled");

    const startLoop = () => {
      if (
        rafRef.current !== null ||
        videoFrameCallbackRef.current !== null ||
        document.hidden ||
        !permissionGateRef.current.isCurrent(request) ||
        !requestedRef.current
      ) {
        return;
      }

      const runInference = (timestamp: number, mediaTime?: number) => {
        if (
          document.hidden ||
          !permissionGateRef.current.isCurrent(request) ||
          !requestedRef.current
        ) {
          return;
        }

        if (
          inferenceBusyRef.current ||
          timestamp - lastInferenceAtRef.current < inferenceIntervalRef.current
        ) {
          return;
        }

        inferenceBusyRef.current = true;
        lastInferenceAtRef.current = timestamp;
        const inferenceStartedAt = performance.now();
        try {
          const hand = adapter.recognize(video, timestamp, mediaTime);
          if (hand === undefined) {
            return;
          }
          if (hand === MEDIAPIPE_FRAME_ERROR) {
            inferenceErrorCountRef.current += 1;
            if (inferenceErrorCountRef.current >= 3) {
              stopResources("model-error");
            }
            return;
          }
          inferenceErrorCountRef.current = 0;
          const result = processGestureFrame(engineRef.current, {
            hand,
            timestamp
          });
          engineRef.current = result.state;
          if (GESTURE_DIAGNOSTICS_ENABLED) {
            const recentRecognitionTimestamps = [
              ...recognitionTimestampsRef.current.filter(
                (sampleTimestamp) => timestamp - sampleTimestamp <= 1_000
              ),
              timestamp
            ];
            recognitionTimestampsRef.current = recentRecognitionTimestamps;
            const timeSpan =
              recentRecognitionTimestamps.at(-1)! -
              recentRecognitionTimestamps[0];
            const recognitionFps =
              recentRecognitionTimestamps.length > 1 && timeSpan > 0
                ? ((recentRecognitionTimestamps.length - 1) * 1_000) / timeSpan
                : recentRecognitionTimestamps.length;
            setDiagnostics({
              ...getGestureEngineDiagnostics(result.state),
              recognitionFps
            });
          }
          publishEngineState(result.state);
          if (result.command) {
            executeCommand(result.command);
          }
        } catch {
          inferenceErrorCountRef.current += 1;
          if (inferenceErrorCountRef.current >= 3) {
            stopResources("model-error");
          }
        } finally {
          const inferenceDuration = performance.now() - inferenceStartedAt;
          inferenceIntervalRef.current = Math.min(
            MAX_INFERENCE_INTERVAL_MS,
            Math.max(BASE_INFERENCE_INTERVAL_MS, inferenceDuration * 1.25)
          );
          inferenceBusyRef.current = false;
        }
      };

      const scheduleNextFrame = () => {
        if ("requestVideoFrameCallback" in video) {
          videoFrameCallbackRef.current = video.requestVideoFrameCallback(
            tickVideoFrame
          );
        } else {
          rafRef.current = window.requestAnimationFrame(tickAnimationFrame);
        }
      };

      const tickVideoFrame: VideoFrameRequestCallback = (
        timestamp,
        metadata
      ) => {
        videoFrameCallbackRef.current = null;
        if (
          document.hidden ||
          !permissionGateRef.current.isCurrent(request) ||
          !requestedRef.current
        ) {
          return;
        }
        scheduleNextFrame();
        runInference(timestamp, metadata.mediaTime);
      };

      const tickAnimationFrame = (timestamp: number) => {
        rafRef.current = null;
        if (
          document.hidden ||
          !permissionGateRef.current.isCurrent(request) ||
          !requestedRef.current
        ) {
          return;
        }
        scheduleNextFrame();
        runInference(timestamp);
      };

      scheduleNextFrame();
    };

    startInferenceLoopRef.current = startLoop;
    startLoop();
  }, [executeCommand, publishEngineState, resetEngine, stopResources]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (videoFrameCallbackRef.current !== null) {
          videoRef.current?.cancelVideoFrameCallback(
            videoFrameCallbackRef.current
          );
          videoFrameCallbackRef.current = null;
        }
        return;
      }

      lastInferenceAtRef.current = 0;
      startInferenceLoopRef.current?.();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    return () => {
      stopResources("disabled", false);
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [stopResources]);

  const value = useMemo<GestureContextValue>(
    () => ({
      activationState,
      cameraRunning,
      commandsActive,
      diagnostics,
      disable,
      enable,
      previewEnabled,
      previewStream,
      registerSidebarToggle,
      requested,
      setPreviewEnabled,
      status
    }),
    [
      activationState,
      cameraRunning,
      commandsActive,
      diagnostics,
      disable,
      enable,
      previewEnabled,
      previewStream,
      registerSidebarToggle,
      requested,
      setPreviewEnabled,
      status
    ]
  );

  return (
    <GestureContext.Provider value={value}>
      {children}
      {feedback ? (
        <div
          aria-live="polite"
          className="theme-control pointer-events-none fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-soft-dark backdrop-blur lg:bottom-8"
          key={feedback.id}
          role="status"
        >
          {feedback.message}
        </div>
      ) : (
        <div aria-live="polite" className="sr-only" role="status" />
      )}
    </GestureContext.Provider>
  );
}

export function useCuratoreGestures() {
  const context = useContext(GestureContext);
  if (!context) {
    throw new Error("useCuratoreGestures must be used inside GestureProvider");
  }
  return context;
}

function mapCameraError(error: unknown): CameraGestureStatus {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "no-camera";
  }
  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    name === "AbortError" ||
    name === "OverconstrainedError"
  ) {
    return "device-error";
  }
  return "device-error";
}

function waitForVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera video did not become ready."));
    }, VIDEO_READY_TIMEOUT_MS);
    const handleLoadedMetadata = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(video.error ?? new Error("Camera video failed."));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);
  });
}
