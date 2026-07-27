import { Library } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function LibraryPage() {
  return (
    <ComingSoonPage
      description="Your complete collection of imported playlists and saved media will live here."
      icon={<Library aria-hidden="true" className="h-8 w-8" />}
      title="Library"
    />
  );
}
