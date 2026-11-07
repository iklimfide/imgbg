"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MediaView } from "@/components/MediaView";
import type { Post } from "@/db/schema";
import { publicMediaUrl } from "@/lib/r2";

export type AdminPostCard = {
  id: string;
  type: "image" | "video" | "audio";
  r2Key: string;
  mime: string;
  size: number;
  originalName: string | null;
  ownerName: string | null;
  passwordHash: string | null;
  deletedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  pageUrl: string;
};

const PAGE_SIZE = 20;

function statusOf(post: AdminPostCard) {
  if (post.deletedAt) {
    return { label: "Silindi", hidden: true };
  }
  if (post.expiresAt && new Date(post.expiresAt).getTime() < Date.now()) {
    return { label: "Süresi doldu", hidden: true };
  }
  return { label: "Yayında", hidden: false };
}

function asPost(item: AdminPostCard): Post {
  return {
    id: item.id,
    userId: null,
    guestKey: null,
    type: item.type,
    r2Key: item.r2Key,
    mime: item.mime,
    size: item.size,
    originalName: item.originalName,
    passwordHash: item.passwordHash,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
    deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
    createdAt: new Date(item.createdAt),
  };
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace(".", ",")} MB`;
}

function typeLabel(type: AdminPostCard["type"]) {
  if (type === "video") {
    return "Video";
  }
  if (type === "audio") {
    return "Ses";
  }
  return "Resim";
}

function Thumb({ post }: { post: AdminPostCard }) {
  const src = publicMediaUrl(post.id, post.r2Key, Boolean(post.passwordHash));
  if (post.type === "video") {
    return <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  if (post.type === "audio") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-violet-100 text-lg text-violet-700 dark:bg-slate-800 dark:text-violet-300">
        ♪
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-full w-full object-cover" />
  );
}

export function AdminGallery({ posts }: { posts: AdminPostCard[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<AdminPostCard | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "live" | "hidden">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const hidden = statusOf(post).hidden;
      if (filter === "live") {
        return !hidden;
      }
      if (filter === "hidden") {
        return hidden;
      }
      return true;
    });
  }, [posts, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageBytes = slice.reduce((sum, post) => sum + post.size, 0);
  const allBytes = filtered.reduce((sum, post) => sum + post.size, 0);

  useEffect(() => {
    setSelected([]);
  }, [filter, safePage]);

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

  async function run(kod: string, action: "restore" | "hide" | "purge") {
    setBusy(true);
    await fetch(`/api/admin/posts/${kod}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (open?.id === kod && action === "purge") {
      setOpen(null);
    }
    router.refresh();
  }

  async function purgeSelected() {
    if (selected.length === 0 || !confirm(`${selected.length} kaydı kalıcı silmek istiyor musun?`)) {
      return;
    }
    setBusy(true);
    await Promise.all(
      selected.map((kod) =>
        fetch(`/api/admin/posts/${kod}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "purge" }),
        }),
      ),
    );
    setBusy(false);
    setSelected([]);
    router.refresh();
  }

  const allOnPage = slice.length > 0 && slice.every((post) => selected.includes(post.id));

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Yüklemeler</h1>
          <p className="text-sm text-slate-500">Kullanıcıya kapalı kayıtlar da burada durur.</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Bu sayfa: {formatBytes(pageBytes)}
            <span className="ml-2 font-normal text-slate-400">· toplam {formatBytes(allBytes)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: pages }, (_, index) => index + 1)
              .slice(0, 20)
              .map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-sm ${
                    number === safePage
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {number}
                </button>
              ))}
          </div>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as typeof filter);
              setPage(1);
            }}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Tümü</option>
            <option value="live">Yayında</option>
            <option value="hidden">Gizli</option>
          </select>
          <span className="text-sm text-slate-500">{filtered.length}</span>
          <button
            type="button"
            onClick={() => setSelected(allOnPage ? [] : slice.map((post) => post.id))}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700"
          >
            Tümünü seç
          </button>
          <button
            type="button"
            disabled={busy || selected.length === 0}
            onClick={() => void purgeSelected()}
            className="min-h-9 rounded-lg border border-red-300 px-3 text-sm text-red-600 disabled:opacity-50"
          >
            Tümünü sil
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={() => setSelected(allOnPage ? [] : slice.map((post) => post.id))}
                  />
                </th>
                <th className="px-2 py-3">Önizleme</th>
                <th className="px-2 py-3">Durum</th>
                <th className="px-2 py-3">Kim</th>
                <th className="px-2 py-3">Tarih</th>
                <th className="px-2 py-3">Link</th>
                <th className="px-2 py-3">Tür</th>
                <th className="px-2 py-3">Boyut</th>
                <th className="px-2 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((post) => {
                const status = statusOf(post);
                return (
                  <tr key={post.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(post.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(post.id)
                              ? current.filter((id) => id !== post.id)
                              : [...current, post.id],
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setOpen(post)}
                        className="h-14 w-14 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800"
                      >
                        <Thumb post={post} />
                      </button>
                    </td>
                    <td className="px-2 py-2 text-slate-500">{status.hidden ? status.label : "—"}</td>
                    <td className="px-2 py-2">{post.ownerName ?? "Misafir"}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600 dark:text-slate-300">
                      {new Date(post.createdAt).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="max-w-[220px] px-2 py-2">
                      <Link href={post.pageUrl} className="block truncate text-sky-600 hover:underline">
                        {post.pageUrl}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{typeLabel(post.type)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{formatBytes(post.size)}</td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          title="Geri getir"
                          onClick={() => void run(post.id, "restore")}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-sky-600 hover:bg-sky-50 disabled:opacity-50"
                        >
                          ↩
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          title="Kalıcı sil"
                          onClick={() => {
                            if (confirm("Bu kaydı kalıcı silmek istiyor musun?")) {
                              void run(post.id, "purge");
                            }
                          }}
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          ⌫
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{open.originalName ?? open.id}</p>
                <p className="text-sm text-slate-500">
                  /{open.id} · {statusOf(open).label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            <MediaView post={asPost(open)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
