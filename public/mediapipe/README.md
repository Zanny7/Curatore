# Bundled MediaPipe assets

Curatore serves these files locally. They are fetched only after a user
explicitly enables webcam gestures; no runtime CDN is used.

## Runtime

- Package: `@mediapipe/tasks-vision`
- Pinned version: `0.10.35`
- Source: https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.35
- Upstream: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- Files: `wasm/vision_wasm_*`

The WASM and loader files are copied without renaming from the package's
published `wasm` directory because `FilesetResolver` relies on those names.

## Gesture Recognizer model

- Model: MediaPipe Gesture Recognizer, float16 bundle, version 1
- Source: https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task
- Model card: https://storage.googleapis.com/mediapipe-assets/gesture_recognizer/model_card_hand_gesture_classification_with_faireness_2022.pdf
- License: Apache License 2.0 (the bundled hand tracking and gesture models)
- SHA-256: `97952348CF6A6A4915C2EA1496B4B37EBABC50CBBF80571435643C455F2B0482`

The Apache License 2.0 text is included in `LICENSE-APACHE-2.0.txt`.
