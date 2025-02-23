import { MetadataStore } from "./metadata.js";
import { SearchStore } from "./search.js";

// src/db/index.ts
export class Database {
  metadata: MetadataStore;
  search: SearchStore;

  constructor(config: {
    metadataPath: string;
    searchHost: string;
    searchApiKey: string;
  }) {
    this.metadata = new MetadataStore(config.metadataPath);
    this.search = new SearchStore(config.searchHost, config.searchApiKey);
  }

  async initialize() {
    await this.search.initialize();
  }
}
