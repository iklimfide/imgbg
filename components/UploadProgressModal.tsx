"use client";

export function UploadProgressModal({
  open,
  percent,
  loaded,
  total,
  paused,
  onPause,
  onResume,
  onCancel,
}: {
  open: boolean;
  percent: number;
  loaded: number;
  total: number;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  const shown = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-progress-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-sky-200 dark:bg-slate-900 dark:ring-slate-700"
      >
        <p id="upload-progress-title" className="text-lg font-medium text-slate-800 dark:text-slate-100">
          {paused ? "Duraklatıldı" : "Yükleniyor"}
        </p>
        <p className="mt-4 text-left text-4xl font-semibold text-sky-500">{shown}%</p>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-200"
            style={{ width: `${shown}%` }}
          />
        </div>
        <div className="mt-4 flex justify-between text-sm text-slate-500">
          <div className="text-left">
            <p>Yüklenen</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">{formatMb(loaded)}</p>
          </div>
          <div className="text-right">
            <p>Toplam</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">{formatMb(total)}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={paused ? onResume : onPause}
            className="min-h-11 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
          >
            {paused ? "Devam" : "Durdur"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-red-300 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-800"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMb(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} MB`;
}
