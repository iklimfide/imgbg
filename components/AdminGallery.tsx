"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GalleryBulkBar } from "@/components/GalleryBulkBar";
import { GalleryListTable, compareGalleryItems, type GallerySort } from "@/components/GalleryTile";
import { MediaEditPanel } from "@/components/MediaEditPanel";
import { MediaPreview } from "@/components/MediaPreview";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { TagChips } from "@/components/TagEditor";
import { prefetchMedia } from "@/lib/media-cache";
import { cleanTags, matchesTagFilter, toggleTagFilter, uniqueTags, withoutTags } from "@/lib/tags";

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
  thumbSrc: string;
  tags: string[];
};

const KIND_FILTERS = [
  {
    key: "all",
    label: "Tümü",
    on: "bg-sky-600 text-white shadow-sm",
    off: "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60",
  },
  {
    key: "image",
    label: "Resimler",
    on: "bg-violet-600 text-white shadow-sm",
    off: "bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/60",
  },
  {
    key: "video",
    label: "Videolar",
    on: "bg-fuchsia-600 text-white shadow-sm",
    off: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/60",
  },
  {
    key: "audio",
    label: "Sesler",
    on: "bg-rose-600 text-white shadow-sm",
    off: "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-900/60",
  },
] as const;

type KindFilter = (typeof KIND_FILTERS)[number]["key"];

