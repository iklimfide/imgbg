"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { remainingLabel } from "@/components/MediaStatusBadges";
import { CopyButton } from "@/components/CopyLink";
import { markMediaShown, mediaWasShown, objectUrlFromCache, prefetchMedia, warmMedia } from "@/lib/media-cache";
import { posterFromVideoUrl } from "@/lib/video-poster";

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
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}.${value("month")}.${value("year")} ${value("hour")}:${value("minute")}`;
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

export const GalleryThumb = memo(function GalleryThumb({
  type,
  src,
  fullSrc,
  kod,
  eager = false,
}: {
  type: "image" | "video" | "audio";
  src: string;
  fullSrc?: string;
  kod?: string;
  eager?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const displaySrc = failed && fullSrc ? fullSrc : src;
  const [live, setLive] = useState(eager);
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    void objectUrlFromCache(displaySrc).then((url) => {
      if (!url) {
        return;
      }
      if (!active) {
        URL.revokeObjectURL(url);
        return;
      }
      created = url;
      setCachedSrc(url);
      setLive(true);
      markMediaShown(displaySrc);
    });
    return () => {
      active = false;
      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [displaySrc]);

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
      { rootMargin: "1800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [live, src]);

  const [videoFallback, setVideoFallback] = useState(false);
  const [localPoster, setLocalPoster] = useState<string | null>(null);
  const savingPoster = useRef(false);

  useEffect(() => {
    if (type !== "video" || !videoFallback || !kod || savingPoster.current) {
      return;
    }
    savingPoster.current = true;
    let cancelled = false;
    void posterFromVideoUrl(`/api/media/${kod}?capture=1`)
      .then(async (blob) => {
        if (!blob || cancelled) {
          return;
        }
        const posterUrl = URL.createObjectURL(blob);
        setLocalPoster(posterUrl);
        setVideoFallback(false);
        await fetch(`/api/thumb/${kod}`, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/webp" },
          body: blob,
        }).catch(() => undefined);
      })
      .catch(() => {
        savingPoster.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [kod, type, videoFallback]);

  if (type === "audio") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-violet-100 text-lg text-violet-700 dark:bg-slate-800 dark:text-violet-300">
        ♪
      </div>
    );
  }

  return (
    <div ref={root} className="h-full w-full bg-slate-200 dark:bg-slate-800">
      {live && type === "video" && !videoFallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localPoster ?? cachedSrc ?? src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => {
            if (!localPoster) {
              setVideoFallback(true);
            }
          }}
          onLoad={() => {
            prefetchMedia(src);
            void warmMedia(src);
          }}
        />
      ) : null}
      {live && type === "video" && videoFallback ? (
        <video src={fullSrc ?? src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : null}
      {live && type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cachedSrc ?? displaySrc}
          alt=""
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover"
          onError={() => {
            if (fullSrc && !failed) {
              setFailed(true);
            }
          }}
          onLoad={() => {
            prefetchMedia(displaySrc);
            void warmMedia(displaySrc);
          }}
        />
      ) : null}
    </div>
  );
});

export type GalleryListItem = {
  id: string;
  type: "image" | "video" | "audio";
  src: string;
  thumbSrc?: string;
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
    return "Galeriden çıktı";
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
  );
}

const GalleryCard = memo(function GalleryCard({
  post,
  checked,
  showOwner,
  showViews,
  eagerThumb,
  onToggle,
  onOpen,
}: {
  post: GalleryListItem;
  checked: boolean;
  showOwner?: boolean;
  showViews?: boolean;
  eagerThumb?: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl ${checked ? "bg-slate-900" : "bg-transparent"}`}>
      <article
        role="button"
        tabIndex={0}
        onClick={() => onToggle(post.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle(post.id);
          }
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-2 ${
          checked
            ? "scale-[0.96] border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggle(post.id)}
          aria-label="Seç"
          className="shrink-0"
        />
        <button
          type="button"
          onPointerEnter={() => prefetchMedia(post.src)}
          onPointerDown={() => prefetchMedia(post.src)}
          onClick={(event) => {
            event.stopPropagation();
            prefetchMedia(post.src);
            onOpen(post.id);
          }}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800"
        >
          <GalleryThumb
            type={post.type}
            src={post.thumbSrc ?? post.src}
            fullSrc={post.src}
            kod={post.id}
            eager={eagerThumb}
          />
        </button>
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500">
            <span>{statusText(post)}</span>
            {post.passwordHash ? <span className="text-xs text-violet-600">Şifreli</span> : null}
            {showOwner ? <span className="text-slate-700 dark:text-slate-200">{post.owner ?? "Misafir"}</span> : null}
            <span>{typeLabel(post.type)}</span>
            <span>{formatBytes(post.size)}</span>
            {showViews ? <span>{post.views ?? 0} görüntü</span> : null}
            <span className="text-slate-600 dark:text-slate-300">{formatWhen(post.createdAt)}</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-950/60 dark:text-violet-200"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sky-600">{post.pageUrl}</span>
            <span onClick={(event) => event.stopPropagation()}>
              <CopyButton text={post.pageUrl} compact />
            </span>
          </div>
        </div>
      </article>
    </div>
  );
});

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
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Hepsini seç" />
        <SortHead label="Ad" dir={sort.key === "name" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "name"))} />
        <SortHead label="Tarih" dir={sort.key === "date" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "date"))} />
        <SortHead label="Tür" dir={sort.key === "type" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "type"))} />
        <SortHead label="Boyut" dir={sort.key === "size" ? sort.dir : undefined} onClick={() => onSort(toggleSort(sort, "size"))} />
        {showViews ? (
          <SortHead
            label="Görüntülenme"
            dir={sort.key === "views" ? sort.dir : undefined}
            onClick={() => onSort(toggleSort(sort, "views"))}
          />
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((post, index) => (
          <GalleryCard
            key={post.id}
            post={post}
            checked={selectedSet.has(post.id)}
            showOwner={showOwner}
            showViews={showViews}
            eagerThumb={post.type === "image" && index < 32}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}
