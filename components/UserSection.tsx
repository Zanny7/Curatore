import { CircleUserRound } from "lucide-react";

export function UserSection() {
  return (
    <div className="border-t border-[var(--app-sidebar-border)] px-4 py-3 lg:py-4">
      <div className="flex items-center justify-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-200">
          <CircleUserRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            Example User
          </p>
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ready to play
          </p>
        </div>
      </div>
    </div>
  );
}
