import { NextResponse } from "next/server";
import { createPlaylistFromImport } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; url?: string };
    const name = body.name?.trim();
    const url = body.url?.trim();

    if (!name || !url) {
      return NextResponse.json(
        { error: "Playlist name and URL are required." },
        { status: 400 }
      );
    }

    const playlist = await createPlaylistFromImport(name, url);
    return NextResponse.json({ playlist });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import playlist.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
