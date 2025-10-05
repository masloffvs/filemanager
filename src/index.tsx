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

import { requestApiMetadata } from "./api/api_metadata";
import { requestApiSimpleDownload } from "./api/api_simpleDownlaod";
import { requestApiPreview } from "./api/api_preview";
import { requestApiSearch } from "./api/api_search";
import MediaIndex from "./mediaIndex";
import { requestApiMediaSlice } from "./api/api_mediaSlice";
import { requestApiGetMedia } from "./api/api_getMedia";
import { requestApiGetMediaFrames } from "./api/api_getMediaFrames";
import requestApiMediaStream from "./api/api_streamMedia";

// Config + Walker background service
const config = new ConfigStore();
config.load();
export const walker = new Walker(undefined, config.get());
walker.init(config.get().indexRootPath);

let server = serve({
  routes: {
    "/*": () => new Response("Server starting..."),
  },
  port: Number(config.get().serverPort || 3000),
  hostname: String(config.get().serverHost || "127.0.0.1"),
});

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

export const mediaIndex = new MediaIndex(walker);
await mediaIndex.entrypoint();

const c0 = config.get();

server.stop();

server = serve({
  port: Number(c0.serverPort || 3000),
  hostname: String(c0.serverHost || "127.0.0.1"),
  routes: {
    "/*": index,

    "/api/generate100mb": () => {
      // 100 MiB = 104857600 bytes
      const size = 100 * 1024 * 1024;
      // Bun supports streaming responses
      const stream = new ReadableStream({
        start(controller) {
          const chunkSize = 64 * 1024; // 64 KiB
          let sent = 0;
          // Fill chunk with zeros (or any pattern)
          const chunk = new Uint8Array(chunkSize);
          function push() {
            if (sent >= size) {
              controller.close();
              return;
            }
            const remaining = size - sent;
            const toSend = remaining >= chunkSize ? chunkSize : remaining;
            controller.enqueue(chunk.subarray(0, toSend));
            sent += toSend;
            // Use setTimeout to avoid blocking event loop
            setTimeout(push, 0);
          }
          push();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(size),
          "Content-Disposition": 'attachment; filename="generated_100mb.bin"',
        },
      });
    },

    "/api/media/frames": requestApiGetMediaFrames,
    "/api/media/slice": requestApiMediaSlice,
    "/api/media/get": requestApiGetMedia,
    "/api/media/stream": requestApiMediaStream,

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

        // Rename "path" to "fullPath" in result for clarity and add password protection info
        const result = entries.map((e) => ({
          ...e,
          fullPath: e.path,
          isPasswordProtected:
            e.type === "file" ? walker.db.hasFilePassword(e.id) : false,
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
    "/api/metadata": requestApiMetadata,
    "/api/download": requestApiSimpleDownload,
    "/api/preview": requestApiPreview,
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
        const result = {
          ...saved,
          fullPath: saved.path,
          isPasswordProtected:
            saved.type === "file" ? walker.db.hasFilePassword(saved.id) : false,
        };
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
    "/api/search": requestApiSearch,
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
        if (lower.endsWith(".zip")) {
          const items = await listZipEntries(filePath);
          return new Response(JSON.stringify({ type: "zip", items }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        // TODO: add tar/tgz support
        return new Response(
          JSON.stringify({
            error: "Unsupported archive type",
            hint: "Only .zip supported currently",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/filePassword": async (req) => {
      try {
        if (req.method === "POST") {
          // Set or update file password
          const body = await req.json().catch(() => null);
          if (!body || (!body.id && !body.path)) {
            return new Response(
              JSON.stringify({ error: "id or path required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const entry = body.id
            ? walker.db.getEntryById(String(body.id))
            : walker.db.getEntryByPath(String(body.path));

          if (!entry || entry.type !== "file") {
            return new Response(JSON.stringify({ error: "File not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!body.password || typeof body.password !== "string") {
            return new Response(
              JSON.stringify({ error: "password required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Hash the password using Bun's built-in crypto
          const passwordHash = await Bun.password.hash(body.password);

          // Store password hash in database (assuming walker.db has a method for this)
          walker.db.setFilePassword(entry.id, passwordHash);

          return new Response(
            JSON.stringify({
              success: true,
              message: "Password set successfully",
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (req.method === "GET") {
          // Check if file has password protection
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

          const hasPassword = walker.db.hasFilePassword(entry.id);

          return new Response(JSON.stringify({ hasPassword }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (req.method === "DELETE") {
          // Remove file password protection
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

          walker.db.removeFilePassword(entry.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: "Password protection removed",
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("Method Not Allowed", { status: 405 });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    "/api/verifyPassword": async (req) => {
      try {
        if (req.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
        }

        const body = await req.json().catch(() => null);
        if (!body || (!body.id && !body.path) || !body.password) {
          return new Response(
            JSON.stringify({ error: "id/path and password required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const entry = body.id
          ? walker.db.getEntryById(String(body.id))
          : walker.db.getEntryByPath(String(body.path));

        if (!entry || entry.type !== "file") {
          return new Response(JSON.stringify({ error: "File not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const passwordHash = walker.db.getFilePasswordHash(entry.id);
        if (!passwordHash) {
          return new Response(
            JSON.stringify({ error: "File is not password protected" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Verify password using Bun's built-in crypto
        const isValid = await Bun.password.verify(body.password, passwordHash);

        return new Response(JSON.stringify({ valid: isValid }), {
          headers: { "Content-Type": "application/json" },
        });
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
async function listZipEntries(
  zipPath: string
): Promise<
  Array<{ path: string; size: number; compressedSize: number; isDir: boolean }>
> {
  const fd = await fs.promises.open(zipPath, "r");
  try {
    const stat = await fd.stat();
    const size = stat.size;
    const maxCommentLen = 0xffff; // per ZIP spec
    const eocdMinSize = 22;
    const readSize = Math.min(maxCommentLen + eocdMinSize, size);
    const start = size - readSize;
    const buf = Buffer.alloc(readSize);
    await fd.read(buf, 0, readSize, start);
    const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]); // EOCD
    const eocdOffsetInBuf = buf.lastIndexOf(sig);
    if (eocdOffsetInBuf < 0) throw new Error("ZIP EOCD not found");
    const eocd = eocdOffsetInBuf;
    const centralDirectorySize = buf.readUInt32LE(eocd + 12);
    const centralDirectoryOffset = buf.readUInt32LE(eocd + 16);
    // Read central directory
    const cdbuf = Buffer.alloc(centralDirectorySize);
    await fd.read(cdbuf, 0, centralDirectorySize, centralDirectoryOffset);
    const entries: Array<{
      path: string;
      size: number;
      compressedSize: number;
      isDir: boolean;
    }> = [];
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
      const name = cdbuf.slice(nameStart, nameEnd).toString("utf8");
      const isDir = name.endsWith("/") || name.endsWith("\\");
      entries.push({
        path: name.replace(/\\/g, "/"),
        size: uncompressedSize,
        compressedSize,
        isDir,
      });
      p = nameEnd + extraLen + commentLen; // advance to next header
    }
    // Sort entries by path
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  } finally {
    await fd.close();
  }
}

logger.info("Yeap, server running", { url: String(server.url) });
