"use client";

import {
  AlertTriangle,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { TagColorPicker } from "@/components/TagColorPicker";
import { usePlayer } from "@/context/PlayerContext";
import {
  getTagPillClasses,
  normalizeTagName,
  TAG_MAX_LENGTH
} from "@/lib/tags";
import type { TagColor, TagDefinition } from "@/types";

export default function TagsPage() {
  const {
    createTagDefinition,
    deleteTagDefinition,
    playlistsLoaded,
    songMetadata,
    tagDefinitions,
    updateTagDefinition
  } = usePlayer();
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("theme");
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<TagDefinition | null>(null);
  const [deleting, setDeleting] = useState<TagDefinition | null>(null);

  const sortedTags = useMemo(
    () =>
      [...tagDefinitions].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base"
        })
      ),
    [tagDefinitions]
  );

  const usageCounts = useMemo(
    () =>
      Object.fromEntries(
        tagDefinitions.map((tag) => [
          tag.id,
          Object.values(songMetadata).filter((metadata) =>
            metadata.keywords.some(
              (keyword) =>
                keyword.tagId === tag.id ||
                (!keyword.tagId &&
                  keyword.name.toLocaleLowerCase() ===
                    tag.name.toLocaleLowerCase())
            )
          ).length
        ])
      ),
    [songMetadata, tagDefinitions]
  );

  useEffect(() => {
    if (!editing && !deleting) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditing(null);
        setDeleting(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deleting, editing]);

  function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = normalizeTagName(name);
    if (!nextName) {
      setNotice("Enter a tag name.");
      return;
    }
    const created = createTagDefinition(nextName, color);
    if (!created) {
      setNotice("A tag with that name already exists.");
      return;
    }
    setName("");
    setColor("theme");
    setNotice(`${created.name} created.`);
  }

  if (!playlistsLoaded) {
    return <p className="text-sm text-zinc-500">Loading tags…</p>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
          Organization
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
          Tags
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Create a reusable tag library for organizing songs. A tag&apos;s
          color and name stay consistent everywhere in Curatore.
        </p>
      </header>

      <form
        className="theme-card grid gap-5 rounded-xl p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        onSubmit={createTag}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Create tag
            </span>
            <input
              className="theme-field h-10 w-full rounded-lg px-3 text-sm"
              maxLength={TAG_MAX_LENGTH}
              onChange={(event) =>
                setName(event.target.value.slice(0, TAG_MAX_LENGTH))
              }
              placeholder={'Enter a tag, e.g. "Pop"'}
              value={name}
            />
          </label>
          <TagColorPicker onChange={setColor} value={color} />
        </div>
        <button
          className="theme-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition disabled:opacity-40"
          disabled={!name.trim()}
          type="submit"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Create tag
        </button>
      </form>

      {notice ? (
        <p className="text-sm font-medium text-accent-strong" role="status">
          {notice}
        </p>
      ) : null}

      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Created tags
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {tagDefinitions.length}{" "}
              {tagDefinitions.length === 1 ? "tag" : "tags"}
            </p>
          </div>
        </div>

        {sortedTags.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {sortedTags.map((tag) => {
              const usageCount = usageCounts[tag.id] ?? 0;
              return (
                <article
                  className="theme-card flex min-w-0 items-center gap-3 rounded-xl p-3.5"
                  key={tag.id}
                >
                  <span
                    className={`inline-flex min-h-7 min-w-0 items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${getTagPillClasses(
                      tag.color,
                      false
                    )}`}
                  >
                    <span className="truncate">{tag.name}</span>
                  </span>
                  <p className="min-w-0 flex-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
                    {usageCount} {usageCount === 1 ? "song" : "songs"}
                  </p>
                  <button
                    aria-label={`Edit ${tag.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-accent-strong dark:text-zinc-400 dark:hover:bg-white/5"
                    onClick={() => setEditing(tag)}
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Delete ${tag.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10"
                    onClick={() => setDeleting(tag)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="theme-card rounded-xl border-dashed p-8 text-center">
            <Tags
              aria-hidden="true"
              className="mx-auto h-7 w-7 text-zinc-400"
            />
            <h2 className="mt-3 text-lg font-bold text-zinc-950 dark:text-white">
              No tags created yet
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create your first reusable tag above.
            </p>
          </div>
        )}
      </div>

      {editing ? (
        <EditTagDialog
          onClose={() => setEditing(null)}
          onSave={(updates) => {
            if (!updateTagDefinition(editing.id, updates)) {
              return false;
            }
            setEditing(null);
            setNotice(`${updates.name} updated.`);
            return true;
          }}
          tag={editing}
        />
      ) : null}

      {deleting ? (
        <DeleteTagDialog
          onClose={() => setDeleting(null)}
          onDelete={() => {
            deleteTagDefinition(deleting.id);
            setDeleting(null);
            setNotice(`${deleting.name} deleted.`);
          }}
          tag={deleting}
          usageCount={usageCounts[deleting.id] ?? 0}
        />
      ) : null}
    </section>
  );
}

function EditTagDialog({
  onClose,
  onSave,
  tag
}: {
  onClose: () => void;
  onSave: (updates: { name: string; color: TagColor }) => boolean;
  tag: TagDefinition;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal onClose={onClose}>
      <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
        Edit tag
      </p>
      <h2 className="mt-2 text-2xl font-bold text-zinc-950 dark:text-white">
        Update {tag.name}
      </h2>
      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Name
        </span>
        <input
          className="theme-field h-10 w-full rounded-lg px-3 text-sm"
          maxLength={TAG_MAX_LENGTH}
          onChange={(event) =>
            setName(event.target.value.slice(0, TAG_MAX_LENGTH))
          }
          value={name}
        />
      </label>
      <div className="mt-4">
        <TagColorPicker onChange={setColor} value={color} />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="theme-button-primary h-10 flex-1 rounded-lg text-sm font-semibold disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() => {
            const nextName = normalizeTagName(name);
            if (!onSave({ name: nextName, color })) {
              setError("A tag with that name already exists.");
            }
          }}
          type="button"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

function DeleteTagDialog({
  onClose,
  onDelete,
  tag,
  usageCount
}: {
  onClose: () => void;
  onDelete: () => void;
  tag: TagDefinition;
  usageCount: number;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertTriangle aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-white">
        Delete {tag.name}?
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        This removes the tag from the library and from {usageCount}{" "}
        {usageCount === 1 ? "song" : "songs"}. Ratings attached to this tag
        will also be removed. This cannot be undone.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          className="theme-button-secondary h-10 flex-1 rounded-lg text-sm font-semibold"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-10 flex-1 rounded-lg border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-500 transition hover:bg-red-500/20"
          onClick={onDelete}
          type="button"
        >
          Delete tag
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="theme-overlay fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        aria-modal="true"
        className="theme-menu relative w-full max-w-md rounded-2xl p-5 shadow-2xl"
        role="dialog"
      >
        <button
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-white/5 dark:hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        {children}
      </section>
    </div>
  );
}
