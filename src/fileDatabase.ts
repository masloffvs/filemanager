import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export type EntryType = "file" | "link" | "folder";

export interface CreateEntry {
  type: EntryType;
  path: string; // absolute path (expected)
  size?: number | null; // may be 0 or null
  mimeType?: string | null; // nullable
  comment?: string | null; // nullable
  tags?: string[] | null; // nullable array of tags
  meta?: unknown; // optional arbitrary JSON
  parentId?: string | null; // optional parent entry id
  isPhantomSymlink?: boolean; // true if this is a phantom folder from a symlink
}

export interface Entry extends Required<Pick<CreateEntry, "type" | "path">> {
  id: string;
  size: number | null;
  mimeType: string | null;
  comment: string | null;
  tags: string[] | null;
  meta: unknown | null;
  parentId: string | null;
  isPhantomSymlink: boolean | null;
}

function isWindowsAbsolute(p: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(p);
}

function isAbsolutePath(p: string): boolean {
  return p.startsWith("/") || isWindowsAbsolute(p);
}

function toRow(entry: Entry) {
  return {
    id: entry.id,
    type: entry.type,
    path: entry.path,
    size: entry.size ?? null,
    mime_type: entry.mimeType ?? null,
    comment: entry.comment ?? null,
    tags: entry.tags == null ? null : JSON.stringify(entry.tags),
    meta: entry.meta == null ? null : JSON.stringify(entry.meta),
    parent_id: entry.parentId ?? null,
    is_phantom_symlink: entry.isPhantomSymlink ? 1 : 0,
  } as const;
}

