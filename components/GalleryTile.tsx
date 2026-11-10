"use client";

import { useEffect, useRef, useState } from "react";
import { rememberMedia } from "@/lib/media-cache";

export const galleryGridClass =
  "grid grid-cols-2 gap-1 @min-[32rem]:grid-cols-4 @min-[48rem]:grid-cols-6 @min-[64rem]:grid-cols-8 @min-[80rem]:grid-cols-10 @min-[96rem]:grid-cols-12";

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
  const [live, setLive] = useState(false);
  const [cached, setCached] = useState<string | null>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "480px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!live || type !== "image") {
      return;
    }
    let drop: string | null = null;
    let cancelled = false;
    void rememberMedia(src).then((next) => {
      if (cancelled) {
        if (next.startsWith("blob:")) {
          URL.revokeObjectURL(next);
        }
        return;
      }
      setCached(next);
      if (next.startsWith("blob:")) {
        drop = next;
      }
    });
    return () => {
      cancelled = true;
      if (drop) {
        URL.revokeObjectURL(drop);
      }
    };
  }, [live, src, type]);

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
      {live && type === "image" && cached ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cached} alt="" decoding="async" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

export function GalleryTile({
  selected,
  dimmed,
  type,
  src,
  onOpen,
}: {
  selected: boolean;
  dimmed?: boolean;
  type: "image" | "video" | "audio";
  src: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ contentVisibility: "auto", containIntrinsicSize: "128px" }}
      className={`aspect-square w-full overflow-hidden bg-slate-200 dark:bg-slate-800 ${
        dimmed ? "opacity-50" : ""
      } ${selected ? "ring-2 ring-inset ring-sky-500" : ""}`}
    >
      <GalleryThumb type={type} src={src} />
    </button>
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
