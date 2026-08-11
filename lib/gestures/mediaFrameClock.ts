export class MediaFrameClock {
  private lastMediaTime = -1;
  private lastTimestamp = -1;

  next(mediaTime: number, requestedTimestamp: number) {
    if (
      !Number.isFinite(mediaTime) ||
      !Number.isFinite(requestedTimestamp) ||
      mediaTime <= this.lastMediaTime
    ) {
      return undefined;
    }

    this.lastMediaTime = mediaTime;
    const timestamp = Math.max(
      Math.round(requestedTimestamp),
      this.lastTimestamp + 1
    );
    this.lastTimestamp = timestamp;
    return timestamp;
  }
}
