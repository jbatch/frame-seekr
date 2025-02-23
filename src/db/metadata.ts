// src/db/metadata.ts
import Database from "better-sqlite3";
import type { Video } from "./schema.js";

export class MetadataStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Single videos table with processing settings and results
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        filename TEXT NOT NULL,
        duration INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        
        -- Processing settings
        frame_interval REAL NOT NULL,
        frame_format TEXT NOT NULL,
        frame_quality INTEGER NOT NULL,
        frame_height INTEGER,
        subtitle_source TEXT NOT NULL,
        subtitle_stream INTEGER,
        subtitle_path TEXT,
        
        -- Results
        output_directory TEXT NOT NULL,
        total_frames INTEGER NOT NULL,
        total_subtitles INTEGER NOT NULL,
        disk_space_used INTEGER NOT NULL
      );
    `);
  }

  async addVideo(video: Video): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO videos (
        id, path, filename, duration, created_at, updated_at,
        frame_interval, frame_format, frame_quality, frame_height,
        subtitle_source, subtitle_stream, subtitle_path,
        output_directory, total_frames, total_subtitles, disk_space_used
      ) VALUES (
        @id, @path, @filename, @duration, @created_at, @updated_at,
        @frame_interval, @frame_format, @frame_quality, @frame_height,
        @subtitle_source, @subtitle_stream, @subtitle_path,
        @output_directory, @total_frames, @total_subtitles, @disk_space_used
      )
    `);

    stmt.run({
      ...video,
      created_at: video.created_at.toISOString(),
      updated_at: video.updated_at.toISOString(),
    });
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const row = this.db
      .prepare<[string], Video>("SELECT * FROM videos WHERE id = ?")
      .get(id);

    if (!row) return undefined;

    return {
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    } as Video;
  }

  async updateVideo(video: Video): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE videos SET
        path = @path,
        filename = @filename,
        duration = @duration,
        updated_at = @updated_at,
        frame_interval = @frame_interval,
        frame_format = @frame_format,
        frame_quality = @frame_quality,
        frame_height = @frame_height,
        subtitle_source = @subtitle_source,
        subtitle_stream = @subtitle_stream,
        subtitle_path = @subtitle_path,
        output_directory = @output_directory,
        total_frames = @total_frames,
        total_subtitles = @total_subtitles,
        disk_space_used = @disk_space_used
      WHERE id = @id
    `);

    stmt.run({
      ...video,
      updated_at: video.updated_at.toISOString(),
    });
  }

  async getFramePath(videoId: string, timestamp: number): Promise<string> {
    const video = await this.getVideo(videoId);
    if (!video) throw new Error(`Video not found: ${videoId}`);

    const frameNumber =
      Math.floor(timestamp / (video.frame_interval * 1000)) + 1;
    return `${video.output_directory}/frame_${frameNumber}.${video.frame_format}`;
  }

  async listVideos(): Promise<Video[]> {
    const rows = this.db
      .prepare<[], Video>("SELECT * FROM videos ORDER BY created_at DESC")
      .all();

    return rows.map((row) => ({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    })) as Video[];
  }

  async deleteVideo(id: string): Promise<void> {
    this.db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  }

  async getFramesInRange(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<string[]> {
    const video = await this.getVideo(videoId);
    if (!video) throw new Error(`Video not found: ${videoId}`);

    const startFrame =
      Math.floor(startTime / (video.frame_interval * 1000)) + 1;
    const endFrame = Math.floor(endTime / (video.frame_interval * 1000)) + 1;

    const frames: string[] = [];
    for (let i = startFrame; i <= endFrame; i++) {
      frames.push(`${video.output_directory}/frame_${i}.${video.frame_format}`);
    }

    return frames;
  }
}
