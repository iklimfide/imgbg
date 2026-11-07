"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

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
      <button
        type="button"
        className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-500 @min-[28rem]:w-auto"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
    </div>
  );
}
