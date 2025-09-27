import { promises as fs } from "fs";
import path from "path";
import { STORAGE, MAX_UPLOAD_BYTES, STRICT_MIME } from "./config";
import { listEntries } from "./listing";
import { enforceNameByDetected, extFromName, detectFileType, lookupMimeByPath } from "./utils/mime";
import { resolveSafe, sanitizeRelPath, sanitizeSegment } from "./utils/path";
import { baseSecurityHeaders, sendHtml, sendJson, sendText, wantsJson } from "./http/http";
import { renderHtmlList } from "../web/templates";
import { randomSuffixHex } from "./utils/random";

export async function startServer() {
  await fs.mkdir(STORAGE, { recursive: true });

  Bun.serve({
    port: 3003,
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Root listing
      if (req.method === "GET" && (pathname === "/" || pathname === "")) {
        try {
          const listing = await listEntries("");
          if (wantsJson(req, url)) return sendJson({ ok: true, ...listing });
          return sendHtml(await renderHtmlList(url.origin, { ok: true, ...listing }));
        } catch (err) {
          const error = String(err instanceof Error ? err.message : err);
          if (wantsJson(req, url)) return sendJson({ ok: false, error }, 500);
          return sendText("Internal Server Error", 500);
        }
      }

      // GET /browse[/<rel>]
      if (req.method === "GET" && pathname.startsWith("/browse")) {
        const relRaw = pathname.slice("/browse".length).replace(/^\/+/, "");
        const relDecoded = relRaw ? relRaw.split("/").map(decodeURIComponent).join("/") : "";
        try {
          const listing = await listEntries(relDecoded);
          if (wantsJson(req, url)) return sendJson({ ok: true, ...listing });
          return sendHtml(await renderHtmlList(url.origin, { ok: true, ...listing }));
        } catch {
          if (wantsJson(req, url)) return sendJson({ ok: false, error: "not found" }, 404);
          return sendText("Not found", 404);
        }
      }

      // GET /files/<rel> (stream)
      if (req.method === "GET" && pathname.startsWith("/files/")) {
        const relRaw = pathname.slice("/files/".length);
        const relDecoded = relRaw.split("/").map(decodeURIComponent).join("/");
        try {
          const { abs } = resolveSafe(relDecoded);
          const st = await fs.stat(abs);
          if (!st.isFile()) throw new Error("not a file");
          const file = Bun.file(abs);
          const headers = {
            "Content-Type": lookupMimeByPath(abs),
            "Content-Length": String(st.size),
            "Content-Disposition": `attachment; filename="${path.basename(abs)}"`,
            ...baseSecurityHeaders(),
          };
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

      // 404
      if (wantsJson(req, url)) return sendJson({ ok: false, error: "not found" }, 404);
      return sendText("Not found", 404);
    },
  });

  console.log("Bun server running on http://0.0.0.0:3003");
}
