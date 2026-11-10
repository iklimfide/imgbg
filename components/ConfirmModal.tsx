"use client";

import { ModalCloseButton } from "@/components/ModalCloseButton";

export function ConfirmModal({
  open,
  title = "Onay",
  message,
  confirmLabel = "Tamam",
  cancelLabel = "İptal",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4"
      onClick={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 pr-16 text-center shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalCloseButton disabled={pending} onClick={onCancel} />
        <p id="confirm-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {pending ? "Bekle..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
