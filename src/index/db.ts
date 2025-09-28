import { promises as fs } from "fs";
import path from "path";
import { INDEX_DIR } from "../config";

// Bun's SQLite driver
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore
import { Database } from "bun:sqlite";

let db: any | null = null;

function ensureDb() {
  if (db) return db;
  const file = path.join(INDEX_DIR, "index.sqlite");
  db = new Database(file);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    CREATE TABLE IF NOT EXISTS disks (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      path TEXT NOT NULL,
      meta TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS nodes (
      disk_id TEXT NOT NULL,
      rel TEXT NOT NULL,
      parent_rel TEXT NOT NULL,
      name TEXT NOT NULL,
      dir INTEGER NOT NULL,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL,
      is_link INTEGER NOT NULL,
      media_kind TEXT,
      file_kind TEXT,
      is_exec INTEGER,
      seen_at INTEGER,
      PRIMARY KEY (disk_id, rel)
    );
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(disk_id, parent_rel, dir, mtime);
  `);
  return db;
}

export async function openDb() {
  await fs.mkdir(INDEX_DIR, { recursive: true });
  return ensureDb();
}

export function randomHex(bytes = 16) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function upsertDisk(name: string, p: string, meta: any = null) {
  const db = ensureDb();
  const now = Date.now();
  const row = db.query("SELECT id FROM disks WHERE name = ?").get(name) as { id?: string } | undefined;
  if (row && row.id) {
    db.query("UPDATE disks SET path=?, meta=?, updated_at=? WHERE id=?").run(p, meta ? JSON.stringify(meta) : null, now, row.id);
    return row.id as string;
  }
  const id = randomHex(12);
  db.query("INSERT INTO disks(id,name,path,meta,created_at,updated_at) VALUES (?,?,?,?,?,?)").run(id, name, p, meta ? JSON.stringify(meta) : null, now, now);
  return id;
}

export function getDiskId(name: string): string | null {
  const db = ensureDb();
  const row = db.query("SELECT id FROM disks WHERE name = ?").get(name) as { id?: string } | undefined;
  return row?.id || null;
}

export function begin() { ensureDb().exec("BEGIN"); }
export function commit() { ensureDb().exec("COMMIT"); }
export function rollback() { try { ensureDb().exec("ROLLBACK"); } catch {} }

export function upsertNode(params: {
  disk_id: string;
  rel: string;
  parent_rel: string;
  name: string;
  dir: number;
  size: number;
  mtime: number;
  is_link: number;
  media_kind?: string | null;
  file_kind?: string | null;
  is_exec?: number | null;
  seen_at: number;
}) {
  const db = ensureDb();
  const stmt = db.query(`
    INSERT INTO nodes (disk_id,rel,parent_rel,name,dir,size,mtime,is_link,media_kind,file_kind,is_exec,seen_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(disk_id,rel) DO UPDATE SET
      parent_rel=excluded.parent_rel,
      name=excluded.name,
      dir=excluded.dir,
      size=excluded.size,
      mtime=excluded.mtime,
      is_link=excluded.is_link,
      media_kind=excluded.media_kind,
      file_kind=excluded.file_kind,
      is_exec=excluded.is_exec,
      seen_at=excluded.seen_at
  `);
  stmt.run(
    params.disk_id,
    params.rel,
    params.parent_rel,
    params.name,
    params.dir,
    params.size,
    params.mtime,
    params.is_link,
    params.media_kind ?? null,
    params.file_kind ?? null,
    params.is_exec ?? null,
    params.seen_at,
  );
}

export function deleteNodesNotSeen(disk_id: string, seen_at: number) {
  ensureDb().query("DELETE FROM nodes WHERE disk_id=? AND (seen_at IS NULL OR seen_at != ?)").run(disk_id, seen_at);
}

export function updateDirSize(disk_id: string, rel: string, size: number) {
  ensureDb().query("UPDATE nodes SET size=? WHERE disk_id=? AND rel=?").run(size, disk_id, rel);
}

export function listChildren(disk_id: string, rel: string) {
  const db = ensureDb();
  const dirs = db.query("SELECT name, rel, mtime, size FROM nodes WHERE disk_id=? AND parent_rel=? AND dir=1 ORDER BY name COLLATE NOCASE").all(disk_id, rel) as any[];
  const files = db.query("SELECT name, rel, mtime, size, is_link, media_kind, file_kind, is_exec FROM nodes WHERE disk_id=? AND parent_rel=? AND dir=0 ORDER BY mtime DESC").all(disk_id, rel) as any[];
  return { dirs, files };
}

export function getNode(disk_id: string, rel: string) {
  const db = ensureDb();
  return db.query("SELECT name, rel, mtime, size, is_link, media_kind, file_kind, is_exec, dir FROM nodes WHERE disk_id=? AND rel=?").get(disk_id, rel) as any | undefined;
}

export function getRootSize(disk_id: string): number | null {
  const row = ensureDb().query("SELECT size FROM nodes WHERE disk_id=? AND rel='' AND dir=1").get(disk_id) as { size?: number } | undefined;
  return (row && typeof row.size === 'number') ? row.size : null;
}
