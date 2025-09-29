import { serve } from "bun";
import * as fs from "fs";
import * as path from "path";
import index from "./index.html";
import { logger } from "./logger";
import Walker from "./walker";
import ConfigStore, {
  type SortKey,
  type SortOrder,
  type SortSpec,
} from "./config";

// Config + Walker background service
const config = new ConfigStore();
config.load();
const walker = new Walker();
walker.init(config.get().indexRootPath);
(async () => {
  while (true) {
    try {
      await walker.entrypoint();
    } catch (err) {
      logger.error("Walker error", { err: String(err) });
    }
    // Touch first-index marker by appending 1 byte so UI knows indexing has run at least once
    try {
      const markerDir = path.resolve(".index");
      const markerFile = path.join(markerDir, "firstindex");
      if (!fs.existsSync(markerDir))
        fs.mkdirSync(markerDir, { recursive: true });
      fs.appendFileSync(markerFile, Buffer.from([1]));
    } catch (e) {
      logger.error("Failed to update firstindex marker", { error: String(e) });
    }
    const interval = Math.max(1, Number(config.get().reindexIntervalSec || 10));
    await new Promise((res) => setTimeout(res, interval * 1000));
  }
})();

const c0 = config.get();
let server = serve({
  port: Number(c0.serverPort || 3000),
  hostname: String(c0.serverHost || "127.0.0.1"),
  routes: {
    "/": index,

    "/api/getSliceByIdOrPath": async (req) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        let pathParam = url.searchParams.get("path");
        const type = url.searchParams.get("type") as
          | "file"
          | "folder"
          | "link"
          | undefined; // if not set - get every entity

        let parentId: string | null = null;
        if (id) {
          parentId = id;
        } else {
          // Use root if path is "/" or not set
          if (!pathParam || pathParam === "/") {
            // Find the root entry (the one with parentId === null)
            const rootEntry = walker.db
              .listAll()
              .find((e) => e.parentId === null && e.type === "folder");
            if (!rootEntry) {
              return new Response(
                JSON.stringify({ error: "Root folder not found" }),
                { status: 404 }
              );
            }
            parentId = rootEntry.id;
          } else {
            // Find entry by path; if missing, gracefully fall back to root
            const entry = walker.db.getEntryByPath(pathParam);
            if (!entry) {
              const rootEntry = walker.db
                .listAll()
                .find((e) => e.parentId === null && e.type === "folder");
              if (!rootEntry) {
                return new Response(
                  JSON.stringify({
                    error: "Parent not found by path and root missing",
                  }),
                  {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                  }
                );
              }
              parentId = rootEntry.id;
            } else {
              parentId = entry.id;
            }
          }
        }

        let entries;
        if (type === "file" || type === "folder" || type === "link") {
          entries = walker.db.getChildren(parentId, { type });
        } else {
          entries = walker.db.getChildren(parentId);
        }

        // Rename "path" to "fullPath" in result for clarity
        const result = entries.map((e) => ({
          ...e,
          fullPath: e.path,
        }));

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
        });
      }
    },
    "/api/config": async (req) => {
      if (req.method === "GET") {
        const c = config.get();
        const resolved = {
          ...c,
          resolvedIndexRootPath: path.resolve(c.indexRootPath),
        };
        const ready = fs.existsSync(path.resolve(".index/firstindex"));
        return new Response(JSON.stringify({ ...resolved, ready }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (req.method === "POST") {
        try {
          const body = await req.json();
          const prev = config.get();
          // Validate sort specs
          const validKey = (k: any): k is SortKey =>
            ["name", "size", "modified", "created"].includes(String(k));
          const validOrder = (o: any): o is SortOrder =>
            ["asc", "desc"].includes(String(o));
          let folderSort: SortSpec | undefined;
          if (body.folderSort && typeof body.folderSort === "object") {
            const k = body.folderSort.key;
            const o = body.folderSort.order;
            if (validKey(k) && validOrder(o)) folderSort = { key: k, order: o };
          }
          let fileSort: SortSpec | undefined;
          if (body.fileSort && typeof body.fileSort === "object") {
            const k = body.fileSort.key;
            const o = body.fileSort.order;
            if (validKey(k) && validOrder(o)) fileSort = { key: k, order: o };
          }
          const nextPort = Number.isFinite(Number(body.serverPort))
            ? Number(body.serverPort)
            : prev.serverPort;
          const nextHost =
            typeof body.serverHost === "string" && body.serverHost.trim() !== ""
              ? String(body.serverHost)
              : prev.serverHost;

          const next = config.set({
            indexRootPath:
              typeof body.indexRootPath === "string" &&
              body.indexRootPath.trim() !== ""
                ? body.indexRootPath
                : prev.indexRootPath,
            reindexIntervalSec:
              Number.isFinite(Number(body.reindexIntervalSec)) &&
              Number(body.reindexIntervalSec) > 0
                ? Number(body.reindexIntervalSec)
                : prev.reindexIntervalSec,
            ...(folderSort ? { folderSort } : {}),
            ...(fileSort ? { fileSort } : {}),
            serverPort: nextPort,
            serverHost: nextHost,
          });
          if (next.indexRootPath !== prev.indexRootPath) {
            walker.init(next.indexRootPath);
          }
          const requiresRestart =
            next.serverPort !== prev.serverPort ||
            next.serverHost !== prev.serverHost;
          const payload = { ...next, requiresRestart };
          return new Response(JSON.stringify(payload), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return new Response("Method Not Allowed", { status: 405 });
    },
    "/api/download": async (req) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const pathParam = url.searchParams.get("path");

        const entry = id
          ? walker.db.getEntryById(id)
          : pathParam
          ? walker.db.getEntryByPath(pathParam)
          : null;
        if (!entry || entry.type !== "file") {
          return new Response(JSON.stringify({ error: "File not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        const file = Bun.file(entry.path);
        const filename = entry.path.split(/[/\\]/).pop() || "download";
        return new Response(file, {
          headers: {
            "Content-Type":
              entry.mimeType || file.type || "application/octet-stream",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
              filename
            )}`,
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/preview": async (req) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const pathParam = url.searchParams.get("path");

        const entry = id
          ? walker.db.getEntryById(id)
          : pathParam
          ? walker.db.getEntryByPath(pathParam)
          : null;
        if (!entry || entry.type !== "file") {
          return new Response(JSON.stringify({ error: "File not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const file = Bun.file(entry.path);
        const stat = await fs.promises.stat(entry.path).catch(() => null);
        if (!stat) {
          return new Response(
            JSON.stringify({ error: "File not accessible" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const size = stat.size;
        const range = req.headers.get("range");
        const type = entry.mimeType || file.type || "application/octet-stream";
        const isVideo = /^video\//i.test(type);

        // For video: require Range and stream only the requested chunk
        if (isVideo) {
          if (!range || !/^bytes=/.test(range)) {
            return new Response(
              JSON.stringify({
                error: "Range header required for video streaming",
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                  "Accept-Ranges": "bytes",
                },
              }
            );
          }
          const [startStr, endStr] = range.replace(/bytes=/i, "").split("-");
          let start = parseInt(startStr, 10);
          let end = endStr
            ? parseInt(endStr, 10)
            : Math.min(start + 1_000_000, size - 1); // ~1MB chunks by default
          if (Number.isNaN(start) || start < 0) start = 0;
          if (Number.isNaN(end) || end >= size) end = size - 1;
          if (start > end) return new Response(null, { status: 416 });
          const chunkSize = end - start + 1;
          const stream = fs.createReadStream(entry.path, { start, end });
          return new Response(stream as any, {
            status: 206,
            headers: {
              "Content-Type": type,
              "Content-Length": String(chunkSize),
              "Content-Range": `bytes ${start}-${end}/${size}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        // Non-video: support range using Bun.file slices; otherwise send whole file inline
        if (range && /^bytes=/.test(range)) {
          const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
          let start = parseInt(startStr, 10);
          let end = endStr ? parseInt(endStr, 10) : size - 1;
          if (Number.isNaN(start)) start = 0;
          if (Number.isNaN(end) || end >= size) end = size - 1;
          if (start > end) return new Response(null, { status: 416 });
          const chunk = file.slice(start, end + 1);
          return new Response(chunk, {
            status: 206,
            headers: {
              "Content-Type": type,
              "Content-Length": String(end - start + 1),
              "Content-Range": `bytes ${start}-${end}/${size}`,
              "Accept-Ranges": "bytes",
            },
          });
        }

        return new Response(file, {
          headers: {
            "Content-Type": type,
            "Content-Length": String(size),
            "Accept-Ranges": "bytes",
            "Content-Disposition": "inline",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/updateEntry": async (req) => {
      try {
        const body = await req.json().catch(() => null);
        if (!body || (body.id == null && body.path == null)) {
          return new Response(
            JSON.stringify({ error: "id or path required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        const target = body.id
          ? walker.db.getEntryById(String(body.id))
          : walker.db.getEntryByPath(String(body.path));
        if (!target) {
          return new Response(JSON.stringify({ error: "Entry not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Normalize tags: accept array or comma/space separated string
        let tags: string[] | null | undefined = body.tags as any;
        if (typeof tags === "string") {
          tags = tags
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (Array.isArray(tags)) {
          tags = tags.map((t) => String(t)).filter((t) => t.length > 0);
        }

        const updated = {
          ...target,
          comment: body.hasOwnProperty("comment")
            ? body.comment ?? null
            : target.comment,
          tags: body.hasOwnProperty("tags") ? tags ?? null : target.tags,
        };
        const saved = walker.db.updateEntry(updated);
        const result = { ...saved, fullPath: saved.path };
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/search": async (req) => {
      try {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") || "";
        const limit = Math.min(
          200,
          Math.max(1, Number(url.searchParams.get("limit") || 50))
        );
        const typeParam = url.searchParams.get("type") as
          | "file"
          | "folder"
          | "link"
          | null;
        const type =
          typeParam === "file" || typeParam === "folder" || typeParam === "link"
            ? typeParam
            : undefined;
        const results = walker.db
          .searchEntries(q, { type, limit })
          .map((e) => ({
            ...e,
            fullPath: e.path,
          }));
        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/tags": async (req) => {
      try {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") || "";
        const limit = Math.min(
          200,
          Math.max(1, Number(url.searchParams.get("limit") || 50))
        );
        const cloud = walker.db.getTagCloud({ prefix: q || undefined, limit });
        return new Response(JSON.stringify(cloud), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/reloadAutotags": async () => {
      try {
        walker.autoTagger.loadDefault();
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/applyAutotags": async (req) => {
      try {
        const url = new URL(req.url);
        const mode = (url.searchParams.get("mode") || "merge").toLowerCase();
        const typeParam = url.searchParams.get("type") as
          | "file"
          | "folder"
          | "link"
          | null;
        const type =
          typeParam === "file" || typeParam === "folder" || typeParam === "link"
            ? typeParam
            : undefined;
        const pathPrefix = url.searchParams.get("pathPrefix") || undefined;
        const dryRun =
          (url.searchParams.get("dry") || "false").toLowerCase() === "true";

        const all = walker.db.listAll();
        const targets = all.filter(
          (e) =>
            (!type || e.type === type) &&
            (!pathPrefix || e.path.startsWith(pathPrefix))
        );
        let updated = 0;
        let scanned = 0;
        for (const e of targets) {
          scanned++;
          const auto = walker.autoTagger.tagsFor(e.path, e.mimeType);
          const existing = Array.isArray(e.tags) ? e.tags : [];
          let next: string[] | null = null;
          if (mode === "replace") {
            next = auto.length ? auto : null;
          } else if (mode === "missing") {
            next = existing.length ? existing : auto.length ? auto : null;
          } else {
            // merge (default)
            const merged = [...existing];
            for (const t of auto) if (!merged.includes(t)) merged.push(t);
            next = merged.length ? merged : null;
          }
          const changed =
            JSON.stringify(existing) !== JSON.stringify(next || []);
          if (changed && !dryRun) {
            walker.db.updateEntry({ ...e, tags: next });
            updated++;
          } else if (changed && dryRun) {
            updated++;
          }
        }
        return new Response(
          JSON.stringify({ ok: true, mode, scanned, updated, dryRun }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/archiveList": async (req) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const pathParam = url.searchParams.get("path");

        const entry = id
          ? walker.db.getEntryById(id!)
          : pathParam
          ? walker.db.getEntryByPath(pathParam)
          : null;
        if (!entry || entry.type !== "file") {
          return new Response(JSON.stringify({ error: "File not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        const filePath = entry.path;
        const lower = filePath.toLowerCase();
        if (lower.endsWith('.zip')) {
          const items = await listZipEntries(filePath);
          return new Response(JSON.stringify({ type: 'zip', items }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        // TODO: add tar/tgz support
        return new Response(
          JSON.stringify({ error: "Unsupported archive type", hint: "Only .zip supported currently" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

logger.info("Server running", { url: String(server.url) });

// ---- Helpers ----
async function listZipEntries(zipPath: string): Promise<Array<{ path: string; size: number; compressedSize: number; isDir: boolean }>> {
  const fd = await fs.promises.open(zipPath, 'r');
  try {
    const stat = await fd.stat();
    const size = stat.size;
    const maxCommentLen = 0xFFFF; // per ZIP spec
    const eocdMinSize = 22;
    const readSize = Math.min(maxCommentLen + eocdMinSize, size);
    const start = size - readSize;
    const buf = Buffer.alloc(readSize);
    await fd.read(buf, 0, readSize, start);
    const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]); // EOCD
    const eocdOffsetInBuf = buf.lastIndexOf(sig);
    if (eocdOffsetInBuf < 0) throw new Error('ZIP EOCD not found');
    const eocd = eocdOffsetInBuf;
    const centralDirectorySize = buf.readUInt32LE(eocd + 12);
    const centralDirectoryOffset = buf.readUInt32LE(eocd + 16);
    // Read central directory
    const cdbuf = Buffer.alloc(centralDirectorySize);
    await fd.read(cdbuf, 0, centralDirectorySize, centralDirectoryOffset);
    const entries: Array<{ path: string; size: number; compressedSize: number; isDir: boolean }> = [];
    let p = 0;
    const CEN_SIG = 0x02014b50;
    while (p + 46 <= cdbuf.length) {
      const sigVal = cdbuf.readUInt32LE(p);
      if (sigVal !== CEN_SIG) break;
      // parse fields
      const compressedSize = cdbuf.readUInt32LE(p + 20);
      const uncompressedSize = cdbuf.readUInt32LE(p + 24);
      const fileNameLen = cdbuf.readUInt16LE(p + 28);
      const extraLen = cdbuf.readUInt16LE(p + 30);
      const commentLen = cdbuf.readUInt16LE(p + 32);
      // const externalAttrs = cdbuf.readUInt32LE(p + 38);
      const nameStart = p + 46;
      const nameEnd = nameStart + fileNameLen;
      const name = cdbuf.slice(nameStart, nameEnd).toString('utf8');
      const isDir = name.endsWith('/') || name.endsWith('\\');
      entries.push({ path: name.replace(/\\/g, '/'), size: uncompressedSize, compressedSize, isDir });
      p = nameEnd + extraLen + commentLen; // advance to next header
    }
    // Sort entries by path
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  } finally {
    await fd.close();
  }
}
