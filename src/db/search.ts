// src/db/search.ts
import { MeiliSearch } from "meilisearch";

interface SearchableFrame {
  id: string; // Composite key: videoId_timestamp
  videoId: string;
  startTime: number; // Start timestamp in milliseconds
  endTime: number; // End timestamp in milliseconds
  subtitleText: string;
}

export class SearchStore {
  private client: MeiliSearch;

  constructor(host: string, apiKey: string) {
    this.client = new MeiliSearch({
      host,
      apiKey,
    });
  }

  async initialize() {
    await this.client.createIndex("frames", {
      primaryKey: "id",
    });

    await this.client.index("frames").updateSettings({
      searchableAttributes: ["subtitleText"],
      filterableAttributes: ["videoId", "startTime", "endTime"],
      sortableAttributes: ["startTime", "endTime"],
    });
  }

  async indexSubtitle(
    videoId: string,
    startTime: number,
    endTime: number,
    subtitleText: string
  ) {
    const searchableFrame: SearchableFrame = {
      id: `${videoId}_${startTime}`,
      videoId,
      startTime,
      endTime,
      subtitleText,
    };

    await this.client.index("frames").addDocuments([searchableFrame]);
  }

  async search(
    query: string,
    options: {
      videoId?: string;
      limit?: number;
      offset?: number;
      timeRange?: {
        start?: number;
        end?: number;
      };
    } = {}
  ) {
    const searchParams: any = {
      limit: options.limit || 20,
      offset: options.offset || 0,
    };

    // Build filter conditions
    const filters: string[] = [];

    if (options.videoId) {
      filters.push(`videoId = "${options.videoId}"`);
    }

    if (options.timeRange) {
      if (options.timeRange.start !== undefined) {
        filters.push(`startTime >= ${options.timeRange.start}`);
      }
      if (options.timeRange.end !== undefined) {
        filters.push(`endTime <= ${options.timeRange.end}`);
      }
    }

    if (filters.length > 0) {
      searchParams.filter = filters.join(" AND ");
    }

    return this.client.index("frames").search(query, searchParams);
  }
}
