// src/helpers/frames.ts
import { execSync } from "child_process";
import { mkdir, stat, readdir } from "fs/promises";
import { basename, join } from "path";

interface FrameExtractionResult {
  outputDir: string;
  stats: {
    totalFrames: number;
    diskSpaceUsed: number;
  };
}

interface FrameOptions {
  intervalSeconds: number;
  height?: number;
  quality: number;
  format: "jpg" | "webp";
}

export function getVideoDuration(videoPath: string): number {
  const command = `ffprobe -v quiet -print_format json -show_format "${videoPath}"`;
  const output = execSync(command).toString();
  const format = JSON.parse(output).format;
  return parseFloat(format.duration);
}

export async function extractFrames(
  videoPath: string,
  options: FrameOptions
): Promise<FrameExtractionResult> {
  try {
    const { intervalSeconds, height, quality, format } = options;

    // Create output directory
    const videoName = basename(videoPath).split(".").slice(0, -1).join(".");
    const outputDir = join(process.cwd(), "output", videoName);
    await mkdir(outputDir, { recursive: true });

    // Build FFmpeg filters
    let filters = [`fps=${1 / intervalSeconds}`];
    if (height) {
      filters.push(`scale=-1:${height}`);
    }
    const filterString = filters.join(",");

    // Build output options
    let outputOptions =
      format === "jpg"
        ? `-qscale:v ${quality} -pix_fmt yuvj420p`
        : `-quality ${Math.max(
            1,
            Math.min(100, (31 - quality) * 3.3)
          )} -compression_level 6`;

    // Extract frames
    const command = `ffmpeg -v quiet -i "${videoPath}" -vf "${filterString}" ${outputOptions} "${outputDir}/frame_%d.${format}"`;
    execSync(command);

    // Get frame files and calculate stats
    const files = await readdir(outputDir);
    const frameFiles = files.filter(
      (f) => f.startsWith("frame_") && f.endsWith(`.${format}`)
    );

    // Calculate total size
    let totalSize = 0;
    for (const file of frameFiles) {
      const fileStats = await stat(join(outputDir, file));
      totalSize += fileStats.size;
    }

    return {
      outputDir,
      stats: {
        totalFrames: frameFiles.length,
        diskSpaceUsed: totalSize,
      },
    };
  } catch (error) {
    console.error("Error extracting frames:", error);
    throw error;
  }
}
