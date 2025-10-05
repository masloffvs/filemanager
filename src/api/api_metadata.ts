import fs from "fs";
import sharp from "sharp";
import { logger } from "../logger";
import { walker } from "../index";
import { humanSize } from "@/ui/types";
import * as yauzl from "yauzl";
import * as mm from "music-metadata";

export async function requestApiMetadata(req: Request): Promise<any> {
  const id = new URL(req.url).searchParams.get("id");
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

  const filePath = entry.path;

  if (!fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: "File (at disk) not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If the file is a video, extract video metadata (duration, bitrate, resolution, etc.)
  if (/^video\//i.test(entry.mimeType || "")) {
    // Use ffprobe via Bun.spawn to get metadata
    try {
      const proc = Bun.spawn([
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration:format=bit_rate:stream=width,height,codec_name,codec_type",
        "-of",
        "json",
        filePath,
      ]);
      const output = await new Response(proc.stdout).text();
      const meta = JSON.parse(output);

      const stat = await fs.promises.stat(filePath).catch(() => null);

      // Extract relevant info
      const format = meta.format || {};
      const streams = Array.isArray(meta.streams) ? meta.streams : [];
      const videoStream = streams.find((s: any) => s.codec_type === "video");
      const audioStream = streams.find((s: any) => s.codec_type === "audio");

      // Helper to format seconds as HH:MM:SS
      function formatDuration(seconds: number | null): string | null {
        if (seconds == null || isNaN(seconds)) return null;
        const sec = Math.floor(seconds % 60);
        const min = Math.floor((seconds / 60) % 60);
        const hr = Math.floor(seconds / 3600);
        return [hr, min, sec].map((v) => String(v).padStart(2, "0")).join(":");
      }

      // Helper to format bytes as human-readable
      function formatBytes(bytes: number | null): string | null {
        if (bytes == null || isNaN(bytes)) return null;
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        let val = bytes;
        while (val >= 1024 && i < units.length - 1) {
          val /= 1024;
          i++;
        }
        return `${val.toFixed(2)} ${units[i]}`;
      }

      // Helper to format bitrate as human-readable
      function formatBitrate(bps: number | null): string | null {
        if (bps == null || isNaN(bps)) return null;
        if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
        if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
        return `${bps} bps`;
      }

      // Helper to map resolution to YouTube-like quality labels
      function getQualityLabel(
        width: number | null,
        height: number | null
      ): string | null {
        if (!width || !height) return null;
        const res = Math.max(width, height);
        if (res >= 2160) return "2160p (4K)";
        if (res >= 1440) return "1440p (QHD)";
        if (res >= 1080) return "1080p (FHD)";
        if (res >= 720) return "720p (HD)";
        if (res >= 480) return "480p (SD)";
        if (res >= 360) return "360p";
        if (res >= 240) return "240p";
        return `${res}p`;
      }

      const videoMetadata = {
        duration: format.duration ? Number(format.duration) : null,
        bitrate: format.bit_rate ? Number(format.bit_rate) : null,
        width: videoStream?.width ?? null,
        height: videoStream?.height ?? null,
        videoCodec: videoStream?.codec_name ?? null,
        audioCodec: audioStream?.codec_name ?? null,
        size: format.size ? Number(format.size) : stat?.size,
        quality: getQualityLabel(
          videoStream?.width ?? null,
          videoStream?.height ?? null
        ),
        // Human-readable fields
        human: {
          duration: formatDuration(
            format.duration ? Number(format.duration) : null
          ),
          bitrate: formatBitrate(
            format.bit_rate ? Number(format.bit_rate) : null
          ),
          size: humanSize(format.size ? Number(format.size) : stat?.size ?? 0),
          resolution:
            videoStream?.width && videoStream?.height
              ? `${videoStream.width}x${videoStream.height}`
              : null,
          videoCodec: videoStream?.codec_name ?? null,
          audioCodec: audioStream?.codec_name ?? null,
          quality: getQualityLabel(
            videoStream?.width ?? null,
            videoStream?.height ?? null
          ),
        },
      };

      return new Response(JSON.stringify({ ...videoMetadata, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      logger.error("ffprobe failed", { error: String(err) });
      const stat = await fs.promises.stat(filePath).catch(() => null);
      // Fallback: just return file size
      return new Response(JSON.stringify({ size: stat?.size, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // If the file is an image, extract image metadata (dimensions, color profile, palette, etc.)
  if (/^image\//i.test(entry.mimeType || "")) {
    try {
      // Use 'sharp' for image metadata (requires sharp installed)
      const image = sharp(filePath);
      const meta = await image.metadata();

      // Extract color palette (dominant colors)
      let palette: Array<{ hex: string; rgb: [number, number, number] }> = [];
      try {
        const { dominant } = await image.stats();
        if (
          dominant &&
          dominant.r != null &&
          dominant.g != null &&
          dominant.b != null
        ) {
          palette.push({
            hex: `#${(
              (1 << 24) +
              (dominant.r << 16) +
              (dominant.g << 8) +
              dominant.b
            )
              .toString(16)
              .slice(1)}`,
            rgb: [dominant.r, dominant.g, dominant.b],
          });
        }
      } catch {}

      // Color profile info
      const colorProfile = meta.icc ? meta.icc : null;

      const imageMetadata = {
        width: meta.width ?? null,
        height: meta.height ?? null,
        format: meta.format ?? null,
        size: meta.size ?? (await fs.promises.stat(filePath)).size,
        colorSpace: meta.space ?? null,
        hasAlpha: meta.hasAlpha ?? null,
        colorProfile,
        palette,
        human: {
          resolution:
            meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
          format: meta.format ?? null,
          size: humanSize(meta.size ?? (await fs.promises.stat(filePath)).size),
          colorSpace: meta.space ?? null,
          hasAlpha: meta.hasAlpha ? "yes" : "no",
          palette: palette.map((c) => c.hex),
        },
      };

      return new Response(JSON.stringify({ ...imageMetadata, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      logger.error("Image metadata failed", { error: String(err) });
      // Fallback: just return file size
      const stat = await fs.promises.stat(filePath).catch(() => null);
      return new Response(JSON.stringify({ size: stat?.size, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // If the file is a zip archive, extract metadata without unpacking
  if (entry.mimeType === "application/zip" || /\.zip$/i.test(filePath)) {
    try {
      const stat = await fs.promises.stat(filePath).catch(() => null);

      // Open zip file
      const zip: yauzl.ZipFile = await new Promise((resolve, reject) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err || !zipfile) reject(err || new Error("No zipfile"));
          else resolve(zipfile);
        });
      });

      let fileCount = 0;
      let totalUncompressedSize = 0;
      let isEncrypted = false;
      let compressionMethods = new Set<string>();

      await new Promise<void>((resolve) => {
        zip.readEntry();
        zip.on("entry", (entry) => {
          fileCount++;
          totalUncompressedSize += entry.uncompressedSize;
          // Check if entry is encrypted (bit 0 of general purpose flag)
          if ((entry.generalPurposeBitFlag & 0x1) !== 0) isEncrypted = true;
          // Compression method
          compressionMethods.add(String(entry.compressionMethod));
          zip.readEntry();
        });
        zip.on("end", () => {
          zip.close();
          resolve();
        });
      });

      const compressionLabels: Record<string, string> = {
        "0": "Stored (no compression)",
        "8": "Deflate",
        "9": "Deflate64",
        "12": "BZIP2",
        "14": "LZMA",
        "98": "PPMd",
        // Add more if needed
      };

      const zipMetadata = {
        fileCount,
        totalUncompressedSize,
        isEncrypted,
        compressionMethods: Array.from(compressionMethods).map(
          (m) => compressionLabels[m] || `Method ${m}`
        ),
        size: stat?.size ?? null,
        human: {
          fileCount,
          totalUncompressedSize: humanSize(totalUncompressedSize),
          size: humanSize(stat?.size ?? 0),
          isEncrypted: isEncrypted ? "yes" : "no",
          compressionMethods: Array.from(compressionMethods).map(
            (m) => compressionLabels[m] || `Method ${m}`
          ),
        },
      };

      return new Response(JSON.stringify({ ...zipMetadata, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      logger.error("Zip metadata failed", { error: String(err) });
      const stat = await fs.promises.stat(filePath).catch(() => null);
      return new Response(JSON.stringify({ size: stat?.size, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /// music
  // If the file is audio/music, extract metadata (artist, album, cover, bitrate, etc.)
  if (/^audio\//i.test(entry.mimeType || "")) {
    try {
      // Use 'music-metadata' for audio files
      const meta = await mm.parseFile(filePath, { duration: true });

      // Extract cover image (if present)
      let cover: string | null = null;
      if (meta.common.picture && meta.common.picture.length > 0) {
        // Convert first cover to base64 data URL
        const pic = meta.common.picture[0];
        if (pic?.format && pic?.data) {
          cover = `data:${pic.format};base64,${pic.data.toBase64()}`;
        }
      }

      // File size
      const stat = await fs.promises.stat(filePath).catch(() => null);

      // Bitrate (in bps)
      const bitrate = meta.format.bitrate ?? null;

      // Duration (in seconds)
      const duration = meta.format.duration ?? null;

      // Number of channels
      const numberOfChannels = meta.format.numberOfChannels ?? null;

      // Human-readable helpers
      function formatDuration(seconds: number | null): string | null {
        if (seconds == null || isNaN(seconds)) return null;
        const sec = Math.floor(seconds % 60);
        const min = Math.floor((seconds / 60) % 60);
        const hr = Math.floor(seconds / 3600);
        return [hr, min, sec].map((v) => String(v).padStart(2, "0")).join(":");
      }
      function formatBitrate(bps: number | null): string | null {
        if (bps == null || isNaN(bps)) return null;
        if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
        if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
        return `${bps} bps`;
      }

      const audioMetadata = {
        title: meta.common.title ?? null,
        artist: meta.common.artist ?? null,
        album: meta.common.album ?? null,
        year: meta.common.year ?? null,
        genre: meta.common.genre ?? null,
        track: meta.common.track?.no ?? null,
        disk: meta.common.disk?.no ?? null,
        duration,
        bitrate,
        sampleRate: meta.format.sampleRate ?? null,
        codec: meta.format.codec ?? null,
        cover,
        size: stat?.size ?? null,
        numberOfChannels,
        human: {
          title: meta.common.title ?? null,
          artist: meta.common.artist ?? null,
          album: meta.common.album ?? null,
          year: meta.common.year ?? null,
          genre: meta.common.genre?.join(", ") ?? null,
          track: meta.common.track?.no ?? null,
          disk: meta.common.disk?.no ?? null,
          duration: formatDuration(duration),
          bitrate: formatBitrate(bitrate),
          sampleRate: meta.format.sampleRate
            ? `${meta.format.sampleRate} Hz`
            : null,
          codec: meta.format.codec ?? null,
          size: humanSize(stat?.size ?? 0),
          numberOfChannels:
            numberOfChannels !== null ? `${numberOfChannels}` : null,
        },
      };

      return new Response(JSON.stringify({ ...audioMetadata, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      logger.error("Audio metadata failed", { error: String(err) });
      const stat = await fs.promises.stat(filePath).catch(() => null);
      return new Response(JSON.stringify({ size: stat?.size, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ version: 1 }), {
    headers: { "Content-Type": "application/json" },
  });
}
