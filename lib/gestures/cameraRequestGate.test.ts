import { describe, expect, it, vi } from "vitest";
import {
  acceptCameraStream,
  CameraRequestGate
} from "./cameraRequestGate";

describe("CameraRequestGate", () => {
  it("prevents a cancelled permission request from starting the camera", () => {
    const gate = new CameraRequestGate();
    const request = gate.begin();
    const stop = vi.fn();

    gate.cancel();
    const accepted = acceptCameraStream(gate, request, {
      getTracks: () => [{ stop } as unknown as MediaStreamTrack]
    });

    expect(accepted).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
  });

  it("accepts only the latest permission request", () => {
    const gate = new CameraRequestGate();
    gate.begin();
    const latest = gate.begin();
    const stop = vi.fn();

    expect(
      acceptCameraStream(gate, latest, {
        getTracks: () => [{ stop } as unknown as MediaStreamTrack]
      })
    ).toBe(true);
    expect(stop).not.toHaveBeenCalled();
  });
});
