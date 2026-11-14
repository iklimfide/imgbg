export const MAX_TAGS = 12;
export const MAX_TAG_LEN = 24;
export const UNTAGGED = "__untagged__";

export function toggleTagFilter(current: string[], tag: string | null) {
  if (!tag) {
    return [];
  }
  if (tag === UNTAGGED) {
    return current.includes(UNTAGGED) ? [] : [UNTAGGED];
  }
  const key = tag.toLocaleLowerCase("tr");
  const withoutNone = current.filter((item) => item !== UNTAGGED);
  if (withoutNone.some((item) => item.toLocaleLowerCase("tr") === key)) {
    return withoutNone.filter((item) => item.toLocaleLowerCase("tr") !== key);
  }
  return [...withoutNone, tag];
}

export function matchesTagFilter(tags: string[], filter: string | string[] | null) {
  const selected = !filter ? [] : Array.isArray(filter) ? filter : [filter];
  if (selected.length === 0) {
    return true;
  }
  if (selected.includes(UNTAGGED)) {
    return tags.length === 0;
  }
  return selected.every((item) => postHasTag(tags, item));
}

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
  const raw = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  const list = raw.flatMap((item) => String(item ?? "").split(/[,#\n]+/));
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

export function withoutTags(tags: string[], remove: string[]) {
  const keys = new Set(cleanTags(remove).map((item) => item.toLocaleLowerCase("tr")));
  if (keys.size === 0) {
    return [];
  }
  return tags.filter((item) => !keys.has(item.toLocaleLowerCase("tr")));
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
