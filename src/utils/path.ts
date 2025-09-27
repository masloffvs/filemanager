import { FILENAME_MAX_LEN, STORAGE } from "../config";
import path from "path";

export function sanitizeSegment(seg: string) {
  seg = seg.replaceAll("/", "");
  seg = path.basename(seg);
  seg = seg.replace(/[^\w.\-() ]+/g, "_").trim();
  seg = seg.replace(/\s+/g, " ");
  seg = seg.replace(/^\.+/, "");
  if (seg.length > FILENAME_MAX_LEN) seg = seg.slice(0, FILENAME_MAX_LEN);
  if (!seg) seg = "file";
  return seg;
}

export function sanitizeRelPath(rel: string) {
  if (!rel) return "";
  const parts = rel.split("/").filter(Boolean).map(sanitizeSegment);
  return parts.join("/");
}

export function resolveSafe(rel: string) {
  const cleaned = sanitizeRelPath(rel);
  const abs = path.resolve(STORAGE, cleaned);
  const okRoot = abs === STORAGE;
  const okChild = abs.startsWith(STORAGE + path.sep);
  if (!(okRoot || okChild)) throw new Error("bad path");
  return { abs, rel: cleaned };
}

export function encodeRelForUrl(rel: string) {
  if (!rel) return "";
  return rel.split("/").map(encodeURIComponent).join("/");
}

