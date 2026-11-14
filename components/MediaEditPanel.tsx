"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyLink";
import { PasswordInput } from "@/components/PasswordInput";
import { TagEditor } from "@/components/TagEditor";
import { ttlOptionsFor } from "@/lib/quota";

export type EditableMedia = {
  id: string;
  type: "image" | "video" | "audio";
  originalName: string | null;
  passwordHash: string | null;
  hiddenAt: string | null;
  expiresAt?: string | null;
  pageUrl: string;
  tags: string[];
};

export function MediaEditPanel({
  post,
  pending,
  tagError,
  deleteLabel = "Sil",
  onPatch,
  onDelete,
}: {
  post: EditableMedia;
  pending?: boolean;
  tagError?: string;
  deleteLabel?: string;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(post.originalName ?? "");
  const [ttl, setTtl] = useState(
    post.type === "image" ? (post.expiresAt ? "1mo" : "forever") : "1d",
  );
  const [password, setPassword] = useState("");
  const options = ttlOptionsFor(post.type);

  useEffect(() => {
    setName(post.originalName ?? "");
    setPassword("");
    setTtl(post.type === "image" ? (post.expiresAt ? "1mo" : "forever") : "1d");
  }, [post.id, post.originalName, post.expiresAt, post.type]);

  return (
    <div className="mt-4 space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Paylaşım linki</span>
        <div className="flex gap-2">
          <input
            readOnly
            value={post.pageUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="min-h-11 min-w-0 flex-1 truncate rounded-xl border border-slate-200 px-3 text-sm text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-sky-300"
          />
          <CopyButton
            text={post.pageUrl}
            className="min-h-11 shrink-0 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void onPatch({ hidden: !post.hiddenAt })}
          className="min-h-11 rounded-xl bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {post.hiddenAt ? "Yayına al" : "Gizle"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="min-h-11 rounded-xl bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          Sil
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Düzelt (dosya adı)</span>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={180}
            disabled={pending}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => void onPatch({ originalName: name.trim() })}
            className="min-h-11 rounded-xl bg-slate-800 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Süreyi değiştir</span>
        <div className="flex gap-2">
          <select
            value={ttl}
            onChange={(event) => setTtl(event.target.value)}
            disabled={pending}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
            {post.type === "image" ? <option value="forever">Kalıcı (silinmesin)</option> : null}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => void onPatch({ ttl })}
            className="min-h-11 rounded-xl bg-sky-600 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Uygula
          </button>
        </div>
      </label>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {post.passwordHash ? "Şifreyi değiştir" : "Şifre ekle"}
        </p>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <PasswordInput
              minLength={4}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Yeni şifre"
              disabled={pending}
              className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <button
            type="button"
            disabled={pending || password.trim().length < 4}
            onClick={() => {
              void onPatch({ password: password.trim() });
              setPassword("");
            }}
            className="min-h-11 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
        {post.passwordHash ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void onPatch({ clearPassword: true })}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Şifreyi kaldır
          </button>
        ) : null}
      </div>

      <TagEditor tags={post.tags} pending={pending} onChange={(tags) => void onPatch({ tags })} />
      {tagError ? <p className="text-sm text-red-600">{tagError}</p> : null}
    </div>
  );
}
