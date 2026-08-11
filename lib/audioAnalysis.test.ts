import { describe, expect, it, vi } from "vitest";
import { createAudioAnalysisGraph } from "@/lib/audioAnalysis";

describe("audio analysis graph", () => {
  it("connects once and disconnects/closes once during cleanup", async () => {
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const analyser = { connect: vi.fn(), disconnect: vi.fn(), fftSize: 0, smoothingTimeConstant: 0 };
    const context = {
      state: "running",
      destination: {},
      createMediaElementSource: vi.fn(() => source),
      createAnalyser: vi.fn(() => analyser),
      resume: vi.fn(),
      close: vi.fn(async () => { context.state = "closed"; })
    };
    const graph = createAudioAnalysisGraph({} as HTMLAudioElement, () => context as unknown as AudioContext);
    await graph.dispose();
    await graph.dispose();
    expect(context.createMediaElementSource).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(analyser.disconnect).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });
});
