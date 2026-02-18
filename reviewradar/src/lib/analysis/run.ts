import { db } from "@/lib/db";
import { scrapeReviews } from "@/lib/scraper";
import { categorizeReviews } from "@/lib/ai/categorize";

export interface RunAnalysisParams {
  analysisId: number;
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  threshold: number;
  timeRange: string;
}

/**
 * Runs the full analysis pipeline: scrape → filter → categorize → store.
 * Used when Inngest is not available (e.g. local dev without Inngest keys).
 */
export async function runAnalysisCore(params: RunAnalysisParams): Promise<void> {
  const { analysisId, storeId, store, threshold } = params;
  const startTime = Date.now();

  try {
    await db.analysis.update({
      where: { id: analysisId },
      data: { status: "SCRAPING" },
    });

    const result = await scrapeReviews(storeId, store, { num: 3000 });

    await db.app.update({
      where: { store_storeId: { store, storeId } },
      data: {
        name: result.app.name,
        iconUrl: result.app.iconUrl,
        rating: result.app.rating,
        totalRatings: result.app.totalRatings,
        category: result.app.category,
        developer: result.app.developer,
        url: result.app.url,
        lastScraped: new Date(),
      },
    });

    const app = await db.app.findUnique({
      where: { store_storeId: { store, storeId } },
    });

    if (!app) throw new Error("App not found after scrape");

    for (const review of result.reviews) {
      await db.review.upsert({
        where: {
          appId_storeReviewId: {
            appId: app.id,
            storeReviewId: review.storeReviewId,
          },
        },
        create: {
          appId: app.id,
          storeReviewId: review.storeReviewId,
          score: review.score,
          title: review.title,
          text: review.text,
          userName: review.userName,
          date: review.date,
          version: review.version,
          thumbsUp: review.thumbsUp ?? 0,
        },
        update: {},
      });
    }

    await db.analysis.update({
      where: { id: analysisId },
      data: {
        status: "ANALYZING",
        totalRatings: result.app.totalRatings,
        totalReviews: result.scrapeMeta.uniqueCount,
        negativeReviews: null,
      },
    });

    const reviews = await db.review.findMany({
      where: {
        appId: app.id,
        score: { lte: threshold },
        text: { not: null },
      },
      orderBy: { date: "desc" },
    });

    const negativeReviews = reviews
      .filter((r) => r.text && r.text.trim().length > 10)
      .map((r) => ({ score: r.score, text: r.text! }));

    await db.analysis.update({
      where: { id: analysisId },
      data: { negativeReviews: negativeReviews.length },
    });

    const categorized = await categorizeReviews({
      appName: result.app.name,
      platform: store === "GOOGLE_PLAY" ? "Google Play" : "App Store",
      category: result.app.category || "General",
      reviews: negativeReviews,
    });

    await db.complaintCategory.deleteMany({
      where: { analysisId },
    });

    const totalNeg = categorized.totalNegativeReviews || 1;
    for (const [index, cat] of categorized.categories.entries()) {
      await db.complaintCategory.create({
        data: {
          analysisId,
          category: cat.category,
          parentCategory: cat.parentCategory || null,
          count: cat.count,
          percentage: (cat.count / totalNeg) * 100,
          severity: (cat.severity?.toUpperCase() ?? "MEDIUM") as
            | "CRITICAL"
            | "HIGH"
            | "MEDIUM"
            | "LOW",
          sampleReviews: cat.sampleReviews ?? [],
          rank: index + 1,
        },
      });
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    await db.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETE",
        completedAt: new Date(),
        processingTime: elapsed,
      },
    });
  } catch (err) {
    await db.analysis.update({
      where: { id: analysisId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}
