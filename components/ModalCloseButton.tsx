"use client";

export function ModalCloseButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Kapat"
      className="absolute right-2 top-2 z-20 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 text-3xl leading-none text-white shadow-lg ring-2 ring-white/80 hover:bg-slate-800 disabled:opacity-50 sm:right-3 sm:top-3 sm:h-14 sm:w-14 sm:text-4xl"
    >
      ×
    </button>
  );
}
