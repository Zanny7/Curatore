export type AudioAnalysisGraph = {
  analyser: AnalyserNode;
  resume: () => Promise<void>;
  dispose: () => Promise<void>;
};

export function createAudioAnalysisGraph(
  audio: HTMLAudioElement,
  createContext: () => AudioContext = () => new AudioContext()
): AudioAnalysisGraph {
  const context = createContext();
  const source = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source.connect(analyser);
  analyser.connect(context.destination);
  let disposed = false;

  return {
    analyser,
    async resume() {
      if (!disposed && context.state === "suspended") {
        await context.resume();
      }
    },
    async dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      source.disconnect();
      analyser.disconnect();
      if (context.state !== "closed") {
        await context.close();
      }
    }
  };
}
