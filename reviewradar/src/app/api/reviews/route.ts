import { NextRequest, NextResponse } from "next/server";
import { scrapeReviews } from "@/lib/scraper";

/**
 * GET /api/reviews?appId=xxx&store=GOOGLE_PLAY&num=500
 * Fetches raw reviews for an app (no DB, no auth).
 */
export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("appId");
  const store = req.nextUrl.searchParams.get("store") as "GOOGLE_PLAY" | "APP_STORE" | null;
  const num = Math.min(parseInt(req.nextUrl.searchParams.get("num") ?? "3000", 10) || 3000, 50000);

  if (!appId || !store || !["GOOGLE_PLAY", "APP_STORE"].includes(store)) {
    return NextResponse.json(
      { error: "Missing or invalid appId and store. Use appId=xxx&store=GOOGLE_PLAY" },
      { status: 400 }
    );
  }

  try {
    const result = await scrapeReviews(appId, store, { num });
    return NextResponse.json({
      app: result.app,
      reviews: result.reviews,
      total: result.reviews.length,
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
