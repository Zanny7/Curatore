import type { GestureHandFrame } from "@/lib/gestures/gestureEngine";
import { MediaFrameClock } from "@/lib/gestures/mediaFrameClock";

const WASM_ASSET_PATH = "/mediapipe/wasm";
const MODEL_ASSET_PATH =
  "/mediapipe/models/gesture_recognizer.task";

export const MEDIAPIPE_RUNTIME_VERSION = "0.10.35";
export const MEDIAPIPE_GESTURE_MODEL_VERSION = "float16/1";
export const MEDIAPIPE_FRAME_ERROR = Symbol("mediapipe-frame-error");

export type MediaPipeGestureAdapter = {
  close: () => void;
  recognize: (
    video: HTMLVideoElement,
    timestamp: number,
    mediaTime?: number
  ) =>
    | GestureHandFrame
    | null
    | undefined
    | typeof MEDIAPIPE_FRAME_ERROR;
};

export async function createMediaPipeGestureAdapter(): Promise<MediaPipeGestureAdapter> {
  // Keep the substantial runtime out of the initial application bundle and do not
  // initialize it until camera gestures have been explicitly requested.
  const { FilesetResolver, GestureRecognizer } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
  const recognizer = await GestureRecognizer.createFromOptions(fileset, {
    baseOptions: {
      delegate: "CPU",
      modelAssetPath: MODEL_ASSET_PATH
    },
    cannedGesturesClassifierOptions: {
      categoryAllowlist: [
        "Open_Palm",
        "Closed_Fist",
        "Pointing_Up",
        "Victory",
        "None"
      ],
      scoreThreshold: 0.5
    },
    minHandDetectionConfidence: 0.62,
    minHandPresenceConfidence: 0.62,
    minTrackingConfidence: 0.62,
    numHands: 1,
    runningMode: "VIDEO"
  });
  const frameClock = new MediaFrameClock();

  return {
    close: () => recognizer.close(),
    recognize(video, timestamp, mediaTime) {
      if (
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.paused ||
        video.ended ||
        video.seeking ||
        video.videoWidth === 0 ||
        video.videoHeight === 0 ||
        !Number.isFinite(mediaTime ?? video.currentTime)
      ) {
        return undefined;
      }

      const inferenceTimestamp = frameClock.next(
        mediaTime ?? video.currentTime,
        timestamp
      );
      if (inferenceTimestamp === undefined) {
        return undefined;
      }
      let result: ReturnType<typeof recognizer.recognizeForVideo>;
      try {
        result = recognizer.recognizeForVideo(video, inferenceTimestamp);
      } catch {
        // A camera can briefly expose an unusable decoded frame while changing
        // state. Report it as a recoverable frame error instead of allowing the
        // exception to escape through the browser's animation callback.
        return MEDIAPIPE_FRAME_ERROR;
      }
      const landmarks = result.landmarks[0];
      if (!landmarks || landmarks.length < 21) {
        return null;
      }

      const categories = result.gestures[0] ?? [];
      const scoreFor = (name: string) =>
        categories.find((category) => category.categoryName === name)?.score ?? 0;
      const handednessName = result.handedness[0]?.[0]?.categoryName;
      const handedness =
        handednessName === "Left" || handednessName === "Right"
          ? handednessName
          : "Unknown";

      return {
        closedFistScore: scoreFor("Closed_Fist"),
        handedness,
        landmarks: landmarks.map(({ x, y, z }) => ({ x, y, z })),
        openPalmScore: scoreFor("Open_Palm"),
        pointingUpScore: scoreFor("Pointing_Up"),
        victoryScore: scoreFor("Victory")
      };
    }
  };
}
