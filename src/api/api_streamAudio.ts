import { musicIndex, walker } from "../index";
import fs from "fs";

export default async function requestApiAudioStream(req: Request) {
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

    const audioTrack = await musicIndex.getTrackById(id);

    if (!audioTrack) {
      return new Response(JSON.stringify({ error: "Audio track not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const entry = walker.db.getEntryById(audioTrack.id);

    if (!entry) {
      return new Response(JSON.stringify({ error: "Entry not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (walker.db.hasFilePassword(audioTrack.id)) {
      if (!password) {
        return new Response(JSON.stringify({ error: "password required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const valid = await walker.db.verifyFilePassword(audioTrack.id, password);
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

  const audioTrack = await musicIndex.getTrackById(id);

  if (!audioTrack) {
    return new Response(JSON.stringify({ error: "Audio track not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entry = walker.db.getEntryById(audioTrack.id);

  if (!entry) {
    return new Response(JSON.stringify({ error: "Entry not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (walker.db.hasFilePassword(audioTrack.id)) {
    if (!password) {
      return new Response(JSON.stringify({ error: "password required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const valid = await walker.db.verifyFilePassword(audioTrack.id, password);
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

  let file = Bun.file(realPath);
  const fileSize = file.size;

  const [startParam, endParam] = byteRangeMatch.slice(1, 3);
  const start = startParam ? parseInt(startParam) : 0;
  const end = endParam ? parseInt(endParam) : fileSize - 1;

  const chunkSize = end - start + 1;
  const slicedFile = file.slice(start, end + 1);

  // Determine audio MIME type based on file extension
  const audioMimeType = entry.mimeType || getAudioMimeType(realPath);

  return new Response(slicedFile.stream(), {
    status: 206, // Partial Content
    headers: {
      "Content-Type": audioMimeType,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": String(chunkSize),
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year for audio files
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      Vary: "User-Agent",
    },
  });
}

function getAudioMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split(".").pop();

  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "flac":
      return "audio/flac";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "m4a":
    case "aac":
      return "audio/mp4";
    case "wma":
      return "audio/x-ms-wma";
    case "opus":
      return "audio/opus";
    default:
      return "audio/mpeg"; // Default fallback
  }
}
