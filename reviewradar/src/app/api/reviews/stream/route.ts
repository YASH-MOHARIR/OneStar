import { NextRequest } from "next/server";
import { scrapeReviews } from "@/lib/scraper";

export const maxDuration = 300; // 5 minutes for long scrapes (Vercel Pro)

/**
 * GET /api/reviews/stream?appId=xxx&store=GOOGLE_PLAY&num=10000
 * Streams reviews via Server-Sent Events with progress updates.
 */
export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("appId");
  const store = req.nextUrl.searchParams.get("store") as "GOOGLE_PLAY" | "APP_STORE" | null;
  const num = Math.min(
    parseInt(req.nextUrl.searchParams.get("num") ?? "10000", 10) || 10000,
    50000
  );

  if (!appId || !store || !["GOOGLE_PLAY", "APP_STORE"].includes(store)) {
    return new Response(
      JSON.stringify({ error: "Missing appId and store" }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const result = await scrapeReviews(appId, store, {
          num,
          sort: "newest", // For listing UI - use "rating" when doing AI analysis for negative reviews
          onBatch: async (batch, totalFetched) => {
            send({
              type: "progress",
              fetched: totalFetched,
              batch: batch.map((r) => ({
                ...r,
                date: r.date instanceof Date ? r.date.toISOString() : r.date,
              })),
            });
          },
        });

        send({
          type: "done",
          app: result.app,
          total: result.reviews.length,
        });
      } catch (error) {
        console.error("Stream error:", error);
        send({ type: "error", message: "Failed to fetch reviews" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
