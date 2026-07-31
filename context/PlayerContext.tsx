"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  readStoredCuratedPlaylists,
  readStoredPlaylists,
  readStoredSongMetadata,
  readStoredTagDefinitions,
  writeStoredCuratedPlaylists,
  writeStoredPlaylists,
  writeStoredSongMetadata,
  writeStoredTagDefinitions
} from "@/lib/storage";
import {
  createTagId,
  migrateTagLibrary,
  normalizeTagName,
  normalizeTagRating
} from "@/lib/tags";
import { createClientId } from "@/lib/id";
import type {
  PlayerState,
  Playlist,
  RemovedPlaylistVideo,
  SongMetadata,
  TagColor,
  TagDefinition,
  VideoItem
} from "@/types";

type PlayerContextValue = PlayerState & {
  importedPlaylists: Playlist[];
  curatedPlaylists: Playlist[];
  allPlaylists: Playlist[];
  songMetadata: Record<string, SongMetadata>;
  tagDefinitions: TagDefinition[];
  currentVideo: PlayerState["queue"][number] | null;
  playerReady: boolean;
  playlistsLoaded: boolean;
  addImportedPlaylist: (playlist: Playlist) => void;
  createCuratedPlaylist: (name: string, videos?: VideoItem[]) => Playlist;
  renamePlaylist: (playlistId: string, name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  refreshImportedPlaylist: (
    playlistId: string,
    refreshedPlaylist: Playlist
  ) => number;
  loadPlaylist: (playlist: Playlist, videoId?: string) => void;
  copyPlaylistVideos: (
    sourcePlaylistId: string,
    destinationPlaylistId: string,
    videoIds: string[]
  ) => void;
  movePlaylistVideos: (
    sourcePlaylistId: string,
    destinationPlaylistId: string,
    videoIds: string[]
  ) => void;
  removePlaylistVideos: (playlistId: string, videoIds: string[]) => void;
  removePlaylistVideo: (playlistId: string, videoId: string) => void;
  restorePlaylistVideos: (
    playlistId: string,
    removed: RemovedPlaylistVideo[]
  ) => void;
  reorderPlaylistVideos: (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  setPlaylistVideoFrequency: (
    playlistId: string,
    videoIds: string[],
    frequency: number
  ) => void;
  updateSongMetadata: (videoId: string, metadata: SongMetadata) => void;
  createTagDefinition: (
    name: string,
    color: TagColor
  ) => TagDefinition | null;
  updateTagDefinition: (
    tagId: string,
    updates: { name: string; color: TagColor }
  ) => boolean;
  deleteTagDefinition: (tagId: string) => void;
  updatePlaylistVideo: (
    playlistId: string,
    videoId: string,
    updates: Partial<PlayerState["queue"][number]>
  ) => void;
  setPlayerReady: (ready: boolean) => void;
  togglePlayback: () => void;
  setPlayback: (playing: boolean) => void;
  next: () => void;
  advanceAfterNaturalEnd: (playbackRevision: number) => void;
  previous: () => void;
  playQueueItem: (queueIndex: number) => void;
  removeQueueItem: (queueIndex: number) => void;
  reorderQueueItem: (fromQueueIndex: number, toQueueIndex: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [importedPlaylists, setImportedPlaylists] = useState<Playlist[]>([]);
  const [curatedPlaylists, setCuratedPlaylists] = useState<Playlist[]>([]);
  const [songMetadata, setSongMetadata] = useState<
    Record<string, SongMetadata>
  >({});
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [state, setState] = useState<PlayerState>({
    selectedPlaylist: null,
    queue: [],
    currentIndex: 0,
    playbackRevision: 0,
    isPlaying: false,
    shuffle: false,
    repeat: false,
    volume: 75
  });

  useEffect(() => {
    setImportedPlaylists(readStoredPlaylists());
    setCuratedPlaylists(readStoredCuratedPlaylists());
    const migration = migrateTagLibrary(
      readStoredTagDefinitions(),
      readStoredSongMetadata()
    );
    setSongMetadata(migration.metadata);
    setTagDefinitions(migration.definitions);
    writeStoredSongMetadata(migration.metadata);
    writeStoredTagDefinitions(migration.definitions);
    setPlaylistsLoaded(true);
  }, []);

  const addImportedPlaylist = useCallback((playlist: Playlist) => {
    setImportedPlaylists((current) => {
      if (current.some((item) => item.id === playlist.id)) {
        return current;
      }
      const importedAt = new Date().toISOString();
      const next = [
        {
          ...playlist,
          createdAt: playlist.createdAt ?? importedAt,
          lastRefreshedAt: playlist.lastRefreshedAt ?? importedAt,
          excludedVideoIds: playlist.excludedVideoIds ?? [],
          videos: playlist.videos.map((video) => ({
            ...video,
            addedAt: video.addedAt ?? importedAt,
            playFrequency: normalizeFrequency(video.playFrequency)
          }))
        },
        ...current
      ];
      writeStoredPlaylists(next);
      return next;
    });
  }, []);

  const createCuratedPlaylist = useCallback(
    (name: string, videos: VideoItem[] = []) => {
      const createdAt = new Date().toISOString();
      const playlist: Playlist = {
        id: createClientId("curated"),
        name: name.trim(),
        thumbnailUrl:
          videos[0]?.thumbnailUrl ??
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='100%25' height='100%25' fill='%2318181b'/%3E%3Cpath d='M210 120h220v120H210z' rx='16' fill='%2327272a'/%3E%3Cpath d='M280 150l90 30-90 30z' fill='%23d4d4d8'/%3E%3C/svg%3E",
        videoCount: videos.length,
        source: "curated",
        videos: videos.map((video) => ({
          ...video,
          addedAt: video.addedAt ?? createdAt,
          playFrequency: normalizeFrequency(video.playFrequency)
        })),
        createdAt
      };

      setCuratedPlaylists((current) => {
        const next = [playlist, ...current];
        writeStoredCuratedPlaylists(next);
        return next;
      });

      return playlist;
    },
    []
  );

  const renamePlaylist = useCallback((playlistId: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    const rename = (playlists: Playlist[]) =>
      playlists.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, name: nextName } : playlist
      );

    setImportedPlaylists((current) => {
      const next = rename(current);
      writeStoredPlaylists(next);
      return next;
    });
    setCuratedPlaylists((current) => {
      const next = rename(current);
      writeStoredCuratedPlaylists(next);
      return next;
    });
    setState((current) =>
      current.selectedPlaylist?.id === playlistId
        ? {
            ...current,
            selectedPlaylist: {
              ...current.selectedPlaylist,
              name: nextName
            }
          }
        : current
    );
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setImportedPlaylists((current) => {
      const next = current.filter((playlist) => playlist.id !== playlistId);
      writeStoredPlaylists(next);
      return next;
    });
    setCuratedPlaylists((current) => {
      const next = current.filter((playlist) => playlist.id !== playlistId);
      writeStoredCuratedPlaylists(next);
      return next;
    });
    setState((current) =>
      current.selectedPlaylist?.id === playlistId
        ? {
            ...current,
            selectedPlaylist: null,
            queue: [],
            currentIndex: 0,
            playbackRevision: current.playbackRevision + 1,
            isPlaying: false
          }
        : current
    );
  }, []);

  const refreshImportedPlaylist = useCallback(
    (playlistId: string, refreshedPlaylist: Playlist) => {
      const existing = importedPlaylists.find(
        (playlist) => playlist.id === playlistId
      );
      if (!existing) {
        return 0;
      }

      const excluded = new Set(existing.excludedVideoIds ?? []);
      const currentById = new Map(
        existing.videos.map((video) => [video.id, video])
      );
      const refreshedById = new Map(
        refreshedPlaylist.videos.map((video) => [video.id, video])
      );
      const newVideos = refreshedPlaylist.videos
        .filter(
          (video) => !currentById.has(video.id) && !excluded.has(video.id)
        )
        .map((video) => ({
          ...video,
          addedAt: new Date().toISOString(),
          playFrequency: 1
        }));
      const videos = [
        ...existing.videos.map((video) => ({
          ...(refreshedById.get(video.id) ?? video),
          startSeconds: video.startSeconds,
          endSeconds: video.endSeconds,
          addedAt: video.addedAt,
          playFrequency: normalizeFrequency(video.playFrequency)
        })),
        ...newVideos
      ];
      const refreshed: Playlist = {
        ...existing,
        thumbnailUrl: refreshedPlaylist.thumbnailUrl || existing.thumbnailUrl,
        videoCount: videos.length,
        videos,
        lastRefreshedAt: new Date().toISOString()
      };

      setImportedPlaylists((current) => {
        const next = current.map((playlist) =>
          playlist.id === playlistId ? refreshed : playlist
        );
        writeStoredPlaylists(next);
        return next;
      });
      setState((current) => {
        if (current.selectedPlaylist?.id !== playlistId) {
          return current;
        }
        return {
          ...current,
          selectedPlaylist: refreshed,
          queue: buildWeightedQueue(
            videos,
            current.shuffle,
            current.queue[current.currentIndex]?.id
          ),
          currentIndex: 0
        };
      });

      return newVideos.length;
    },
    [importedPlaylists]
  );

  const loadPlaylist = useCallback((playlist: Playlist, videoId?: string) => {
    setState((current) => ({
      ...current,
      selectedPlaylist: playlist,
      queue: buildWeightedQueue(playlist.videos, current.shuffle, videoId),
      currentIndex: 0,
      playbackRevision: current.playbackRevision + 1,
      isPlaying: false
    }));
  }, []);

  const removePlaylistVideos = useCallback(
    (playlistId: string, videoIds: string[]) => {
      const ids = new Set(videoIds);
      const updateCollection = (playlists: Playlist[]) =>
        playlists.map((playlist) => {
          if (playlist.id !== playlistId) {
            return playlist;
          }

          const videos = playlist.videos.filter((video) => !ids.has(video.id));
          return {
            ...playlist,
            videoCount: videos.length,
            videos,
            excludedVideoIds:
              playlist.source === "imported"
                ? Array.from(
                    new Set([...(playlist.excludedVideoIds ?? []), ...videoIds])
                  )
                : playlist.excludedVideoIds
          };
        });

      setImportedPlaylists((current) => {
        const next = updateCollection(current);
        writeStoredPlaylists(next);
        return next;
      });
      setCuratedPlaylists((current) => {
        const next = updateCollection(current);
        writeStoredCuratedPlaylists(next);
        return next;
      });

      setState((current) => {
        if (current.selectedPlaylist?.id !== playlistId) {
          return current;
        }

        const currentVideo = current.queue[current.currentIndex] ?? null;
        const videos = current.selectedPlaylist.videos.filter(
          (video) => !ids.has(video.id)
        );
        const queue = current.queue.filter((video) => !ids.has(video.id));
        const nextIndex = currentVideo
          ? Math.max(
              0,
              queue.findIndex((video) => video.id === currentVideo.id)
            )
          : 0;

        return {
          ...current,
          selectedPlaylist: {
            ...current.selectedPlaylist,
            videoCount: videos.length,
            videos,
            excludedVideoIds:
              current.selectedPlaylist.source === "imported"
                ? Array.from(
                    new Set([
                      ...(current.selectedPlaylist.excludedVideoIds ?? []),
                      ...videoIds
                    ])
                  )
                : current.selectedPlaylist.excludedVideoIds
          },
          queue,
          currentIndex:
            queue.length === 0 ? 0 : Math.min(nextIndex, queue.length - 1),
          isPlaying: queue.length > 0 ? current.isPlaying : false
        };
      });
    },
    []
  );

  const removePlaylistVideo = useCallback(
    (playlistId: string, videoId: string) => {
      removePlaylistVideos(playlistId, [videoId]);
    },
    [removePlaylistVideos]
  );

  const restorePlaylistVideos = useCallback(
    (playlistId: string, removed: RemovedPlaylistVideo[]) => {
      if (removed.length === 0) {
        return;
      }

      const restoredIds = new Set(removed.map((item) => item.video.id));
      const restore = (playlist: Playlist) => {
        const videos = [...playlist.videos];
        for (const item of [...removed].sort((a, b) => a.index - b.index)) {
          if (!videos.some((video) => video.id === item.video.id)) {
            videos.splice(Math.min(item.index, videos.length), 0, item.video);
          }
        }
        return {
          ...playlist,
          thumbnailUrl: videos[0]?.thumbnailUrl ?? playlist.thumbnailUrl,
          videoCount: videos.length,
          videos,
          excludedVideoIds: (playlist.excludedVideoIds ?? []).filter(
            (id) => !restoredIds.has(id)
          )
        };
      };
      const restoreCollection = (playlists: Playlist[]) =>
        playlists.map((playlist) =>
          playlist.id === playlistId ? restore(playlist) : playlist
        );

      setImportedPlaylists((current) => {
        const next = restoreCollection(current);
        writeStoredPlaylists(next);
        return next;
      });
      setCuratedPlaylists((current) => {
        const next = restoreCollection(current);
        writeStoredCuratedPlaylists(next);
        return next;
      });
      setState((current) => {
        if (current.selectedPlaylist?.id !== playlistId) {
          return current;
        }
        const selectedPlaylist = restore(current.selectedPlaylist);
        return {
          ...current,
          selectedPlaylist,
          queue: buildWeightedQueue(
            selectedPlaylist.videos,
            current.shuffle,
            current.queue[current.currentIndex]?.id
          ),
          currentIndex: 0
        };
      });
    },
    []
  );

  const reorderPlaylistVideos = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      const reorder = (playlist: Playlist) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= playlist.videos.length ||
          toIndex >= playlist.videos.length ||
          fromIndex === toIndex
        ) {
          return playlist;
        }
        const videos = [...playlist.videos];
        const [moved] = videos.splice(fromIndex, 1);
        videos.splice(toIndex, 0, moved);
        return { ...playlist, videos };
      };
      const reorderCollection = (playlists: Playlist[]) =>
        playlists.map((playlist) =>
          playlist.id === playlistId ? reorder(playlist) : playlist
        );

      setImportedPlaylists((current) => {
        const next = reorderCollection(current);
        writeStoredPlaylists(next);
        return next;
      });
      setCuratedPlaylists((current) => {
        const next = reorderCollection(current);
        writeStoredCuratedPlaylists(next);
        return next;
      });
      setState((current) => {
        if (current.selectedPlaylist?.id !== playlistId) {
          return current;
        }
        const selectedPlaylist = reorder(current.selectedPlaylist);
        return {
          ...current,
          selectedPlaylist,
          queue: buildWeightedQueue(
            selectedPlaylist.videos,
            current.shuffle,
            current.queue[current.currentIndex]?.id
          ),
          currentIndex: 0
        };
      });
    },
    []
  );

  const setPlaylistVideoFrequency = useCallback(
    (playlistId: string, videoIds: string[], frequency: number) => {
      const ids = new Set(videoIds);
      const normalized = normalizeFrequency(frequency);
      const update = (playlist: Playlist) => ({
        ...playlist,
        videos: playlist.videos.map((video) =>
          ids.has(video.id)
            ? { ...video, playFrequency: normalized }
            : video
        )
      });
      const updateCollection = (playlists: Playlist[]) =>
        playlists.map((playlist) =>
          playlist.id === playlistId ? update(playlist) : playlist
        );

      setImportedPlaylists((current) => {
        const next = updateCollection(current);
        writeStoredPlaylists(next);
        return next;
      });
      setCuratedPlaylists((current) => {
        const next = updateCollection(current);
        writeStoredCuratedPlaylists(next);
        return next;
      });
      setState((current) => {
        if (current.selectedPlaylist?.id !== playlistId) {
          return current;
        }
        const selectedPlaylist = update(current.selectedPlaylist);
        return {
          ...current,
          selectedPlaylist,
          queue: buildWeightedQueue(
            selectedPlaylist.videos,
            current.shuffle,
            current.queue[current.currentIndex]?.id
          ),
          currentIndex: 0
        };
      });
    },
    []
  );

  const copyPlaylistVideos = useCallback(
    (
      sourcePlaylistId: string,
      destinationPlaylistId: string,
      videoIds: string[]
    ) => {
      const source = [...importedPlaylists, ...curatedPlaylists].find(
        (playlist) => playlist.id === sourcePlaylistId
      );
      if (!source) {
        return;
      }

      const ids = new Set(videoIds);
      const selected = source.videos.filter((video) => ids.has(video.id));
      setCuratedPlaylists((current) => {
        const next = current.map((playlist) => {
          if (playlist.id !== destinationPlaylistId) {
            return playlist;
          }

          const existing = new Set(playlist.videos.map((video) => video.id));
          const videos = [
            ...playlist.videos,
            ...selected
              .filter((video) => !existing.has(video.id))
              .map((video) => ({
                ...video,
                addedAt: new Date().toISOString(),
                playFrequency: 1
              }))
          ];
          return {
            ...playlist,
            thumbnailUrl: videos[0]?.thumbnailUrl ?? playlist.thumbnailUrl,
            videoCount: videos.length,
            videos
          };
        });
        writeStoredCuratedPlaylists(next);
        return next;
      });
    },
    [curatedPlaylists, importedPlaylists]
  );

  const movePlaylistVideos = useCallback(
    (
      sourcePlaylistId: string,
      destinationPlaylistId: string,
      videoIds: string[]
    ) => {
      copyPlaylistVideos(sourcePlaylistId, destinationPlaylistId, videoIds);
      removePlaylistVideos(sourcePlaylistId, videoIds);
    },
    [copyPlaylistVideos, removePlaylistVideos]
  );

  const updateSongMetadata = useCallback(
    (videoId: string, metadata: SongMetadata) => {
      setSongMetadata((current) => {
        const next = {
          ...current,
          [videoId]: {
            ...metadata,
            keywords: metadata.keywords.slice(0, 3).map((keyword) => ({
              ...keyword,
              rating: normalizeTagRating(keyword.rating)
            })),
            rating:
              metadata.rating === undefined
                ? undefined
                : Math.min(5, Math.max(1, Math.round(metadata.rating)))
          }
        };
        writeStoredSongMetadata(next);
        return next;
      });
    },
    []
  );

  const createTagDefinition = useCallback(
    (name: string, color: TagColor) => {
      const nextName = normalizeTagName(name);
      if (
        !nextName ||
        tagDefinitions.some(
          (tag) =>
            tag.name.toLocaleLowerCase() === nextName.toLocaleLowerCase()
        )
      ) {
        return null;
      }

      const definition: TagDefinition = {
        id: createTagId(),
        name: nextName,
        color,
        createdAt: new Date().toISOString()
      };
      setTagDefinitions((current) => {
        const next = [...current, definition];
        writeStoredTagDefinitions(next);
        return next;
      });
      return definition;
    },
    [tagDefinitions]
  );

  const updateTagDefinition = useCallback(
    (
      tagId: string,
      updates: {
        name: string;
        color: TagColor;
      }
    ) => {
      const nextName = normalizeTagName(updates.name);
      const currentDefinition = tagDefinitions.find((tag) => tag.id === tagId);
      if (
        !currentDefinition ||
        !nextName ||
        tagDefinitions.some(
          (tag) =>
            tag.id !== tagId &&
            tag.name.toLocaleLowerCase() === nextName.toLocaleLowerCase()
        )
      ) {
        return false;
      }

      setTagDefinitions((current) => {
        const next = current.map((tag) =>
          tag.id === tagId
            ? { ...tag, name: nextName, color: updates.color }
            : tag
        );
        writeStoredTagDefinitions(next);
        return next;
      });
      setSongMetadata((current) => {
        const next = Object.fromEntries(
          Object.entries(current).map(([videoId, metadata]) => [
            videoId,
            {
              ...metadata,
              keywords: metadata.keywords.map((keyword) =>
                keyword.tagId === tagId ||
                (!keyword.tagId &&
                  keyword.name.toLocaleLowerCase() ===
                    currentDefinition.name.toLocaleLowerCase())
                  ? {
                      ...keyword,
                      tagId,
                      name: nextName,
                      color: updates.color
                    }
                  : keyword
              )
            }
          ])
        );
        writeStoredSongMetadata(next);
        return next;
      });
      return true;
    },
    [tagDefinitions]
  );

  const deleteTagDefinition = useCallback(
    (tagId: string) => {
      const definition = tagDefinitions.find((tag) => tag.id === tagId);
      if (!definition) {
        return;
      }

      setTagDefinitions((current) => {
        const next = current.filter((tag) => tag.id !== tagId);
        writeStoredTagDefinitions(next);
        return next;
      });
      setSongMetadata((current) => {
        const next = Object.fromEntries(
          Object.entries(current).map(([videoId, metadata]) => [
            videoId,
            {
              ...metadata,
              keywords: metadata.keywords.filter(
                (keyword) =>
                  keyword.tagId !== tagId &&
                  !(
                    !keyword.tagId &&
                    keyword.name.toLocaleLowerCase() ===
                      definition.name.toLocaleLowerCase()
                  )
              )
            }
          ])
        );
        writeStoredSongMetadata(next);
        return next;
      });
    },
    [tagDefinitions]
  );

  const updatePlaylistVideo = useCallback((
    playlistId: string,
    videoId: string,
    updates: Partial<PlayerState["queue"][number]>
  ) => {
    const playlist = [...importedPlaylists, ...curatedPlaylists].find(
      (item) => item.id === playlistId
    );
    if (!playlist) {
      return;
    }

    const updatedPlaylist: Playlist = {
      ...playlist,
      videos: playlist.videos.map((video) =>
        video.id === videoId ? { ...video, ...updates } : video
      )
    };

    setImportedPlaylists((current) => {
      const next = current.map((item) =>
        item.id === playlistId ? updatedPlaylist : item
      );
      writeStoredPlaylists(next);
      return next;
    });
    setCuratedPlaylists((current) => {
      const next = current.map((item) =>
        item.id === playlistId ? updatedPlaylist : item
      );
      writeStoredCuratedPlaylists(next);
      return next;
    });

    setState((current) => {
      if (current.selectedPlaylist?.id !== playlistId) {
        return current;
      }

      return {
        ...current,
        selectedPlaylist: updatedPlaylist,
        queue: current.queue.map((video) =>
          video.id === videoId ? { ...video, ...updates } : video
        )
      };
    });
  }, [curatedPlaylists, importedPlaylists]);

  const setPlayback = useCallback((playing: boolean) => {
    setState((current) => ({ ...current, isPlaying: playing }));
  }, []);

  const togglePlayback = useCallback(() => {
    setState((current) => ({ ...current, isPlaying: !current.isPlaying }));
  }, []);

  const advanceQueue = useCallback(
    (expectedPlaybackRevision?: number) => {
      setState((current) => {
        if (
          current.queue.length === 0 ||
          (expectedPlaybackRevision !== undefined &&
            (current.playbackRevision !== expectedPlaybackRevision ||
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
      });
    },
    []
  );

  const next = useCallback(() => {
    advanceQueue();
  }, [advanceQueue]);

  const advanceAfterNaturalEnd = useCallback(
    (expectedPlaybackRevision: number) => {
      advanceQueue(expectedPlaybackRevision);
    },
    [advanceQueue]
  );

  const previous = useCallback(() => {
    setState((current) => {
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
    });
  }, []);

  const playQueueItem = useCallback((queueIndex: number) => {
    setState((current) => {
      if (
        queueIndex <= current.currentIndex ||
        queueIndex >= current.queue.length
      ) {
        return current;
      }

      return {
        ...current,
        currentIndex: queueIndex,
        playbackRevision: current.playbackRevision + 1,
        isPlaying: true
      };
    });
  }, []);

  const removeQueueItem = useCallback((queueIndex: number) => {
    setState((current) => {
      if (
        queueIndex <= current.currentIndex ||
        queueIndex >= current.queue.length
      ) {
        return current;
      }

      const queue = [...current.queue];
      queue.splice(queueIndex, 1);
      return { ...current, queue };
    });
  }, []);

  const reorderQueueItem = useCallback(
    (fromQueueIndex: number, toQueueIndex: number) => {
      setState((current) => {
        if (
          fromQueueIndex <= current.currentIndex ||
          toQueueIndex <= current.currentIndex ||
          fromQueueIndex >= current.queue.length ||
          toQueueIndex >= current.queue.length ||
          fromQueueIndex === toQueueIndex
        ) {
          return current;
        }

        const queue = [...current.queue];
        const [moved] = queue.splice(fromQueueIndex, 1);
        queue.splice(toQueueIndex, 0, moved);
        return { ...current, queue };
      });
    },
    []
  );

  const toggleShuffle = useCallback(() => {
    setState((current) => {
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
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((current) => ({ ...current, repeat: !current.repeat }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((current) => ({
      ...current,
      volume: Math.min(100, Math.max(0, volume))
    }));
  }, []);

  const currentVideo = state.queue[state.currentIndex] ?? null;
  const allPlaylists = useMemo(
    () => [...curatedPlaylists, ...importedPlaylists],
    [curatedPlaylists, importedPlaylists]
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      importedPlaylists,
      curatedPlaylists,
      allPlaylists,
      songMetadata,
      tagDefinitions,
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      createCuratedPlaylist,
      renamePlaylist,
      deletePlaylist,
      refreshImportedPlaylist,
      copyPlaylistVideos,
      loadPlaylist,
      movePlaylistVideos,
      removePlaylistVideos,
      removePlaylistVideo,
      restorePlaylistVideos,
      reorderPlaylistVideos,
      setPlaylistVideoFrequency,
      updateSongMetadata,
      createTagDefinition,
      updateTagDefinition,
      deleteTagDefinition,
      updatePlaylistVideo,
      setPlayerReady,
      togglePlayback,
      setPlayback,
      next,
      advanceAfterNaturalEnd,
      previous,
      playQueueItem,
      removeQueueItem,
      reorderQueueItem,
      toggleShuffle,
      toggleRepeat,
      setVolume
    }),
    [
      state,
      importedPlaylists,
      curatedPlaylists,
      allPlaylists,
      songMetadata,
      tagDefinitions,
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      createCuratedPlaylist,
      renamePlaylist,
      deletePlaylist,
      refreshImportedPlaylist,
      copyPlaylistVideos,
      loadPlaylist,
      movePlaylistVideos,
      removePlaylistVideos,
      removePlaylistVideo,
      restorePlaylistVideos,
      reorderPlaylistVideos,
      setPlaylistVideoFrequency,
      updateSongMetadata,
      createTagDefinition,
      updateTagDefinition,
      deleteTagDefinition,
      updatePlaylistVideo,
      setPlayerReady,
      togglePlayback,
      setPlayback,
      next,
      advanceAfterNaturalEnd,
      previous,
      playQueueItem,
      removeQueueItem,
      reorderQueueItem,
      toggleShuffle,
      toggleRepeat,
      setVolume
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }

  return context;
}

function normalizeFrequency(value?: number) {
  return Math.min(5, Math.max(1, Math.round(value ?? 1)));
}

function buildWeightedQueue(
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

  const requestedIndex = ordered.findIndex(
    (video) => video.id === firstVideoId
  );
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
    const pool = candidates.length > 0 ? candidates : remaining.map(
      (video, index) => ({ video, index })
    );
    const choice = pool[Math.floor(Math.random() * pool.length)];
    shuffled.push(choice.video);
    remaining.splice(choice.index, 1);
  }

  return shuffled;
}
