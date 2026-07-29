"use client";

import { motion, LayoutGroup } from "framer-motion";
import { Plus, Tag, Tags } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  formatTagPill,
  getTagPillClasses,
  normalizeTagRating,
  TAG_MATCH_DEFAULT,
  TAG_MATCH_MAX,
  TAG_MATCH_MIN,
  TAG_PILL_VISIBLE_LENGTH
} from "@/lib/tags";
import type { SongMetadata, TagDefinition } from "@/types";

type SongQuickTagExperimentProps = {
  compact?: boolean;
  controlKey: string;
  detailedEditor?: ReactNode;
  keywords: SongMetadata["keywords"];
  onOpenDetailed: () => void;
  onOpenQuick: () => void;
  onSaveTags: (keywords: SongMetadata["keywords"]) => void;
  selectedTag: string | null;
  songTitle: string;
  tagDefinitions: TagDefinition[];
};

function isAssigned(
  tag: TagDefinition,
  keywords: SongMetadata["keywords"]
) {
  return keywords.some(
    (keyword) =>
      keyword.tagId === tag.id ||
      (!keyword.tagId &&
        keyword.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase())
  );
}

export function SongQuickTagExperiment({
  compact = false,
  controlKey,
  detailedEditor,
  keywords,
  onOpenDetailed,
  onOpenQuick,
  onSaveTags,
  selectedTag,
  songTitle,
  tagDefinitions
}: SongQuickTagExperimentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layoutGroupId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ratingTagId, setRatingTagId] = useState<string | null>(null);
  const availableTags = useMemo(
    () =>
      tagDefinitions
        .filter((tag) => !isAssigned(tag, keywords))
        .sort((left, right) =>
          left.name.localeCompare(right.name, undefined, {
            sensitivity: "base"
          })
        ),
    [keywords, tagDefinitions]
  );
  const quickTagDisabled = keywords.length >= 3 || availableTags.length === 0;

  useEffect(() => {
    if (!pickerOpen && !ratingTagId) {
      return;
    }

    function dismissFloatingControls(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setPickerOpen(false);
        setRatingTagId(null);
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerOpen(false);
        setRatingTagId(null);
      }
    }

    document.addEventListener("pointerdown", dismissFloatingControls);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissFloatingControls);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [pickerOpen, ratingTagId]);

  useEffect(() => {
    if (quickTagDisabled) {
      setPickerOpen(false);
    }
    if (
      ratingTagId &&
      !keywords.some(
        (keyword) =>
          keyword.tagId === ratingTagId ||
          (!keyword.tagId &&
            keyword.name.toLocaleLowerCase() ===
              ratingTagId.toLocaleLowerCase())
      )
    ) {
      setRatingTagId(null);
    }
  }, [keywords, quickTagDisabled, ratingTagId]);

  function assignTag(tag: TagDefinition) {
    if (keywords.length >= 3 || isAssigned(tag, keywords)) {
      return;
    }
    onSaveTags([
      ...keywords,
      {
        tagId: tag.id,
        name: tag.name,
        color: tag.color,
        rating: TAG_MATCH_DEFAULT
      }
    ]);
  }

  function updateRating(
    keyword: SongMetadata["keywords"][number],
    rating: number
  ) {
    const normalizedRating = normalizeTagRating(rating);
    onSaveTags(
      keywords.map((current) =>
        current.tagId === keyword.tagId ||
        (!current.tagId &&
          current.name.toLocaleLowerCase() ===
            keyword.name.toLocaleLowerCase())
          ? { ...current, rating: normalizedRating }
          : current
      )
    );
  }

  const sortedKeywords = [...keywords]
    .slice(0, 3)
    .sort(
      (left, right) =>
        right.rating - left.rating ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    );

  return (
    <LayoutGroup id={layoutGroupId}>
      <div
        className={
          compact
            ? "relative inline-flex min-w-0 shrink-0 items-center gap-0.5"
            : "relative flex w-full items-center gap-1"
        }
        data-song-editor-root={controlKey}
        ref={rootRef}
      >
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            aria-expanded={pickerOpen}
            aria-label={`Quickly assign a tag to ${songTitle}`}
            className="relative flex h-5 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-white/5"
            disabled={quickTagDisabled}
            onClick={() => {
              setRatingTagId(null);
              if (!pickerOpen) {
                onOpenQuick();
              }
              setPickerOpen(!pickerOpen);
            }}
            type="button"
          >
            <Tag aria-hidden="true" className="h-3.5 w-3.5" />
            <Plus
              aria-hidden="true"
              className="absolute right-0.5 top-0 h-2.5 w-2.5"
            />
          </button>
          <button
            aria-label={`Edit tags for ${songTitle}`}
            className="flex h-5 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
            onClick={() => {
              setPickerOpen(false);
              setRatingTagId(null);
              onOpenDetailed();
            }}
            type="button"
          >
            <Tags aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        {sortedKeywords.length > 0 ? (
          <span className="inline-flex min-w-0 flex-col items-stretch gap-1">
            {sortedKeywords.map((keyword) => {
              const keywordKey = keyword.tagId ?? keyword.name;
              const highlighted =
                keyword.name.toLocaleLowerCase() ===
                selectedTag?.toLocaleLowerCase();
              const pillColors = getTagPillClasses(
                keyword.color ?? "theme",
                highlighted
              );
              const ratingOpen =
                ratingTagId === (keyword.tagId ?? keyword.name);

              return (
                <motion.span
                  className="group/tag relative inline-flex min-w-0"
                  key={keywordKey}
                  layout
                  layoutId={`quick-tag-${layoutGroupId}-${keywordKey}`}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 34
                  }}
                >
                  <button
                    aria-expanded={ratingOpen}
                    aria-label={`${keyword.name}, ${keyword.rating} out of ${TAG_MATCH_MAX} match. Change rating`}
                    className={`relative inline-flex min-h-5 max-w-28 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${pillColors}`}
                    onClick={() => {
                      setPickerOpen(false);
                      setRatingTagId((current) =>
                        current === keywordKey ? null : keywordKey
                      );
                    }}
                    type="button"
                  >
                    <ExpandableTagName
                      expandedClassName={pillColors}
                      name={keyword.name}
                    />
                    {!ratingOpen ? (
                      <span className="theme-tooltip pointer-events-none absolute bottom-[calc(100%+0.3rem)] left-1/2 z-[70] hidden h-6 -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-md px-2 text-[9px] leading-none shadow-lg group-hover/tag:flex group-focus-within/tag:flex">
                        {keyword.rating}/{TAG_MATCH_MAX}
                      </span>
                    ) : null}
                  </button>

                  {ratingOpen ? (
                    <div
                      aria-label={`${keyword.name} match rating`}
                      className="absolute left-1/2 top-[calc(100%+0.3rem)] z-[80] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap"
                      onClick={(event) => event.stopPropagation()}
                      role="group"
                    >
                      <input
                        aria-label={`Set ${keyword.name} match rating`}
                        className="h-5 w-24 cursor-pointer accent-[var(--accent)]"
                        max={TAG_MATCH_MAX}
                        min={TAG_MATCH_MIN}
                        onInput={(event) =>
                          updateRating(
                            keyword,
                            Number(event.currentTarget.value)
                          )
                        }
                        type="range"
                        value={keyword.rating}
                      />
                      <output className="text-xs font-semibold text-accent-strong">
                        {keyword.rating}/{TAG_MATCH_MAX}
                      </output>
                    </div>
                  ) : null}
                </motion.span>
              );
            })}
          </span>
        ) : null}

        {pickerOpen ? (
          <div
            aria-label="Available quick tags"
            className={`absolute bottom-[calc(100%+0.35rem)] z-[80] flex w-[min(16rem,calc(100vw-3rem))] flex-wrap gap-1.5 ${
              compact ? "right-0" : "left-0"
            }`}
          >
            {availableTags.map((tag) => (
              <motion.button
                aria-label={`Assign ${tag.name}`}
                className={`inline-flex min-h-5 max-w-28 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${getTagPillClasses(
                  tag.color,
                  false
                )}`}
                key={tag.id}
                layout
                layoutId={`quick-tag-${layoutGroupId}-${tag.id}`}
                onClick={() => assignTag(tag)}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34
                }}
                type="button"
              >
                <ExpandableTagName
                  expandedClassName={getTagPillClasses(tag.color, false)}
                  name={tag.name}
                />
              </motion.button>
            ))}
          </div>
        ) : null}

        {detailedEditor}
      </div>
    </LayoutGroup>
  );
}

function ExpandableTagName({
  expandedClassName,
  name
}: {
  expandedClassName: string;
  name: string;
}) {
  const truncated = name.length > TAG_PILL_VISIBLE_LENGTH;

  return (
    <>
      <span className="truncate">{formatTagPill(name)}</span>
      {truncated ? (
        <span
          className={`pointer-events-none absolute left-0 top-1/2 z-[60] hidden min-h-5 w-max -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 text-center leading-none shadow-md group-hover/tag:inline-flex group-focus-within/tag:inline-flex ${expandedClassName}`}
        >
          {name}
        </span>
      ) : null}
    </>
  );
}
