export interface ScrapeOptions {
  num?: number;       // default: 3000
  lang?: string;      // default: "en"
  country?: string;   // default: "us"
  onBatch?: (batch: ScrapeResult["reviews"], totalFetched: number) => void | Promise<void>;
  // Sort is NOT configurable. Always RATING (lowest first).
}

export type ScrapeStoppedReason =
  | "target_reached"
  | "no_more_results"
  | "recycling_detected"
  | "error";

export interface ScrapeResult {
  app: {
    storeId: string;
    name: string;
    iconUrl: string;
    rating: number;
    totalRatings: number;
    category: string;
    developer: string;
    url: string;
  };
  reviews: {
    storeReviewId: string;
    score: number;
    title?: string;
    text: string;
    userName?: string;
    date: Date;
    version?: string;
    thumbsUp?: number;
  }[];
  scrapeMeta: {
    totalFetched: number;
    uniqueCount: number;
    duplicatesDetected: number;
    stoppedReason: ScrapeStoppedReason;
  };
}
