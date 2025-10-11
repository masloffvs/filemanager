import { logger } from "../../logger";
import type { Entry } from "../../fileDatabase";
import * as mm from "music-metadata";
import * as fs from "fs";
import * as crypto from "crypto";

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  year?: number;
  genre?: string[];
  track?: {
    no?: number;
    of?: number;
  };
  disk?: {
    no?: number;
    of?: number;
  };
  duration?: number; // in seconds
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  coverArt?: string; // base64 encoded album art
}

export async function isAudioFileValid(
  file: Entry
): Promise<{ valid: boolean; md5?: string }> {
  try {
    if (!file.mimeType?.startsWith("audio/")) {
      return { valid: false };
    }

    // Check if file exists and is readable
    if (!fs.existsSync(file.path)) {
      return { valid: false };
    }

    // Calculate MD5 hash for corruption detection
    const fileBuffer = await fs.promises.readFile(file.path);
    const md5 = crypto.createHash("md5").update(fileBuffer).digest("hex");

    // Try to parse basic metadata to validate file integrity
    const metadata = await mm.parseFile(file.path);

    // File is valid if we can extract basic info
    const valid = !!(metadata.format || metadata.common);

    return { valid, md5 };
  } catch (error) {
    logger.warn(`Failed to validate audio file: ${file.path}`, { error });
    return { valid: false };
  }
}

export async function extractAudioMetadata(
  file: Entry
): Promise<AudioMetadata> {
  try {
    const metadata = await mm.parseFile(file.path);

    const audioMeta: AudioMetadata = {
      title: metadata.common.title || extractTitleFromFilename(file.path),
      artist: metadata.common.artist,
      album: metadata.common.album,
      albumArtist: metadata.common.albumartist,
      year: metadata.common.year,
      genre: metadata.common.genre,
      track: metadata.common.track
        ? {
            no: metadata.common.track.no || undefined,
            of: metadata.common.track.of || undefined,
          }
        : undefined,
      disk: metadata.common.disk
        ? {
            no: metadata.common.disk.no || undefined,
            of: metadata.common.disk.of || undefined,
          }
        : undefined,
      duration: metadata.format.duration,
      bitrate: metadata.format.bitrate,
      sampleRate: metadata.format.sampleRate,
      channels: metadata.format.numberOfChannels,
      codec: metadata.format.codec || metadata.format.container,
    };

    // Extract album art if present
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      if (picture && picture.data) {
        const base64 = Buffer.from(picture.data).toString("base64");
        const mimeType = picture.format || "image/jpeg";
        audioMeta.coverArt = `data:${mimeType};base64,${base64}`;
      }
    }

    return audioMeta;
  } catch (error) {
    logger.error(`Failed to extract audio metadata: ${file.path}`, { error });

    // Return minimal metadata with just filename-based title
    return {
      title: extractTitleFromFilename(file.path),
      duration: 0,
    };
  }
}

function extractTitleFromFilename(filePath: string): string {
  const filename = filePath.split("/").pop() || filePath;
  // Remove extension and common patterns
  return filename
    .replace(/\.[^.]+$/, "") // Remove extension
    .replace(/^\d+\s*[-.]?\s*/, "") // Remove track numbers at start
    .replace(/[-_]/g, " ") // Replace dashes and underscores with spaces
    .trim();
}

export function normalizeString(str: string | undefined): string {
  if (!str) return "Unknown";
  return str.trim();
}

export function normalizeArtist(artist: string | undefined): string {
  return normalizeString(artist) || "Unknown Artist";
}

export function normalizeAlbum(album: string | undefined): string {
  return normalizeString(album) || "Unknown Album";
}

export function normalizeGenre(genres: string[] | undefined): string {
  if (!genres || genres.length === 0) return "Unknown";
  return genres[0] || "Unknown"; // Take first genre
}
