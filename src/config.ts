import path from "path";

export const STORAGE = path.resolve("./storage");

// Security/config
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
export const STRICT_MIME = false; // true => reject on MIME/ext mismatch
export const FILENAME_MAX_LEN = 180;

// In-memory cache TTLs
export const DIR_SIZE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export interface DiskConfig { name: string; path: string }

// Additional disks. You can edit this array or populate via env `EXTRA_DISKS=name1:/abs/path1,name2:/abs/path2`
export const DISKS: DiskConfig[] = (() => {
  const list: DiskConfig[] = [{ name: "storage", path: STORAGE }];
  const extra = process.env.EXTRA_DISKS || "";
  for (const item of extra.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [name, p] = item.split(":");
    if (!name || !p) continue;
    list.push({ name, path: path.resolve(p) });
  }
  return list;
})();

export const INDEX_DIR = path.resolve("./.index");
