"use client";

import { useEffect, useRef, useState } from "react";

export function LinkAddModal({
  open,
  pending,
  onClose,
  onAdd,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onAdd: (url: string) => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setUrl("");
    setError("");
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, pending]);

  if (!open) {
    return null;
  }

  async function submit() {
    const next = url.trim();
    if (!next) {
      setError("Bir bağlantı yapıştır.");
      return;
    }
    setError("");
    const message = await onAdd(next);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-4"
      onClick={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-modal-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="link-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Linkten ekle
        </p>
        <input
          ref={inputRef}
          type="url"
          value={url}
          disabled={pending}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="https://..."
          className="mt-4 w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {pending ? "Alınıyor..." : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
