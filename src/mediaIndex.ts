import type { AppConfig } from "./config";
import type { Entry } from "./fileDatabase";
import type Walker from "./walker";
import {
  isVideoFileValidQuick,
  extractVideoMetadata,
  extractVideoPalette,
} from "./media/video/helpers";
import { Database } from "bun:sqlite";
import { logger } from "./logger";
import { bootstrapDatabase, createSchema } from "./utils/dbHelper";
import { extractThumbnailsList } from "./media/video/helpers";

type MediaType = "image" | "video" | "audio";

export interface MediaFile extends Entry {
  mediaType: MediaType;
}

export interface VideoMediaFile extends MediaFile {
  title: string;
  description?: string;
  duration?: number; // in seconds
  width?: number;
  height?: number;
  thumbnailBase64?: string; // base64 encoded thumbnail
  quality?: string; // e.g., "1080p", "720p"
  codec?: string; // e.g., "H.264", "VP9"
  frameRate?: number; // in fps
  aspectRatio?: string; // e.g., "16:9", "4:3"
}

export type MediaSlicedEntry = {
  id: string;
  entryId: string;
  mediaType: MediaType;
};

function determineMediaType(file: Entry): MediaType | null {
  if (file.type !== "file" || !file.mimeType) return null;
  if (file.mimeType.startsWith("image/")) return "image";
  if (file.mimeType.startsWith("video/")) return "video";
  if (file.mimeType.startsWith("audio/")) return "audio";
  return null;
}

export default class MediaIndex {
  private mediaDatabasePath: string;
  private dbConnection: Database | null = null;

  constructor(
    private walkerDb: Walker,
    private applicationConfig: AppConfig | null = null
  ) {
    this.mediaDatabasePath =
      applicationConfig?.mediaOptions?.mediaDbPath || ".index/media.db";

    this.dbConnection = new Database(this.mediaDatabasePath);

    /// Initialize database schema
    // Video media table
    bootstrapDatabase(
      this.dbConnection,
      "videoMedia",
      createSchema({
        id: { type: "TEXT", primaryKey: true },
        entryId: { type: "TEXT", unique: true },
        mediaType: { type: "TEXT", notNull: true },
        title: { type: "TEXT" },
        description: { type: "TEXT" },
        duration: { type: "INTEGER", notNull: true },
        width: { type: "INTEGER", notNull: true },
        height: { type: "INTEGER", notNull: true },
        thumbnailBase64: { type: "TEXT" },
        thumbnailFastViewBase64JsonList: { type: "TEXT" },
        quality: { type: "TEXT", notNull: true },
        codec: { type: "TEXT", notNull: true },
        frameRate: { type: "REAL", notNull: false },
        aspectRatio: { type: "TEXT", notNull: false },
      })
    );

    // Corrupted files table
    bootstrapDatabase(
      this.dbConnection,
      "corruptedFiles",
      createSchema({
        md5: { type: "TEXT", primaryKey: true, unique: true },
      })
    );

    // Frames for videos
    bootstrapDatabase(
      this.dbConnection,
      "videoFrames",
      createSchema({
        id: { type: "INTEGER", primaryKey: true },
        videoMediaId: { type: "TEXT", notNull: true },
        timestamp: { type: "INTEGER", notNull: true }, // in seconds
        frameBase64: { type: "TEXT", notNull: true }, // base64 encoded frame
      })
    );

    bootstrapDatabase(
      this.dbConnection,
      "videoColorPalettes",
      createSchema({
        id: { type: "INTEGER", primaryKey: true },
        videoMediaId: { type: "TEXT", notNull: true },
        frame: { type: "INTEGER", notNull: true }, // in seconds

        paletteHexTopLeft: { type: "TEXT", notNull: true },
        paletteHexTopRight: { type: "TEXT", notNull: true },
        paletteHexBottomLeft: { type: "TEXT", notNull: true },
        paletteHexBottomRight: { type: "TEXT", notNull: true },
        paletteHexCenter: { type: "TEXT", notNull: true },
      })
    );
  }

  private async insertMediaData(file: VideoMediaFile) {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }

    if (this.walkerDb.db.getEntryById(file.id) === undefined) {
      throw new Error(`Entry with ID ${file.id} does not exist in walker DB`);
    }

