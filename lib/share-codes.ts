import type { MediaKind } from "@/lib/site";

export type ShareKind = MediaKind;

export type ShareSnippetKey = "url" | "html" | "markdown" | "forum";

export const SHARE_SNIPPET_TABS: { key: ShareSnippetKey; label: string }[] = [
  { key: "url", label: "URL" },
  { key: "html", label: "HTML" },
  { key: "markdown", label: "Markdown" },
  { key: "forum", label: "Forum" },
];

function safeAlt(name: string) {
  return name.replace(/[\r\n]+/g, " ").replace(/["<>]/g, "").slice(0, 80);
}

export function shareSnippets({
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
  const alt = safeAlt(name) || "medya";
  if (kind === "video") {
    return {
      url: pageUrl,
      html: `<video src="${mediaUrl}" controls playsinline></video>`,
      markdown: `[${alt}](${pageUrl})`,
      forum: `[URL=${pageUrl}]${alt}[/URL]`,
    } as const;
  }
  if (kind === "audio") {
    return {
      url: pageUrl,
      html: `<audio src="${mediaUrl}" controls></audio>`,
      markdown: `[${alt}](${pageUrl})`,
      forum: `[URL=${pageUrl}]${alt}[/URL]`,
    } as const;
  }
  return {
    url: pageUrl,
    html: `<img src="${mediaUrl}" alt="${alt}" />`,
    markdown: `![${alt}](${mediaUrl})`,
    forum: `[IMG]${mediaUrl}[/IMG]`,
  } as const;
}

export function mediaShareUrl(pageUrl: string, kod: string) {
  try {
    return `${new URL(pageUrl).origin}/api/media/${kod}`;
  } catch {
    return `/api/media/${kod}`;
  }
}
