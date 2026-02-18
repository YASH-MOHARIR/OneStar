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
    totalRatings: app.userRatingCount ?? 0,
    category: app.primaryGenreName ?? "",
    developer: app.developer ?? "",
    url: app.url ?? "",
  };
}

/**
 * Fetch reviews from Apple App Store.
 * Note: App Store scraper paginates by page (1-10), each page ~50 reviews.
 */
export async function scrapeAppStoreReviews(
  appId: string | number,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, sort = "newest", country = "us" } = options;

  const appDetails = await getAppStoreApp(appId);

  const allReviews: ScrapeResult["reviews"] = [];
  let page = 1;
  const maxPages = Math.min(10, Math.ceil(num / 50)); // App Store limits to 10 pages

  while (allReviews.length < num && page <= maxPages) {
    try {
      const reviews = await store.reviews({
        id: Number(appId),
        sort: sort === "newest" ? store.sort.RECENT : store.sort.HELPFUL,
        page,
        country,
      });

      if (!reviews || reviews.length === 0) break;

      for (const review of reviews) {
        allReviews.push({
          storeReviewId: String(review.id),
          score: review.score ?? 0,
          title: review.title || undefined,
          text: review.text || "",
          userName: review.userName || undefined,
          date: new Date((review as { updated?: string }).updated ?? Date.now()),
          version: review.version || undefined,
        });
      }

      page++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      break; // App Store often limits to ~500 reviews
    }
  }

  return { app: appDetails, reviews: allReviews };
}

/**
 * Parse an App Store URL to extract the app ID.
 * Supports: https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580
 */
export function parseAppStoreUrl(url: string): string | null {
  try {
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