    if (file.mediaType !== "video") {
      throw new Error("Only video media files can be inserted");
    }

    // Validate required fields
    if (!file.id) {
      throw new Error("File ID is required");
    }
    if (!file.mediaType) {
      throw new Error("Media type is required");
    }

    // Check if video metadata is complete - skip incomplete records
    if (!file.duration || !file.width || !file.height || !file.codec) {
      logger.warn("Skipping incomplete video metadata for:", {
        path: file.path,
      });
      return false;
    }

    // Check if entry already exists in media table
    const existingCheck = this.dbConnection.prepare(
      `SELECT id FROM videoMedia WHERE id = ? OR entryId = ?`
    );
    const existingRecord = existingCheck.get(file.id, file.id);

    logger.debug("Checking for existing record:", {
      fileId: file.id,
      existingRecord,
      filePath: file.path,
    });

    if (existingRecord) {
      logger.debug("Record already exists, skipping insert");
      return false;
    }

    // Log what we're about to insert for debugging
    logger.debug("Video metadata before insert:", {
      id: file.id,
      title: file.title,
      duration: file.duration,
      width: file.width,
      height: file.height,
      quality: file.quality,
      codec: file.codec,
      frameRate: file.frameRate,
      aspectRatio: file.aspectRatio,
      hasThumbnail: !!file.thumbnailBase64,
    });

