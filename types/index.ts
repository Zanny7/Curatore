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
  source?: PlaylistSource;
  storagePath?: string;
  mimeType?: string;
  fileSize?: number;
  originalFileName?: string;
  duration?: string;
  startSeconds?: number;
  endSeconds?: number;
  addedAt?: string;
  playFrequency?: number;
};

export type PlaylistSource = "youtube" | "local";
export type PlaylistOrigin = "curated" | "imported";

export type TagColor =
  | "theme"
  | "slate"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

export type TagDefinition = {
  id: string;
  name: string;
  color: TagColor;
  createdAt?: string;
};

export type KeywordRating = {
  color?: TagColor;
  name: string;
  rating: number;
  tagId?: string;
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
  source: PlaylistSource;
  origin: PlaylistOrigin;
  videos: VideoItem[];
  createdAt?: string;
  lastRefreshedAt?: string;
  excludedVideoIds?: string[];
  storagePersistence?: "persistent" | "best-effort";
};

export type RemovedPlaylistVideo = {
  index: number;
  video: VideoItem;
};

export type PlayerState = {
  selectedPlaylist: Playlist | null;
  queue: VideoItem[];
  currentIndex: number;
  playbackRevision: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
};
