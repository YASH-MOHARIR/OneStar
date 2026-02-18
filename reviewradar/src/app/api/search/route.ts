import { NextRequest, NextResponse } from "next/server";
import { searchApps } from "@/lib/scraper";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const store = req.nextUrl.searchParams.get("store") as
    | "GOOGLE_PLAY"
    | "APP_STORE"
    | null;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchApps(query, store ?? undefined);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search apps" },
      { status: 500 }
    );
  }
}
