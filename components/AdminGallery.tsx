"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GalleryBulkBar } from "@/components/GalleryBulkBar";
import {
  GALLERY_CHUNK,
  GalleryLoadMore,
  GalleryTile,
  SORTS,
  fileLabel,
  galleryGridClass,
  sortChipClass,
  type GallerySort,
} from "@/components/GalleryTile";
import { MediaEditPanel } from "@/components/MediaEditPanel";
import { MediaPreview } from "@/components/MediaPreview";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { TagChips } from "@/components/TagEditor";
import { cleanTags, postHasTag, uniqueTags } from "@/lib/tags";

export type AdminPostCard = {
  id: string;
  userId: string | null;
  holders: { id: string; name: string }[];
  type: "image" | "video" | "audio";
  r2Key: string;
  mime: string;
  size: number;
  originalName: string | null;
  ownerName: string | null;
  passwordHash: string | null;
  deletedAt: string | null;
  hiddenAt?: string | null;
  expiresAt: string | null;
  views: number;
  createdAt: string;
  pageUrl: string;
  src: string;
  tags: string[];
};

const KIND_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "image", label: "Resimler" },
  { key: "video", label: "Videolar" },
  { key: "audio", label: "Sesler" },
] as const;

type KindFilter = (typeof KIND_FILTERS)[number]["key"];

