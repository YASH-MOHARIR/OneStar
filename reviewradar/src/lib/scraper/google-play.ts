import gplay from "google-play-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

/**
 * Search Google Play Store for apps by name.
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

// RATING = 3 (lowest first). Hardcoded — never user-configurable.
const SORT_RATING = 3; // gplay.sort.RATING

/**
 * Scrape Google Play reviews sorted by RATING (lowest first).
 * Ensures we get the most negative reviews first for analysis.
 *
 * IMPORTANT: Google Play recycles reviews after ~5,000-6,000 unique results.
 * We deduplicate by storeReviewId and stop when batches return 0 new unique reviews.
 */
export async function scrapeGooglePlayReviews(
  appId: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, lang = "en", country = "us" } = options;

  const appDetails = await getGooglePlayApp(appId);

  const uniqueReviews = new Map<string, ScrapeResult["reviews"][0]>();
  let nextToken: string | null = null;
  let emptyBatches = 0;
  let totalFetched = 0;
  let duplicatesDetected = 0;
  let stoppedReason: ScrapeResult["scrapeMeta"]["stoppedReason"] = "target_reached";

  try {
    while (uniqueReviews.size < num) {
      const batchSize = Math.min(150, num - uniqueReviews.size);

      const result = await gplay.reviews({
        appId,
        sort: SORT_RATING,
        num: batchSize,
        lang,
        country,
        paginate: true,
        nextPaginationToken: nextToken ?? undefined,
      });

      const reviews = result.data;
      if (!reviews || reviews.length === 0) {
        stoppedReason = "no_more_results";
        break;
      }

      const batch: ScrapeResult["reviews"] = [];
      let newInBatch = 0;

      for (const review of reviews) {
        const id = review.id ?? String(Math.random());
        totalFetched++;
        if (!uniqueReviews.has(id)) {
          const r = {
            storeReviewId: id,
            score: review.score ?? 0,
            title: review.title || undefined,
            text: review.text || "",
            userName: review.userName || undefined,
            date: new Date(review.date ?? Date.now()),
            version: review.version || undefined,
            thumbsUp: (review as { thumbsUp?: number }).thumbsUp ?? 0,
          };
          uniqueReviews.set(id, r);
          batch.push(r);
          newInBatch++;
        } else {
          duplicatesDetected++;
        }
      }

      if (options.onBatch && batch.length > 0) {
        await options.onBatch(batch, uniqueReviews.size);
      }

      if (newInBatch === 0) {
        emptyBatches++;
        if (emptyBatches >= 2) {
          stoppedReason = "recycling_detected";
          break;
        }
      } else {
        emptyBatches = 0;
      }

      nextToken = result.nextPaginationToken ?? null;
      if (!nextToken) {
        stoppedReason = "no_more_results";
        break;
      }

      if (uniqueReviews.size >= num) {
        stoppedReason = "target_reached";
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch {
    stoppedReason = "error";
  }

  return {
    app: appDetails,
    reviews: Array.from(uniqueReviews.values()),
    scrapeMeta: {
      totalFetched,
      uniqueCount: uniqueReviews.size,
      duplicatesDetected,
      stoppedReason,
    },
  };
}

/**
 * Parse a Google Play URL to extract the app ID.
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
