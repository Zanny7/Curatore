"use client";

import { motion, LayoutGroup } from "framer-motion";
import { Plus, Tag, Tags, X } from "lucide-react";
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
  TAG_MATCH_MIN
} from "@/lib/tags";
import type { SongMetadata, TagDefinition } from "@/types";

type SongQuickTagExperimentProps = {
  compact?: boolean;
  controlKey: string;
  detailedEditor?: ReactNode;
  interactionId: string;
  keywords: SongMetadata["keywords"];
  layout?: "player" | "playlist";
  onFloatingStateChange: (interactionId: string, active: boolean) => void;
  onOpenDetailed?: () => void;
  onOpenQuick: () => void;
  onSaveTags: (keywords: SongMetadata["keywords"]) => void;
  selectedTag: string | null;
  showDetailed?: boolean;
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
  interactionId,
  keywords,
  layout = "playlist",
  onFloatingStateChange,
  onOpenDetailed,
  onOpenQuick,
  onSaveTags,
  selectedTag,
  showDetailed = true,
  songTitle,
  tagDefinitions
}: SongQuickTagExperimentProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const ratingMenuRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const layoutGroupId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ratingTagId, setRatingTagId] = useState<string | null>(null);
  const [removeTagKey, setRemoveTagKey] = useState<string | null>(null);
  const [holdingTagKey, setHoldingTagKey] = useState<string | null>(null);
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
    if (!pickerOpen && !ratingTagId && !removeTagKey) {
      return;
    }

    function dismissFloatingControls(event: PointerEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (pickerOpen) {
        const choice = event.target.closest("[data-quick-tag-choice]");
        if (!choice || !pickerRef.current?.contains(choice)) {
          setPickerOpen(false);
        }
      }

      if (ratingTagId) {
        const ratingTrigger = event.target.closest("[data-tag-rating-trigger]");
        const clickedRatingControl =
          ratingMenuRef.current?.contains(event.target) ||
          (ratingTrigger && rootRef.current?.contains(ratingTrigger));
        if (!clickedRatingControl) {
          setRatingTagId(null);
        }
      }

      if (removeTagKey) {
        const removeControl = event.target.closest("[data-tag-remove-control]");
        if (!removeControl || !rootRef.current?.contains(removeControl)) {
          setRemoveTagKey(null);
        }
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerOpen(false);
        setRatingTagId(null);
        setRemoveTagKey(null);
      }
    }

    document.addEventListener("pointerdown", dismissFloatingControls);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissFloatingControls);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [pickerOpen, ratingTagId, removeTagKey]);

  const floatingControlActive =
    pickerOpen ||
    Boolean(ratingTagId) ||
    Boolean(removeTagKey) ||
    Boolean(holdingTagKey);

  useEffect(() => {
    onFloatingStateChange(interactionId, floatingControlActive);
  }, [floatingControlActive, interactionId, onFloatingStateChange]);

  useEffect(
    () => () => onFloatingStateChange(interactionId, false),
    [interactionId, onFloatingStateChange]
  );

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
    if (
      removeTagKey &&
      !keywords.some(
        (keyword) => (keyword.tagId ?? keyword.name) === removeTagKey
      )
    ) {
      setRemoveTagKey(null);
    }
  }, [keywords, quickTagDisabled, ratingTagId, removeTagKey]);

  useEffect(
    () => () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
    },
    []
  );

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

  function cancelRemoveHold() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingTagKey(null);
  }

  function revealRemoveButton(keywordKey: string) {
    cancelRemoveHold();
    setPickerOpen(false);
    setRatingTagId(null);
    setRemoveTagKey(keywordKey);
  }

  function removeTag(keyword: SongMetadata["keywords"][number]) {
    onSaveTags(
      keywords.filter(
        (current) =>
          !(
            current.tagId === keyword.tagId ||
            (!current.tagId &&
              current.name.toLocaleLowerCase() ===
                keyword.name.toLocaleLowerCase())
          )
      )
    );
    setRemoveTagKey(null);
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
          layout === "player"
            ? "relative flex min-w-0 flex-1 flex-wrap items-center gap-2"
            : compact
              ? "relative inline-flex min-w-0 shrink-0 items-center gap-0.5"
              : "relative flex w-full items-center gap-1"
        }
        data-song-editor-root={controlKey}
        ref={rootRef}
      >
        <div
          className={
            layout === "player"
              ? "flex shrink-0 items-center"
              : "flex shrink-0 flex-col items-center gap-0.5"
          }
        >
          <button
            aria-expanded={pickerOpen}
            aria-label={`Quickly assign a tag to ${songTitle}`}
            className={`relative flex items-center justify-center text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-white/5 ${
              layout === "player"
                ? "h-8 w-8 rounded-lg"
                : "h-5 w-7 rounded-md"
            }`}
            disabled={quickTagDisabled}
            onClick={() => {
              cancelRemoveHold();
              setRatingTagId(null);
              setRemoveTagKey(null);
              if (!pickerOpen) {
                onOpenQuick();
              }
              setPickerOpen(!pickerOpen);
            }}
            type="button"
          >
            <Tag
              aria-hidden="true"
              className={layout === "player" ? "h-4 w-4" : "h-3.5 w-3.5"}
            />
            <Plus
              aria-hidden="true"
              className={`absolute h-2.5 w-2.5 ${
                layout === "player" ? "right-1 top-0.5" : "right-0.5 top-0"
              }`}
            />
          </button>
          {showDetailed ? (
            <button
              aria-label={`Edit tags for ${songTitle}`}
              className="flex h-5 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
              onClick={() => {
                cancelRemoveHold();
                setPickerOpen(false);
                setRatingTagId(null);
                setRemoveTagKey(null);
                onOpenDetailed?.();
              }}
              type="button"
            >
              <Tags aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {sortedKeywords.length > 0 ? (
          <span
            className={`inline-flex min-w-0 gap-1 ${
              layout === "player"
                ? "flex-row flex-wrap items-center"
                : "flex-col items-stretch"
            }`}
          >
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
              const removeOpen = removeTagKey === keywordKey;
              const pillControlOpen = ratingOpen || removeOpen;

              return (
                <motion.span
                  className={`relative inline-flex min-w-0 items-center ${
                    pillControlOpen ? "" : "group/tag"
                  }`}
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
                    className={`relative inline-flex min-h-5 max-w-[min(12rem,calc(100vw-3rem))] shrink-0 touch-manipulation items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${pillColors}`}
                    data-tag-rating-trigger
                    onContextMenu={(event) => {
                      event.preventDefault();
                      revealRemoveButton(keywordKey);
                    }}
                    onClick={() => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      setPickerOpen(false);
                      setRemoveTagKey(null);
                      setRatingTagId((current) =>
                        current === keywordKey ? null : keywordKey
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Delete" ||
                        event.key === "Backspace"
                      ) {
                        event.preventDefault();
                        revealRemoveButton(keywordKey);
                      }
                    }}
                    onPointerCancel={cancelRemoveHold}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }
                      cancelRemoveHold();
                      longPressTriggeredRef.current = false;
                      setHoldingTagKey(keywordKey);
                      holdTimerRef.current = window.setTimeout(() => {
                        longPressTriggeredRef.current = true;
                        holdTimerRef.current = null;
                        setHoldingTagKey(null);
                        revealRemoveButton(keywordKey);
                      }, 550);
                    }}
                    onPointerLeave={cancelRemoveHold}
                    onPointerUp={cancelRemoveHold}
                    type="button"
                  >
                    <ExpandableTagName expandInPlace name={keyword.name} />
                    {!pillControlOpen ? (
                      <span className="theme-tooltip pointer-events-none absolute bottom-[calc(100%+0.3rem)] left-1/2 z-[70] hidden h-6 -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-md px-2 text-[9px] leading-none shadow-lg group-hover/tag:flex group-focus-within/tag:flex">
                        {keyword.rating}/{TAG_MATCH_MAX}
                      </span>
                    ) : null}
                  </button>

                  {removeOpen ? (
                    <motion.button
                      animate={{ opacity: 1, scale: 1 }}
                      aria-label={`Remove ${keyword.name}`}
                      className="theme-destructive absolute left-[calc(100%+0.25rem)] top-0 flex h-5 w-5 items-center justify-center rounded-md border border-[var(--theme-destructive)] bg-[var(--theme-destructive-soft)] shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-destructive)]"
                      data-tag-remove-control
                      initial={{ opacity: 0, scale: 0.7 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeTag(keyword);
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </motion.button>
                  ) : null}

                  {ratingOpen ? (
                    <div
                      aria-label={`${keyword.name} match rating`}
                      className="theme-menu absolute left-1/2 top-[calc(100%+0.3rem)] z-[80] w-[4.25rem] -translate-x-1/2 overflow-hidden rounded-xl p-1 text-left backdrop-blur-xl"
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => event.preventDefault()}
                      ref={ratingMenuRef}
                      role="group"
                    >
                      {Array.from(
                        { length: TAG_MATCH_MAX - TAG_MATCH_MIN + 1 },
                        (_, index) => index + TAG_MATCH_MIN
                      ).map((value) => (
                        <button
                          aria-label={`${value} out of ${TAG_MATCH_MAX}`}
                          aria-pressed={keyword.rating === value}
                          className={`h-8 w-full rounded-lg border px-1.5 text-xs font-semibold transition ${
                            keyword.rating === value
                              ? "border-[var(--accent)] bg-accent-soft text-accent-strong"
                              : "border-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                          key={value}
                          onClick={() => {
                            updateRating(keyword, value);
                            setRatingTagId(null);
                          }}
                          type="button"
                        >
                          {value}
                        </button>
                      ))}
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
            className="theme-control absolute bottom-[calc(100%+0.35rem)] left-3.5 z-[80] flex w-max max-w-[min(16rem,calc(100vw-3rem))] -translate-x-1/2 flex-wrap gap-1.5 rounded-lg p-1.5 shadow-lg backdrop-blur-md"
            ref={pickerRef}
          >
            {availableTags.map((tag) => (
              <motion.button
                aria-label={`Assign ${tag.name}`}
                className={`inline-flex min-h-5 max-w-28 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${getTagPillClasses(
                  tag.color,
                  false
                )}`}
                data-quick-tag-choice
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
                <ExpandableTagName name={tag.name} />
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
  expandInPlace = false,
  name
}: {
  expandInPlace?: boolean;
  name: string;
}) {
  return expandInPlace ? (
    <span className="block max-w-[8ch] overflow-hidden text-ellipsis whitespace-nowrap transition-[max-width] duration-200 ease-out group-hover/tag:max-w-48 group-focus-within/tag:max-w-48">
      {name}
    </span>
  ) : (
    <span className="truncate">{formatTagPill(name)}</span>
  );
}
