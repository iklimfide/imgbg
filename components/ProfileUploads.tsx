"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CopyButton } from "@/components/CopyLink";
import {
  GalleryTile,
  SORTS,
  fileLabel,
  galleryGridClass,
  sortChipClass,
  type GallerySort,
} from "@/components/GalleryTile";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { MediaPreview } from "@/components/MediaPreview";

export type ProfilePostCard = {
  id: string;
  type: "image" | "video" | "audio";
  r2Key: string;
  mime: string;
  size: number;
  originalName: string | null;
  passwordHash: string | null;
  hiddenAt: string | null;
  views: number;
  createdAt: string;
  pageUrl: string;
  src: string;
};

const CHUNK = 12;

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "image", label: "Resimlerim" },
  { key: "video", label: "Videolarım" },
  { key: "audio", label: "Seslerim" },
] as const;

type GalleryFilter = (typeof FILTERS)[number]["key"];

function sortPosts(posts: ProfilePostCard[], sort: GallerySort) {
  const list = [...posts];
  if (sort === "old") {
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  if (sort === "views") {
    return list.sort((a, b) => b.views - a.views);
  }
  if (sort === "az") {
    return list.sort((a, b) =>
      fileLabel(a.originalName, a.id).localeCompare(fileLabel(b.originalName, b.id), "tr", { sensitivity: "base" }),
    );
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ProfileUploads({ posts, ownerName }: { posts: ProfilePostCard[]; ownerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<ProfilePostCard | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [sort, setSort] = useState<GallerySort>("new");
  const [selected, setSelected] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [shown, setShown] = useState(CHUNK);
  const sentinel = useRef<HTMLDivElement>(null);
  const byType = filter === "all" ? posts : posts.filter((post) => post.type === filter);
  const filtered = useMemo(() => sortPosts(byType, sort), [byType, sort]);
  const visible = filtered.slice(0, shown);
  const allFiltered = filtered.length > 0 && filtered.every((post) => selected.includes(post.id));
  const selectedUrls = filtered.filter((post) => selected.includes(post.id)).map((post) => post.pageUrl);
  const heading =
    filter === "video" ? `${ownerName}'in Videoları` : filter === "audio" ? `${ownerName}'in Sesleri` : `${ownerName}'in Resimleri`;

  useEffect(() => {
    setShown(CHUNK);
    setSelected([]);
  }, [filter, sort]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown((count) => Math.min(filtered.length, count + CHUNK));
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, shown]);

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
    setMenu(false);
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
    setSelected([]);
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
    return <p className="text-slate-500 dark:text-slate-400">Henüz yükleme yok.</p>;
  }

  return (
    <>
      <div className="gallery-shell space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white sm:text-xl">{heading}</h2>
        <div className="flex flex-nowrap gap-1">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`min-h-7 min-w-0 flex-1 truncate rounded-lg px-1.5 text-[11px] font-medium sm:min-h-8 sm:flex-none sm:px-2.5 sm:text-xs ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {SORTS.map((item) => (
              <button key={item.key} type="button" onClick={() => setSort(item.key)} className={sortChipClass(sort === item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected(allFiltered ? [] : filtered.map((post) => post.id))
              }
              className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
            >
              Hepsini seç
            </button>
            <button
              type="button"
              onClick={() => setMenu((value) => !value)}
              className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-300"
            >
              Eylemler ▾
            </button>
            {menu ? (
              <div className="absolute right-0 top-8 z-30 min-w-[11rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  disabled={busy || selected.length === 0}
                  onClick={() => {
                    setMenu(false);
                    setAskDelete(true);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  Sil ({selected.length})
                </button>
                <button
                  type="button"
                  disabled={busy || selected.length === 0}
                  onClick={() => void setHidden(selected, true)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  Gizle
                </button>
                <button
                  type="button"
                  disabled={busy || selected.length === 0}
                  onClick={() => void setHidden(selected, false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  Yayına al
                </button>
                <div className="px-2 py-1">
                  <CopyButton text={selectedUrls.join("\n")} compact disabled={selectedUrls.length === 0} label={`Kopyala (${selectedUrls.length})`} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Bu türde yükleme yok.</p>
        ) : (
          <div className={galleryGridClass}>
            {visible.map((post) => (
              <GalleryTile
                key={post.id}
                selected={selected.includes(post.id)}
                dimmed={Boolean(post.hiddenAt)}
                type={post.type}
                src={post.src}
                onOpen={() => setOpen(post)}
              />
            ))}
          </div>
        )}
        <div ref={sentinel} className="h-8" />
      </div>

      <ConfirmModal
        open={askDelete}
        message={`${selected.length} paylaşımı silmek istiyor musun?`}
        pending={busy}
        onCancel={() => setAskDelete(false)}
        onConfirm={() => void removeSelected()}
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
              <div className="mb-3 flex min-w-0 items-center gap-2">
                <p className="min-w-0 truncate text-sm text-sky-600 sm:text-base">{open.pageUrl}</p>
                <CopyButton text={open.pageUrl} compact />
              </div>
              <MediaPreview type={open.type} src={open.src} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
