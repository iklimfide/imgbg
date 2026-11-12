"use client";

import { useEffect, useRef, useState } from "react";
import { MediaStatusBadges, type MediaStatusInfo } from "@/components/MediaStatusBadges";
import { markMediaShown, mediaWasShown, warmMedia } from "@/lib/media-cache";

export const GALLERY_CHUNK = 18;

export const galleryGridClass =
  "grid grid-cols-2 gap-1 @min-[32rem]:grid-cols-2 @min-[48rem]:grid-cols-3 @min-[64rem]:grid-cols-4 @min-[80rem]:grid-cols-5 @min-[96rem]:grid-cols-6";

export function GalleryLoadMore({
  shown,
  total,
  onMore,
}: {
  shown: number;
  total: number;
  onMore: () => void;
}) {
  if (shown >= total) {
    return null;
  }
  const next = Math.min(GALLERY_CHUNK, total - shown);
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onMore}
        className="inline-flex min-h-11 items-center rounded-full bg-sky-600 px-5 text-sm font-medium text-white hover:bg-sky-500"
      >
        Daha fazla yükle ({next})
      </button>
    </div>
  );
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

export function GalleryTile({
  selected,
  dimmed,
  type,
  src,
  status,
  tags,
  onToggle,
  onOpen,
}: {
  selected: boolean;
  dimmed?: boolean;
  type: "image" | "video" | "audio";
  src: string;
  status?: MediaStatusInfo;
  tags?: string[];
  onToggle?: () => void;
  onOpen: () => void;
}) {
  const shownTags = tags?.slice(0, 3) ?? [];
  const extra = (tags?.length ?? 0) - shownTags.length;
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden bg-slate-200 dark:bg-slate-800 ${
        dimmed ? "opacity-50" : ""
      } ${selected ? "ring-2 ring-inset ring-sky-500" : ""}`}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0">
        <GalleryThumb type={type} src={src} />
      </button>
      {onToggle ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label="Seç"
          onClick={onToggle}
          className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold text-white ${
            selected ? "border-sky-500 bg-sky-500" : "border-white bg-black/35"
          }`}
        >
          {selected ? "✓" : ""}
        </button>
      ) : null}
      {status ? <MediaStatusBadges {...status} compact /> : null}
      {shownTags.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex flex-wrap gap-1 p-1.5">
          {shownTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm"
            >
              #{tag}
            </span>
          ))}
          {extra > 0 ? (
            <span className="rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-white">
              +{extra}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const SORTS = [
  { key: "new", label: "En yeni" },
  { key: "old", label: "En eski" },
  { key: "views", label: "En çok görüntülenenler" },
  { key: "az", label: "A-Z" },
] as const;

export type GallerySort = (typeof SORTS)[number]["key"];

export function sortChipClass(active: boolean) {
  return `inline-flex min-h-8 items-center rounded-full px-2.5 text-[11px] font-medium sm:text-xs ${
    active
      ? "bg-sky-600 text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
  }`;
}
