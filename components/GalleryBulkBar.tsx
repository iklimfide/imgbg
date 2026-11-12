"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyLink";
import { TTL_OPTIONS } from "@/lib/quota";

const TTL_SHORT: Record<string, string> = {
  "1m": "1 dk",
  "5m": "5 dk",
  "1d": "1 gün",
  "1mo": "1 ay",
  "1y": "1 yıl",
  forever: "Kalıcı",
};

export function GalleryBulkBar({
  selectedCount,
  allSelected,
  busy,
  deleteLabel = "Sil",
  copyText,
  onSelectAll,
  onHide,
  onPublish,
  onDelete,
  onTag,
  onTtl,
}: {
  selectedCount: number;
  allSelected: boolean;
  busy?: boolean;
  deleteLabel?: string;
  copyText: string;
  onSelectAll: () => void;
  onHide: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
  onTtl?: (ttl: string) => void;
}) {
  const empty = selectedCount === 0;
  const [ttlKey, setTtlKey] = useState("forever");
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 px-1">
        <button type="button" onClick={onSelectAll} className="text-xs font-medium text-sky-700 dark:text-sky-300">
          {allSelected ? "Seçimi kaldır" : "Hepsini seç"}
        </button>
        <span className="text-xs text-slate-500">{selectedCount} seçildi</span>
        <CopyButton text={copyText} compact disabled={empty} label="Kopyala" />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          disabled={busy || empty}
          onClick={onHide}
          className="min-h-10 rounded-xl bg-amber-50 text-xs font-medium text-amber-800 disabled:opacity-40 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Gizle
        </button>
        <button
          type="button"
          disabled={busy || empty}
          onClick={onPublish}
          className="min-h-10 rounded-xl bg-emerald-50 text-xs font-medium text-emerald-800 disabled:opacity-40 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Yayına al
        </button>
        <button
          type="button"
          disabled={busy || empty}
          onClick={onDelete}
          className="min-h-10 rounded-xl bg-red-50 text-xs font-medium text-red-600 disabled:opacity-40"
        >
          {deleteLabel}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <form
          className="flex min-w-0 gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = String(new FormData(event.currentTarget).get("tag") ?? "");
            event.currentTarget.reset();
            onTag(value);
          }}
        >
          <input
            name="tag"
            placeholder="Etiket"
            disabled={busy || empty}
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button type="submit" disabled={busy || empty} className="min-h-10 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white disabled:opacity-40">
            Ekle
          </button>
        </form>
        <div className="flex min-w-0 gap-1">
          <select
            value={ttlKey}
            disabled={busy || empty}
            onChange={(event) => setTtlKey(event.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {TTL_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {TTL_SHORT[option.key] ?? option.label}
              </option>
            ))}
            <option value="forever">{TTL_SHORT.forever}</option>
          </select>
          <button
            type="button"
            disabled={busy || empty || !onTtl}
            onClick={() => onTtl?.(ttlKey)}
            className="min-h-10 rounded-xl bg-sky-600 px-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Süre
          </button>
        </div>
      </div>
    </div>
  );
}