function statusOf(post: AdminPostCard) {
  if (post.deletedAt) {
    return { label: "Silindi", hidden: true };
  }
  if (post.hiddenAt) {
    return { label: "Gizli", hidden: true };
  }
  if (post.expiresAt && new Date(post.expiresAt).getTime() < Date.now()) {
    return { label: "Süresi doldu", hidden: true };
  }
  return { label: "Yayında", hidden: false };
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace(".", ",")} MB`;
}

function sortPosts(posts: AdminPostCard[], sort: GallerySort) {
  const list = [...posts];
  if (sort === "old") {
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  if (sort === "views") {
    return list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  }
  if (sort === "az") {
    return list.sort((a, b) =>
      fileLabel(a.originalName, a.id).localeCompare(fileLabel(b.originalName, b.id), "tr", { sensitivity: "base" }),
    );
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function AdminGallery({ posts }: { posts: AdminPostCard[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<AdminPostCard | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "hidden">("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState<GallerySort>("new");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(GALLERY_CHUNK);
  const [saveNote, setSaveNote] = useState<{ text: string; url?: string } | null>(null);
  const [ask, setAsk] = useState<{ message: string; run: () => Promise<void> } | null>(null);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of posts) {
      const list = post.holders.length
        ? post.holders
        : [{ id: post.userId ?? "guest", name: post.ownerName?.trim() || (post.userId ? "Üye" : "Misafir") }];
      for (const holder of list) {
        if (!map.has(holder.id)) {
          map.set(holder.id, holder.name);
        }
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "tr"));
  }, [posts]);

  const filtered = useMemo(() => {
    const next = posts.filter((post) => {
      if (kind !== "all" && post.type !== kind) {
        return false;
      }
      if (owner !== "all") {
        const ids = post.holders.length ? post.holders.map((holder) => holder.id) : [post.userId ?? "guest"];
        if (!ids.includes(owner)) {
          return false;
        }
      }
      if (tagFilter && !postHasTag(post.tags, tagFilter)) {
        return false;
      }
      const hidden = statusOf(post).hidden;
      if (filter === "live") {
        return !hidden;
      }
      if (filter === "hidden") {
        return hidden;
      }
      return true;
    });
    return sortPosts(next, sort);
  }, [posts, filter, kind, owner, sort, tagFilter]);

  const visible = filtered.slice(0, shown);
  const allBytes = filtered.reduce((sum, post) => sum + post.size, 0);
  const tags = uniqueTags(posts);
  const allFiltered = filtered.length > 0 && filtered.every((post) => selected.includes(post.id));
  const selectedUrls = filtered.filter((post) => selected.includes(post.id)).map((post) => post.pageUrl);

  useEffect(() => {
    setShown(GALLERY_CHUNK);
    setSelected([]);
  }, [filter, kind, owner, sort, tagFilter]);

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

  async function saveToGallery(kod: string) {
    setBusy(true);
    setSaveNote(null);
    try {
      const response = await fetch(`/api/posts/${kod}/save`, { method: "POST" });
      const json = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
        already?: boolean;
      } | null;
      if (!response.ok || !json?.url) {
        setSaveNote({ text: json?.error ?? "Galerine eklenemedi." });
        return;
      }
      setSaveNote({
        text: json.already ? "Zaten galerinde" : "Galerine eklendi",
        url: json.url,
      });
    } catch {
      setSaveNote({ text: "Galerine eklenemedi." });
    } finally {
      setBusy(false);
    }
  }

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

  async function patchOpen(body: Record<string, unknown>) {
    if (!open) {
      return;
    }
    setBusy(true);
    setSaveNote(null);
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
      setSaveNote({ text: json?.error ?? "Kaydedilemedi." });
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

  async function setHidden(ids: string[], hidden: boolean) {
    if (ids.length === 0) {
      return;
    }
    setBusy(true);
    const byId = new Map(posts.map((post) => [post.id, post]));
    await Promise.all(
      ids.map((kod) => {
        const post = byId.get(kod);
        if (!hidden && post?.deletedAt) {
          return fetch(`/api/admin/posts/${kod}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          });
        }
        return fetch(`/api/posts/${kod}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        });
      }),
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

  async function purgeSelected() {
    if (selected.length === 0) {
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
    setAsk(null);
    setSelected([]);
    router.refresh();
  }

  return (
    <>
      <div className="gallery-shell space-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Yüklemeler</h1>
          <p className="text-sm text-slate-500">
            Kullanıcıya kapalı kayıtlar da burada durur · toplam {formatBytes(allBytes)} · {filtered.length}
          </p>
          {saveNote ? (
            <p className="text-sm text-violet-700 dark:text-violet-300">
              {saveNote.text}
              {saveNote.url ? (
                <>
                  {" · "}
                  <Link href={saveNote.url} className="underline">
                    {saveNote.url}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-nowrap gap-1">
          {KIND_FILTERS.map((item) => {
            const active = kind === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setKind(item.key)}
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
          <select
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="min-h-9 max-w-[12rem] rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            aria-label="Kullanıcı"
          >
            <option value="all">Tüm kullanıcılar</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Tümü</option>
            <option value="live">Yayında</option>
            <option value="hidden">Gizli</option>
          </select>
        </div>

        <TagChips tags={tags} active={tagFilter} onPick={setTagFilter} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {SORTS.map((item) => (
              <button key={item.key} type="button" onClick={() => setSort(item.key)} className={sortChipClass(sort === item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <GalleryBulkBar
          selectedCount={selected.length}
          allSelected={allFiltered}
          busy={busy}
          deleteLabel="Kalıcı sil"
          copyText={selectedUrls.join("\n")}
          onSelectAll={() => setSelected(allFiltered ? [] : filtered.map((post) => post.id))}
          onHide={() => void setHidden(selected, true)}
          onPublish={() => void setHidden(selected, false)}
          onDelete={() =>
            setAsk({
              message: `${selected.length} kaydı kalıcı silmek istiyor musun?`,
              run: purgeSelected,
            })
          }
          onTag={(tag) => void tagSelected(tag)}
          onTtl={(ttl) => void applySelectedTtl(ttl)}
        />

        <div className={galleryGridClass}>
          {visible.map((post) => (
            <GalleryTile
              key={post.id}
              selected={selected.includes(post.id)}
              dimmed={statusOf(post).hidden}
              type={post.type}
              src={post.src}
              status={{
                hidden: Boolean(post.hiddenAt),
                password: Boolean(post.passwordHash),
                deleted: Boolean(post.deletedAt),
                expiresAt: post.expiresAt,
              }}
              tags={post.tags}
              onToggle={() =>
                setSelected((current) =>
                  current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id],
                )
              }
              onOpen={() => setOpen(post)}
            />
          ))}
        </div>
        <GalleryLoadMore
          shown={visible.length}
          total={filtered.length}
          onMore={() => setShown((count) => Math.min(filtered.length, count + GALLERY_CHUNK))}
        />
      </div>
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
              <p className="mb-3 text-sm text-slate-500">
                {open.holders.length > 0 ? open.holders.map((holder) => holder.name).join(", ") : (open.ownerName ?? "Misafir")}
              </p>
              <MediaPreview type={open.type} src={open.src} />
              <MediaEditPanel
                post={{ ...open, hiddenAt: open.hiddenAt ?? null }}
                pending={busy}
                tagError={saveNote && !saveNote.url ? saveNote.text : ""}
                onPatch={(body) => patchOpen(body)}
                onDelete={() =>
                  setAsk({
                    message: "Bu kaydı kalıcı silmek istiyor musun?",
                    run: async () => {
                      await run(open.id, "purge");
                      setAsk(null);
                    },
                  })
                }
              />
              {open.type === "image" || open.type === "video" ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveToGallery(open.id)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    {busy ? "Ekleniyor..." : "Galerime ekle"}
                  </button>
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(open.id, "restore")}
                  className="min-h-10 flex-1 rounded-xl bg-sky-50 text-sm text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  Geri getir
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setAsk({
                      message: "Bu kaydı kalıcı silmek istiyor musun?",
                      run: async () => {
                        await run(open.id, "purge");
                        setAsk(null);
                      },
                    })
                  }
                  className="min-h-10 flex-1 rounded-xl bg-red-50 text-sm text-red-600"
                >
                  Kalıcı sil
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        open={Boolean(ask)}
        message={ask?.message ?? ""}
        pending={busy}
        onCancel={() => setAsk(null)}
        onConfirm={() => {
          if (ask) {
            void ask.run();
          }
        }}
      />
    </>
  );
}
