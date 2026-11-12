"use client";

import { useEffect, useRef, useState } from "react";
import { remainingLabel } from "@/components/MediaStatusBadges";
import { CopyButton } from "@/components/CopyLink";
import { markMediaShown, mediaWasShown, warmMedia } from "@/lib/media-cache";

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace(".", ",")} MB`;
}

export function typeLabel(type: "image" | "video" | "audio") {
  if (type === "video") {
    return "Video";
  }
  if (type === "audio") {
    return "Ses";
  }
  return "Resim";
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fileLabel(name: string | null, id: string) {
  const raw = name?.trim();
  if (!raw) {
    return id;
  }
  try {
    return decodeURIComponent(raw).replace(/\\/g, "/").split("/").pop() ?? raw;
  } catch {
    return raw.replace(/\\/g, "/").split("/").pop() ?? raw;
  }
}

export function GalleryThumb({
  type,
  src,
}: {
  type: "image" | "video" | "audio";
  src: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(() => mediaWasShown(src));

  useEffect(() => {
    if (live) {
      markMediaShown(src);
      return;
    }
    const node = root.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          markMediaShown(src);
          setLive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "480px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [live, src]);

  if (type === "audio") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-violet-100 text-lg text-violet-700 dark:bg-slate-800 dark:text-violet-300">
        ♪
      </div>
    );
  }

  return (
    <div ref={root} className="h-full w-full bg-slate-200 dark:bg-slate-800">
      {live && type === "video" ? (
        <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : null}
      {live && type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          decoding="async"
          className="h-full w-full object-cover"
          onLoad={() => {
            void warmMedia(src);
          }}
        />
      ) : null}
    </div>
  );
}

export type GalleryListItem = {
  id: string;
  type: "image" | "video" | "audio";
  src: string;
  originalName: string | null;
  passwordHash: string | null;
  hiddenAt?: string | null;
  deletedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  pageUrl: string;
  size: number;
  views?: number;
  tags: string[];
  owner?: string;
};

export type GallerySortKey = "date" | "name" | "views" | "type" | "size";
export type GallerySort = { key: GallerySortKey; dir: "asc" | "desc" };

export function compareGalleryItems(
  a: { createdAt: string; originalName: string | null; id: string; views?: number; type: string; size: number },
  b: { createdAt: string; originalName: string | null; id: string; views?: number; type: string; size: number },
  sort: GallerySort,
) {
  let result = 0;
  if (sort.key === "date") {
    result = a.createdAt.localeCompare(b.createdAt);
  } else if (sort.key === "name") {
    result = fileLabel(a.originalName, a.id).localeCompare(fileLabel(b.originalName, b.id), "tr", { sensitivity: "base" });
  } else if (sort.key === "views") {
    result = (a.views ?? 0) - (b.views ?? 0);
  } else if (sort.key === "type") {
    result = a.type.localeCompare(b.type, "tr");
  } else {
    result = a.size - b.size;
  }
  return sort.dir === "asc" ? result : -result;
}

function toggleSort(current: GallerySort, key: GallerySortKey): GallerySort {
  if (current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: key === "date" || key === "views" || key === "size" ? "desc" : "asc" };
}

function statusText(post: GalleryListItem) {
  if (post.deletedAt) {
    return "Silindi";
  }
  if (post.hiddenAt) {
    return "Gizli";
  }
  const ttl = remainingLabel(post.expiresAt);
  if (ttl) {
    return ttl;
  }
  return "Yayında";
}

function SortHead({
  label,
  dir,
  onClick,
}: {
  label: string;
  dir?: "asc" | "desc";
  onClick: () => void;
}) {
  const active = Boolean(dir);
  return (
    <th className="px-2 py-3">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-left text-xs font-medium ${
          active ? "text-sky-700 dark:text-sky-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <span>{label}</span>
        <span className="inline-flex flex-col text-[8px] leading-[0.65] tracking-tighter" aria-hidden>
          <span className={dir === "asc" ? "text-sky-700 dark:text-sky-300" : "text-slate-300 dark:text-slate-600"}>▲</span>
          <span className={dir === "desc" ? "text-sky-700 dark:text-sky-300" : "text-slate-300 dark:text-slate-600"}>▼</span>
        </span>
      </button>
    </th>
  );
}

export function GalleryListTable({
  rows,
  selected,
  allSelected,
  showOwner,
  showViews,
  sort,
  onSort,
  onToggle,
  onToggleAll,
  onOpen,
}: {
  rows: GalleryListItem[];
  selected: string[];
  allSelected: boolean;
  showOwner?: boolean;
  showViews?: boolean;
  sort: GallerySort;
  onSort: (sort: GallerySort) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800">
          <tr>
            <th className="w-10 px-3 py-3">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Hepsini seç" />
            </th>
            <SortHead label="Önizleme" dir={sort.key === "name" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "name"))} />
            <th className="px-2 py-3">Durum</th>
            {showOwner ? <th className="px-2 py-3">Kim</th> : null}
            <th className="px-2 py-3">Etiket</th>
            <SortHead label="Tarih" dir={sort.key === "date" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "date"))} />
            <th className="px-2 py-3">Link</th>
            <SortHead label="Tür" dir={sort.key === "type" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "type"))} />
            <SortHead label="Boyut" dir={sort.key === "size" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "size"))} />
            {showViews ? (
              <SortHead
                label="Görüntülenme"
                dir={sort.key === "views" ? sort.dir : undefined}
                onClick={() => onSort(toggleSort(sort, "views"))}
              />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.includes(post.id)}
                  onChange={() => onToggle(post.id)}
                  aria-label="Seç"
                />
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpen(post.id)}
                  className={`h-24 w-24 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 ${
                    post.hiddenAt || post.deletedAt ? "opacity-50" : ""
                  }`}
                >
                  <GalleryThumb type={post.type} src={post.src} />
                </button>
              </td>
              <td className="px-2 py-2 text-slate-500">
                <span className="block">{statusText(post)}</span>
                {post.passwordHash ? <span className="text-xs text-violet-600">Şifreli</span> : null}
              </td>
              {showOwner ? <td className="px-2 py-2">{post.owner ?? "Misafir"}</td> : null}
              <td className="px-2 py-2">
                <div className="flex max-w-[12rem] flex-wrap gap-1">
                  {post.tags.length === 0 ? <span className="text-slate-400">—</span> : null}
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                      #{tag}
                    </span>
                  ))}
                  {post.tags.length > 3 ? <span className="text-[11px] text-slate-400">+{post.tags.length - 3}</span> : null}
                </div>
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-slate-600 dark:text-slate-300">{formatWhen(post.createdAt)}</td>
              <td className="px-2 py-2">
                <div className="flex min-w-0 max-w-[280px] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(post.id)}
                    className="min-w-0 truncate text-left text-sky-600 hover:underline"
                  >
                    {post.pageUrl}
                  </button>
                  <CopyButton text={post.pageUrl} compact />
                </div>
              </td>
              <td className="px-2 py-2">{typeLabel(post.type)}</td>
              <td className="whitespace-nowrap px-2 py-2">{formatBytes(post.size)}</td>
              {showViews ? <td className="whitespace-nowrap px-2 py-2">{post.views ?? 0}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
