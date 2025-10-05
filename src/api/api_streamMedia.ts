import { mediaIndex, walker } from "../index";
import fs from "fs";

export default async function requestApiMediaStream(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const password = url.searchParams.get("password"); // Optional

  if (req.method === "HEAD") {
    // check access.. password? 403
    if (!id) {
      return new Response(JSON.stringify({ error: "id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mediaIndexFile = await mediaIndex.getMediaById(id);

    if (!mediaIndexFile) {
      return new Response(JSON.stringify({ error: "Media not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const entry = walker.db.getEntryById(mediaIndexFile.id);

    if (!entry) {
      return new Response(JSON.stringify({ error: "Entry not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (walker.db.hasFilePassword(mediaIndexFile.id)) {
      if (!password) {
        return new Response(JSON.stringify({ error: "password required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const valid = await walker.db.verifyFilePassword(
        mediaIndexFile.id,
        password
      );
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

    if (!fs.existsSync(entry.path)) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  //required Headers for streaming
  const range = req.headers.get("Range");
  const userAgent = req.headers.get("User-Agent") || "Unknown";

  if (!range || !userAgent) {
    return new Response(
      JSON.stringify({ error: "Range and User-Agent headers are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // validate range header
  const byteRangeMatch = range.match(/bytes=(\d+)-(\d*)/);
  if (!byteRangeMatch) {
    return new Response(JSON.stringify({ error: "Invalid Range header" }), {
      status: 416,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!id) {
    return new Response(JSON.stringify({ error: "id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mediaIndexFile = await mediaIndex.getMediaById(id);

  if (!mediaIndexFile) {
    return new Response(JSON.stringify({ error: "Media not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entry = walker.db.getEntryById(mediaIndexFile.id);

  if (!entry) {
    return new Response(JSON.stringify({ error: "Entry not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (walker.db.hasFilePassword(mediaIndexFile.id)) {
    if (!password) {
      return new Response(JSON.stringify({ error: "password required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const valid = await walker.db.verifyFilePassword(
      mediaIndexFile.id,
      password
    );
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

  if (!fs.existsSync(entry.path)) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let file = Bun.file(entry.path);

  const [start, end] = byteRangeMatch.slice(1, 3).map(Number);
  file = file.slice(start, end || (start || 0) + 1);

  return new Response(file.stream(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `inline; filename="${entry.id}"`,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${(end && end - 1) || ""}/${file.size}`,
      "Content-Length": String(file.size),
      "Cache-Control": "no-cache",
      Vary: "User-Agent",
    },
  });
}
