export const MAX_TAGS = 12;
export const MAX_TAG_LEN = 24;

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return cleanTags(parsed);
  } catch {
    return cleanTags(raw.split(/[,#]+/));
  }
}

export function cleanTags(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,#\n]+/)
      : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of list) {
    const value = String(item ?? "")
      .replace(/^#+/, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_TAG_LEN);
    if (value.length < 2) {
      continue;
    }
    const key = value.toLocaleLowerCase("tr");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(value);
    if (tags.length >= MAX_TAGS) {
      break;
    }
  }
  return tags;
}

export function serializeTags(tags: string[]) {
  return JSON.stringify(cleanTags(tags));
}

export function postHasTag(tags: string[], tag: string) {
  const key = tag.toLocaleLowerCase("tr");
  return tags.some((item) => item.toLocaleLowerCase("tr") === key);
}

export function uniqueTags(posts: { tags: string[] }[]) {
  const map = new Map<string, string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tag.toLocaleLowerCase("tr");
      if (!map.has(key)) {
        map.set(key, tag);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "tr"));
}
