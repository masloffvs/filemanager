export type Entry = {
  id: string;
  type: "file" | "link" | "folder";
  size: number | null;
  fullPath: string; // server-provided display path
  path: string; // absolute path (used for icon heuristics)
  mimeType: string | null;
  parentId: string | null;
  meta?: any | null;
  comment?: string | null;
  tags?: string[] | null;
  isPasswordProtected?: boolean; // true if file is password protected
};

// human-readable file size formatter
export function humanSize(val: number | null | undefined): string {
  if (val == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;
  let size = Number(val);
  if (!Number.isFinite(size) || size < 0) return "";
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  const precision = size < 10 && i > 0 ? 1 : 0;
  return `${size.toFixed(precision)} ${units[i]}`;
}