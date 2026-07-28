import type {
  SongMetadata,
  TagColor,
  TagDefinition
} from "@/types";

export const TAG_MAX_LENGTH = 12;
export const TAG_PILL_VISIBLE_LENGTH = 6;

export const TAG_COLOR_OPTIONS: {
  color: TagColor;
  label: string;
  swatchClassName: string;
}[] = [
  {
    color: "theme",
    label: "Theme",
    swatchClassName:
      "bg-[linear-gradient(135deg,#71717a_0_48%,var(--accent)_52%_100%)]"
  },
  { color: "slate", label: "Slate", swatchClassName: "bg-slate-500" },
  { color: "blue", label: "Blue", swatchClassName: "bg-blue-500" },
  {
    color: "emerald",
    label: "Emerald",
    swatchClassName: "bg-emerald-500"
  },
  { color: "amber", label: "Amber", swatchClassName: "bg-amber-500" },
  { color: "rose", label: "Rose", swatchClassName: "bg-rose-500" },
  { color: "violet", label: "Violet", swatchClassName: "bg-violet-500" }
];

const TAG_COLORS = new Set<TagColor>(
  TAG_COLOR_OPTIONS.map((option) => option.color)
);

export function isTagColor(value: unknown): value is TagColor {
  return typeof value === "string" && TAG_COLORS.has(value as TagColor);
}

export function normalizeTagName(name: string) {
  return name.trim().slice(0, TAG_MAX_LENGTH);
}

export function formatTagPill(name: string) {
  return name.length > TAG_PILL_VISIBLE_LENGTH
    ? `${name.slice(0, TAG_PILL_VISIBLE_LENGTH)}..`
    : name;
}

export function getTagPillClasses(color: TagColor, active: boolean) {
  if (color === "theme") {
    return active
      ? "bg-accent-soft text-accent-strong ring-1 ring-inset ring-[var(--accent-ring)]"
      : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-white/[0.06] dark:text-zinc-400 dark:ring-white/10";
  }

  const colorClasses: Record<Exclude<TagColor, "theme">, string> = {
    slate:
      "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20",
    blue:
      "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20",
    emerald:
      "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
    amber:
      "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20",
    rose:
      "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20",
    violet:
      "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/20"
  };

  return `${colorClasses[color]} ${
    active
      ? "outline outline-2 outline-offset-1 outline-[var(--accent)]"
      : ""
  }`;
}

export function migrateTagLibrary(
  storedDefinitions: TagDefinition[],
  metadata: Record<string, SongMetadata>
) {
  const definitions: TagDefinition[] = [];
  const byId = new Map<string, TagDefinition>();
  const byName = new Map<string, TagDefinition>();

  for (const definition of storedDefinitions) {
    const name = normalizeTagName(definition.name);
    const normalizedName = name.toLocaleLowerCase();
    if (!name || byName.has(normalizedName)) {
      continue;
    }
    const normalized: TagDefinition = {
      id: definition.id || createTagId(),
      name,
      color: isTagColor(definition.color) ? definition.color : "theme",
      createdAt: definition.createdAt
    };
    definitions.push(normalized);
    byId.set(normalized.id, normalized);
    byName.set(normalizedName, normalized);
  }

  const migratedMetadata = Object.fromEntries(
    Object.entries(metadata).map(([videoId, song]) => [
      videoId,
      {
        ...song,
        keywords: song.keywords.slice(0, 3).flatMap((keyword) => {
          const name = normalizeTagName(keyword.name);
          if (!name) {
            return [];
          }
          let definition =
            (keyword.tagId ? byId.get(keyword.tagId) : undefined) ??
            byName.get(name.toLocaleLowerCase());
          if (!definition) {
            definition = {
              id: createTagId(),
              name,
              color: isTagColor(keyword.color) ? keyword.color : "theme"
            };
            definitions.push(definition);
            byId.set(definition.id, definition);
            byName.set(name.toLocaleLowerCase(), definition);
          }
          return [
            {
              tagId: definition.id,
              name: definition.name,
              color: definition.color,
              rating: Math.min(10, Math.max(1, Math.round(keyword.rating)))
            }
          ];
        })
      }
    ])
  );

  return { definitions, metadata: migratedMetadata };
}

export function createTagId() {
  return `tag-${crypto.randomUUID()}`;
}
