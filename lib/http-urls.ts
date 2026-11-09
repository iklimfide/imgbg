export function parseHttpUrls(text: string) {
  const found = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const cleaned = found.map((url) => url.replace(/[),.;!?]+$/g, ""));
  return [...new Set(cleaned)];
}
