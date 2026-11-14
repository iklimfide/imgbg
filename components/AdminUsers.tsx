"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PasswordInput } from "@/components/PasswordInput";
import { formatBytes, formatWhen } from "@/components/GalleryTile";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import type { AdminUserRow } from "@/lib/users-admin";

export function AdminUsers({ users, selfId }: { users: AdminUserRow[]; selfId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AdminUserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<AdminUserRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) {
      return users;
    }
    return users.filter(
      (item) =>
        item.name.toLocaleLowerCase("tr").includes(q) ||
        item.email.toLocaleLowerCase("tr").includes(q),
    );
  }, [users, query]);

  function startEdit(row: AdminUserRow) {
    setOpen(row);
    setName(row.name);
    setEmail(row.email);
    setPassword("");
    setError("");
  }

  async function save() {
    if (!open) {
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/users/${open.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: password.trim() || undefined,
      }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setError(json?.error ?? "Kaydedilemedi.");
      return;
    }
    setOpen(null);
    router.refresh();
  }

  async function remove(row: AdminUserRow) {
    setBusy(true);
    const response = await fetch(`/api/admin/users/${row.id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    setAsk(null);
    if (!response.ok) {
      setError(json?.error ?? "Silinemedi.");
      return;
    }
    if (open?.id === row.id) {
      setOpen(null);
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-semibold text-slate-800 dark:text-white sm:text-lg">Kullanıcılar</h1>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
          {filtered.length}
        </span>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ad veya e-posta ara"
        className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      {error && !open ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="space-y-2">
        {filtered.map((row) => (
          <article
            key={row.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                {row.name}
                {row.admin ? (
                  <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                    Master
                  </span>
                ) : null}
                {row.id === selfId ? (
                  <span className="ml-1 text-[10px] text-slate-400">sen</span>
                ) : null}
              </p>
              <p className="truncate text-xs text-slate-500">{row.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                {row.postCount} medya · {formatBytes(row.bytes)} · {formatWhen(row.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="min-h-9 rounded-xl bg-sky-50 px-3 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
              >
                Düzenle
              </button>
              <button
                type="button"
                disabled={row.id === selfId}
                onClick={() => setAsk(row)}
                className="min-h-9 rounded-xl bg-red-50 px-3 text-xs font-medium text-red-700 disabled:opacity-40 dark:bg-red-950/40 dark:text-red-200"
              >
                Sil
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
            Kullanıcı yok.
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
          onClick={() => !busy && setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pt-12 shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalCloseButton onClick={() => setOpen(null)} />
            <h2 className="text-lg font-semibold">Kullanıcıyı düzenle</h2>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1 text-sm">
                <span>Kullanıcı adı</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>E-posta</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={open.admin}
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Yeni şifre (isteğe bağlı)</span>
                <PasswordInput
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(ask)}
        title="Kullanıcıyı sil"
        message={
          ask
            ? `${ask.name} silinsin mi? Medyaları da kalıcı silinir. Bu işlem geri alınmaz.`
            : ""
        }
        confirmLabel="Sil"
        pending={busy}
        onConfirm={() => ask && void remove(ask)}
        onCancel={() => setAsk(null)}
      />
    </div>
  );
}
