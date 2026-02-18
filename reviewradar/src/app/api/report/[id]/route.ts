import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysisId = parseInt(id, 10);

  if (isNaN(analysisId)) {
    return NextResponse.json({ error: "Invalid analysis ID" }, { status: 400 });
  }

  const analysis = await db.analysis.findUnique({
    where: { id: analysisId },
    include: {
      app: true,
      complaints: { orderBy: { rank: "asc" } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  if (analysis.status !== "COMPLETE") {
    return NextResponse.json({
      analysis: {
        id: analysis.id,
        status: analysis.status,
        totalReviews: analysis.totalReviews,
        negativeReviews: analysis.negativeReviews,
      },
      app: {
        name: analysis.app.name,
        store: analysis.app.store,
        iconUrl: analysis.app.iconUrl,
      },
      complaints: [],
    });
  }

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      status: analysis.status,
      totalReviews: analysis.totalReviews,
      negativeReviews: analysis.negativeReviews,
      processingTime: analysis.processingTime,
      createdAt: analysis.createdAt.toISOString(),
      shareId: analysis.shareId,
    },
    app: {
      name: analysis.app.name,
      store: analysis.app.store,
      iconUrl: analysis.app.iconUrl,
      rating: analysis.app.rating,
      totalRatings: analysis.app.totalRatings,
      category: analysis.app.category,
      developer: analysis.app.developer,
      slug: analysis.app.slug,
    },
    complaints: analysis.complaints.map((c) => ({
      category: c.category,
      parentCategory: c.parentCategory,
      count: c.count,
      percentage: c.percentage,
      severity: c.severity,
      sampleReviews: c.sampleReviews,
      rank: c.rank,
      trending: c.trending,
    })),
  });
}
