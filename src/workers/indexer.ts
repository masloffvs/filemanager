import { promises as fs } from "fs";
import path from "path";
import { DISKS, DiskConfig } from "../config";
import { DiskIndex, IndexedDir, IndexedFile } from "../index/types";
import { loadIndex, saveIndex, setIndex } from "../index/store";
import { log } from "../utils/log";
import { lookupMimeByPath } from "../utils/mime";

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join("");
}

async function buildForDisk(disk: DiskConfig): Promise<DiskIndex> {
  const root = disk.path;
  const files: Record<string, IndexedFile> = {};
  const dirs: Record<string, IndexedDir> = {};

  const ensureDir = async (rel: string, mtime: number) => {
    if (!dirs[rel]) dirs[rel] = { rel, mtime, size: 0, childrenDirs: [], childrenFiles: [] };
    else dirs[rel].mtime = Math.max(dirs[rel].mtime, mtime);
  };

  const stack: string[] = [""];
  let lastSnapshot = 0;
  const SNAPSHOT_EVERY_MS = 750;
  const maybeSnapshot = async () => {
    const now = Date.now();
    if (now - lastSnapshot < SNAPSHOT_EVERY_MS) return;
    lastSnapshot = now;
    const idx: DiskIndex = { disk: disk.name, root, builtAt: Date.now(), files: { ...files }, dirs: { ...dirs } };
    setIndex(disk.name, idx); // update in-memory for UI
    await saveIndex(idx); // atomic save to file
    log("indexer", "snapshot", "partial saved", { disk: disk.name, files: Object.keys(files).length, dirs: Object.keys(dirs).length });
  };
  while (stack.length) {
    const rel = stack.pop()!; // '' at root
    const abs = path.join(root, rel);
    let entries: any[] = [];
    let stDirMtime = Date.now();
    try {
      const st = await fs.stat(abs);
      stDirMtime = st.mtimeMs;
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      continue;
    }
    await ensureDir(rel, stDirMtime);
    for (const ent of entries) {
      const name = ent.name;
      const childRel = rel ? `${rel}/${name}` : name;
      const childAbs = path.join(abs, name);
      try {
        const lst = await fs.lstat(childAbs);
        const isLink = lst.isSymbolicLink();
        const st = isLink ? await fs.stat(childAbs).catch(() => lst) : lst;
        if (st.isDirectory()) {
          dirs[rel].childrenDirs.push(name);
          await ensureDir(childRel, st.mtimeMs);
          stack.push(childRel);
        } else if (st.isFile() || isLink) {
          const id = await sha1Hex(`${disk.name}:${childRel}`);
          const mime = lookupMimeByPath(childAbs);
          let mediaKind: IndexedFile["mediaKind"] | undefined = undefined;
          if (mime.startsWith("image/")) mediaKind = "image";
          else if (mime.startsWith("video/")) mediaKind = "video";
          else if (mime.startsWith("audio/")) mediaKind = "audio";
          files[childRel] = {
            id,
            name,
            rel: childRel,
            size: (st as any).size ?? 0,
            mtime: st.mtimeMs,
            isLink,
            mediaKind,
          };
          dirs[rel].childrenFiles.push(name);
          // propagate size to ancestors
          const size = (st as any).size ?? 0;
          const parts = rel ? rel.split("/") : [];
          for (let i = parts.length; i >= 0; i--) {
            const drel = parts.slice(0, i).join("/");
            if (!dirs[drel]) dirs[drel] = { rel: drel, mtime: stDirMtime, size: 0, childrenDirs: [], childrenFiles: [] };
            dirs[drel].size += size;
          }
          await maybeSnapshot();
        }
      } catch {}
    }
  }

  const index: DiskIndex = {
    disk: disk.name,
    root,
    builtAt: Date.now(),
    files,
    dirs,
  };
  // final snapshot
  setIndex(disk.name, index);
  await saveIndex(index);
  return index;
}

async function indexAll() {
  for (const d of DISKS) {
    try {
      const idx = await buildForDisk(d);
      log("indexer", "build", "built index", { disk: d.name, files: Object.keys(idx.files).length, dirs: Object.keys(idx.dirs).length });
    } catch (e:any) {
      log("indexer", "build", "failed", { disk: d.name, error: String(e?.message||e) });
    }
  }
}

function debounce(fn: () => void, ms: number) { let t: any; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

async function startWatchers() {
  const building = new Map<string, boolean>();
  for (const d of DISKS) {
    try {
      const abs = d.path;
      const run = debounce(async () => {
        log("watcher", "fs", "change detected, reindex", { disk: d.name });
        if (building.get(d.name)) { log("watcher", "fs", "skip, build in progress", { disk: d.name }); return; }
        building.set(d.name, true);
        try {
          const idx = await buildForDisk(d);
          log("indexer", "build", "built index", { disk: d.name, files: Object.keys(idx.files).length, dirs: Object.keys(idx.dirs).length });
        } finally { building.set(d.name, false); }
      }, 1000);
      // Recursive on macOS should work; if not, we fallback to noop
      (fs as any).watch(abs, { recursive: true }, (_event, _file) => run());
      log("watcher", "fs", "watching", { disk: d.name, path: abs });
    } catch (e:any) {
      log("watcher", "fs", "watch failed", { disk: d.name, error: String(e?.message||e) });
    }
  }
}

export async function startIndexingWorkers() {
  // Try loading saved indices
  for (const d of DISKS) {
    const loaded = await loadIndex(d.name);
    if (loaded) setIndex(d.name, loaded);
  }
  await indexAll();
  await startWatchers();
}
