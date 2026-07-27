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
  writeStoredCuratedPlaylists,
  writeStoredPlaylists,
  writeStoredSongMetadata
} from "@/lib/storage";
import type { PlayerState, Playlist, SongMetadata, VideoItem } from "@/types";

type PlayerContextValue = PlayerState & {
  importedPlaylists: Playlist[];
  curatedPlaylists: Playlist[];
  allPlaylists: Playlist[];
  songMetadata: Record<string, SongMetadata>;
  currentVideo: PlayerState["queue"][number] | null;
  playerReady: boolean;
  playlistsLoaded: boolean;
  addImportedPlaylist: (playlist: Playlist) => void;
  createCuratedPlaylist: (name: string, videos?: VideoItem[]) => Playlist;
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
  updateSongMetadata: (videoId: string, metadata: SongMetadata) => void;
  updatePlaylistVideo: (
    playlistId: string,
    videoId: string,
    updates: Partial<PlayerState["queue"][number]>
  ) => void;
  setPlayerReady: (ready: boolean) => void;
  togglePlayback: () => void;
  setPlayback: (playing: boolean) => void;
  next: () => void;
  previous: () => void;
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
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [state, setState] = useState<PlayerState>({
    selectedPlaylist: null,
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    shuffle: false,
    repeat: false,
    volume: 75
  });

  useEffect(() => {
    setImportedPlaylists(readStoredPlaylists());
    setCuratedPlaylists(readStoredCuratedPlaylists());
    setSongMetadata(readStoredSongMetadata());
    setPlaylistsLoaded(true);
  }, []);

  const addImportedPlaylist = useCallback((playlist: Playlist) => {
    setImportedPlaylists((current) => {
      const withoutDuplicate = current.filter((item) => item.id !== playlist.id);
      const next = [playlist, ...withoutDuplicate];
      writeStoredPlaylists(next);
      return next;
    });
  }, []);

  const createCuratedPlaylist = useCallback(
    (name: string, videos: VideoItem[] = []) => {
      const playlist: Playlist = {
        id: `curated-${crypto.randomUUID()}`,
        name: name.trim(),
        thumbnailUrl:
          videos[0]?.thumbnailUrl ??
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='100%25' height='100%25' fill='%2318181b'/%3E%3Cpath d='M210 120h220v120H210z' rx='16' fill='%2327272a'/%3E%3Cpath d='M280 150l90 30-90 30z' fill='%23d4d4d8'/%3E%3C/svg%3E",
        videoCount: videos.length,
        source: "curated",
        videos
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

  const loadPlaylist = useCallback((playlist: Playlist, videoId?: string) => {
    const requestedIndex = videoId
      ? playlist.videos.findIndex((video) => video.id === videoId)
      : 0;
    setState((current) => ({
      ...current,
      selectedPlaylist: playlist,
      queue: playlist.videos,
      currentIndex: requestedIndex >= 0 ? requestedIndex : 0,
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
          return { ...playlist, videoCount: videos.length, videos };
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
            videoCount: queue.length,
            videos: queue
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
            ...selected.filter((video) => !existing.has(video.id))
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
        const next = { ...current, [videoId]: metadata };
        writeStoredSongMetadata(next);
        return next;
      });
    },
    []
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

  const next = useCallback(() => {
    setState((current) => {
      if (current.queue.length === 0) {
        return current;
      }

      if (current.shuffle && current.queue.length > 1) {
        let nextIndex = current.currentIndex;
        while (nextIndex === current.currentIndex) {
          nextIndex = Math.floor(Math.random() * current.queue.length);
        }
        return { ...current, currentIndex: nextIndex, isPlaying: true };
      }

      const isAtEnd = current.currentIndex >= current.queue.length - 1;
      if (isAtEnd && !current.repeat) {
        return { ...current, isPlaying: false };
      }

      return {
        ...current,
        currentIndex: isAtEnd ? 0 : current.currentIndex + 1,
        isPlaying: true
      };
    });
  }, []);

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
        isPlaying: true
      };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((current) => ({ ...current, shuffle: !current.shuffle }));
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
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      createCuratedPlaylist,
      copyPlaylistVideos,
      loadPlaylist,
      movePlaylistVideos,
      removePlaylistVideos,
      removePlaylistVideo,
      updateSongMetadata,
      updatePlaylistVideo,
      setPlayerReady,
      togglePlayback,
      setPlayback,
      next,
      previous,
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
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      createCuratedPlaylist,
      copyPlaylistVideos,
      loadPlaylist,
      movePlaylistVideos,
      removePlaylistVideos,
      removePlaylistVideo,
      updateSongMetadata,
      updatePlaylistVideo,
      setPlayerReady,
      togglePlayback,
      setPlayback,
      next,
      previous,
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
