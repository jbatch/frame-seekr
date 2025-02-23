// src/helpers/subtitles.ts
import { execSync } from "child_process";
import { readFileSync } from "fs";

export interface SubtitleStream {
  index: number;
  codec_name: string;
  tags?: {
    language?: string;
    title?: string;
  };
}

export interface SubtitleEntry {
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  text: string;
}

export async function getSubtitleStreams(
  videoPath: string
): Promise<SubtitleStream[]> {
  try {
    const command = `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`;
    const output = execSync(command).toString();
    const streams = JSON.parse(output).streams;

    return streams
      .map((stream: any, index: number) => ({
        ...stream,
        index,
      }))
      .filter((stream: any) => stream.codec_type === "subtitle");
  } catch (error) {
    console.error("Error checking for embedded subtitles:", error);
    return [];
  }
}

function timeToMs(timeStr: string): number {
  const [hours, minutes, seconds] = timeStr.split(":");
  const [secs, ms] = seconds.split(",");

  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(secs) * 1000 +
    parseInt(ms)
  );
}

function parseSrtContent(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.trim().split("\n\n");

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // Skip the subtitle number (lines[0])
    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!timeMatch) continue;

    const [, startTimeStr, endTimeStr] = timeMatch;
    const text = lines.slice(2).join("\n").trim();

    entries.push({
      startTime: timeToMs(startTimeStr),
      endTime: timeToMs(endTimeStr),
      text,
    });
  }

  return entries;
}

export async function extractSubtitlesFromFile(
  filePath: string
): Promise<SubtitleEntry[]> {
  try {
    const content = readFileSync(filePath, "utf-8");
    return parseSrtContent(content);
  } catch (error) {
    throw new Error(`Failed to extract subtitles from file: ${error}`);
  }
}

export async function extractEmbeddedSubtitles(
  videoPath: string,
  streamIndex: number = 0
): Promise<SubtitleEntry[]> {
  try {
    // Extract subtitles to SRT format using FFmpeg
    const command = `ffmpeg -v quiet -i "${videoPath}" -map 0:s:${streamIndex} -f srt pipe:1`;
    const subtitles = execSync(command).toString();
    return parseSrtContent(subtitles);
  } catch (error) {
    throw new Error(`Failed to extract embedded subtitles: ${error}`);
  }
}
