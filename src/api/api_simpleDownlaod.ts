import { walker } from "../index";
import fs from "fs";
import path from "path";

export async function requestApiSimpleDownload(
  req: Request
): Promise<Response> {
  const id = new URL(req.url).searchParams.get("id");
  const password = new URL(req.url).searchParams.get("password");

  if (!id) {
    return new Response("id required", { status: 400 });
  }

  const entry = walker.db.getEntryById(id);
  if (!entry) {
    return new Response("Entry not found", { status: 404 });
  }

  if (entry.type !== "file") {
    return new Response("Invalid entry type", { status: 400 });
  }

  if (walker.db.hasFilePassword(id)) {
    if (!password) {
      return new Response("Password required", { status: 401 });
    }
    const valid = walker.db.verifyFilePassword(id, password);
    if (!valid) {
      return new Response("Password incorrect", { status: 403 });
    }
  }

  // Get the real path for reading (handles phantom symlink files)
  const realPath = walker.db.getRealPath(entry);
  const fileStream = Bun.file(realPath);

  if (!fs.existsSync(realPath)) {
    return new Response("File (at disk) not found", { status: 404 });
  }

  // Extract just the filename from the path and encode properly for Content-Disposition
  const fileName = (path.basename(entry.path) || "download")
    .replace(/"/g, "'")
    .replace(/\s+/g, "_")
    .trim();

  return new Response(fileStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}";`,
      "Content-Type": entry.mimeType || "application/octet-stream",
      //   "Content-Length": entry.size?.toString() || undefined,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
      Accept: "*/*",
      Vary: "Accept",
    },
  });
}
