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
    <div className="min-w-0 space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Kısa bağlantınız</p>
      <CopyLink url={pageUrl} />
      <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
        {SHARE_SNIPPET_TABS.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-h-9 min-w-0 flex-1 rounded-full px-2 text-xs font-semibold @min-[36rem]:px-3 @min-[36rem]:text-sm ${
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
    <div className="relative">
      <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 px-3 py-3 pr-20 text-xs text-sky-100">
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 rounded-lg bg-slate-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-600"
      >
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}
