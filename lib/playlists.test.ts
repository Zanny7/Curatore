import { describe, expect, it } from "vitest";
import {
  getPlaybackEngine,
  groupPlaylistsBySource,
  migratePlaylists
} from "@/lib/playlists";
import type { Playlist } from "@/types";

const legacy = {
  id: "legacy",
  name: "Old import",
  thumbnailUrl: "thumb",
  videoCount: 1,
  source: "imported",
  videos: [{ id: "video", title: "Song", channelTitle: "Artist", thumbnailUrl: "track" }]
};

describe("playlist migration and grouping", () => {
  it("migrates existing playlist data to YouTube source type", () => {
    const [playlist] = migratePlaylists([legacy], "imported");
    expect(playlist.source).toBe("youtube");
    expect(playlist.origin).toBe("imported");
    expect(playlist.videos[0].source).toBe("youtube");
  });

  it("persists and reloads local playlist metadata", () => {
    const playlist = makePlaylist("local", "local-list");
    const [reloaded] = migratePlaylists(
      JSON.parse(JSON.stringify([playlist])) as unknown,
      "imported"
    );
    expect(reloaded).toMatchObject({ id: "local-list", source: "local" });
    expect(reloaded.videos[0].storagePath).toBe("curatore/local-audio/a.mp3");
  });

  it("groups YouTube and local playlists and chooses the correct engine", () => {
    const youtube = makePlaylist("youtube", "yt");
    const local = makePlaylist("local", "local");
    expect(groupPlaylistsBySource([local, youtube])).toEqual({
      youtube: [youtube],
      local: [local]
    });
    expect(getPlaybackEngine(local)).toBe("native-audio");
    expect(getPlaybackEngine(youtube)).toBe("youtube-iframe");
  });
});

function makePlaylist(source: Playlist["source"], id: string): Playlist {
  return {
    id,
    name: id,
    thumbnailUrl: "thumb",
    videoCount: 1,
    source,
    origin: "imported",
    videos: [{
      id: `${id}-track`,
      title: "Track",
      channelTitle: source === "local" ? "Local file" : "YouTube",
      thumbnailUrl: "track",
      source,
      storagePath: source === "local" ? "curatore/local-audio/a.mp3" : undefined
    }]
  };
}
