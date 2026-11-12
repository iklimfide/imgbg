"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GalleryBulkBar } from "@/components/GalleryBulkBar";
import { GalleryListTable, compareGalleryItems, type GallerySort } from "@/components/GalleryTile";
import { MediaEditPanel } from "@/components/MediaEditPanel";
import { MediaPreview } from "@/components/MediaPreview";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { TagChips } from "@/components/TagEditor";
import { cleanTags, postHasTag, uniqueTags } from "@/lib/tags";

export type ProfilePostCard = {
  id: string;
  type: "image" | "video" | "audio";
  r2Key: string;
  mime: string;
  size: number;
  originalName: string | null;
  passwordHash: string | null;
  hiddenAt: string | null;
  expiresAt: string | null;
  views: number;
  createdAt: string;
  pageUrl: string;
  src: string;
  tags: string[];
};

const FILTERS = [
  { key: "all", label: "Tümü", short: "Tümü" },
  { key: "image", label: "Resimlerim", short: "Resim" },
  { key: "video", label: "Videolarım", short: "Video" },
  { key: "audio", label: "Seslerim", short: "Ses" },
] as const;

type GalleryFilter = (typeof FILTERS)[number]["key"];

function sortPosts(posts: ProfilePostCard[], sort: GallerySort) {
  return [...posts].sort((a, b) => compareGalleryItems(a, b, sort));
}

