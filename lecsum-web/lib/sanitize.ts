// Strip control characters and null bytes, collapse whitespace, trim
function cleanString(s: string): string {
  return s
    .replace(/[\x00-\x1f\x7f]/g, "") // control chars + DEL
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = cleanString(raw);
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 200);
}

export function sanitizeCourseName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = cleanString(raw);
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 100);
}

export function sanitizeFilename(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Strip path separators to prevent traversal
  const stripped = raw.replace(/[/\\]/g, "").replace(/\.\./g, "");
  const cleaned = cleanString(stripped);
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 255);
}
