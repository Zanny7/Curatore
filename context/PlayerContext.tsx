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
import { readStoredPlaylists, writeStoredPlaylists } from "@/lib/storage";
import type { PlayerState, Playlist } from "@/types";

type PlayerContextValue = PlayerState & {
  importedPlaylists: Playlist[];
  allPlaylists: Playlist[];
  currentVideo: PlayerState["queue"][number] | null;
  playerReady: boolean;
  playlistsLoaded: boolean;
  addImportedPlaylist: (playlist: Playlist) => void;
  loadPlaylist: (playlist: Playlist) => void;
  removePlaylistVideo: (playlistId: string, videoId: string) => void;
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

  const loadPlaylist = useCallback((playlist: Playlist) => {
    setState((current) => ({
      ...current,
      selectedPlaylist: playlist,
      queue: playlist.videos,
      currentIndex: 0,
      isPlaying: false
    }));
  }, []);

  const removePlaylistVideo = useCallback((playlistId: string, videoId: string) => {
    const playlist = importedPlaylists.find((item) => item.id === playlistId);
    if (!playlist) {
      return;
    }

    const videos = playlist.videos.filter((video) => video.id !== videoId);
    const updatedPlaylist: Playlist = {
      ...playlist,
      videoCount: videos.length,
      videos
    };

    setImportedPlaylists((current) => {
      const next = current.map((item) =>
        item.id === playlistId ? updatedPlaylist : item
      );
      writeStoredPlaylists(next);
      return next;
    });

    setState((current) => {
      if (current.selectedPlaylist?.id !== playlistId || !updatedPlaylist) {
        return current;
      }

      const currentVideo = current.queue[current.currentIndex] ?? null;
      const queue = updatedPlaylist.videos;
      const nextIndex = currentVideo
        ? Math.max(
            0,
            queue.findIndex((video) => video.id === currentVideo.id)
          )
        : 0;

      return {
        ...current,
        selectedPlaylist: updatedPlaylist,
        queue,
        currentIndex: queue.length === 0 ? 0 : Math.min(nextIndex, queue.length - 1),
        isPlaying: queue.length > 0 ? current.isPlaying : false
      };
    });
  }, [importedPlaylists]);

  const updatePlaylistVideo = useCallback((
    playlistId: string,
    videoId: string,
    updates: Partial<PlayerState["queue"][number]>
  ) => {
    const playlist = importedPlaylists.find((item) => item.id === playlistId);
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
  }, [importedPlaylists]);

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
  const allPlaylists = useMemo(() => importedPlaylists, [importedPlaylists]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      importedPlaylists,
      allPlaylists,
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      loadPlaylist,
      removePlaylistVideo,
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
      allPlaylists,
      currentVideo,
      playerReady,
      playlistsLoaded,
      addImportedPlaylist,
      loadPlaylist,
      removePlaylistVideo,
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
