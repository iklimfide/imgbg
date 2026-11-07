"use client";

import { useState } from "react";

export function CopyButton({
  text,
  compact = false,
  disabled = false,
  label = "Kopyala",
}: {
  text: string;
  compact?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || !text}
      className={
        compact
          ? "inline-flex min-h-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 px-2.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          : "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-500 disabled:opacity-50 @min-[28rem]:w-auto"
      }
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Kopyalandı" : label}
    </button>
  );
}

export function CopyLink({ url }: { url: string }) {
  return (
    <div className="@container w-full min-w-0">
    <div className="flex w-full min-w-0 flex-col gap-2 @min-[28rem]:flex-row @min-[28rem]:items-center">
      <code
        className={`min-w-0 w-full break-all rounded-xl bg-white px-3 py-2.5 text-xs text-violet-700 @min-[28rem]:text-sm dark:bg-slate-950 dark:text-violet-300 ${
          url.includes("\n") ? "max-h-28 overflow-auto whitespace-pre-wrap" : "@min-[28rem]:truncate"
        }`}
      >
        {url}
      </code>
      <CopyButton text={url} />
    </div>
    </div>
  );
}
