export class CameraRequestGate {
  private generation = 0;

  begin() {
    this.generation += 1;
    return this.generation;
  }

  cancel() {
    this.generation += 1;
  }

  isCurrent(request: number) {
    return request === this.generation;
  }
}

export function acceptCameraStream(
  gate: CameraRequestGate,
  request: number,
  stream: Pick<MediaStream, "getTracks">
) {
  if (gate.isCurrent(request)) {
    return true;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
  return false;
}
