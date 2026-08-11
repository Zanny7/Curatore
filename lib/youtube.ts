import type { Playlist, VideoItem } from "@/types";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const PLACEHOLDER_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%2318181b'/%3E%3Cpath d='M270 115l125 65-125 65V115z' fill='%23e4e4e7' fill-opacity='.85'/%3E%3C/svg%3E";

export function parsePlaylistIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const list = parsedUrl.searchParams.get("list");

    if (list) {
      return list;
    }

    const pathMatch = parsedUrl.pathname.match(/playlist\/([a-zA-Z0-9_-]+)/);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function fetchPlaylistById(
  playlistId: string,
  nameOverride?: string
): Promise<Playlist> {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    throw new Error("YouTube API key is not configured.");
  }

  const [metadata, videos] = await Promise.all([
    fetchPlaylistMetadata(playlistId, apiKey),
    fetchPlaylistVideos(playlistId, apiKey)
  ]);

  if (videos.length === 0) {
    throw new Error("No playable embeddable videos were found in this playlist.");
  }

  const importedAt = new Date().toISOString();

  return {
    id: playlistId,
    name: nameOverride?.trim() || metadata.title,
    url: `https://www.youtube.com/playlist?list=${playlistId}`,
    thumbnailUrl:
      metadata.thumbnailUrl ?? videos[0]?.thumbnailUrl ?? PLACEHOLDER_THUMBNAIL,
    videoCount: videos.length,
    source: "youtube",
    origin: "imported",
    videos: videos.map((video) => ({
      ...video,
      source: "youtube",
      addedAt: importedAt,
      playFrequency: 1
    })),
    createdAt: importedAt,
    lastRefreshedAt: importedAt,
    excludedVideoIds: []
  };
}

export async function fetchPlaylistVideos(
  playlistId: string,
  apiKey = getYouTubeApiKey()
): Promise<VideoItem[]> {
  if (!apiKey) {
    throw new Error("YouTube API key is not configured.");
  }

  const candidates: VideoItem[] = [];
  let pageToken: string | undefined;

  do {
    const response = await fetchJson<YouTubePlaylistItemsResponse>(
      "playlistItems",
      {
        key: apiKey,
        maxResults: "50",
        pageToken,
        part: "snippet,contentDetails",
        playlistId
      }
    );

    for (const item of response.items ?? []) {
      const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;

      if (
        !videoId ||
        !item.snippet ||
        !title ||
        title === "Deleted video" ||
        title === "Private video"
      ) {
        continue;
      }

      candidates.push({
        id: videoId,
        title,
        channelTitle:
          item.snippet.videoOwnerChannelTitle ?? item.snippet.channelTitle ?? "YouTube",
        thumbnailUrl: selectThumbnail(item.snippet.thumbnails),
        duration: undefined,
        source: "youtube"
      });
    }

    pageToken = response.nextPageToken;
  } while (pageToken && candidates.length < 100);

  return filterPlayableVideos(candidates, apiKey);
}

export async function createPlaylistFromImport(
  name: string,
  url: string
): Promise<Playlist> {
  const playlistId = parsePlaylistIdFromUrl(url);

  if (!playlistId) {
    throw new Error("Enter a valid YouTube playlist URL.");
  }

  const playlist = await fetchPlaylistById(playlistId, name);

  return {
    ...playlist,
    url
  };
}

function getYouTubeApiKey() {
  // Keep API keys server-only. Add or rotate the key in `.env.local`;
  // do not expose it through NEXT_PUBLIC_* variables.
  return process.env.YOUTUBE_API_KEY;
}

async function fetchPlaylistMetadata(playlistId: string, apiKey: string) {
  const response = await fetchJson<YouTubePlaylistResponse>("playlists", {
    key: apiKey,
    part: "snippet,contentDetails",
    id: playlistId
  });

  const playlist = response.items?.[0];

  if (!playlist) {
    throw new Error("Playlist not found.");
  }

  return {
    title: playlist.snippet.title,
    thumbnailUrl: selectThumbnail(playlist.snippet.thumbnails),
    videoCount: playlist.contentDetails?.itemCount
  };
}

async function fetchJson<T>(
  resource: "playlistItems" | "playlists" | "videos",
  params: Record<string, string | undefined>
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE_URL}/${resource}`);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  // This is the only place that should call the YouTube Data API. Keep API
  // keys in server environment variables and expand this service as needed.
  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`YouTube API request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function filterPlayableVideos(videos: VideoItem[], apiKey: string) {
  const playableVideos = new Map<string, VideoItem>();

  for (let index = 0; index < videos.length; index += 50) {
    const batch = videos.slice(index, index + 50);
    const response = await fetchJson<YouTubeVideosResponse>("videos", {
      key: apiKey,
      part: "snippet,status",
      id: batch.map((video) => video.id).join(",")
    });

    for (const item of response.items ?? []) {
      if (
        item.status?.embeddable === false ||
        item.status?.uploadStatus !== "processed"
      ) {
        continue;
      }

      playableVideos.set(item.id, {
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: selectThumbnail(item.snippet.thumbnails),
        source: "youtube"
      });
    }
  }

  return videos
    .map((video) => playableVideos.get(video.id))
    .filter((video): video is VideoItem => Boolean(video));
}

function selectThumbnail(thumbnails?: YouTubeThumbnails) {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    PLACEHOLDER_THUMBNAIL
  );
}

type YouTubeThumbnail = {
  url: string;
};

type YouTubeThumbnails = {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
};

type YouTubePlaylistResponse = {
  items?: Array<{
    snippet: {
      title: string;
      thumbnails?: YouTubeThumbnails;
    };
    contentDetails?: {
      itemCount?: number;
    };
  }>;
};

type YouTubePlaylistItemsResponse = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title: string;
      channelTitle?: string;
      videoOwnerChannelTitle?: string;
      thumbnails?: YouTubeThumbnails;
      resourceId?: {
        videoId?: string;
      };
    };
    contentDetails?: {
      videoId?: string;
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails?: YouTubeThumbnails;
    };
    status?: {
      embeddable?: boolean;
      uploadStatus?: string;
    };
  }>;
};
