import { walker } from "../index";
import fs from "fs";

export async function requestApiPreview(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const password = url.searchParams.get("password"); // Optional

  if (!id) {
    return new Response(JSON.stringify({ error: "id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entry = walker.db.getEntryById(id);

  if (!entry) {
    return new Response(JSON.stringify({ error: "Entry not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "HEAD") {
    if (walker.db.hasFilePassword(id)) {
      if (!password) {
        return new Response(JSON.stringify({ error: "password required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const valid = await walker.db.verifyFilePassword(id, password);
      if (!valid) {
        return new Response(JSON.stringify({ error: "password incorrect" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (entry.type !== "file") {
      return new Response(JSON.stringify({ error: "Invalid entry type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the real path for reading (handles phantom symlink files)
    const realPath = walker.db.getRealPath(entry);

    if (!fs.existsSync(realPath)) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, { status: 200 });
  }

  if (walker.db.hasFilePassword(id)) {
    if (!password) {
      return new Response(JSON.stringify({ error: "password required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const valid = await walker.db.verifyFilePassword(id, password);
    if (!valid) {
      return new Response(JSON.stringify({ error: "password incorrect" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (entry.type !== "file") {
    return new Response(JSON.stringify({ error: "Invalid entry type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the real path for reading (handles phantom symlink files)
  const realPath = walker.db.getRealPath(entry);
  const file = Bun.file(realPath);

  // if is audio
  if (entry.mimeType && entry.mimeType.startsWith("audio/")) {
    return new Response(file, {
      headers: {
        "Content-Type": entry.mimeType || "application/octet-stream",
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Check if the file is a video
  const isVideo =
    (entry.mimeType && entry.mimeType.startsWith("video/")) ||
    (file.type && file.type.startsWith("video/"));

  if (isVideo) {
    const range = req.headers.get("range");
    if (!range) {
      return new Response(
        JSON.stringify({
          error: "Range header required for video streaming",
        }),
        {
          status: 416,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const size = await file.size;
    if (size == null) {
      return new Response(
        JSON.stringify({ error: "Could not determine file size" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse Range header
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");

    if (startStr === undefined || startStr === "") {
      return new Response(
        JSON.stringify({ error: "Invalid Range header format" }),
        {
          status: 416,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (isNaN(parseInt(startStr, 10))) {
      return new Response(
        JSON.stringify({ error: "Invalid Range header format" }),
        {
          status: 416,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : size - 1;
    const chunkSize = end - start + 1;

    //   const stream = fs.createReadStream(entry.path, {
    //     start,
    //     end,
    //   });

    // Use Bun's file.slice for efficient streaming
    const slicedFile = file.slice(start, end + 1);
    return new Response(slicedFile, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type":
          entry.mimeType || file.type || "application/octet-stream",
      },
    });
  }

  // Non-video files: return whole file
  return new Response(file, {
    headers: {
      "Content-Type": entry.mimeType || file.type || "application/octet-stream",
    },
  });
}
