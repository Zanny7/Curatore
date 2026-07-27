import { Heart } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function FavoritesPage() {
  return (
    <ComingSoonPage
      description="Quick access to the videos and playlists you care about most will appear here."
      icon={<Heart aria-hidden="true" className="h-8 w-8" />}
      title="Favorites"
    />
  );
}
