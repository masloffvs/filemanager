import path from "path";

export const STORAGE = path.resolve("./storage");

// Security/config
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
export const STRICT_MIME = false; // true => reject on MIME/ext mismatch
export const FILENAME_MAX_LEN = 180;

// In-memory cache TTLs
export const DIR_SIZE_TTL_MS = 2 * 60 * 1000; // 2 minutes
