import { inngest } from "./client";
import { db } from "@/lib/db";
import { scrapeReviews, filterNegativeReviews } from "@/lib/scraper";
import { categorizeReviews } from "@/lib/ai/categorize";

export const runAnalysis = inngest.createFunction(
  {
    id: "run-analysis",
    retries: 2,
    onFailure: async ({ event }) => {
      const analysisId = (event.data as { analysisId?: number }).analysisId;
      if (analysisId) {
        await db.analysis.update({
          where: { id: analysisId },
          data: { status: "FAILED" },
        });
      }
    },
  },
  { event: "analysis/run" },
  async ({ event, step }) => {
    const { analysisId, storeId, store, threshold, timeRange } = event.data as {
      analysisId: number;
      storeId: string;
      store: "GOOGLE_PLAY" | "APP_STORE";
      threshold: number;
      timeRange: string;
    };
    const startTime = Date.now();

    await step.run("update-status-scraping", async () => {
      await db.analysis.update({
        where: { id: analysisId },
        data: { status: "SCRAPING" },
      });
    });

    const scrapeResult = await step.run("scrape-reviews", async () => {
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

      if (app) {
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
      }

      return {
        totalRatings: result.app.totalRatings,
        totalReviews: result.scrapeMeta.uniqueCount,
        scrapeMeta: result.scrapeMeta,
        appName: result.app.name,
        appCategory: result.app.category || "General",
      };
    });

    const negativeReviews = await step.run("filter-reviews", async () => {
      const app = await db.app.findUnique({
        where: { store_storeId: { store, storeId } },
      });

      if (!app) throw new Error("App not found");

      const reviews = await db.review.findMany({
        where: {
          appId: app.id,
          score: { lte: threshold },
          text: { not: null },
        },
        orderBy: { date: "desc" },
      });

      await db.analysis.update({
        where: { id: analysisId },
        data: {
          status: "ANALYZING",
          totalRatings: scrapeResult.totalRatings,
          totalReviews: scrapeResult.totalReviews,
          negativeReviews: reviews.length,
        },
      });

      return reviews
        .filter((r) => r.text && r.text.trim().length > 10)
        .map((r) => ({ score: r.score, text: r.text! }));
    });

    const categorized = await step.run("categorize-reviews", async () => {
      return categorizeReviews({
        appName: scrapeResult.appName,
        platform: store === "GOOGLE_PLAY" ? "Google Play" : "App Store",
        category: scrapeResult.appCategory,
        reviews: negativeReviews,
      });
    });

    await step.run("store-results", async () => {
      await db.complaintCategory.deleteMany({
        where: { analysisId },
      });

      for (const [index, cat] of categorized.categories.entries()) {
        await db.complaintCategory.create({
          data: {
            analysisId,
            category: cat.category,
            parentCategory: cat.parentCategory || null,
            count: cat.count,
            percentage:
              (cat.count / categorized.totalNegativeReviews) * 100,
            severity: (cat.severity?.toUpperCase() ?? "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
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
    });

    return { analysisId, status: "COMPLETE" };
  }
);
