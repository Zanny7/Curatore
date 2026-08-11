import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalStoragePath,
  createLocalTrackObjectUrl,
  deleteUnreferencedLocalFiles,
  importLocalMusicPlaylist,
  type LocalMusicFileStore,
  validateLocalAudioFiles
} from "@/lib/localMusicStorage";
import type { Playlist } from "@/types";

class MemoryStore implements LocalMusicFileStore {
  files = new Map<string, File>();
  failAfter = Number.POSITIVE_INFINITY;
  writes = 0;
  removed: string[] = [];
  async write(path: string, file: File) {
    this.writes += 1;
    if (this.writes > this.failAfter) throw new Error("disk failure");
    this.files.set(path, file);
  }
  async read(path: string) {
    const file = this.files.get(path);
    if (!file) throw new Error("missing");
    return file;
  }
  async remove(path: string) {
    this.removed.push(path);
    this.files.delete(path);
  }
}

beforeEach(() => {
  vi.stubGlobal("navigator", {
    storage: {
      estimate: vi.fn(async () => ({ quota: 1_000_000, usage: 0 })),
      getDirectory: vi.fn(),
      persist: vi.fn(async () => true)
    }
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("local music import", () => {
  it("rejects more than 20 files", () => {
    const files = Array.from({ length: 21 }, (_, index) => audioFile(`${index}.mp3`));
    expect(() => validateLocalAudioFiles(files)).toThrow(/no more than 20/i);
  });

  it("rejects unsupported files", () => {
    expect(() => validateLocalAudioFiles([new File(["x"], "notes.txt", { type: "text/plain" })])).toThrow(/unsupported audio file/i);
  });

  it("gives duplicate filenames unique storage paths", async () => {
    const store = new MemoryStore();
    const playlist = await importLocalMusicPlaylist("Duplicates", [audioFile("song.mp3"), audioFile("song.mp3")], store);
    expect(playlist.videos[0].storagePath).not.toBe(playlist.videos[1].storagePath);
    expect(store.files.size).toBe(2);
  });

  it("never sends local audio files to an application or external API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await importLocalMusicPlaylist("Private", [audioFile("private.mp3")], new MemoryStore());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cleans up files after a failed transactional import", async () => {
    const store = new MemoryStore();
    store.failAfter = 1;
    await expect(importLocalMusicPlaylist("Failure", [audioFile("one.mp3"), audioFile("two.mp3")], store)).rejects.toThrow(/cleaned up/i);
    expect(store.files.size).toBe(0);
    expect(store.removed).toHaveLength(1);
  });

  it("removes only unreferenced OPFS files when deleting a playlist", async () => {
    const store = new MemoryStore();
    const shared = "curatore/local-audio/shared.mp3";
    const unique = "curatore/local-audio/unique.mp3";
    const deleted = playlistWithPaths("deleted", [shared, unique]);
    const survivor = playlistWithPaths("survivor", [shared]);
    await deleteUnreferencedLocalFiles(deleted, [survivor], store);
    expect(store.removed).toEqual([unique]);
  });

  it("revokes an object URL exactly once", async () => {
    const store = new MemoryStore();
    const path = createLocalStoragePath("p", "t", "song.mp3");
    await store.write(path, audioFile("song.mp3"));
    const urlApi = { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() };
    const lease = await createLocalTrackObjectUrl(path, store, urlApi);
    lease.release();
    lease.release();
    expect(urlApi.revokeObjectURL).toHaveBeenCalledOnce();
  });
});

function audioFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "audio/mpeg" });
}

function playlistWithPaths(id: string, paths: string[]): Playlist {
  return {
    id,
    name: id,
    thumbnailUrl: "thumb",
    videoCount: paths.length,
    source: "local",
    origin: "imported",
    videos: paths.map((storagePath, index) => ({
      id: `${id}-${index}`,
      title: "Track",
      channelTitle: "Local file",
      thumbnailUrl: "track",
      source: "local",
      storagePath
    }))
  };
}
