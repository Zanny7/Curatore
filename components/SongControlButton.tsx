import type { ButtonHTMLAttributes } from "react";

type SongControlButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  tone?: "accent" | "neutral";
};

export function SongControlButton({
  active = false,
  children,
  className = "",
  tone = "accent",
  type = "button",
  ...props
}: SongControlButtonProps) {
  const hoverClasses =
    tone === "accent"
      ? "hover:bg-zinc-100 hover:text-accent-strong dark:hover:bg-white/5"
      : "hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-white/5 dark:hover:text-white";

  return (
    <button
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${hoverClasses} ${
        active
          ? "text-accent-strong"
          : "text-zinc-500 dark:text-zinc-400"
      } ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