function fromRow(row: any): Entry {
  return {
    id: row.id as string,
    type: row.type as EntryType,
    path: row.path as string,
    size: row.size === null ? null : Number(row.size),
    mimeType: row.mime_type ?? null,
    comment: row.comment ?? null,
    tags: row.tags == null ? null : (safeJsonParse(row.tags) as string[]),
    meta: row.meta == null ? null : safeJsonParse(row.meta),
    parentId: row.parent_id ?? null,
    isPhantomSymlink: row.is_phantom_symlink === 1 ? true : false,
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class FileDatabase {
  private db: Database;
  private idGenerator: () => string;

  private ensurePathExists(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  constructor(
    dbPath: string = "storage/filedb.sqlite",
    idGenerator?: () => string
  ) {
    this.ensurePathExists(dbPath);
    this.db = new Database(dbPath, { create: true, strict: true });
    this.idGenerator = idGenerator ?? (() => crypto.randomUUID());
    this.bootstrap();
  }

  private bootstrap() {
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('file','link','folder')),
        path TEXT NOT NULL UNIQUE,
        size INTEGER NULL CHECK (size IS NULL OR size >= 0),
        mime_type TEXT NULL,
        comment TEXT NULL,
        tags TEXT NULL,
        meta TEXT NULL,
        parent_id TEXT NULL REFERENCES entries(id) ON DELETE CASCADE,
        is_phantom_symlink INTEGER NOT NULL DEFAULT 0 CHECK (is_phantom_symlink IN (0, 1))
      );
      CREATE INDEX IF NOT EXISTS idx_entries_parent ON entries(parent_id);
      CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);

      CREATE TABLE IF NOT EXISTS file_passwords (
        file_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

    // Migration: add tags column if missing
    try {
      const cols = this.db.query("PRAGMA table_info(entries)").all() as Array<{
        name: string;
      }>;
      const hasTags = cols.some((c) => c.name === "tags");
      if (!hasTags) {
        this.db.exec("ALTER TABLE entries ADD COLUMN tags TEXT NULL");
      }
      const hasPhantomSymlink = cols.some(
        (c) => c.name === "is_phantom_symlink"
      );
      if (!hasPhantomSymlink) {
        this.db.exec(
          "ALTER TABLE entries ADD COLUMN is_phantom_symlink INTEGER NOT NULL DEFAULT 0 CHECK (is_phantom_symlink IN (0, 1))"
        );
      }
    } catch (e) {
      // Ignore migration errors; table might already be up-to-date
    }
  }

  close() {
    this.db.close();
  }

  /** Create a new entry and return it. */
  createEntry(input: CreateEntry & { id?: string }): Entry {
    if (!input || typeof input !== "object") {
      throw new Error("Input must be an object");
    }
    if (!input.path || typeof input.path !== "string") {
      throw new Error(
        `Missing or invalid parameter "path": ${JSON.stringify(input)}`
      );
    }
    if (!isAbsolutePath(input.path)) {
      throw new Error(`Path must be absolute: ${input.path}`);
    }
    if (
      input.size != null &&
      (!Number.isFinite(input.size) || input.size < 0)
    ) {
      throw new Error(`Size must be a non-negative number or null`);
    }
    // Check parentId existence if specified
    if (input.parentId) {
      const parent = this.getEntryById(input.parentId);
      if (!parent) {
        throw new Error(`Parent entry does not exist: ${input.parentId}`);
      }
    }
    const id = input.id ?? this.idGenerator();

    const entry: Entry = {
      id,
      type: input.type,
      path: input.path,
      size: input.size ?? null,
      mimeType: input.mimeType ?? null,
      comment: input.comment ?? null,
      tags: input.tags ?? null,
      meta: input.meta ?? null,
      parentId: input.parentId ?? null,
      isPhantomSymlink: input.isPhantomSymlink ?? false,
    };

    const stmt = this.db.query(`
      INSERT INTO entries (id, type, path, size, mime_type, comment, tags, meta, parent_id, is_phantom_symlink)
      VALUES ($id, $type, $path, $size, $mime_type, $comment, $tags, $meta, $parent_id, $is_phantom_symlink)
    `);

    try {
      stmt.run(toRow(entry));
    } catch (err: any) {
      if (
        typeof err?.message === "string" &&
        err.message.includes("UNIQUE") &&
        err.message.includes("path")
      ) {
        throw new Error(`Entry with path already exists: ${input.path}`);
      }
      if (
        typeof err?.message === "string" &&
        err.message.includes("FOREIGN KEY")
      ) {
        throw new Error(`Parent entry does not exist: ${input.parentId}`);
      }
      throw err;
    }

    return entry;
  }

  /** Update an existing entry in-place by id. */
  updateEntry(entry: Entry): Entry {
    if (!entry || typeof entry !== "object") {
      throw new Error("Entry must be an object");
    }
    if (!entry.id || typeof entry.id !== "string") {
      throw new Error('Missing or invalid parameter "id"');
    }
    // Validate fields similar to create
    if (
      !entry.path ||
      typeof entry.path !== "string" ||
      !isAbsolutePath(entry.path)
    ) {
      throw new Error(`Path must be absolute: ${entry.path}`);
    }
    if (
      entry.size != null &&
      (!Number.isFinite(entry.size) || entry.size < 0)
    ) {
      throw new Error(`Size must be a non-negative number or null`);
    }
    if (entry.parentId) {
      const parent = this.getEntryById(entry.parentId);
      if (!parent) {
        throw new Error(`Parent entry does not exist: ${entry.parentId}`);
      }
    }

    const stmt = this.db.query(`
      UPDATE entries
         SET type = $type,
             path = $path,
             size = $size,
             mime_type = $mime_type,
             comment = $comment,
             tags = $tags,
             meta = $meta,
             parent_id = $parent_id,
             is_phantom_symlink = $is_phantom_symlink
       WHERE id = $id
    `);
    const info = stmt.run(toRow(entry)) as unknown as { changes: number };
    if ((info?.changes ?? 0) === 0) {
      throw new Error(`Entry not found for update: ${entry.id}`);
    }
    return entry;
  }

  /** Alias for createEntry */
  addEntry(input: CreateEntry & { id?: string }) {
    return this.createEntry(input);
  }

  getEntryById(id: string): Entry | null {
    if (!id || typeof id !== "string") {
      throw new Error('Missing or invalid parameter "id"');
    }
    const stmt = this.db.query(`SELECT * FROM entries WHERE id = $id`);
    const row = stmt.get({ id });
    return row ? fromRow(row) : null;
  }

  getEntryByPath(pathStr: string): Entry | null {
    if (!pathStr || typeof pathStr !== "string") {
      throw new Error('Missing or invalid parameter "path"');
    }
    const stmt = this.db.query(`SELECT * FROM entries WHERE path = $path`);
    const row = stmt.get({ path: pathStr });
    return row ? fromRow(row) : null;
  }

  /** Get direct children of a parent. Optionally filter by type. */
  getChildren(parentId: string, opts?: { type?: EntryType }): Entry[] {
    if (!parentId || typeof parentId !== "string") {
      throw new Error('Missing or invalid parameter "parentId"');
    }
    if (opts?.type) {
      const stmt = this.db.query(
        `SELECT * FROM entries WHERE parent_id = $pid AND type = $type ORDER BY path`
      );
      return (stmt.all({ pid: parentId, type: opts.type }) as any[]).map(
        fromRow
      );
    }
    const stmt = this.db.query(
      `SELECT * FROM entries WHERE parent_id = $pid ORDER BY path`
    );
    return (stmt.all({ pid: parentId }) as any[]).map(fromRow);
  }

  getEveryFile(): Entry[] {
    const stmt = this.db.query(`SELECT * FROM entries WHERE type = 'file'`);
    return (stmt.all() as any[]).map(fromRow);
  }

  /** Recursively collect all descendants (children, grandchildren, ...). */
  getDescendants(rootId: string): Entry[] {
    if (!rootId || typeof rootId !== "string") {
      throw new Error('Missing or invalid parameter "rootId"');
    }
    const stmt = this.db.query(`
      WITH RECURSIVE tree AS (
        SELECT * FROM entries WHERE id = $root
        UNION ALL
        SELECT e.* FROM entries e
        JOIN tree t ON e.parent_id = t.id
      )
      SELECT * FROM tree WHERE id != $root
    `);
    return (stmt.all({ root: rootId }) as any[]).map(fromRow);
  }

  /** Delete an entry by id. Due to FK CASCADE, children are removed automatically. */
  deleteEntry(id: string): boolean {
    if (!id || typeof id !== "string") {
      throw new Error('Missing or invalid parameter "id"');
    }
    const stmt = this.db.query(`DELETE FROM entries WHERE id = $id`);
    const info = stmt.run({ id }) as unknown as { changes: number };
    return (info?.changes ?? 0) > 0;
  }

  countAll(): number {
    const stmt = this.db.query(`SELECT COUNT(*) as cnt FROM entries`);
    const row = stmt.get() as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  }

  /** List all entries (useful for debugging). */
  listAll(): Entry[] {
    const stmt = this.db.query(`SELECT * FROM entries ORDER BY path`);
    return (stmt.all() as any[]).map(fromRow);
  }

  /** List entries whose path is this prefix or inside it. */
  listByPathPrefix(prefix: string): Entry[] {
    if (!prefix || typeof prefix !== "string") {
      throw new Error('Missing or invalid parameter "prefix"');
    }
    if (!isAbsolutePath(prefix)) {
      throw new Error(`Prefix must be absolute: ${prefix}`);
    }
    const stmt = this.db.query(
      `SELECT * FROM entries WHERE path = $p OR path LIKE ($p || '/%') ORDER BY path`
    );
    return (stmt.all({ p: prefix }) as any[]).map(fromRow);
  }

  /** Search entries by path/comment/tags (case-insensitive). */
  searchEntries(
    query: string,
    opts?: { type?: EntryType; limit?: number }
  ): Entry[] {
    if (typeof query !== "string" || query.trim().length === 0) return [];
    const limit = Math.max(1, Math.min(1000, opts?.limit ?? 50));
    const like = `%${query.trim().replace(/\s+/g, "%")}%`;
    const params: Record<string, any> = { q: like, limit };
    let sql = `
      SELECT * FROM entries
       WHERE (
         path LIKE $q COLLATE NOCASE
         OR comment LIKE $q COLLATE NOCASE
         OR tags LIKE $q COLLATE NOCASE
       )
    `;
    if (opts?.type) {
      sql += ` AND type = $type`;
      params["type"] = opts.type;
    }
    sql += ` ORDER BY type DESC, path LIMIT $limit`;
    const stmt = this.db.query(sql);
    return (stmt.all(params) as any[]).map(fromRow);
  }

  /** Return a tag cloud: list of { tag, count } sorted by count desc. */
  getTagCloud(opts?: {
    limit?: number;
    prefix?: string;
  }): Array<{ tag: string; count: number }> {
    const limit = Math.max(1, Math.min(1000, opts?.limit ?? 50));
    const rows = this.db
      .query(`SELECT tags FROM entries WHERE tags IS NOT NULL`)
      .all() as Array<{ tags: string | null }>;
    const counts = new Map<string, number>();
    const prefix = (opts?.prefix || "").toLowerCase();
    for (const r of rows) {
      if (!r.tags) continue;
      const arr = safeJsonParse(r.tags);
      if (!Array.isArray(arr)) continue;
      for (const tRaw of arr) {
        const t = String(tRaw || "").trim();
        if (!t) continue;
        if (prefix && !t.toLowerCase().startsWith(prefix)) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    const out = Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, limit);
    return out;
  }

  /** Set password hash for a file. */
  setFilePassword(fileId: string, passwordHash: string): void {
    if (!fileId || !passwordHash) {
      throw new Error("fileId and passwordHash are required");
    }
    const stmt = this.db.query(`
      INSERT OR REPLACE INTO file_passwords (file_id, password_hash, created_at)
      VALUES ($fileId, $passwordHash, unixepoch())
    `);
    stmt.run({ fileId, passwordHash });
  }

  /** Check if file has password protection. */
  hasFilePassword(fileId: string): boolean {
    if (!fileId) return false;
    const stmt = this.db.query(`
      SELECT 1 FROM file_passwords WHERE file_id = $fileId
    `);
    const result = stmt.get({ fileId });
    return !!result;
  }

  /** Get password hash for a file. */
  getFilePasswordHash(fileId: string): string | null {
    if (!fileId) return null;
    const stmt = this.db.query(`
      SELECT password_hash FROM file_passwords WHERE file_id = $fileId
    `);
    const result = stmt.get({ fileId }) as
      | { password_hash: string }
      | undefined;
    return result?.password_hash ?? null;
  }

  /** Remove password protection from a file. */
  removeFilePassword(fileId: string): void {
    if (!fileId) return;
    const stmt = this.db.query(`
      DELETE FROM file_passwords WHERE file_id = $fileId
    `);
    stmt.run({ fileId });
  }

  /** Verify password for a file. */
  async verifyFilePassword(fileId: string, password: string): Promise<boolean> {
    if (!fileId || !password) return false;
    const hash = this.getFilePasswordHash(fileId);
    if (!hash) return false;
    return await Bun.password.verify(password, hash);
  }
}

export default FileDatabase;
