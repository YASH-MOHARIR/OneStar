export interface ScrapeOptions {
  num?: number;        // Max reviews to fetch (default: 3000)
  sort?: "newest" | "rating" | "helpfulness";
  lang?: string;       // Default: "en"
  country?: string;    // Default: "us"
}

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
}
