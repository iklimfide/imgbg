"use client";

import { useState } from "react";
import { CopyLink } from "@/components/CopyLink";
import {
  SHARE_SNIPPET_TABS,
  shareSnippets,
  type ShareKind,
  type ShareSnippetKey,
} from "@/lib/share-codes";

export function ShareCodes({
  pageUrl,
  mediaUrl,
  name,
  kind,
}: {
  pageUrl: string;
  mediaUrl: string;
  name: string;
  kind: ShareKind;
}) {
  const [tab, setTab] = useState<ShareSnippetKey>("url");
  const snippets = shareSnippets({ pageUrl, mediaUrl, name, kind });
  const code = snippets[tab];

  return (
    <div className="@container min-w-0 space-y-3">
      <CopyLink url={pageUrl} />
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 @min-[22rem]:grid-cols-4">
        {SHARE_SNIPPET_TABS.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-h-9 rounded-xl px-2 text-xs font-semibold @min-[22rem]:rounded-full ${
                active
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <SnippetBox code={code} />
    </div>
  );
}

export function BulkShareCodes({ urls }: { urls: string[] }) {
  return (
    <div className="min-w-0 space-y-3 rounded-2xl bg-violet-50 p-3 dark:bg-violet-950/40 @min-[36rem]:p-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Toplu kod · {urls.length} resim
      </p>
      <CopyLink url={urls.join("\n")} />
    </div>
  );
}

function SnippetBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-900 px-3 py-3 text-xs text-sky-100">
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-slate-800 text-xs font-medium text-white hover:bg-slate-700"
      >
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}
