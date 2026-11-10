"use client";

import { useEffect, useRef, useState } from "react";
import { ModalCloseButton } from "@/components/ModalCloseButton";
import { parseHttpUrls } from "@/lib/http-urls";

export function LinkAddModal({
  open,
  pending,
  pendingNote,
  paused = false,
  onClose,
  onAdd,
  onPause,
  onResume,
  onCancelFetch,
  kind = "image",
}: {
  open: boolean;
  pending: boolean;
  pendingNote?: string;
  paused?: boolean;
  kind?: "image" | "video";
  onClose: () => void;
  onAdd: (urls: string[]) => Promise<string | null>;
  onPause?: () => void;
  onResume?: () => void;
  onCancelFetch?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const videoOnly = kind === "video";

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!pending) {
      setText("");
      setError("");
    }
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
    const urls = parseHttpUrls(text);
    if (urls.length === 0) {
      setError(videoOnly ? "Bir video bağlantısı yapıştır." : "Bir veya daha fazla bağlantı yapıştır.");
      return;
    }
    setError("");
    await onAdd(videoOnly ? urls.slice(0, 1) : urls);
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
        className="relative w-full max-w-md rounded-3xl bg-white p-6 pr-16 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalCloseButton
          disabled={pending}
          onClick={() => {
            if (!pending) {
              onClose();
            }
          }}
        />
        <p id="link-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {pending ? (paused ? "Duraklatıldı" : "Alınıyor") : "Linkten ekle"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {pending
            ? pendingNote || "Bağlantılar alınıyor."
            : videoOnly
              ? "Tek bir Twitter/X veya mp4 bağlantısı yapıştır."
              : "Birden fazla bağlantıyı alt alta veya yan yana yapıştır."}
        </p>
        {videoOnly ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="url"
            value={text}
            disabled={pending}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="https://x.com/.../status/..."
            className="mt-4 w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        ) : (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={text}
            disabled={pending}
            rows={6}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={"https://...\nhttps://..."}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        )}
        {error ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-600">{error}</p>
        ) : null}
        {pending ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={paused ? onResume : onPause}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
            >
              {paused ? "Devam et" : "Durdur"}
            </button>
            <button
              type="button"
              onClick={onCancelFetch}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-800"
            >
              İptal
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-500"
            >
              Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
