import { promises as fs } from "fs";
import path from "path";
import { DirInfo, FileInfo } from "./types";
import { makeBreadcrumbs } from "./utils/breadcrumbs";
import { resolveSafe } from "./utils/path";
import { getDirSize } from "./utils/dirsize";
import { lookupMimeByPath } from "./utils/mime";
import { classifyFileKind } from "./utils/kind";

export async function listEntries(rel: string) {
  const { abs, rel: cleaned } = resolveSafe(rel);
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const dirs: DirInfo[] = [];
  const files: FileInfo[] = [];

  await Promise.all(
    entries.map(async (ent) => {
      const base = ent.name;
      const entryRel = cleaned ? `${cleaned}/${base}` : base;
      const p = path.join(abs, base);
      const lst = await fs.lstat(p);
      const isLink = lst.isSymbolicLink();
      const st = isLink ? await fs.stat(p).catch(() => lst) : lst;
      if (st.isDirectory()) {
        let size: number | undefined = undefined;
        try { size = await getDirSize(p); } catch { /* ignore */ }
        dirs.push({ name: base, rel: entryRel, mtime: new Date(st.mtimeMs).toISOString(), size });
      } else if (st.isFile() || isLink) {
        const mime = lookupMimeByPath(p);
        let mediaKind: FileInfo["mediaKind"] | undefined = undefined;
        if (mime.startsWith("image/")) mediaKind = "image";
        else if (mime.startsWith("video/")) mediaKind = "video";
        else if (mime.startsWith("audio/")) mediaKind = "audio";
        const { kind: fileKind, isExec } = classifyFileKind(p, (st as any).mode ?? 0);
        files.push({ name: base, rel: entryRel, size: (st as any).size ?? 0, mtime: new Date(st.mtimeMs).toISOString(), isLink, mediaKind, fileKind, isExec });
      }
    })
  );

  dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  files.sort((a, b) => +new Date(b.mtime) - +new Date(a.mtime));

  return { cwd: cleaned, dirs, files, breadcrumbs: makeBreadcrumbs(cleaned) };
}
