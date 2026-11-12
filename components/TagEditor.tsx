"use client";

import { useState } from "react";
import { MAX_TAG_LEN } from "@/lib/tags";

export function TagChips({
  tags,
  active,
  onPick,
}: {
  tags: string[];
  active?: string | null;
  onPick: (tag: string | null) => void;
}) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={`inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium sm:text-xs ${
          !active
            ? "bg-sky-600 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        Tümü
      </button>
      {tags.map((tag) => {
        const on = active?.toLocaleLowerCase("tr") === tag.toLocaleLowerCase("tr");
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onPick(on ? null : tag)}
            className={`inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium sm:text-xs ${
              on
                ? "bg-violet-600 text-white"
                : "bg-violet-50 text-violet-800 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-200"
            }`}
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}

export function TagEditor({
  tags,
  pending = false,
  onChange,
}: {
  tags: string[];
  pending?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const next = draft.trim();
    if (next.length < 2) {
      return;
    }
    onChange([...tags, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Etiketler</p>
      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? <span className="text-xs text-slate-400">Etiket yok</span> : null}
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={pending}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            className="inline-flex min-h-8 items-center gap-1 rounded-full bg-violet-100 px-2.5 text-xs font-medium text-violet-800 hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-950/60 dark:text-violet-200"
          >
            #{tag}
            <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={MAX_TAG_LEN}
          disabled={pending}
          placeholder="Etiket ekle"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="button"
          disabled={pending || draft.trim().length < 2}
          onClick={add}
          className="min-h-10 rounded-xl bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}
