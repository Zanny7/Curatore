"use client";

import { useId } from "react";

const STAR_PATH =
  "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z";
const SECTOR_PATH =
  "M12 12 L-2.1068 -7.4164 A24 24 0 0 1 26.1068 -7.4164 Z";
const SECTION_COUNT = 5;
const SECTION_ANGLE = 360 / SECTION_COUNT;
const FIRST_BOUNDARY_ANGLE = -126;
const RATED_SCALE = 1.15;

type SegmentedStarRatingProps = {
  className?: string;
  onSelect?: (rating: number) => void;
  rating?: number;
};

function normalizeRating(rating: number | undefined) {
  if (rating === undefined) {
    return 0;
  }

  return Math.min(SECTION_COUNT, Math.max(0, Math.round(rating)));
}

export function SegmentedStarRating({
  className,
  onSelect,
  rating
}: SegmentedStarRatingProps) {
  const normalizedRating = normalizeRating(rating);
  const clipPathId = `segmented-star-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-label={`${normalizedRating} out of ${SECTION_COUNT}`}
      className={className}
      data-rating={normalizedRating}
      focusable="false"
      role="img"
      viewBox="0 0 24 24"
    >
      <defs>
        <clipPath id={clipPathId}>
          <path d={STAR_PATH} />
        </clipPath>
      </defs>

      <g
        transform={
          normalizedRating > 0
            ? `translate(12 12) scale(${RATED_SCALE}) translate(-12 -12)`
            : undefined
        }
      >
        <g clipPath={`url(#${clipPathId})`}>
          {Array.from({ length: SECTION_COUNT }, (_, index) => (
            <path
              className={onSelect ? "cursor-pointer" : undefined}
              d={SECTOR_PATH}
              fill={
                index < normalizedRating ? "var(--accent)" : "currentColor"
              }
              fillOpacity={index < normalizedRating ? 1 : 0.22}
              key={index}
              onClick={
                onSelect
                  ? (event) => {
                      event.stopPropagation();
                      onSelect(index + 1);
                    }
                  : undefined
              }
              transform={`rotate(${(index + 1) * SECTION_ANGLE} 12 12)`}
            />
          ))}

          {Array.from({ length: SECTION_COUNT }, (_, index) => {
            const angle =
              ((FIRST_BOUNDARY_ANGLE + index * SECTION_ANGLE) * Math.PI) / 180;
            return (
              <line
                key={index}
                pointerEvents="none"
                stroke="var(--theme-border)"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
                x1="12"
                x2={12 + 16 * Math.cos(angle)}
                y1="12"
                y2={12 + 16 * Math.sin(angle)}
              />
            );
          })}
        </g>
      </g>

      {normalizedRating === 0 ? (
        <path
          d={STAR_PATH}
          fill="none"
          pointerEvents="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
