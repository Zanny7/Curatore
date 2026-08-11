// Flip the final boolean to hide the diagnostics panel during development.
// Production builds always disable it.
export const GESTURE_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV === "development" && true;
