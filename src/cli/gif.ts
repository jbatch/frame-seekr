// src/cli/gif.ts
import { execSync } from "child_process";
import { join } from "path";
import { Database } from "../db/index.js";

interface GifOptions {
  subtitles?: boolean;
  loop?: boolean;
}

function parseTimestamp(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(":");
  const [secs, ms] = seconds.split(".");

  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(secs) * 1000 +
    parseInt(ms)
  );
}

export async function createGif(
  db: Database,
  videoId: string,
  startTime: string,
  endTime: string,
  options: GifOptions = {}
): Promise<void> {
  try {
    // Get video metadata
    const video = await db.metadata.getVideo(videoId);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Convert timestamps to milliseconds
    const startMs = parseTimestamp(startTime);
    const endMs = parseTimestamp(endTime);

    // Get frames in the time range
    const frames = await db.metadata.getFramesInRange(videoId, startMs, endMs);
    if (frames.length === 0) {
      throw new Error("No frames found in the specified time range");
    }

    // Create temporary file for frame list
    const frameListPath = join(video.output_directory, "frames.txt");
    const frameListContent = frames
      .map((frame) => {
        // Each frame should be shown for the interval duration
        return `file '${frame}'\nduration ${video.frame_interval}`;
      })
      .join("\n");

    // Write frame list to temporary file
    const { writeFile, unlink } = await import("fs/promises");
    await writeFile(frameListPath, frameListContent);

    // Build FFmpeg command
    const outputPath = join(
      video.output_directory,
      `${startTime}-${endTime}.gif`
    );

    // Use FFmpeg's concat demuxer to create the GIF
    // -safe 0: Allow absolute paths in the frame list
    // -f concat: Use concat demuxer
    // -i: Input file list
    // -vf palettegen/paletteuse: Generate and use optimal palette for GIF
    const ffmpegCommand = `ffmpeg -v quiet -y -safe 0 -f concat -i "${frameListPath}" \
      -vf "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      ${options.loop === false ? "-loop 0" : ""} \
      "${outputPath}"`;

    // Execute FFmpeg commandssj jbatch
    execSync(ffmpegCommand);

    // Clean up temporary file
    // await unlink(frameListPath);

    console.log(`\nGIF created successfully:`);
    console.log(`Output: ${outputPath}`);
    console.log(`Duration: ${((endMs - startMs) / 1000).toFixed(2)}s`);
    console.log(`Frames: ${frames.length}`);
    console.log(`Frame Interval: ${video.frame_interval}s`);
  } catch (error) {
    console.error("Error creating GIF:", error);
    throw error;
  }
}
