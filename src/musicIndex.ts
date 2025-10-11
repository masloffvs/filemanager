import type { AppConfig } from "./config";
import type { Entry } from "./fileDatabase";
import type Walker from "./walker";
import {
  isAudioFileValid,
  extractAudioMetadata,
  normalizeArtist,
  normalizeAlbum,
  normalizeGenre,
  type AudioMetadata,
} from "./media/audio/helpers";
import { Database } from "bun:sqlite";
import { logger } from "./logger";
import { bootstrapDatabase, createSchema } from "./utils/dbHelper";

export interface MusicFile extends Entry {
  mediaType: "audio";
}

export interface AudioTrack extends MusicFile {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  genre: string;
  trackNumber?: number;
  trackTotal?: number;
  diskNumber?: number;
  diskTotal?: number;
  duration?: number; // in seconds
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  coverArt?: string; // base64 encoded album art
}

export interface Album {
  id: string;
  name: string;
  artist: string; // Main album artist
  year?: number;
  genre: string;
  trackCount: number;
  totalDuration: number; // in seconds
  coverArt?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  totalDuration: number; // in seconds
}

export interface Genre {
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
}

function determineIsAudio(file: Entry): boolean {
  return file.type === "file" && !!file.mimeType?.startsWith("audio/");
}

export default class MusicIndex {
  private musicDatabasePath: string;
  private dbConnection: Database | null = null;

  constructor(
    private walkerDb: Walker,
    private applicationConfig: AppConfig | null = null
  ) {
    this.musicDatabasePath = ".index/music.db";

    this.dbConnection = new Database(this.musicDatabasePath);

    // Initialize database schema
    this.initializeSchema();
  }

  private initializeSchema() {
    if (!this.dbConnection) return;

    // Audio tracks table
    bootstrapDatabase(
      this.dbConnection,
      "audioTracks",
      createSchema({
        id: { type: "TEXT", primaryKey: true },
        entryId: { type: "TEXT", unique: true },
        title: { type: "TEXT", notNull: true },
        artist: { type: "TEXT", notNull: true },
        album: { type: "TEXT", notNull: true },
        albumArtist: { type: "TEXT" },
        year: { type: "INTEGER" },
        genre: { type: "TEXT", notNull: true },
        trackNumber: { type: "INTEGER" },
        trackTotal: { type: "INTEGER" },
        diskNumber: { type: "INTEGER" },
        diskTotal: { type: "INTEGER" },
        duration: { type: "REAL" },
        bitrate: { type: "INTEGER" },
        sampleRate: { type: "INTEGER" },
        channels: { type: "INTEGER" },
        codec: { type: "TEXT" },
        coverArt: { type: "TEXT" },
      })
    );

    // Albums table - computed from tracks
    bootstrapDatabase(
      this.dbConnection,
      "albums",
      createSchema({
        id: { type: "TEXT", primaryKey: true },
        name: { type: "TEXT", notNull: true },
        artist: { type: "TEXT", notNull: true },
        year: { type: "INTEGER" },
        genre: { type: "TEXT", notNull: true },
        trackCount: { type: "INTEGER", notNull: true },
        totalDuration: { type: "REAL", notNull: true },
        coverArt: { type: "TEXT" },
      })
    );

    // Artists table - computed from tracks
    bootstrapDatabase(
      this.dbConnection,
      "artists",
      createSchema({
        id: { type: "TEXT", primaryKey: true },
        name: { type: "TEXT", notNull: true },
        albumCount: { type: "INTEGER", notNull: true },
        trackCount: { type: "INTEGER", notNull: true },
        totalDuration: { type: "REAL", notNull: true },
      })
    );

    // Genres table - computed from tracks
    bootstrapDatabase(
      this.dbConnection,
      "genres",
      createSchema({
        id: { type: "TEXT", primaryKey: true },
        name: { type: "TEXT", notNull: true },
        trackCount: { type: "INTEGER", notNull: true },
        albumCount: { type: "INTEGER", notNull: true },
        artistCount: { type: "INTEGER", notNull: true },
      })
    );

    // Corrupted files table
    bootstrapDatabase(
      this.dbConnection,
      "corruptedAudioFiles",
      createSchema({
        md5: { type: "TEXT", primaryKey: true, unique: true },
      })
    );

    // Create indexes for better performance
    this.dbConnection.exec(`
      CREATE INDEX IF NOT EXISTS idx_audioTracks_artist ON audioTracks(artist);
      CREATE INDEX IF NOT EXISTS idx_audioTracks_album ON audioTracks(album);
      CREATE INDEX IF NOT EXISTS idx_audioTracks_genre ON audioTracks(genre);
      CREATE INDEX IF NOT EXISTS idx_audioTracks_year ON audioTracks(year);
      CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist);
      CREATE INDEX IF NOT EXISTS idx_albums_genre ON albums(genre);
      CREATE INDEX IF NOT EXISTS idx_albums_year ON albums(year);
    `);
  }

