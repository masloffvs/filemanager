export type Detected = { ext: string; mime: string } | null;

export function detectFileType(buf: Uint8Array): Detected {
  const B = (i: number) => buf[i];
  const has = (s: string) =>
    new TextDecoder().decode(buf.subarray(0, Math.min(buf.length, 4096))).toLowerCase().includes(s);

  if (buf.length >= 12) {
    if (buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47&&buf[4]===0x0d&&buf[5]===0x0a&&buf[6]===0x1a&&buf[7]===0x0a) return { ext: "png", mime: "image/png" };
    if (buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff) return { ext: "jpg", mime: "image/jpeg" };
    if (B(0)===0x52&&B(1)===0x49&&B(2)===0x46&&B(3)===0x46&&B(8)===0x57&&B(9)===0x41&&B(10)===0x56&&B(11)===0x45) return { ext: "wav", mime: "audio/wav" };
    if (B(0)===0x25&&B(1)===0x50&&B(2)===0x44&&B(3)===0x46&&B(4)===0x2d) return { ext: "pdf", mime: "application/pdf" };
    if (B(0)===0x50&&B(1)===0x4b&&(B(2)===0x03||B(2)===0x05||B(2)===0x07)&&(B(3)===0x04||B(3)===0x06||B(3)===0x08)) return { ext: "zip", mime: "application/zip" };
    if (B(0)===0x1f&&B(1)===0x8b) return { ext: "gz", mime: "application/gzip" };
    if ((B(0)===0x49&&B(1)===0x44&&B(2)===0x33) || (B(0)===0xff && (B(1)&0xe0)===0xe0)) return { ext: "mp3", mime: "audio/mpeg" };
    if (buf[4]===0x66&&buf[5]===0x74&&buf[6]===0x79&&buf[7]===0x70) return { ext: "mp4", mime: "video/mp4" };
    if (B(0)===0x1a&&B(1)===0x45&&B(2)===0xdf&&B(3)===0xa3) {
      if (has("webm")) return { ext: "webm", mime: "video/webm" };
      return { ext: "mkv", mime: "video/x-matroska" };
    }
  }
  if (buf.length > 0 && !buf.slice(0,4096).some((b)=>b===0x00)) return { ext: "txt", mime: "text/plain; charset=utf-8" };
  return null;
}

export function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i>=0 ? name.slice(i+1).toLowerCase() : "";
}

export function enforceNameByDetected(baseName: string, detected: Detected): string {
  if (!detected) return baseName;
  const current = extFromName(baseName);
  if (current === detected.ext) return baseName;
  const base = current ? baseName.slice(0, -(current.length + 1)) : baseName;
  return `${base}.${detected.ext}`;
}

export function lookupMimeByPath(p: string) {
  const lower = p.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".jpg")||lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".gz")) return "application/gzip";
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

