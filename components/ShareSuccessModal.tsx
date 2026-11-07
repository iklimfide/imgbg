"use client";

import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BulkShareCodes, ShareCodes } from "@/components/ShareCodes";
import { mediaShareUrl } from "@/lib/share-codes";

export type ShareResult = {
  kod: string;
  url: string;
  preview: string;
  kind: "image" | "video" | "audio";
  name: string;
  deleteToken: string;
};

export function ShareSuccessModal({
  open,
  items,
  note,
  onClose,
  onDeleted,
}: {
  open: boolean;
  items: ShareResult[];
  note: string;
  onClose: () => void;
  onDeleted: (kod: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState<ShareResult | null>(null);
  const [askDelete, setAskDelete] = useState<ShareResult | null>(null);

  useEffect(() => {
    if (!open) {
      setEnlarged(null);
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (enlarged) {
        setEnlarged(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, enlarged]);

  if (!open) {
    return null;
  }

  async function remove(item: ShareResult) {
    setBusy(item.kod);
    const response = await fetch(`/api/posts/${item.kod}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: item.deleteToken }),
    });
    setBusy(null);
    setAskDelete(null);
    if (response.ok) {
      onDeleted(item.kod);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="@container max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900 @min-[40rem]:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p id="share-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              {items.length === 0 ? "Tümü silindi" : "Paylaşım hazır"}
            </p>
            {note && items.length > 0 ? <p className="mt-1 text-sm text-slate-500">{note}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Yüklenen dosyalar silindi. Pencereyi kapatabilirsin.</p>
        ) : (
          <>
          {items.length > 1 ? (
            <div className="mb-5">
              <BulkShareCodes urls={items.map((item) => item.url)} />
            </div>
          ) : null}
          <ul className="space-y-5">
            {items.map((item) => (
              <li
                key={item.kod}
                className="grid grid-cols-1 items-stretch gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 @min-[36rem]:grid-cols-2"
              >
                <div className="relative h-36 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-900 @min-[36rem]:h-full @min-[36rem]:min-h-[11rem]">
                  {item.kind === "video" ? (
                    <video src={item.preview} controls playsInline className="h-full w-full bg-black object-cover" />
                  ) : item.kind === "audio" ? (
                    <audio src={item.preview} controls className="absolute inset-x-3 top-1/2 w-[calc(100%-1.5rem)] -translate-y-1/2" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEnlarged(item)}
                      className="absolute inset-0 cursor-zoom-in"
                      aria-label="Resmi büyüt"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === item.kod}
                    onClick={() => setAskDelete(item)}
                    className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-1.5 text-base font-bold text-red-600 shadow-lg hover:bg-white disabled:opacity-60"
                  >
                    {busy === item.kod ? "Siliniyor..." : "Sil"}
                  </button>
                </div>
                <div className="flex min-w-0 flex-col justify-center space-y-2">
                  <ShareCodes
                    pageUrl={item.url}
                    mediaUrl={mediaShareUrl(item.url, item.kod)}
                    name={item.kod}
                    kind={item.kind}
                  />
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>
      <ConfirmModal
        open={Boolean(askDelete)}
        message="Bu paylaşımı silmek istiyor musun?"
        pending={Boolean(busy)}
        onCancel={() => setAskDelete(null)}
        onConfirm={() => {
          if (askDelete) {
            void remove(askDelete);
          }
        }}
      />
      {enlarged && enlarged.kind === "image" ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={(event) => {
            event.stopPropagation();
            setEnlarged(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enlarged.preview}
            alt=""
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
