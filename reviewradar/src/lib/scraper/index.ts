import "server-only";
import {
  searchGooglePlay,
  scrapeGooglePlayReviews,
  parseGooglePlayUrl,
} from "./google-play";
import {
  searchAppStore,
  scrapeAppStoreReviews,
  parseAppStoreUrl,
} from "./app-store";
import type { ScrapeOptions, ScrapeResult } from "./types";

export type { ScrapeOptions, ScrapeResult };

/**
 * Detect store from a URL and return the store type + app ID.
 */
export function parseAppUrl(url: string): {
  store: "GOOGLE_PLAY" | "APP_STORE";
  appId: string;
} | null {
  const googleId = parseGooglePlayUrl(url);
  if (googleId) return { store: "GOOGLE_PLAY", appId: googleId };

  const appleId = parseAppStoreUrl(url);
  if (appleId) return { store: "APP_STORE", appId: appleId };

  return null;
}

/**
 * Search both stores simultaneously.
 */
export async function searchApps(term: string, store?: "GOOGLE_PLAY" | "APP_STORE") {
  if (store === "GOOGLE_PLAY") return searchGooglePlay(term);
  if (store === "APP_STORE") return searchAppStore(term);

  // Search both stores in parallel
  const [googleResults, appleResults] = await Promise.allSettled([
    searchGooglePlay(term, 5),
    searchAppStore(term, 5),
  ]);

  const results = [];
  if (googleResults.status === "fulfilled") results.push(...googleResults.value);
  if (appleResults.status === "fulfilled") results.push(...appleResults.value);

  return results;
}

/**
 * Scrape reviews from the correct store.
 */
export async function scrapeReviews(
  appId: string,
  store: "GOOGLE_PLAY" | "APP_STORE",
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  if (store === "GOOGLE_PLAY") {
    return scrapeGooglePlayReviews(appId, options);
  }
  return scrapeAppStoreReviews(appId, options);
}

/**
 * Filter reviews by score threshold.
 * Returns only reviews at or below the threshold (e.g., <= 3 stars).
 */
export function filterNegativeReviews(
  reviews: ScrapeResult["reviews"],
  threshold = 3
) {
  return reviews.filter(
    (review) => review.score <= threshold && review.text && review.text.trim().length > 10
  );
}
