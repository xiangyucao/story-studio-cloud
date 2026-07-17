export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function createSlug(title: string) {
  const readable = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${readable || "story"}-${crypto.randomUUID().slice(0, 8)}`;
}
