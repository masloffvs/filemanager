import { promises as fs } from "fs";
import path from "path";
import { DirInfo, FileInfo } from "./types";
import { makeBreadcrumbs } from "./utils/breadcrumbs";
import { resolveSafe } from "./utils/path";

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
      const st = await fs.stat(p);
      if (ent.isDirectory())
        dirs.push({ name: base, rel: entryRel, mtime: new Date(st.mtimeMs).toISOString() });
      else if (ent.isFile())
        files.push({ name: base, rel: entryRel, size: st.size, mtime: new Date(st.mtimeMs).toISOString() });
    })
  );

  dirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  files.sort((a, b) => +new Date(b.mtime) - +new Date(a.mtime));

  return { cwd: cleaned, dirs, files, breadcrumbs: makeBreadcrumbs(cleaned) };
}
