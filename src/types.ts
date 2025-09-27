export interface FileInfo {
  name: string;
  rel: string;
  size: number;
  mtime: string;
  isLink?: boolean;
  mediaKind?: "image" | "video" | "audio";
  fileKind?: "archive" | "executable" | "database" | "script" | "network" | "key" | "i18n" | "encrypted" | "design";
  isExec?: boolean;
}
export interface DirInfo { name: string; rel: string; mtime: string; size?: number }
export interface Breadcrumb { name: string; rel: string }

export interface ApiListResponse { ok: true; cwd: string; dirs: DirInfo[]; files: FileInfo[]; breadcrumbs: Breadcrumb[] }
export interface ApiUploadResponse { ok: true; file: string; size?: number }
export interface ApiError { ok: false; error: string }
