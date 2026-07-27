import { History } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function HistoryPage() {
  return (
    <ComingSoonPage
      description="Recently played videos and previous listening sessions will be collected here."
      icon={<History aria-hidden="true" className="h-8 w-8" />}
      title="History"
    />
  );
}
