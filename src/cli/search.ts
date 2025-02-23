// src/commands/search.ts
import { Database } from "../db/index.js";

interface SearchOptions {
  limit: number;
  videoId?: string;
}

export async function searchFrames(
  db: Database,
  query: string,
  options: SearchOptions
): Promise<void> {
  const results = await db.search.search(query, {
    limit: 1, // Only get the best match
    videoId: options.videoId,
  });

  if (results.hits.length === 0) {
    console.log("No matches found");
    return;
  }

  // Get the best match
  const hit = results.hits[0];
  const video = await db.metadata.getVideo(hit.videoId);

  // Format timestamps as HH:MM:SS.mmm
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(
      3,
      "0"
    )}`;
  };

  console.log("\nBest Match:");
  console.log("===========");

  const score = hit._score !== undefined ? hit._score : hit.score;
  if (score !== undefined) {
    console.log(`Match Score: ${Number(score).toFixed(2)}`);
  }

  console.log(`Video: ${video?.filename || hit.videoId}`);
  console.log(
    `Time Range: ${formatTime(hit.startTime)} -> ${formatTime(hit.endTime)}`
  );
  console.log(`Text: "${hit.subtitleText}"`);

  // Get frames that fall within this time range
  const frames = await db.metadata.getFramesInRange(
    hit.videoId,
    hit.startTime,
    hit.endTime
  );

  // Extract directory and filenames
  if (frames.length > 0) {
    const directory = frames[0].substring(0, frames[0].lastIndexOf("/"));
    const filenames = frames.map((frame) =>
      frame.substring(frame.lastIndexOf("/") + 1)
    );

    console.log(`Frame Directory: ${directory}`);
    console.log(`Frame Files: ${filenames.join(", ")}`);

    // Add GIF command helper
    console.log("\nTo create a GIF of this scene, run:");
    console.log("--------------------------------");
    console.log(`frame-seekr gif \\`);
    console.log(`  "${hit.videoId}" \\`);
    console.log(`  "${formatTime(hit.startTime)}" \\`);
    console.log(`  "${formatTime(hit.endTime)}" \\`);
    console.log(`  --subtitles      # Include subtitles`);
  }
}