function statusOf(post: AdminPostCard) {
  if (post.deletedAt) {
    return { key: "removed" as const, label: "Galeriden çıktı" };
  }
  if (post.hiddenAt) {
    return { key: "hidden" as const, label: "Gizli" };
  }
  if (post.expiresAt && new Date(post.expiresAt).getTime() < Date.now()) {
    return { key: "hidden" as const, label: "Süresi doldu" };
  }
  return { key: "live" as const, label: "Yayında" };
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace(".", ",")} MB`;
}

function sortPosts(posts: AdminPostCard[], sort: GallerySort) {
  return [...posts].sort((a, b) => compareGalleryItems(a, b, sort));
}

export function AdminGallery({ posts }: { posts: AdminPostCard[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<AdminPostCard | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "hidden" | "removed">("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState<GallerySort>({ key: "date", dir: "desc" });
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({});
  const [saveNote, setSaveNote] = useState<{ text: string; url?: string } | null>(null);
  const [ask, setAsk] = useState<{ message: string; run: () => Promise<void> } | null>(null);
  const items = useMemo(
    () => posts.map((post) => (tagOverrides[post.id] ? { ...post, tags: tagOverrides[post.id] } : post)),
    [posts, tagOverrides],
  );

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of items) {
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
  }, [items]);

  const filtered = useMemo(() => {
    const next = items.filter((post) => {
      if (kind !== "all" && post.type !== kind) {
        return false;
      }
      if (owner !== "all") {
        const ids = post.holders.length ? post.holders.map((holder) => holder.id) : [post.userId ?? "guest"];
        if (!ids.includes(owner)) {
          return false;
        }
      }
      if (!matchesTagFilter(post.tags, tagFilter)) {
        return false;
      }
      const status = statusOf(post).key;
      if (filter === "all") {
        return true;
      }
      return status === filter;
    });
    return sortPosts(next, sort);
  }, [items, filter, kind, owner, sort, tagFilter]);

  const allBytes = filtered.reduce((sum, post) => sum + post.size, 0);
  const tags = uniqueTags(items);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allFiltered = filtered.length > 0 && filtered.every((post) => selectedSet.has(post.id));
  const selectedUrls = filtered.filter((post) => selectedSet.has(post.id)).map((post) => post.pageUrl);
  const tableRows = useMemo(
    () =>
      filtered.map((post) => ({
        ...post,
        owner:
          post.holders.length > 0
            ? post.holders.map((holder) => holder.name).join(", ")
            : "—",
      })),
    [filtered],
  );
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const toggleSelected = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }, []);
  const openSelected = useCallback((id: string) => {
    const post = filteredRef.current.find((item) => item.id === id) ?? null;
    if (post?.src) {
      prefetchMedia(post.src);
    }
    setOpen(post);
  }, []);

  useEffect(() => {
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

  async function run(kod: string, action: "restore" | "hide" | "purge" | "remove") {
    setBusy(true);
    await fetch(`/api/admin/posts/${kod}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ownerId: owner }),
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
    if ("tags" in body) {
      const tags = cleanTags(body.tags);
      const kod = open.id;
      setTagOverrides((current) => ({ ...current, [kod]: tags }));
      setOpen((current) => (current ? { ...current, tags } : current));
      void fetch(`/api/posts/${kod}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      }).then(() => router.refresh());
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
    const byId = new Map(items.map((post) => [post.id, post]));
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

  function tagSelected(tag: string, mode: "add" | "remove" = "add") {
    const extra = cleanTags(tag);
    if (selected.length === 0 || (mode === "add" && extra.length === 0)) {
      return;
    }
    const ids = [...selected];
    const byId = new Map(items.map((post) => [post.id, post]));
    const nextTags: Record<string, string[]> = {};
    for (const kod of ids) {
      const current = byId.get(kod)?.tags ?? [];
      nextTags[kod] = mode === "remove" ? withoutTags(current, extra) : cleanTags([...current, ...extra]);
    }
    setTagOverrides((current) => ({ ...current, ...nextTags }));
    setOpen((current) => (current && nextTags[current.id] ? { ...current, tags: nextTags[current.id] } : current));
    void Promise.all(
      ids.map((kod) =>
        fetch(`/api/posts/${kod}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: nextTags[kod] }),
        }),
      ),
    ).then(() => router.refresh());
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

  async function removeSelected() {
    if (selected.length === 0) {
      return;
    }
    setBusy(true);
    await Promise.all(
      selected.map((kod) =>
        fetch(`/api/admin/posts/${kod}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", ownerId: owner }),
        }),
      ),
    );
    setBusy(false);
    setAsk(null);
    setSelected([]);
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
        <div className="gallery-toolbar space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-base font-semibold text-slate-800 dark:text-white sm:text-lg">Yüklemeler</h1>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            {filtered.length} · {formatBytes(allBytes)}
          </span>
        </div>
        {saveNote ? (
          <p className="text-xs text-violet-700 dark:text-violet-300">
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
        <div className="grid grid-cols-4 gap-1">
          {KIND_FILTERS.map((item) => {
            const active = kind === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setKind(item.key)}
                className={`min-h-9 truncate rounded-xl px-1 text-[11px] font-semibold sm:text-xs ${
                  active ? item.on : item.off
                }`}
              >
                {item.label === "Resimler" ? "Resim" : item.label === "Videolar" ? "Video" : item.label === "Sesler" ? "Ses" : item.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <select
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="min-h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
            className="min-h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Tümü</option>
            <option value="live">Yayında</option>
            <option value="hidden">Gizli</option>
            <option value="removed">Galeriden silinenler</option>
          </select>
        </div>
        <TagChips tags={tags} active={tagFilter} onPick={(tag) => setTagFilter((current) => toggleTagFilter(current, tag))} />
        <GalleryBulkBar
          selectedCount={selected.length}
          allSelected={allFiltered}
          busy={busy}
          deleteLabel="Kalıcı sil"
          copyText={selectedUrls.join("\n")}
          onSelectAll={() => setSelected(allFiltered ? [] : filtered.map((post) => post.id))}
          onHide={() => void setHidden(selected, true)}
          onPublish={() => void setHidden(selected, false)}
          onRemove={() =>
            setAsk({
              message:
                owner === "all"
                  ? `${selected.length} kaydı kullanıcı galerilerinden çıkarmak istiyor musun? Dosya kalıcı silinmez.`
                  : `${selected.length} kaydı bu kullanıcının galerisinden çıkarmak istiyor musun? Dosya kalıcı silinmez.`,
              run: removeSelected,
            })
          }
          onDelete={() =>
            setAsk({
              message: `${selected.length} kaydı kalıcı silmek istiyor musun?`,
              run: purgeSelected,
            })
          }
          onTag={(tag, mode) => void tagSelected(tag, mode)}
          onTtl={(ttl) => void applySelectedTtl(ttl)}
        />
        </div>

        <GalleryListTable
          rows={tableRows}
          selected={selected}
          allSelected={allFiltered}
          showOwner
          showViews
          sort={sort}
          onSort={setSort}
          onToggle={toggleSelected}
          onToggleAll={() => setSelected(allFiltered ? [] : filtered.map((post) => post.id))}
          onOpen={openSelected}
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
                {open.holders.length > 0
                  ? open.holders.map((holder) => holder.name).join(", ")
                  : open.ownerName && open.ownerName !== "—"
                    ? open.ownerName
                    : "Galeride yok"}
              </p>
              <MediaPreview type={open.type} src={open.src} />
              <MediaEditPanel
                post={{ ...open, hiddenAt: open.hiddenAt ?? null }}
                pending={busy}
                deleteLabel="Galeriden çıkar"
                tagError={saveNote && !saveNote.url ? saveNote.text : ""}
                onPatch={(body) => patchOpen(body)}
                onDelete={() =>
                  setAsk({
                    message: "Bu kaydı kullanıcının galerisinden çıkarmak istiyor musun? Dosya kalıcı silinmez.",
                    run: async () => {
                      await run(open.id, "remove");
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
