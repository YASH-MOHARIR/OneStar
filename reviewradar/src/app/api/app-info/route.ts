import { NextRequest, NextResponse } from "next/server";
import { getGooglePlayApp } from "@/lib/scraper/google-play";
import { getAppStoreApp } from "@/lib/scraper/app-store";

/**
 * GET /api/app-info?appId=xxx&store=GOOGLE_PLAY
 * Returns app details including totalRatings (estimated max reviews for progress).
 */
export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("appId");
  const store = req.nextUrl.searchParams.get("store") as "GOOGLE_PLAY" | "APP_STORE" | null;

  if (!appId || !store || !["GOOGLE_PLAY", "APP_STORE"].includes(store)) {
    return NextResponse.json(
      { error: "Missing appId and store" },
      { status: 400 }
    );
  }

  try {
    const app =
      store === "GOOGLE_PLAY"
        ? await getGooglePlayApp(appId)
        : await getAppStoreApp(appId);

    return NextResponse.json({
      name: app.name,
      iconUrl: app.iconUrl,
      totalRatings: app.totalRatings ?? 0,
      rating: app.rating,
      developer: app.developer,
    });
  } catch (error) {
    console.error("App info error:", error);
    return NextResponse.json(
      { error: "Failed to fetch app info" },
      { status: 500 }
    );
  }
}
