import store from "app-store-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

/**
 * Search Apple App Store for apps by name.
 */
export async function searchAppStore(term: string, num = 10) {
  const results = await store.search({ term, num, country: "us" });
  return results.map((app: { id: number; title: string; icon: string; score: number; developer: string; url: string }) => ({
    storeId: String(app.id),
    store: "APP_STORE" as const,
    name: app.title,
    iconUrl: app.icon,
    rating: app.score ?? 0,
    developer: app.developer ?? "",
    url: app.url ?? "",
  }));
}

/**
 * Fetch full app details from Apple App Store.
 */
export async function getAppStoreApp(appId: string | number) {
  const app = await store.app({ id: Number(appId) });
  return {
    storeId: String(app.id),
    name: app.title,
    iconUrl: app.icon ?? "",
    rating: app.score ?? 0,
    totalRatings: (app as { userRatingCount?: number }).userRatingCount ?? 0,
    category: (app as { primaryGenreName?: string }).primaryGenreName ?? "",
    developer: app.developer ?? "",
    url: app.url ?? "",
  };
}

/**
 * Scrape Apple App Store reviews.
 * HARD LIMIT: Apple's RSS feed caps at ~500 reviews per country (10 pages × ~50).
 * Apple doesn't recycle — always returns target_reached or no_more_results.
 */
export async function scrapeAppStoreReviews(
  appId: string | number,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { country = "us" } = options;

  const appDetails = await getAppStoreApp(appId);
  const allReviews: ScrapeResult["reviews"] = [];

  for (let page = 1; page <= 10; page++) {
    try {
      const reviews = await store.reviews({
        id: Number(appId),
        sort: store.sort.RECENT,
        page,
        country,
      });

      if (!reviews || reviews.length === 0) break;

      const batch: ScrapeResult["reviews"] = [];
      for (const review of reviews) {
        const r = {
          storeReviewId: String(review.id),
          score: review.score ?? 0,
          title: review.title || undefined,
          text: review.text || "",
          userName: review.userName || undefined,
          date: new Date((review as { updated?: string }).updated ?? Date.now()),
          version: review.version || undefined,
        };
        allReviews.push(r);
        batch.push(r);
      }

      if (options.onBatch && batch.length > 0) {
        await options.onBatch(batch, allReviews.length);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      break;
    }
  }

  return {
    app: appDetails,
    reviews: allReviews,
    scrapeMeta: {
      totalFetched: allReviews.length,
      uniqueCount: allReviews.length,
      duplicatesDetected: 0,
      stoppedReason: "target_reached",
    },
  };
}

/**
 * Parse an App Store URL to extract the app ID.
 */
export function parseAppStoreUrl(url: string): string | null {
  try {
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
