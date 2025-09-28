import { promises as fs } from "fs";
import path from "path";
import { STORAGE, MAX_UPLOAD_BYTES, STRICT_MIME } from "./config";
import { listEntries } from "./listing";
import { startIndexingWorkers, isBuilding } from "./workers/indexer";
import { openDb, getDiskId, listChildren, getRootSize, getNode } from "./index/db";
import { DISKS } from "./config";
import { makeBreadcrumbs } from "./utils/breadcrumbs";
import { ApiListResponse } from "./types";
import { enforceNameByDetected, extFromName, detectFileType, lookupMimeByPath } from "./utils/mime";
import { resolveSafe, sanitizeRelPath, sanitizeSegment } from "./utils/path";
import { baseSecurityHeaders, sendHtml, sendJson, sendText, wantsJson } from "./http/http";
import { renderHtmlList, renderDisks } from "../web/templates";
import { getFsStats } from "./utils/disk";
import { randomSuffixHex } from "./utils/random";

export async function startServer() {
  await fs.mkdir(STORAGE, { recursive: true });
  // start background indexers
  startIndexingWorkers().catch(()=>{});

  Bun.serve({
    port: 3003,
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Root listing => redirect to default disk
      if (req.method === "GET" && (pathname === "/" || pathname === "")) {
        return Response.redirect(url.origin + "/browse/storage", 302);
      }

      // GET /api/index/<disk>[/<rel>] -> fast JSON from index only
      if (req.method === "GET" && pathname.startsWith("/api/index/")) {
        const rest = pathname.slice("/api/index/".length);
        const segs = rest.split('/').filter(Boolean).map(decodeURIComponent);
        const disk = segs.shift() || 'storage';
        const relDecoded = segs.join('/');
        try {
          await openDb();
          const id = getDiskId(disk);
          if (!id) return sendJson({ ok: false, error: "no index" }, 503);
          const res = listChildren(id, relDecoded);
          const dirs = (res.dirs||[]).map((d:any)=>({ name: d.name, rel: d.rel, mtime: new Date(d.mtime).toISOString(), size: d.size }));
          const files = (res.files||[]).map((f:any)=>({ name: f.name, rel: f.rel, size: f.size, mtime: new Date(f.mtime).toISOString(), isLink: !!f.is_link, mediaKind: f.media_kind, fileKind: f.file_kind, isExec: !!f.is_exec }));
          const payload = { ok: true, cwd: relDecoded, dirs, files, breadcrumbs: makeBreadcrumbs(relDecoded) } as any;
          return sendJson(payload);
        } catch (e:any) {
          return sendJson({ ok: false, error: String(e?.message||e) }, 500);
        }
      }

      // GET /api/lookup/<disk>/<rel> -> fast metadata for a file from index
      if (req.method === "GET" && pathname.startsWith("/api/lookup/")) {
        const rest = pathname.slice("/api/lookup/".length);
        const segs = rest.split('/').filter(Boolean).map(decodeURIComponent);
        const disk = segs.shift() || 'storage';
        const relDecoded = segs.join('/');
        await openDb();
        const id = getDiskId(disk);
        if (!id) return sendJson({ ok: false, error: "no index" }, 503);
        const f = getNode(id, relDecoded);
        if (!f) return sendJson({ ok: false, error: "not found" }, 404);
        return sendJson({ ok: true, file: { name: f.name, rel: f.rel, size: f.size, mtime: new Date(f.mtime).toISOString(), isLink: !!f.is_link, mediaKind: f.media_kind, fileKind: f.file_kind, isExec: !!f.is_exec } } as any);
      }

      // GET /api/index/state/<disk> -> building status + counts
      if (req.method === "GET" && pathname.startsWith("/api/index/state/")) {
        const disk = decodeURIComponent(pathname.slice("/api/index/state/".length)) || 'storage';
        // counts optional; building flag is primary for UI
        return sendJson({ ok: true, building: isBuilding(disk), files: 0, dirs: 0, builtAt: undefined } as any);
      }

      // GET /disks => list configured disks
      if (req.method === "GET" && pathname === "/disks") {
        await openDb();
        const disks = await Promise.all(DISKS.map(async d=>{
          const id = getDiskId(d.name);
          const size = id ? getRootSize(id) : null;
          const fsStats = await getFsStats(d.path);
          return { name:d.name, path:d.path, size: size ?? undefined, builtAt: undefined, total: fsStats?.total, used: fsStats?.used, available: fsStats?.available, usedPercent: fsStats?.usedPercent };
        }));
        if (wantsJson(req, url)) return sendJson({ ok:true, cwd:"", dirs:[], files:[], breadcrumbs:[] } as any, 200);
        const html = await renderDisks(url.origin, disks);
        return sendHtml(html);
      }

      // GET /browse[/<disk>[/<rel>]]
      if (req.method === "GET" && pathname.startsWith("/browse")) {
        const parts = pathname.split('/').filter(Boolean); // [browse, disk?, ...rel]
        const disk = parts[1] || 'storage';
        const relParts = parts.slice(2).map(decodeURIComponent);
        const relDecoded = relParts.join('/');
        try {
          await openDb();
          const diskId = getDiskId(disk);
          if (diskId) {
            const res = listChildren(diskId, relDecoded);
            const dirs = (res.dirs||[]).map((d:any)=>({ name: d.name, rel: d.rel, mtime: new Date(d.mtime).toISOString(), size: d.size }));
            const files = (res.files||[]).map((f:any)=>({ name: f.name, rel: f.rel, size: f.size, mtime: new Date(f.mtime).toISOString(), isLink: !!f.is_link, mediaKind: f.media_kind, fileKind: f.file_kind, isExec: !!f.is_exec }));
            const listing = { cwd: relDecoded, dirs, files, breadcrumbs: makeBreadcrumbs(relDecoded) };
            if (wantsJson(req, url)) return sendJson({ ok: true, ...listing });
            return sendHtml(await renderHtmlList(url.origin, { ok: true, ...listing }, { browsePrefix: `/${disk}`, filePrefix: `/${disk}` }));
          }
          // Fallback to FS for default storage disk if index is absent
          if (disk === 'storage') {
            const listing = await listEntries(relDecoded);
            if (wantsJson(req, url)) return sendJson({ ok: true, ...listing });
            return sendHtml(await renderHtmlList(url.origin, { ok: true, ...listing }, { browsePrefix: `/${disk}`, filePrefix: `/${disk}` }));
          }
          throw new Error('not indexed');
        } catch {
          if (wantsJson(req, url)) return sendJson({ ok: false, error: "not found" }, 404);
          return sendText("Not found", 404);
        }
      }

      // GET /files[/<disk>]/<rel> (stream)
      if (req.method === "GET" && pathname.startsWith("/files/")) {
        const rest = pathname.slice("/files/".length);
        const segs = rest.split('/').filter(Boolean).map(decodeURIComponent);
        const disk = DISKS.find(d=>d.name === segs[0]) ? segs.shift()! : 'storage';
        const relDecoded = segs.join('/');
        try {
          const diskRoot = DISKS.find(d=>d.name===disk)?.path || STORAGE;
          const abs = path.resolve(diskRoot, relDecoded);
          const st = await fs.stat(abs);
          if (!st.isFile()) throw new Error("not a file");
          const file = Bun.file(abs);
        const mime = lookupMimeByPath(abs);
        const isInline = mime.startsWith("image/") || mime.startsWith("video/");
        const headers: Record<string, string> = {
          "Content-Type": mime,
          "Content-Length": String(st.size),
          ...baseSecurityHeaders(),
        };
        if (!isInline) headers["Content-Disposition"] = `attachment; filename="${path.basename(abs)}"`;
        return new Response(file, { headers });
        } catch {
          if (wantsJson(req, url)) return sendJson({ ok: false, error: "not found" }, 404);
          return sendText("Not found", 404);
        }
      }

      // PUT /upload/<rel>  -> PUT upload preserving name from path
      if (req.method === "PUT" && pathname.startsWith("/upload/")) {
        try {
          const relRaw = pathname.slice("/upload/".length);
          const relDecoded = relRaw.split("/").map(decodeURIComponent).join("/");
          // split dir + base
          const cleanedRel = sanitizeRelPath(relDecoded);
          const dirPart = cleanedRel.split("/").slice(0, -1).join("/");
          let baseName = sanitizeSegment(cleanedRel.split("/").slice(-1)[0] || `file-${Date.now()}`);

          const { abs: dirAbs } = resolveSafe(dirPart);
          await fs.mkdir(dirAbs, { recursive: true });

          const buf = new Uint8Array(await req.arrayBuffer());
          if (buf.length > MAX_UPLOAD_BYTES) return sendJson({ ok: false, error: "file too large" }, 413);

          const detected = detectFileType(buf);
          if (detected) {
            const desired = enforceNameByDetected(baseName, detected);
            if (STRICT_MIME && extFromName(baseName) && extFromName(baseName) !== detected.ext) {
              return sendJson({ ok: false, error: `mime/extension mismatch (expected .${detected.ext})` }, 415);
            }
            baseName = desired;
          }

          let dest = path.join(dirAbs, baseName);
          try {
            const fd = await fs.open(dest, "wx", 0o600);
            try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
          } catch (e: any) {
            if (e?.code === "EEXIST") {
              const suffix = randomSuffixHex(3);
              const base = baseName.replace(/\.[^.]+$/, "");
              const ext = extFromName(baseName);
              const finalName = ext ? `${base}.${suffix}.${ext}` : `${base}.${suffix}`;
              dest = path.join(dirAbs, finalName);
              const fd = await fs.open(dest, "wx", 0o600);
              try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
              baseName = finalName;
            } else throw e;
          }

          const relOut = (dirPart ? dirPart + "/" : "") + baseName;
          return sendJson({ ok: true, file: relOut, size: buf.length });
        } catch (err) {
          return sendJson({ ok: false, error: String(err) }, 500);
        }
      }

      // PUT /upload  -> PUT upload with optional X-Filename header and ?dir=
      if (req.method === "PUT" && pathname === "/upload") {
        try {
          const dirParam = sanitizeRelPath(url.searchParams.get("dir") || "");
          const { abs: dirAbs } = resolveSafe(dirParam);
          await fs.mkdir(dirAbs, { recursive: true });

          let baseName = sanitizeSegment((req.headers.get("x-filename") || `file-${Date.now()}`).trim());
          const buf = new Uint8Array(await req.arrayBuffer());
          if (buf.length > MAX_UPLOAD_BYTES) return sendJson({ ok: false, error: "file too large" }, 413);

          const detected = detectFileType(buf);
          if (detected) {
            const desired = enforceNameByDetected(baseName, detected);
            if (STRICT_MIME && extFromName(baseName) && extFromName(baseName) !== detected.ext) {
              return sendJson({ ok: false, error: `mime/extension mismatch (expected .${detected.ext})` }, 415);
            }
            baseName = desired;
          }

          let dest = path.join(dirAbs, baseName);
          try {
            const fd = await fs.open(dest, "wx", 0o600);
            try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
          } catch (e: any) {
            if (e?.code === "EEXIST") {
              const suffix = randomSuffixHex(3);
              const base = baseName.replace(/\.[^.]+$/, "");
              const ext = extFromName(baseName);
              const finalName = ext ? `${base}.${suffix}.${ext}` : `${base}.${suffix}`;
              dest = path.join(dirAbs, finalName);
              const fd = await fs.open(dest, "wx", 0o600);
              try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
              baseName = finalName;
            } else throw e;
          }

          const relOut = (dirParam ? dirParam + "/" : "") + baseName;
          return sendJson({ ok: true, file: relOut, size: buf.length });
        } catch (err) {
          return sendJson({ ok: false, error: String(err) }, 500);
        }
      }

      // POST /upload (multipart)
      if (req.method === "POST" && pathname === "/upload") {
        try {
          const form = await req.formData();
          const file = form.get("file") as File | null;
          if (!file) return sendJson({ ok: false, error: "no file" }, 400);
          if (file.size > MAX_UPLOAD_BYTES) return sendJson({ ok: false, error: "file too large" }, 413);

          const dirParam = sanitizeRelPath(url.searchParams.get("dir") || "");
          const { abs: dirAbs } = resolveSafe(dirParam);
          await fs.mkdir(dirAbs, { recursive: true });

          let safeName = sanitizeSegment((file.name || "file").trim());
          const bytes = new Uint8Array(await file.arrayBuffer());
          const detected = detectFileType(bytes);
          if (detected) {
            const desired = enforceNameByDetected(safeName, detected);
            if (STRICT_MIME && extFromName(safeName) && extFromName(safeName) !== detected.ext)
              return sendJson({ ok: false, error: `mime/extension mismatch (expected .${detected.ext})` }, 415);
            safeName = desired;
          }

          let dest = path.join(dirAbs, safeName);
          try {
            const fd = await fs.open(dest, "wx", 0o600);
            try { await fs.writeFile(fd, bytes); } finally { await fd.close(); }
          } catch (e: any) {
            if (e?.code === "EEXIST") {
              const suffix = randomSuffixHex(3);
              const base = safeName.replace(/\.[^.]+$/, "");
              const ext = extFromName(safeName);
              const finalName = ext ? `${base}.${suffix}.${ext}` : `${base}.${suffix}`;
              dest = path.join(dirAbs, finalName);
              const fd = await fs.open(dest, "wx", 0o600);
              try { await fs.writeFile(fd, bytes); } finally { await fd.close(); }
              safeName = finalName;
            } else throw e;
          }

          const relOut = (dirParam ? dirParam + "/" : "") + path.basename(dest);
          return sendJson({ ok: true, file: relOut, size: bytes.length });
        } catch (err) {
          return sendJson({ ok: false, error: String(err) }, 500);
        }
      }

      // PUT/POST /upload-raw (legacy)
      if ((req.method === "PUT" || req.method === "POST") && pathname === "/upload-raw") {
        try {
          const dirParam = sanitizeRelPath(url.searchParams.get("dir") || "");
          const { abs: dirAbs } = resolveSafe(dirParam);
          await fs.mkdir(dirAbs, { recursive: true });

          let fn = sanitizeSegment(url.searchParams.get("filename") || `file-${Date.now()}`);
          const buf = new Uint8Array(await req.arrayBuffer());
          if (buf.length > MAX_UPLOAD_BYTES) return sendJson({ ok: false, error: "file too large" }, 413);

          const detected = detectFileType(buf);
          if (detected) {
            const desired = enforceNameByDetected(fn, detected);
            if (STRICT_MIME && extFromName(fn) && extFromName(fn) !== detected.ext)
              return sendJson({ ok: false, error: `mime/extension mismatch (expected .${detected.ext})` }, 415);
            fn = desired;
          }

          let dest = path.join(dirAbs, fn);
          try {
            const fd = await fs.open(dest, "wx", 0o600);
            try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
          } catch (e: any) {
            if (e?.code === "EEXIST") {
              const suffix = randomSuffixHex(3);
              const base = fn.replace(/\.[^.]+$/, "");
              const ext = extFromName(fn);
              const finalName = ext ? `${base}.${suffix}.${ext}` : `${base}.${suffix}`;
              dest = path.join(dirAbs, finalName);
              const fd = await fs.open(dest, "wx", 0o600);
              try { await fs.writeFile(fd, buf); } finally { await fd.close(); }
              fn = finalName;
            } else throw e;
          }

          const relOut = (dirParam ? dirParam + "/" : "") + path.basename(dest);
          return sendJson({ ok: true, file: relOut, size: buf.length });
        } catch (err) {
          return sendJson({ ok: false, error: String(err) }, 500);
        }
      }

      // POST /admin/index/rebuild -> force full rebuild
      if (req.method === "POST" && pathname === "/admin/index/rebuild") {
        try {
          await startIndexingWorkers();
          return sendJson({ ok: true, file: "reindex started" } as any);
        } catch (e:any) {
          return sendJson({ ok: false, error: String(e?.message||e) }, 500);
        }
      }

      // 404
      if (wantsJson(req, url)) return sendJson({ ok: false, error: "not found" }, 404);
      return sendText("Not found", 404);
    },
  });

  console.log("Bun server running on http://0.0.0.0:3003");
}
