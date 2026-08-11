import { createClientId } from "@/lib/id";
import { localMusicThumbnail } from "@/lib/playlists";
import type { Playlist, VideoItem } from "@/types";

export const MAX_LOCAL_IMPORT_FILES = 20;
const AUDIO_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "opus",
  "wav",
  "webm"
]);

export interface LocalMusicFileStore {
  write(path: string, file: File): Promise<void>;
  read(path: string): Promise<File>;
  remove(path: string): Promise<void>;
}

export class OpfsLocalMusicFileStore implements LocalMusicFileStore {
  async write(path: string, file: File) {
    const { directory, fileName } = await resolveParent(path, true);
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(file);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      await directory.removeEntry(fileName).catch(() => undefined);
      throw error;
    }
  }

  async read(path: string) {
    const { directory, fileName } = await resolveParent(path, false);
    const handle = await directory.getFileHandle(fileName);
    return handle.getFile();
  }

  async remove(path: string) {
    const { directory, fileName } = await resolveParent(path, false);
    await directory.removeEntry(fileName);
  }
}

export function supportsLocalMusicStorage() {
  return Boolean(
    typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === "function"
  );
}

export async function preparePersistentStorage(requiredBytes: number) {
  if (!supportsLocalMusicStorage()) {
    throw new Error(
      "Local music storage is not supported in this browser. Use a current desktop Chromium browser."
    );
  }

  const estimate = await navigator.storage.estimate();
  const available = Math.max(
    0,
    (estimate.quota ?? Number.POSITIVE_INFINITY) - (estimate.usage ?? 0)
  );
  if (available < requiredBytes) {
    throw new Error(
      `Not enough site storage is available. Free at least ${formatBytes(requiredBytes - available)} and try again.`
    );
  }

  const persistent =
    typeof navigator.storage.persist === "function"
      ? await navigator.storage.persist().catch(() => false)
      : false;
  return { available, persistent };
}

export function validateLocalAudioFiles(files: readonly File[]) {
  if (files.length === 0) {
    throw new Error("Select at least one music file.");
  }
  if (files.length > MAX_LOCAL_IMPORT_FILES) {
    throw new Error(`Select no more than ${MAX_LOCAL_IMPORT_FILES} files per import.`);
  }

  const unsupported = files.filter((file) => !isSupportedAudioFile(file));
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported audio ${unsupported.length === 1 ? "file" : "files"}: ${unsupported
        .map((file) => file.name)
        .join(", ")}. Select MP3, M4A/AAC, WAV, FLAC, Ogg/Opus, or WebM audio.`
    );
  }
}

export function isSupportedAudioFile(file: Pick<File, "name" | "type">) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase() ?? "";
  return (
    AUDIO_EXTENSIONS.has(extension) &&
    (file.type === "" || file.type.startsWith("audio/"))
  );
}

export function createLocalStoragePath(
  playlistId: string,
  trackId: string,
  fileName: string
) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "audio";
  return `curatore/local-audio/${playlistId}/${trackId}-${safeName}`;
}

export async function importLocalMusicPlaylist(
  name: string,
  files: readonly File[],
  store: LocalMusicFileStore = new OpfsLocalMusicFileStore()
): Promise<Playlist> {
  const playlistName = name.trim();
  if (!playlistName) {
    throw new Error("Add or confirm a playlist name.");
  }
  validateLocalAudioFiles(files);
  const storage = await preparePersistentStorage(
    files.reduce((total, file) => total + file.size, 0)
  );

  const playlistId = createClientId("local-playlist");
  const createdAt = new Date().toISOString();
  const writtenPaths: string[] = [];
  const videos: VideoItem[] = [];

  try {
    for (const file of files) {
      const trackId = createClientId("local-track");
      const storagePath = createLocalStoragePath(playlistId, trackId, file.name);
      await store.write(storagePath, file);
      writtenPaths.push(storagePath);
      videos.push({
        id: trackId,
        title: file.name.replace(/\.[^.]+$/, ""),
        channelTitle: "Local file",
        thumbnailUrl: localMusicThumbnail,
        source: "local",
        storagePath,
        mimeType: file.type,
        fileSize: file.size,
        originalFileName: file.name,
        addedAt: createdAt,
        playFrequency: 1
      });
    }
  } catch (error) {
    await Promise.allSettled(writtenPaths.map((path) => store.remove(path)));
    throw new Error(
      `The local import could not be completed and was cleaned up. ${
        error instanceof Error ? error.message : "Try again."
      }`
    );
  }

  return {
    id: playlistId,
    name: playlistName,
    thumbnailUrl: localMusicThumbnail,
    videoCount: videos.length,
    source: "local",
    origin: "imported",
    videos,
    createdAt,
    lastRefreshedAt: createdAt,
    excludedVideoIds: [],
    storagePersistence: storage.persistent ? "persistent" : "best-effort"
  };
}

export function getUnreferencedLocalPaths(
  deletedPlaylist: Playlist,
  remainingPlaylists: Playlist[]
) {
  const referenced = new Set(
    remainingPlaylists.flatMap((playlist) =>
      playlist.videos.flatMap((track) =>
        track.storagePath ? [track.storagePath] : []
      )
    )
  );
  return Array.from(
    new Set(
      deletedPlaylist.videos.flatMap((track) =>
        track.storagePath && !referenced.has(track.storagePath)
          ? [track.storagePath]
          : []
      )
    )
  );
}

export async function deleteUnreferencedLocalFiles(
  deletedPlaylist: Playlist,
  remainingPlaylists: Playlist[],
  store: LocalMusicFileStore = new OpfsLocalMusicFileStore()
) {
  const paths = getUnreferencedLocalPaths(deletedPlaylist, remainingPlaylists);
  await Promise.allSettled(paths.map((path) => store.remove(path)));
}

export async function createLocalTrackObjectUrl(
  storagePath: string,
  store: LocalMusicFileStore = new OpfsLocalMusicFileStore(),
  urlApi: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL
) {
  const file = await store.read(storagePath);
  const url = urlApi.createObjectURL(file);
  let released = false;
  return {
    file,
    url,
    release() {
      if (!released) {
        released = true;
        urlApi.revokeObjectURL(url);
      }
    }
  };
}

async function resolveParent(path: string, create: boolean) {
  const segments = path.split("/").filter(Boolean);
  const fileName = segments.pop();
  if (!fileName || segments.length === 0) {
    throw new Error("Invalid local music storage path.");
  }
  let directory = await navigator.storage.getDirectory();
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create });
  }
  return { directory, fileName };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
