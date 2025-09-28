import { promises as fs } from "fs";
import path from "path";
import { DISKS, DiskConfig, INDEX_CONCURRENCY, INDEX_MAX_QUEUE, INDEX_SNAPSHOT_MS, INDEX_SNAPSHOT_BATCH } from "../config";
import { DiskIndex, IndexedDir, IndexedFile } from "../index/types";
import { log } from "../utils/log";
import { classifyFileKind } from "../utils/kind";
import { lookupMimeByPath } from "../utils/mime";
import { openDb, upsertDisk, upsertNode, deleteNodesNotSeen, updateDirSize } from "../index/db";
import { classifyFileKind } from "../utils/kind";

const buildingState = new Map<string, boolean>();
export function isBuilding(disk: string) { return !!buildingState.get(disk); }

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join("");
}

async function buildForDisk(disk: DiskConfig): Promise<DiskIndex> {
  buildingState.set(disk.name, true);
  await openDb();
  const diskId = upsertDisk(disk.name, disk.path);
  const root = disk.path;
  const files: Record<string, IndexedFile> = {};
  const dirs: Record<string, IndexedDir> = {};

  const ensureDir = async (rel: string, mtime: number) => {
    if (!dirs[rel]) dirs[rel] = { rel, mtime, size: 0, childrenDirs: [], childrenFiles: [] };
    else dirs[rel].mtime = Math.max(dirs[rel].mtime, mtime);
  };

  const queue: string[] = [""];
  const dirtyDirs = new Set<string>();
  const dirtyFiles = new Set<string>();
  let lastSnapshot = 0;
  const SNAPSHOT_EVERY_MS = INDEX_SNAPSHOT_MS;
  const maybeSnapshot = async () => {
    const now = Date.now();
    if (now - lastSnapshot < SNAPSHOT_EVERY_MS) return;
    lastSnapshot = now;
    const seen_at = Date.now();
    let processed = 0;
    // Upsert a batch of dirty dirs
    for (const rel of Array.from(dirtyDirs)) {
      const d = dirs[rel]; if (!d) { dirtyDirs.delete(rel); continue; }
      const parent_rel = rel.split("/").slice(0, -1).join("/");
      upsertNode({ disk_id: diskId, rel, parent_rel, name: rel.split("/").slice(-1)[0] || "", dir: 1, size: d.size || 0, mtime: +new Date(d.mtime), is_link: 0, seen_at });
      dirtyDirs.delete(rel);
      processed++; if (processed >= INDEX_SNAPSHOT_BATCH) break;
    }
    // If still have budget, upsert files
    if (processed < INDEX_SNAPSHOT_BATCH) {
      for (const rel of Array.from(dirtyFiles)) {
        const f = files[rel]; if (!f) { dirtyFiles.delete(rel); continue; }
        const parent_rel = rel.split("/").slice(0, -1).join("/");
        const kinds = classifyFileKind(path.join(root, rel), 0);
        upsertNode({ disk_id: diskId, rel, parent_rel, name: f.name, dir: 0, size: f.size || 0, mtime: f.mtime, is_link: f.isLink ? 1 : 0, media_kind: f.mediaKind || null, file_kind: kinds.kind || null, is_exec: kinds.isExec ? 1 : 0, seen_at });
        dirtyFiles.delete(rel);
        processed++; if (processed >= INDEX_SNAPSHOT_BATCH) break;
      }
    }
    log("indexer", "snapshot", "partial saved", { disk: disk.name, files: Object.keys(files).length, dirs: Object.keys(dirs).length });
  };
  async function processDir(rel: string) {
    const abs = path.join(root, rel);
    let entries: any[] = [];
    let stDirMtime = Date.now();
    try {
      const st = await fs.stat(abs);
      stDirMtime = st.mtimeMs;
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    await ensureDir(rel, stDirMtime);
    dirtyDirs.add(rel);
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
          log("indexer", "dir", "discovered", { disk: disk.name, rel: childRel, abs: childAbs, mtime: st.mtimeMs });
          // backpressure: limit queue size
          queue.push(childRel);
          while (queue.length > INDEX_MAX_QUEUE) {
            await maybeSnapshot();
            await new Promise(res => setTimeout(res, 10));
          }
        } else if (st.isFile() || isLink) {
          const id = await sha1Hex(`${disk.name}:${childRel}`);
          const mime = lookupMimeByPath(childAbs);
          let mediaKind: IndexedFile["mediaKind"] | undefined = undefined;
          if (mime.startsWith("image/")) mediaKind = "image";
          else if (mime.startsWith("video/")) mediaKind = "video";
          else if (mime.startsWith("audio/")) mediaKind = "audio";
          const kinds = classifyFileKind(childAbs, (st as any).mode ?? 0);
          files[childRel] = {
            id,
            name,
            rel: childRel,
            size: (st as any).size ?? 0,
            mtime: st.mtimeMs,
            isLink,
            mediaKind,
          };
          dirtyFiles.add(childRel);
          log("indexer", "file", "indexed", {
            disk: disk.name,
            rel: childRel,
            abs: childAbs,
            size: (st as any).size ?? 0,
            mtime: st.mtimeMs,
            link: isLink ? 1 : 0,
            media: mediaKind || "",
            kind: kinds.kind || "",
            exec: kinds.isExec ? 1 : 0,
          });
          dirs[rel].childrenFiles.push(name);
          // propagate size to ancestors
          const size = (st as any).size ?? 0;
          const parts = rel ? rel.split("/") : [];
          for (let i = parts.length; i >= 0; i--) {
            const drel = parts.slice(0, i).join("/");
            if (!dirs[drel]) dirs[drel] = { rel: drel, mtime: stDirMtime, size: 0, childrenDirs: [], childrenFiles: [] };
            dirs[drel].size += size;
            dirtyDirs.add(drel);
          }
        }
      } catch {}
    }
    await maybeSnapshot();
  }

  async function worker() {
    for (;;) {
      const rel = queue.shift();
      if (rel === undefined) break;
      await processDir(rel);
    }
  }

  const workers = Array.from({ length: INDEX_CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const index: DiskIndex = {
    disk: disk.name,
    root,
    builtAt: Date.now(),
    files,
    dirs,
  };
  // final snapshot: write to SQLite and cleanup
  const seen_at = Date.now();
  for (const [rel, d] of Object.entries(dirs)) {
    const parent_rel = rel.split("/").slice(0, -1).join("/");
    upsertNode({ disk_id: diskId, rel, parent_rel, name: rel.split("/").slice(-1)[0] || "", dir: 1, size: d.size || 0, mtime: +new Date(d.mtime), is_link: 0, seen_at });
  }
  for (const [rel, f] of Object.entries(files)) {
    const parent_rel = rel.split("/").slice(0, -1).join("/");
    const kinds = classifyFileKind(path.join(root, rel), 0);
    upsertNode({ disk_id: diskId, rel, parent_rel, name: f.name, dir: 0, size: f.size || 0, mtime: f.mtime, is_link: f.isLink ? 1 : 0, media_kind: f.mediaKind || null, file_kind: kinds.kind || null, is_exec: kinds.isExec ? 1 : 0, seen_at });
  }
  // update sizes for dirs explicitly
  for (const [rel, d] of Object.entries(dirs)) updateDirSize(diskId, rel, d.size || 0);
  // remove nodes not seen in this run
  deleteNodesNotSeen(diskId, seen_at);
  buildingState.set(disk.name, false);
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
  for (const d of DISKS) {
    try {
      const abs = d.path;
      const run = debounce(async () => {
        log("watcher", "fs", "change detected, reindex", { disk: d.name });
        if (buildingState.get(d.name)) { log("watcher", "fs", "skip, build in progress", { disk: d.name }); return; }
        buildingState.set(d.name, true);
        try {
          const idx = await buildForDisk(d);
          log("indexer", "build", "built index", { disk: d.name, files: Object.keys(idx.files).length, dirs: Object.keys(idx.dirs).length });
        } finally { buildingState.set(d.name, false); }
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
  await indexAll();
  await startWatchers();
}