  private async insertAudioTrack(file: AudioTrack): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }

    if (this.walkerDb.db.getEntryById(file.id) === undefined) {
      throw new Error(`Entry with ID ${file.id} does not exist in walker DB`);
    }

    // Check if track already exists
    const existingCheck = this.dbConnection.prepare(
      `SELECT id FROM audioTracks WHERE id = ? OR entryId = ?`
    );
    const existingRecord = existingCheck.get(file.id, file.id);

    if (existingRecord) {
      logger.debug("Audio track already exists, skipping insert");
      return false;
    }

    const stmt = this.dbConnection.prepare(`
      INSERT INTO audioTracks (
        id, entryId, title, artist, album, albumArtist, year, genre,
        trackNumber, trackTotal, diskNumber, diskTotal, duration, 
        bitrate, sampleRate, channels, codec, coverArt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    try {
      const result = stmt.run(
        file.id,
        file.id,
        file.title || "Unknown Title",
        file.artist || "Unknown Artist",
        file.album || "Unknown Album",
        file.albumArtist || null,
        file.year || null,
        file.genre || "Unknown",
        file.trackNumber || null,
        file.trackTotal || null,
        file.diskNumber || null,
        file.diskTotal || null,
        file.duration || null,
        file.bitrate || null,
        file.sampleRate || null,
        file.channels || null,
        file.codec || null,
        file.coverArt || null
      );

      logger.debug("Audio track inserted successfully:", {
        id: file.id,
        title: file.title,
        artist: file.artist,
        album: file.album,
      });

      return result.changes === 1;
    } catch (error) {
      logger.error("Failed to insert audio track:", { error, path: file.path });
      throw error;
    }
  }

  async markFileAsCorrupted(md5: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }

    const stmt = this.dbConnection.prepare(`
      INSERT INTO corruptedAudioFiles (md5) VALUES (?)
    `);

    try {
      const result = stmt.run(md5);
      return result.changes === 1;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return false; // Already marked as corrupted
      }
      throw error;
    }
  }

  async isFileMarkedAsCorrupted(md5: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }

    const stmt = this.dbConnection.prepare(`
      SELECT md5 FROM corruptedAudioFiles WHERE md5 = ?
    `);
    const row = stmt.get(md5);
    return !!row;
  }

  private async isFileAlreadyIndexed(fileId: string): Promise<boolean> {
    if (!this.dbConnection) {
      throw new Error("Database connection not initialized");
    }

    const stmt = this.dbConnection.prepare(`
      SELECT id FROM audioTracks WHERE entryId = ?
    `);
    const row = stmt.get(fileId);
    return !!row;
  }

  private async *walkExtractAudioMetadata() {
    for (const file of this.walkerDb.db.getEveryFile()) {
      if (!determineIsAudio(file)) continue;

      if (await this.isFileAlreadyIndexed(file.id)) {
        logger.debug("Audio file already indexed, skipping:", {
          path: file.path,
        });
        continue;
      }

      const { valid, md5 } = await isAudioFileValid(file, this.walkerDb.db);
      if (!valid) {
        if (md5) await this.markFileAsCorrupted(md5);
        logger.warn("Skipping corrupted audio file:", { path: file.path, md5 });
        continue;
      }

      const audioMeta = await extractAudioMetadata(file, this.walkerDb.db);

      yield {
        ...file,
        mediaType: "audio" as const,
        title: audioMeta.title || "Unknown Title",
        artist: normalizeArtist(audioMeta.artist),
        album: normalizeAlbum(audioMeta.album),
        albumArtist: audioMeta.albumArtist,
        year: audioMeta.year,
        genre: normalizeGenre(audioMeta.genre),
        trackNumber: audioMeta.track?.no,
        trackTotal: audioMeta.track?.of,
        diskNumber: audioMeta.disk?.no,
        diskTotal: audioMeta.disk?.of,
        duration: audioMeta.duration,
        bitrate: audioMeta.bitrate,
        sampleRate: audioMeta.sampleRate,
        channels: audioMeta.channels,
        codec: audioMeta.codec,
        coverArt: audioMeta.coverArt,
      } as AudioTrack;
    }
  }

  private async rebuildAggregatedTables(): Promise<void> {
    if (!this.dbConnection) return;

    logger.info("Rebuilding aggregated music tables...");

    // Rebuild albums table
    this.dbConnection.exec("DELETE FROM albums");
    const albumStmt = this.dbConnection.prepare(`
      INSERT INTO albums (id, name, artist, year, genre, trackCount, totalDuration, coverArt)
      SELECT 
        LOWER(HEX(RANDOMBLOB(16))) as id,
        album as name,
        COALESCE(albumArtist, artist) as artist,
        year,
        genre,
        COUNT(*) as trackCount,
        COALESCE(SUM(duration), 0) as totalDuration,
        (SELECT coverArt FROM audioTracks WHERE album = t.album AND coverArt IS NOT NULL LIMIT 1) as coverArt
      FROM audioTracks t
      GROUP BY album, COALESCE(albumArtist, artist), year, genre
    `);
    albumStmt.run();

    // Rebuild artists table
    this.dbConnection.exec("DELETE FROM artists");
    const artistStmt = this.dbConnection.prepare(`
      INSERT INTO artists (id, name, albumCount, trackCount, totalDuration)
      SELECT 
        LOWER(HEX(RANDOMBLOB(16))) as id,
        artist as name,
        COUNT(DISTINCT album) as albumCount,
        COUNT(*) as trackCount,
        COALESCE(SUM(duration), 0) as totalDuration
      FROM audioTracks
      GROUP BY artist
    `);
    artistStmt.run();

    // Rebuild genres table
    this.dbConnection.exec("DELETE FROM genres");
    const genreStmt = this.dbConnection.prepare(`
      INSERT INTO genres (id, name, trackCount, albumCount, artistCount)
      SELECT 
        LOWER(HEX(RANDOMBLOB(16))) as id,
        genre as name,
        COUNT(*) as trackCount,
        COUNT(DISTINCT album) as albumCount,
        COUNT(DISTINCT artist) as artistCount
      FROM audioTracks
      GROUP BY genre
    `);
    genreStmt.run();

    logger.info("Aggregated music tables rebuilt successfully");
  }

  // Public API methods
  async getTrackById(id: string): Promise<AudioTrack | null> {
    if (!this.dbConnection) return null;

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM audioTracks WHERE id = ?
    `);
    const row = stmt.get(id);
    return row ? (row as AudioTrack) : null;
  }

  async getAllAlbums(limit: number = 50, offset: number = 0): Promise<Album[]> {
    if (!this.dbConnection) return [];

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM albums ORDER BY name LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset);
    return rows as Album[];
  }

  async getAlbumTracks(
    albumName: string,
    artist: string
  ): Promise<AudioTrack[]> {
    if (!this.dbConnection) return [];

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM audioTracks 
      WHERE album = ? AND (artist = ? OR albumArtist = ?)
      ORDER BY diskNumber, trackNumber, title
    `);
    const rows = stmt.all(albumName, artist, artist);
    return rows as AudioTrack[];
  }

  async getAllArtists(
    limit: number = 50,
    offset: number = 0
  ): Promise<Artist[]> {
    if (!this.dbConnection) return [];

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM artists ORDER BY name LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset);
    return rows as Artist[];
  }

  async getArtistAlbums(artistName: string): Promise<Album[]> {
    if (!this.dbConnection) return [];

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM albums WHERE artist = ? ORDER BY year DESC, name
    `);
    const rows = stmt.all(artistName);
    return rows as Album[];
  }

  async getAllGenres(): Promise<Genre[]> {
    if (!this.dbConnection) return [];

    const stmt = this.dbConnection.prepare(`
      SELECT * FROM genres ORDER BY name
    `);
    const rows = stmt.all();
    return rows as Genre[];
  }

  async searchTracks(query: string, limit: number = 20): Promise<AudioTrack[]> {
    if (!this.dbConnection) return [];

    const searchTerm = `%${query}%`;
    const stmt = this.dbConnection.prepare(`
      SELECT * FROM audioTracks 
      WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
      ORDER BY title LIMIT ?
    `);
    const rows = stmt.all(searchTerm, searchTerm, searchTerm, limit);
    return rows as AudioTrack[];
  }

  async entrypoint(): Promise<void> {
    logger.info("Starting music library indexing...");

    let tracksProcessed = 0;
    for await (const audioTrack of this.walkExtractAudioMetadata()) {
      try {
        const result = await this.insertAudioTrack(audioTrack);
        if (result) {
          tracksProcessed++;

          // rebuild after 30 tracks
          if (tracksProcessed % 30 === 0) {
            logger.info(
              `Recently indexed ${tracksProcessed} tracks... Rebuilding aggregated tables now.`
            );
            await this.rebuildAggregatedTables();
          }

          logger.debug("Indexed audio track:", {
            path: audioTrack.path,
            title: audioTrack.title,
            artist: audioTrack.artist,
          });
        }
      } catch (error) {
        logger.error("Failed to index audio track:", {
          path: audioTrack.path,
          error,
        });
      }
    }

    logger.info(
      `Music indexing completed. Processed ${tracksProcessed} tracks.`
    );

    // Rebuild aggregated tables after indexing
    await this.rebuildAggregatedTables();
  }

  close(): void {
    if (this.dbConnection) {
      this.dbConnection.close();
      this.dbConnection = null;
    }
  }
}
