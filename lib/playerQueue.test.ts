import { describe, expect, it, vi } from "vitest";
import { applyPlayerCommand } from "@/lib/playerQueue";
import type { PlayerState, Playlist, VideoItem } from "@/types";

describe("unified player commands", () => {
  it("supports play/pause, previous, next, repeat, shuffle and natural end for local tracks", () => {
    const initial = state();
    const playing = applyPlayerCommand(initial, { type: "toggle-playback" });
    expect(playing.isPlaying).toBe(true);
    const next = applyPlayerCommand(playing, { type: "advance" });
    expect(next.currentIndex).toBe(1);
    const previous = applyPlayerCommand(next, { type: "previous" });
    expect(previous.currentIndex).toBe(0);
    const repeat = applyPlayerCommand({ ...playing, currentIndex: 1 }, { type: "toggle-repeat" });
    const wrapped = applyPlayerCommand(repeat, { type: "advance", expectedPlaybackRevision: repeat.playbackRevision });
    expect(wrapped.currentIndex).toBe(0);
    expect(wrapped.isPlaying).toBe(true);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const shuffled = applyPlayerCommand(initial, { type: "toggle-shuffle" });
    expect(shuffled.shuffle).toBe(true);
    expect(shuffled.queue).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("ignores stale duplicate natural-end notifications", () => {
    const current = { ...state(), isPlaying: true, playbackRevision: 3 };
    expect(applyPlayerCommand(current, { type: "advance", expectedPlaybackRevision: 2 })).toBe(current);
  });
});

function state(): PlayerState {
  const videos: VideoItem[] = ["a", "b"].map((id) => ({
    id,
    title: id,
    channelTitle: "Local file",
    thumbnailUrl: "track",
    source: "local"
  }));
  const playlist: Playlist = {
    id: "local",
    name: "Local",
    thumbnailUrl: "thumb",
    videoCount: 2,
    source: "local",
    origin: "imported",
    videos
  };
  return {
    selectedPlaylist: playlist,
    queue: videos,
    currentIndex: 0,
    playbackRevision: 0,
    isPlaying: false,
    shuffle: false,
    repeat: false,
    volume: 75
  };
}
