# Frame Seekr

A tool for creating Frinkiac-style search engines for any video content. Search through videos using subtitle text and get matching frames, with the ability to create GIFs from scenes.

## Status: On Hold ⏸️

Project is currently paused while evaluating storage requirements and optimization strategies. The core challenge is balancing GIF quality (which requires high frame rates) with the substantial disk space needed to store extracted frames.

## Current Features

- Command line interface for video processing and search
- Subtitle extraction (supports both embedded and external .srt files)
- Frame extraction at configurable intervals
- Full-text search of subtitle content
- Basic GIF creation from extracted frames
- Support for both JPG and WebP frame formats
- Configurable frame quality and resolution
- SQLite metadata storage
- Meilisearch integration for fast text search

## Prerequisites

- Node.js (v18 or higher)
- FFmpeg installed and available in PATH
- Docker and Docker Compose (for Meilisearch)

## Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/frame-seekr.git
cd frame-seekr

# Install dependencies
yarn install

# Build the project
yarn build

# Start Meilisearch (required for search functionality)
docker compose up -d
```

## Usage

### Index a Video

```bash
yarn dev index path/to/video.mp4 [path/to/subtitles.srt]
  --interval 0.1    # Frame extraction interval in seconds
  --quality 5       # Frame quality (1-31, lower is better)
  --format jpg      # Output format (jpg or webp)
  --resolution 720  # Frame height in pixels
```

### Search Content

```bash
yarn dev search "search query"
  --limit 5         # Number of results
  --video <id>      # Filter by video ID
```

### Create GIF

```bash
yarn dev gif <videoId> <start> <end>
  --fps 10          # Frames per second
  --quality 75      # Output quality
  --no-loop        # Disable looping
```

## Technical Stack

- TypeScript/Node.js
- FFmpeg for media processing
- Meilisearch for text search
- SQLite for metadata storage
- Commander.js for CLI

## Challenges & Future Considerations

### Storage Requirements

The main challenge is balancing GIF quality with storage requirements. Real-world example:

8-minute Bluey episode at 10 FPS = 4,800 frames
480p JPG frames
Total storage per episode ≈ 87MB

Potential solutions being considered:
1. Intelligent frame selection based on scene detection
2. Frame deduplication
3. Adaptive frame rates based on motion
4. Cloud storage integration
5. Frame compression optimization
6. Temporary frame storage with periodic cleanup

### Planned Features

- Web UI for search and GIF creation
- Vector search for semantic matching
- Multiple subtitle format support

## Acknowledgments

Inspired by [Frinkiac](https://frinkiac.com/), the fantastic Simpsons screenshot search engine.