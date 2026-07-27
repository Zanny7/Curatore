export type ThemePreference = "light" | "dark";

export type BackgroundThemeId =
  | "midnight"
  | "graphite"
  | "deepSea"
  | "forest"
  | "plum"
  | "ember";

export type BackgroundPreference = {
  mode: "theme" | "image";
  theme: BackgroundThemeId;
  imageDataUrl?: string;
};

export type AccentPreference =
  | "cyan"
  | "emerald"
  | "violet"
  | "rose"
  | "amber"
  | "slate";

export type VideoItem = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  startSeconds?: number;
  endSeconds?: number;
};

export type Playlist = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  videoCount: number;
  source: "imported";
  videos: VideoItem[];
};

export type PlayerState = {
  selectedPlaylist: Playlist | null;
  queue: VideoItem[];
  currentIndex: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
};
