import type { PlayerState, VideoItem } from "@/types";

export type PlayerCommand =
  | { type: "toggle-playback" }
  | { type: "advance"; expectedPlaybackRevision?: number }
  | { type: "previous" }
  | { type: "toggle-shuffle" }
  | { type: "toggle-repeat" };

export function applyPlayerCommand(
  current: PlayerState,
  command: PlayerCommand
): PlayerState {
  if (command.type === "toggle-playback") {
    return { ...current, isPlaying: !current.isPlaying };
  }
  if (command.type === "toggle-repeat") {
    return { ...current, repeat: !current.repeat };
  }
  if (command.type === "previous") {
    if (current.queue.length === 0) {
      return current;
    }
    return {
      ...current,
      currentIndex:
        current.currentIndex === 0
          ? current.queue.length - 1
          : current.currentIndex - 1,
      playbackRevision: current.playbackRevision + 1,
      isPlaying: true
    };
  }
  if (command.type === "toggle-shuffle") {
    const shuffle = !current.shuffle;
    if (!current.selectedPlaylist) {
      return { ...current, shuffle };
    }
    return {
      ...current,
      shuffle,
      queue: buildWeightedQueue(
        current.selectedPlaylist.videos,
        shuffle,
        current.queue[current.currentIndex]?.id
      ),
      currentIndex: 0
    };
  }

  if (
    current.queue.length === 0 ||
    (command.expectedPlaybackRevision !== undefined &&
      (current.playbackRevision !== command.expectedPlaybackRevision ||
        !current.isPlaying))
  ) {
    return current;
  }
  const isAtEnd = current.currentIndex >= current.queue.length - 1;
  if (isAtEnd && !current.repeat) {
    return { ...current, isPlaying: false };
  }
  if (isAtEnd && current.repeat && current.selectedPlaylist) {
    return {
      ...current,
      queue: buildWeightedQueue(
        current.selectedPlaylist.videos,
        current.shuffle
      ),
      currentIndex: 0,
      playbackRevision: current.playbackRevision + 1,
      isPlaying: true
    };
  }
  return {
    ...current,
    currentIndex: current.currentIndex + 1,
    playbackRevision: current.playbackRevision + 1,
    isPlaying: true
  };
}

export function normalizeFrequency(value?: number) {
  return Math.min(5, Math.max(1, Math.round(value ?? 1)));
}

export function buildWeightedQueue(
  videos: VideoItem[],
  shuffle: boolean,
  firstVideoId?: string
) {
  const queue: VideoItem[] = [];
  for (let pass = 1; pass <= 5; pass += 1) {
    for (const video of videos) {
      if (normalizeFrequency(video.playFrequency) >= pass) {
        queue.push(video);
      }
    }
  }
  const ordered = shuffle ? shuffleWithoutAdjacentDuplicates(queue) : queue;
  if (!firstVideoId) {
    return ordered;
  }
  const requestedIndex = ordered.findIndex((video) => video.id === firstVideoId);
  if (requestedIndex <= 0) {
    return ordered;
  }
  const next = [...ordered];
  const [requested] = next.splice(requestedIndex, 1);
  next.unshift(requested);
  return next;
}

function shuffleWithoutAdjacentDuplicates(videos: VideoItem[]) {
  const remaining = [...videos];
  const shuffled: VideoItem[] = [];
  while (remaining.length > 0) {
    const previousId = shuffled.at(-1)?.id;
    const candidates = remaining
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => video.id !== previousId);
    const pool = candidates.length > 0
      ? candidates
      : remaining.map((video, index) => ({ video, index }));
    const choice = pool[Math.floor(Math.random() * pool.length)];
    shuffled.push(choice.video);
    remaining.splice(choice.index, 1);
  }
  return shuffled;
}