    const stmt = this.dbConnection.prepare(`
      INSERT INTO videoMedia (
        id, entryId, mediaType, title, description, duration, width, height,
        thumbnailBase64, quality, codec, frameRate, aspectRatio
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const row = [
      file.id,
      file.id,
      file.mediaType,
      file.title || null,
      file.description || null,
      file.duration || null,
      file.width || null,
      file.height || null,
      file.thumbnailBase64 || null,
      file.quality || null,
      file.codec || null,
      file.frameRate || null,
      file.aspectRatio || null,
    ];

    try {
      const result = stmt.run(...row);
      logger.debug("Insert result:", { result });
      return result.changes === 1;
    } catch (error) {
      logger.error("Insert error:", { error });
      throw error;
    }
  }

  async markFileAsCorrupted(md5: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      INSERT INTO corruptedFiles (md5) VALUES (?)
    `);
    try {
      const result = stmt.run(md5);
      return result.changes === 1;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        // Duplicate entry, ignore
        return false;
      }
      throw error;
    }
  }

  async isFileMarkAsCorrupted(md5: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      SELECT md5 FROM corruptedFiles WHERE md5 = ?
    `);
    const row = stmt.get(md5);
    return !!row;
  }

  async getMediaById(id: string): Promise<VideoMediaFile | null> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      SELECT * FROM videoMedia WHERE id = ?
    `);
    const row = stmt.get(id);
    return row ? (row as VideoMediaFile) : null;
  }

  async getPaletteForVideo(videoMediaId: string): Promise<any | null> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      SELECT * FROM videoPalettes WHERE videoMediaId = ?
    `);
    const row = stmt.get(videoMediaId);
    return row ? (row as any) : null;
  }

  async setPaletteForVideo(
    videoMediaId: string,
    palette: {
      frame: number;
      paletteHexTopLeft: string;
      paletteHexTopRight: string;
      paletteHexBottomLeft: string;
      paletteHexBottomRight: string;
      paletteHexCenter: string;
    }[]
  ): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const insertStmt = this.dbConnection.prepare(`
      INSERT INTO videoColorPalettes (
        videoMediaId, frame,
        paletteHexTopLeft, paletteHexTopRight,
        paletteHexBottomLeft, paletteHexBottomRight,
        paletteHexCenter
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const deleteStmt = this.dbConnection.prepare(`
      DELETE FROM videoColorPalettes WHERE videoMediaId = ?
    `);

    const transaction = this.dbConnection.transaction(() => {
      // first, delete existing palettes for the video
      deleteStmt.run(videoMediaId);

      // then, insert new palettes
      for (const p of palette) {
        insertStmt.run(
          videoMediaId,
          p.frame,
          p.paletteHexTopLeft,
          p.paletteHexTopRight,
          p.paletteHexBottomLeft,
          p.paletteHexBottomRight,
          p.paletteHexCenter
        );
      }
    });

    try {
      transaction();
      return true;
    } catch (error) {
      logger.error("Error setting color palette for video:", { error });
      return false;
    }
  }

  async getFramesForVideo(
    videoMediaId: string
  ): Promise<{ frame: { timestamp: number; frameBase64: string } }[]> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      SELECT timestamp, frameBase64 FROM videoFrames WHERE videoMediaId = ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(videoMediaId) as any[];
    return rows.map((row) => ({
      frame: {
        timestamp: row.timestamp,
        frameBase64: row.frameBase64,
      },
    }));
  }

  async setFramesForVideo(
    videoMediaId: string,
    frames: { timestamp: number; frameBase64: string }[]
  ): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const insertStmt = this.dbConnection.prepare(`
      INSERT INTO videoFrames (videoMediaId, timestamp, frameBase64)
      VALUES (?, ?, ?)
    `);
    const deleteStmt = this.dbConnection.prepare(`
      DELETE FROM videoFrames WHERE videoMediaId = ?
    `);

    const transaction = this.dbConnection.transaction(() => {
      // first, delete existing frames for the video
      deleteStmt.run(videoMediaId);

      // then, insert new frames
      for (const frame of frames) {
        insertStmt.run(videoMediaId, frame.timestamp, frame.frameBase64);
      }
    });

    try {
      transaction();
      return true;
    } catch (error) {
      logger.error("Error setting frames for video:", { error });
      return false;
    }
  }

  async getMediaSlice(
    offset: number,
    limit: number
  ): Promise<MediaSlicedEntry[]> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmtVideo = this.dbConnection.prepare(`
      SELECT * FROM videoMedia
      ORDER BY rowid
      LIMIT ? OFFSET ?
    `);
    const rowsVideo = stmtVideo.all(limit, offset) as any[];

    const mediaSlices = [
      rowsVideo.map(
        (row) =>
          ({
            id: row.entryId,
            entryId: row.entryId,
            mediaType: row.mediaType,
          } as MediaSlicedEntry)
      ),
    ].flat();

    return mediaSlices;
  }

  private async isFileReadyIndex(fileId: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }
    const stmt = this.dbConnection.prepare(`
      SELECT id FROM videoMedia WHERE entryId = ?
    `);
    const row = stmt.get(fileId);
    return !!row;
  }

  private async *walkExtractMediaMetadata() {
    for (const file of this.walkerDb.db.getEveryFile()) {
      if (await this.isFileReadyIndex(file.id)) {
        logger.debug("File already indexed, skipping:", { path: file.path });
        continue;
      }

      const mediaType = determineMediaType(file);
      if (mediaType === "video") {
        const { valid, md5 } = await isVideoFileValidQuick(file);
        if (!valid) {
          if (md5 != undefined) await this.markFileAsCorrupted(md5);

          logger.warn("Skipping corrupted video file:", {
            path: file.path,
            md5,
          });
          continue;
        }

        const videoMeta = await extractVideoMetadata(file);

        yield { ...file, mediaType, ...videoMeta } as VideoMediaFile;
      }
    }
  }

  async entrypoint() {
    for await (const mediaFile of this.walkExtractMediaMetadata()) {
      switch (mediaFile.mediaType) {
        case "video":
          const result = await this.insertMediaData(
            mediaFile as VideoMediaFile
          );
          if (result) {
            logger.info("Indexed video file:", { path: mediaFile.path });

            const frames = await extractThumbnailsList(mediaFile, 10);

            const palette = await extractVideoPalette(mediaFile);

            if (palette && palette.length > 0) {
              await this.setPaletteForVideo(mediaFile.id, palette);
              logger.info("Extracted and stored color palette:", {
                path: mediaFile.path,
                palette: palette.length,
              });
            }

            if (frames.length > 0) {
              await this.setFramesForVideo(mediaFile.id, frames);
              logger.info("Extracted and stored video frames:", {
                path: mediaFile.path,
                frames: frames.length,
              });
            }
          } else {
            logger.debug("Video file already indexed or skipped:", {
              path: mediaFile.path,
            });
          }
          break;

        default:
          logger.warn("Unsupported media type, skipping:", {
            path: mediaFile.path,
          });
          continue;
      }
    }
  }
}
