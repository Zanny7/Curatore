"use client";

import { LocalAudioPlayer } from "@/components/LocalAudioPlayer";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { usePlayer } from "@/context/PlayerContext";

export function MediaPlayer({ visible }: { visible: boolean }) {
  const { selectedPlaylist } = usePlayer();
  return selectedPlaylist?.source === "local" ? (
    <LocalAudioPlayer visible={visible} />
  ) : (
    <YoutubePlayer visible={visible} />
  );
}
