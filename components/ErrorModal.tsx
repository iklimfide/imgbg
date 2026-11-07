"use client";

export function ErrorModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-red-100 dark:bg-slate-900 dark:ring-red-900/40"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="error-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Hata
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-500"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
