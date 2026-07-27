export type ThemePreference = "system" | "light" | "dark";

export type BackgroundThemeId =
  | "midnight"
  | "graphite"
  | "deepSea"
  | "forest"
  | "plum"
  | "ember"
  | "polarNight"
  | "rosewoodGold"
  | "mossLinen"
  | "cobaltTangerine"
  | "lavenderSteel"
  | "sepiaTeal";

export type BackgroundPreference = {
  mode: "theme" | "image";
  theme: BackgroundThemeId;
  imageDataUrl?: string;
};

export type VideoItem = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  startSeconds?: number;
  endSeconds?: number;
  addedAt?: string;
  playFrequency?: number;
};

export type KeywordRating = {
  name: string;
  rating: number;
};

export type SongMetadata = {
  rating?: number;
  keywords: KeywordRating[];
};

export type Playlist = {
  id: string;
  name: string;
  url?: string;
  thumbnailUrl: string;
  videoCount: number;
  source: "curated" | "imported";
  videos: VideoItem[];
  createdAt?: string;
  lastRefreshedAt?: string;
  excludedVideoIds?: string[];
};

export type RemovedPlaylistVideo = {
  index: number;
  video: VideoItem;
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
