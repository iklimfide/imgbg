"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CopyButton } from "@/components/CopyLink";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { DeletePostButton } from "@/components/DeletePostButton";
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

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "image", label: "Resimlerim" },
  { key: "video", label: "Videolarım" },
  { key: "audio", label: "Seslerim" },
] as const;

type GalleryFilter = (typeof FILTERS)[number]["key"];

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace(".", ",")} MB`;
}

function typeLabel(type: ProfilePostCard["type"]) {
  if (type === "video") {
    return "Video";
  }
  if (type === "audio") {
    return "Ses";
  }
  return "Resim";
}

function Thumb({ post }: { post: ProfilePostCard }) {
  const src = post.src;
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

export function ProfileUploads({ posts }: { posts: ProfilePostCard[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<ProfilePostCard | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [askDelete, setAskDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const filtered = filter === "all" ? posts : posts.filter((post) => post.type === filter);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPage = slice.length > 0 && slice.every((post) => selected.includes(post.id));
  const selectedUrls = filtered.filter((post) => selected.includes(post.id)).map((post) => post.pageUrl);

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
      <div className="space-y-3">
        <div className="flex flex-nowrap gap-1">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setFilter(item.key);
                  setPage(1);
                }}
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || selected.length === 0}
            onClick={() => setAskDelete(true)}
            className="min-h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            Sil
          </button>
          <CopyButton
            text={selectedUrls.join("\n")}
            compact
            disabled={selectedUrls.length === 0}
            label={`Toplu kopyala(${selectedUrls.length})`}
          />
          {pages > 1 ? (
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
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Bu türde yükleme yok.</p>
        ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-medium text-slate-500 dark:border-slate-800">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    onChange={() =>
                      setSelected(
                        allOnPage
                          ? selected.filter((id) => !slice.some((post) => post.id === id))
                          : [...new Set([...selected, ...slice.map((post) => post.id)])],
                      )
                    }
                  />
                </th>
                <th className="px-3 py-3">Önizleme</th>
                <th className="px-2 py-3">Durum</th>
                <th className="px-2 py-3">Tarih</th>
                <th className="px-2 py-3">Link</th>
                <th className="px-2 py-3">Tür</th>
                <th className="px-2 py-3">Boyut</th>
                <th className="px-2 py-3">Görüntülenme</th>
                <th className="px-2 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((post) => (
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
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setOpen(post)}
                      className={`h-14 w-14 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 ${
                        post.hiddenAt ? "opacity-50" : ""
                      }`}
                    >
                      <Thumb post={post} />
                    </button>
                  </td>
                  <td className="px-2 py-2 text-slate-500">{post.hiddenAt ? "Gizli" : "Yayında"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-600 dark:text-slate-300">
                    {new Date(post.createdAt).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex min-w-0 max-w-[280px] items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(post)}
                        className="min-w-0 truncate text-left text-sky-600 hover:underline"
                      >
                        {post.pageUrl}
                      </button>
                      <CopyButton text={post.pageUrl} compact />
                    </div>
                  </td>
                  <td className="px-2 py-2">{typeLabel(post.type)}</td>
                  <td className="whitespace-nowrap px-2 py-2">{formatBytes(post.size)}</td>
                  <td className="whitespace-nowrap px-2 py-2">{post.views}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setHidden([post.id], !post.hiddenAt)}
                        className={`inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-white ${
                          post.hiddenAt ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-500 hover:bg-amber-400"
                        }`}
                      >
                        {post.hiddenAt ? "Aç" : "Gizle"}
                      </button>
                      <DeletePostButton kod={post.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
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
