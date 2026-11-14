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
  onRemove,
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
  onRemove?: () => void;
  onDelete: () => void;
  onTag: (tag: string, mode: "add" | "remove") => void;
  onTtl?: (ttl: string) => void;
}) {
  const empty = selectedCount === 0;
  const [ttlKey, setTtlKey] = useState("forever");
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={onSelectAll}
          className="min-h-10 shrink-0 rounded-xl bg-sky-50 px-2 text-[11px] font-medium text-sky-800 sm:px-3 sm:text-xs dark:bg-sky-950/40 dark:text-sky-200"
        >
          {allSelected ? "Seçimi kaldır" : "Hepsini seç"}
        </button>
        <button
          type="button"
          disabled={busy || empty}
          onClick={onHide}
          className="min-h-10 min-w-0 flex-1 truncate rounded-xl bg-amber-50 px-1 text-[11px] font-medium text-amber-800 disabled:opacity-40 sm:text-xs dark:bg-amber-950/40 dark:text-amber-200"
        >
          Gizle
        </button>
        <button
          type="button"
          disabled={busy || empty}
          onClick={onPublish}
          className="min-h-10 min-w-0 flex-1 truncate rounded-xl bg-emerald-50 px-1 text-[11px] font-medium text-emerald-800 disabled:opacity-40 sm:text-xs dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Yayına al
        </button>
        {onRemove ? (
          <button
            type="button"
            disabled={busy || empty}
            onClick={onRemove}
            className="min-h-10 min-w-0 flex-1 truncate rounded-xl bg-sky-50 px-1 text-[11px] font-medium text-sky-800 disabled:opacity-40 sm:text-xs dark:bg-sky-950/40 dark:text-sky-200"
          >
            Galeriden çıkar
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || empty}
          onClick={onDelete}
          className="min-h-10 min-w-0 flex-1 truncate rounded-xl bg-red-50 px-1 text-[11px] font-medium text-red-600 disabled:opacity-40 sm:text-xs"
        >
          {deleteLabel}
        </button>
        <span className="hidden shrink-0 text-[11px] text-slate-500 sm:inline">{selectedCount} seçildi</span>
        <CopyButton text={copyText} compact disabled={empty} label="Kopyala" />
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        <form
          className="flex min-w-0 gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const value = String(new FormData(form).get("tag") ?? "");
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            const mode = submitter instanceof HTMLButtonElement && submitter.value === "remove" ? "remove" : "add";
            form.reset();
            onTag(value, mode);
          }}
        >
          <input
            name="tag"
            placeholder="komik, hazal"
            disabled={busy || empty}
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button type="submit" name="mode" value="add" disabled={busy || empty} className="min-h-10 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white disabled:opacity-40">
            Ekle
          </button>
          <button
            type="submit"
            name="mode"
            value="remove"
            disabled={busy || empty}
            title="Boş bırakırsan seçilenlerin tüm etiketleri silinir"
            className="min-h-10 rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700 disabled:opacity-40 dark:bg-rose-950/40 dark:text-rose-200"
          >
            Kaldır
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
