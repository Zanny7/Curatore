import type {
  Playlist,
  PlaylistOrigin,
  PlaylistSource,
  VideoItem
} from "@/types";

type LegacyPlaylist = Omit<Partial<Playlist>, "source" | "origin" | "videos"> & {
  source?: PlaylistSource | PlaylistOrigin;
  origin?: PlaylistOrigin;
  videos?: Array<Partial<VideoItem>>;
};

export function migratePlaylists(
  value: unknown,
  collectionOrigin: PlaylistOrigin
): Playlist[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const legacy = item as LegacyPlaylist;
    if (
      typeof legacy.id !== "string" ||
      typeof legacy.name !== "string" ||
      !Array.isArray(legacy.videos)
    ) {
      return [];
    }

    const source: PlaylistSource =
      legacy.source === "local" ? "local" : "youtube";
    const origin: PlaylistOrigin =
      legacy.origin === "curated" || legacy.origin === "imported"
        ? legacy.origin
        : legacy.source === "curated" || legacy.source === "imported"
          ? legacy.source
          : collectionOrigin;
    const videos = legacy.videos.flatMap((video) =>
      typeof video.id === "string" && typeof video.title === "string"
        ? [
            {
              ...video,
              channelTitle:
                typeof video.channelTitle === "string"
                  ? video.channelTitle
                  : source === "local"
                    ? "Local file"
                    : "YouTube",
              thumbnailUrl:
                typeof video.thumbnailUrl === "string"
                  ? video.thumbnailUrl
                  : localMusicThumbnail,
              source
            } as VideoItem
          ]
        : []
    );

    return [
      {
        ...legacy,
        id: legacy.id,
        name: legacy.name,
        thumbnailUrl:
          typeof legacy.thumbnailUrl === "string"
            ? legacy.thumbnailUrl
            : localMusicThumbnail,
        videoCount: videos.length,
        origin,
        source,
        videos
      } as Playlist
    ];
  });
}

export function groupPlaylistsBySource(playlists: Playlist[]) {
  return {
    youtube: playlists.filter((playlist) => playlist.source === "youtube"),
    local: playlists.filter((playlist) => playlist.source === "local")
  };
}

export function getPlaybackEngine(playlist: Playlist | null) {
  return playlist?.source === "local" ? "native-audio" : "youtube-iframe";
}

export const localMusicThumbnail =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Cdefs%3E%3CradialGradient id='g'%3E%3Cstop stop-color='%235b21b6'/%3E%3Cstop offset='1' stop-color='%2309090b'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='640' height='360' fill='url(%23g)'/%3E%3Ccircle cx='320' cy='180' r='92' fill='none' stroke='%23e4e4e7' stroke-width='12' opacity='.85'/%3E%3Cpath d='M300 122v112a34 34 0 1 1-16-29v-98l94-20v127a34 34 0 1 1-16-29v-72z' fill='%23fafafa'/%3E%3C/svg%3E";