export function ProfileUploads({
  posts,
  ownerName,
  quota,
}: {
  posts: ProfilePostCard[];
  ownerName: string;
  quota?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<ProfilePostCard | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [sort, setSort] = useState<GallerySort>({ key: "date", dir: "desc" });
  const [selected, setSelected] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [askDeleteOpen, setAskDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tagError, setTagError] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const byType = filter === "all" ? posts : posts.filter((post) => post.type === filter);
  const tagged = tagFilter ? byType.filter((post) => postHasTag(post.tags, tagFilter)) : byType;
  const filtered = useMemo(() => sortPosts(tagged, sort), [tagged, sort]);
  const tags = uniqueTags(posts);
  const allFiltered = filtered.length > 0 && filtered.every((post) => selected.includes(post.id));
  const selectedUrls = filtered.filter((post) => selected.includes(post.id)).map((post) => post.pageUrl);
  const heading =
    filter === "video" ? `${ownerName}'in Videoları` : filter === "audio" ? `${ownerName}'in Sesleri` : `${ownerName}'in Resimleri`;

  useEffect(() => {
    setSelected([]);
  }, [filter, sort, tagFilter]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function setHidden(ids: string[], hidden: boolean) {
    if (ids.length === 0) {
      return;
    }
    setBusy(true);
    await Promise.all(
      ids.map((kod) =>
        fetch(`/api/posts/${kod}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        }),
      ),
    );
    setBusy(false);
    router.refresh();
  }

  async function tagSelected(tag: string) {
    if (selected.length === 0 || tag.trim().length < 2) {
      return;
    }
    setBusy(true);
    const byId = new Map(posts.map((post) => [post.id, post]));
    await Promise.all(
      selected.map((kod) => {
        const post = byId.get(kod);
        return fetch(`/api/posts/${kod}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: cleanTags([...(post?.tags ?? []), tag]) }),
        });
      }),
    );
    setBusy(false);
    router.refresh();
  }

  async function applySelectedTtl(ttl: string) {
    if (selected.length === 0) {
      return;
    }
    setBusy(true);
    await Promise.all(
      selected.map((kod) =>
        fetch(`/api/posts/${kod}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ttl }),
        }),
      ),
    );
    setBusy(false);
    router.refresh();
  }

  async function patchOpen(body: Record<string, unknown>) {
    if (!open) {
      return;
    }
    setBusy(true);
    setTagError("");
    const response = await fetch(`/api/posts/${open.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => null)) as {
      error?: string;
      tags?: string[];
      hidden?: boolean;
      originalName?: string | null;
      password?: boolean;
      expiresAt?: string | null;
    } | null;
    setBusy(false);
    if (!response.ok) {
      setTagError(json?.error ?? "Kaydedilemedi.");
      return;
    }
    setOpen((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        tags: json?.tags ?? current.tags,
        hiddenAt: typeof json?.hidden === "boolean" ? (json.hidden ? new Date().toISOString() : null) : current.hiddenAt,
        originalName: json?.originalName !== undefined ? json.originalName : current.originalName,
        passwordHash: typeof json?.password === "boolean" ? (json.password ? "set" : null) : current.passwordHash,
        expiresAt: json?.expiresAt !== undefined ? json.expiresAt : current.expiresAt,
      };
    });
    router.refresh();
  }

  async function deleteOpen() {
    if (!open) {
      return;
    }
    setBusy(true);
    await fetch(`/api/posts/${open.id}`, { method: "DELETE" });
    setBusy(false);
    setAskDeleteOpen(false);
    setOpen(null);
    router.refresh();
  }

  async function removeSelected() {
    if (selected.length === 0) {
      return;
    }
    setBusy(true);
    await Promise.all(selected.map((kod) => fetch(`/api/posts/${kod}`, { method: "DELETE" })));
    setBusy(false);
    setAskDelete(false);
    setSelected([]);
    router.refresh();
  }

  if (posts.length === 0) {
    return (
      <div className="space-y-2">
        {quota ? <p className="text-sm text-slate-500 dark:text-slate-400">Kalıcı alan: {quota}</p> : null}
        <p className="text-slate-500 dark:text-slate-400">Henüz yükleme yok.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="gallery-toolbar space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-slate-800 dark:text-white sm:text-lg">{heading}</h2>
          {quota ? (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              {quota} MB
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-4 gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`min-h-8 truncate rounded-lg text-[11px] font-medium sm:text-xs ${
                  active ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
        <TagChips tags={tags} active={tagFilter} onPick={setTagFilter} />
        <GalleryBulkBar
          selectedCount={selected.length}
          allSelected={allFiltered}
          busy={busy}
          copyText={selectedUrls.join("\n")}
          onSelectAll={() => setSelected(allFiltered ? [] : filtered.map((post) => post.id))}
          onHide={() => void setHidden(selected, true)}
          onPublish={() => void setHidden(selected, false)}
          onDelete={() => setAskDelete(true)}
          onTag={(tag) => void tagSelected(tag)}
          onTtl={(ttl) => void applySelectedTtl(ttl)}
        />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Bu türde yükleme yok.</p>
        ) : (
          <GalleryListTable
            rows={filtered}
            selected={selected}
            allSelected={allFiltered}
            showViews
            sort={sort}
            onSort={setSort}
            onToggle={(id) =>
              setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
            }
            onToggleAll={() => setSelected(allFiltered ? [] : filtered.map((post) => post.id))}
            onOpen={(id) => setOpen(filtered.find((post) => post.id === id) ?? null)}
          />
        )}
      </div>
      <ConfirmModal
        open={askDelete}
        message={`${selected.length} paylaşımı silmek istiyor musun?`}
        pending={busy}
        onCancel={() => setAskDelete(false)}
        onConfirm={() => void removeSelected()}
      />
      <ConfirmModal
        open={askDeleteOpen}
        message="Bu paylaşımı silmek istiyor musun?"
        pending={busy}
        onCancel={() => setAskDeleteOpen(false)}
        onConfirm={() => void deleteOpen()}
      />
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalCloseButton onClick={() => setOpen(null)} />
            <div className="max-h-[92vh] overflow-y-auto p-4 pr-16 sm:p-6 sm:pr-20">
              <MediaPreview type={open.type} src={open.src} />
              <MediaEditPanel
                post={open}
                pending={busy}
                tagError={tagError}
                onPatch={(body) => patchOpen(body)}
                onDelete={() => setAskDeleteOpen(true)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
