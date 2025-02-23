// src/cli/index.ts
import { Command } from "commander";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { Database } from "../db/index.js";
import { indexVideo } from "./indexVideo.js";
import { searchFrames } from "./search.js";
import { createGif } from "./gif.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8")
);

// Initialize database
const db = new Database({
  metadataPath: join(process.cwd(), "frame-seekr.db"),
  searchHost: process.env.MEILI_HOST || "http://localhost:7700",
  searchApiKey: process.env.MEILI_KEY || "masterKey",
});

const program = new Command();

program
  .name("frame-seekr")
  .description("A tool for creating searchable video frame indexes")
  .version(packageJson.version);

program
  .command("index")
  .description("Index a video file with its subtitles")
  .argument("<video>", "Path to the video file")
  .argument("[subtitles]", "Path to the subtitle file (optional)")
  .option("-s, --stream <number>", "Subtitle stream index to use", "0")
  .option(
    "-r, --resolution <height>",
    "Scale frame height maintaining aspect ratio"
  )
  .option(
    "-q, --quality <number>",
    "Quality level (1-31, lower is better)",
    "5"
  )
  .option("-f, --format <format>", "Output format (jpg or webp)", "jpg")
  .option(
    "-i, --interval <seconds>",
    "Interval between frames in seconds",
    "0.1"
  )
  .action(async (videoPath, subtitles, options) => {
    try {
      await db.initialize();
      await indexVideo(db, videoPath, subtitles, options);
    } catch (error) {
      console.error("\nError:", error);
      process.exit(1);
    }
  });

program
  .command("search")
  .description("Search indexed content")
  .argument("<query>", "Search query")
  .option("-n, --limit <number>", "Number of results to return", "5")
  .option("-v, --video <id>", "Filter by video ID")
  .action(async (query, options) => {
    try {
      await db.initialize();
      await searchFrames(db, query, {
        limit: parseInt(options.limit),
        videoId: options.video,
      });
    } catch (error) {
      console.error("Error during search:", error);
      process.exit(1);
    }
  });

program
  .command("gif")
  .description("Create a GIF from indexed frames")
  .argument("<videoId>", "ID of the indexed video")
  .argument("<start>", "Start time (HH:MM:SS.mmm)")
  .argument("<end>", "End time (HH:MM:SS.mmm)")
  .option("--no-loop", "Disable looping")
  .option("-s, --subtitles", "Include subtitles", false)
  .action(async (videoId, start, end, options) => {
    try {
      await db.initialize();
      await createGif(db, videoId, start, end, {
        loop: options.loop,
        subtitles: options.subtitles,
      });
    } catch (error) {
      console.error("Error creating GIF:", error);
      process.exit(1);
    }
  });

program.parse();
