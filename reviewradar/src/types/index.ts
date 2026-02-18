// ─── Scraper Types ───

export interface ScrapedApp {
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  name: string;
  iconUrl: string;
  rating: number;
  totalRatings: number;
  category: string;
  developer: string;
  url: string;
}

export interface ScrapedReview {
  storeReviewId: string;
  score: number;
  title?: string;
  text: string;
  userName?: string;
  date: Date;
  version?: string;
  thumbsUp?: number;
}

// ─── AI / Categorization Types ───

export interface ComplaintCategoryResult {
  category: string;
  parentCategory: string;
  count: number;
  percentage?: number;
  rank?: number;
  severity: "critical" | "high" | "medium" | "low";
  sampleReviews: string[];
}

export interface CategorizationBatchResult {
  categories: ComplaintCategoryResult[];
  reviewsProcessed: number;
}

export interface MergedCategorizationResult {
  categories: ComplaintCategoryResult[];
  totalReviewsAnalyzed: number;
  totalNegativeReviews: number;
}

// ─── API Request / Response Types ───

export interface AnalyzeRequest {
  appUrl?: string;        // Google Play or App Store URL
  appId?: string;         // Direct store ID
  store?: "GOOGLE_PLAY" | "APP_STORE";
  threshold?: number;     // Default: 3
  timeRange?: "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "LAST_YEAR" | "ALL_TIME";
}

export interface AnalyzeResponse {
  analysisId: number;
  status: "PENDING" | "SCRAPING" | "ANALYZING" | "COMPLETE" | "FAILED";
  message: string;
}

export interface SearchRequest {
  query: string;
  store?: "GOOGLE_PLAY" | "APP_STORE";
}

export interface SearchResult {
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  name: string;
  iconUrl: string;
  rating: number;
  developer: string;
  url: string;
}

export interface ReportResponse {
  analysis: {
    id: number;
    status: string;
    totalReviews: number;
    negativeReviews: number;
    processingTime: number;
    createdAt: string;
  };
  app: {
    name: string;
    store: string;
    iconUrl: string;
    rating: number;
    totalRatings: number;
    category: string;
    developer: string;
  };
  complaints: {
    category: string;
    parentCategory: string;
    count: number;
    percentage: number;
    severity: string;
    sampleReviews: string[];
    rank: number;
    trending: string;
  }[];
}

// ─── Component Prop Types ───

export interface AppCardProps {
  name: string;
  iconUrl: string;
  rating: number;
  store: string;
  developer: string;
  onClick?: () => void;
}

export interface ComplaintCardProps {
  rank: number;
  category: string;
  parentCategory: string;
  count: number;
  percentage: number;
  severity: "critical" | "high" | "medium" | "low";
  sampleReviews: string[];
  isBlurred?: boolean; // For free tier paywall
}

// ─── Plan & Billing Types ───

export interface PlanConfig {
  name: string;
  slug: "free" | "starter" | "pro" | "team";
  price: number; // monthly in cents
  analysesPerMonth: number;
  features: string[];
  stripePriceId?: string;
  popular?: boolean;
}
