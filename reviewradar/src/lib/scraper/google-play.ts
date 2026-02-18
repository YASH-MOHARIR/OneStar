import gplay from "google-play-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

/**
 * Search Google Play Store for apps by name.
 * Used for the autocomplete search bar.
 */
export async function searchGooglePlay(term: string, num = 10) {
  const results = await gplay.search({ term, num });
  return results.map((app) => ({
    storeId: app.appId,
    store: "GOOGLE_PLAY" as const,
    name: app.title,
    iconUrl: app.icon,
    rating: app.score ?? 0,
    developer: app.developer ?? "",
    url: app.url ?? "",
  }));
}

/**
 * Fetch full app details from Google Play.
 */
export async function getGooglePlayApp(appId: string) {
  const app = await gplay.app({ appId });
  return {
    storeId: app.appId,
    name: app.title,
    iconUrl: app.icon ?? "",
    rating: app.score ?? 0,
    totalRatings: app.ratings ?? 0,
    category: app.genre ?? "",
    developer: app.developer ?? "",
    url: app.url ?? "",
  };
}

/**
 * Fetch reviews from Google Play.
 * Paginates automatically to get up to `num` reviews.
 * Returns ALL reviews — filtering by score happens later.
 */
export async function scrapeGooglePlayReviews(
  appId: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, sort = "newest", lang = "en", country = "us" } = options;

  // Fetch app details
  const appDetails = await getGooglePlayApp(appId);

  // Fetch reviews with pagination
  const allReviews: ScrapeResult["reviews"] = [];
  let nextToken: string | null = null;

  const sortMap: Record<string, number> = {
    newest: 2, // gplay.sort.NEWEST
    rating: 3, // gplay.sort.RATING
    helpfulness: 1, // gplay.sort.HELPFULNESS
  };

  while (allReviews.length < num) {
    const batchSize = Math.min(150, num - allReviews.length);

    const result = await gplay.reviews({
      appId,
      sort: sortMap[sort] ?? gplay.sort.NEWEST,
      num: batchSize,
      lang,
      country,
      paginate: true,
      nextPaginationToken: nextToken ?? undefined,
    });

    const reviews = result.data;
    if (!reviews || reviews.length === 0) break;

    for (const review of reviews) {
      allReviews.push({
        storeReviewId: review.id ?? String(Math.random()),
        score: review.score ?? 0,
        title: review.title || undefined,
        text: review.text || "",
        userName: review.userName || undefined,
        date: new Date(review.date ?? Date.now()),
        version: review.version || undefined,
        thumbsUp: (review as { thumbsUp?: number }).thumbsUp ?? 0,
      });
    }

    nextToken = result.nextPaginationToken ?? null;
    if (!nextToken) break;

    // Rate limiting: wait 500ms between pagination calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { app: appDetails, reviews: allReviews };
}

/**
 * Parse a Google Play URL to extract the app ID.
 * Supports: https://play.google.com/store/apps/details?id=com.spotify.music
 */
export function parseGooglePlayUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "play.google.com") {
      return parsed.searchParams.get("id");
    }
    return null;
  } catch {
    return null;
  }
}
