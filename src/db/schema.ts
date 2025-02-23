// src/db/schema.ts
export interface Video {
  id: string;
  path: string;
  filename: string;
  duration: number;
  created_at: Date;
  updated_at: Date;

  // Processing settings
  frame_interval: number;
  frame_format: "jpg" | "webp";
  frame_quality: number;
  frame_height?: number;
  subtitle_source: "embedded" | "external";
  subtitle_stream?: number;
  subtitle_path?: string;

  // Results
  output_directory: string;
  total_frames: number;
  total_subtitles: number;
  disk_space_used: number;
}

// For GIF creation settings
export interface GifOptions {
  width?: number;
  fps: number;
  quality?: number;
  subtitles: boolean;
  loop?: boolean;
  optimizePalette?: boolean;
}

// Search result type
export interface SearchResult {
  videoId: string;
  timestamp: number;
  subtitleText: string;
  score?: number;
}
