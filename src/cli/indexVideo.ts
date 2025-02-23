// src/commands/indexVideo.ts
import crypto from "crypto";
import {
  getSubtitleStreams,
  extractSubtitlesFromFile,
  extractEmbeddedSubtitles,
  type SubtitleEntry,
} from "../helpers/subtitles.js";
import { extractFrames, getVideoDuration } from "../helpers/frames.js";
import { Database } from "../db/index.js";
import type { Video } from "../db/schema.js";

interface IndexOptions {
  stream: string;
  resolution?: string;
  quality: string;
  format: "jpg" | "webp";
  interval: string;
}

export async function indexVideo(
  db: Database,
  videoPath: string,
  subtitles: string | undefined,
  options: IndexOptions
): Promise<void> {
  console.log(`Processing video: ${videoPath}`);

  let subtitleEntries: SubtitleEntry[];

  // Process subtitles
  if (subtitles) {
    console.log(`Using external subtitle file: ${subtitles}`);
    subtitleEntries = await extractSubtitlesFromFile(subtitles);
  } else {
    console.log("Checking for embedded subtitles...");
    const subtitleStreams = await getSubtitleStreams(videoPath);

    if (subtitleStreams.length > 0) {
      console.log("\nFound embedded subtitles:");
      subtitleStreams.forEach((stream, idx) => {
        const lang = stream.tags?.language || "unknown";
        const title = stream.tags?.title || "";
        console.log(`${idx}: [${lang}] ${title} (${stream.codec_name})`);
      });

      const streamIndex = parseInt(options.stream);
      if (streamIndex >= subtitleStreams.length) {
        throw new Error(
          `Invalid stream index: ${streamIndex}. Available streams: 0-${
            subtitleStreams.length - 1
          }`
        );
      }

      console.log(`\nExtracting subtitle stream ${streamIndex}...`);
      subtitleEntries = await extractEmbeddedSubtitles(videoPath, streamIndex);
    } else {
      throw new Error(
        "No embedded subtitles found. Please provide a subtitle file."
      );
    }
  }

  // Preview subtitles
  console.log("\nParsed subtitles preview:");
  console.log("------------------------");
  subtitleEntries.slice(0, 3).forEach((entry) => {
    console.log(`[${entry.startTime} -> ${entry.endTime}] ${entry.text}`);
  });
  console.log("------------------------");
  console.log(`Total subtitles: ${subtitleEntries.length}`);

  // Get video duration
  const duration = getVideoDuration(videoPath);

  // Extract frames
  console.log("\nExtracting frames...");
  const { stats, outputDir } = await extractFrames(videoPath, {
    intervalSeconds: parseFloat(options.interval),
    height: options.resolution ? parseInt(options.resolution) : undefined,
    quality: parseInt(options.quality),
    format: options.format,
  });

  // Create video record
  const video: Video = {
    id: crypto.randomUUID(),
    path: videoPath,
    filename: videoPath.split("/").pop() || "",
    duration,
    created_at: new Date(),
    updated_at: new Date(),

    // Processing settings
    frame_interval: parseFloat(options.interval),
    frame_format: options.format,
    frame_quality: parseInt(options.quality),
    frame_height: options.resolution ? parseInt(options.resolution) : undefined,
    subtitle_source: subtitles ? "external" : "embedded",
    subtitle_stream: subtitles ? undefined : parseInt(options.stream),
    subtitle_path: subtitles,

    // Results
    output_directory: outputDir,
    total_frames: stats.totalFrames,
    total_subtitles: subtitleEntries.length,
    disk_space_used: stats.diskSpaceUsed,
  };

  // Save video to database
  await db.metadata.addVideo(video);

  // Index subtitles in search store
  console.log("\nIndexing subtitles...");
  for (const entry of subtitleEntries) {
    await db.search.indexSubtitle(
      video.id,
      entry.startTime,
      entry.endTime,
      entry.text
    );
  }

  console.log(`\nIndexing complete!`);
  console.log(`Video ID: ${video.id}`);
  console.log(`Duration: ${(duration / 60).toFixed(2)} minutes`);
  console.log(`Frames extracted: ${stats.totalFrames}`);
  console.log(
    `Disk space used: ${(stats.diskSpaceUsed / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`Output directory: ${outputDir}`);
}
