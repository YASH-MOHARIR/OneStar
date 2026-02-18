import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseAppUrl } from "@/lib/scraper";
import { inngest } from "@/lib/inngest/client";
import { runAnalysisCore } from "@/lib/analysis/run";
import { z } from "zod/v3";

const GUEST_USER_ID = "guest";

// Allow long-running requests when falling back to inline analysis (no Inngest)
export const maxDuration = 300;

const AnalyzeSchema = z.object({
  appUrl: z.string().url().optional(),
  storeId: z.string().optional(),
  store: z.enum(["GOOGLE_PLAY", "APP_STORE"]).optional(),
  threshold: z.number().min(1).max(5).default(3),
  timeRange: z
    .enum(["LAST_MONTH", "LAST_3_MONTHS", "LAST_6_MONTHS", "LAST_YEAR", "ALL_TIME"])
    .default("LAST_6_MONTHS"),
});

export async function POST(req: NextRequest) {
  let user = await db.user.findUnique({ where: { id: GUEST_USER_ID } });
  if (!user) {
    user = await db.user.create({
      data: {
        id: GUEST_USER_ID,
        email: "guest@local.dev",
        creditsLimit: 100,
      },
    });
  }

  if (user.plan === "FREE" && user.creditsUsed >= user.creditsLimit) {
    return NextResponse.json(
      {
        error: "Free analysis limit reached",
        upgradeRequired: true,
        creditsUsed: user.creditsUsed,
        creditsLimit: user.creditsLimit,
      },
      { status: 403 }
    );
  }

  const userId = user.id;

  const body = await req.json();
  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { appUrl, storeId, store, threshold, timeRange } = parsed.data;

  let resolvedStoreId: string;
  let resolvedStore: "GOOGLE_PLAY" | "APP_STORE";

  if (appUrl) {
    const parsedUrl = parseAppUrl(appUrl);
    if (!parsedUrl) {
      return NextResponse.json(
        { error: "Invalid app URL. Paste a Google Play or App Store link." },
        { status: 400 }
      );
    }
    resolvedStoreId = parsedUrl.appId;
    resolvedStore = parsedUrl.store;
  } else if (storeId && store) {
    resolvedStoreId = storeId;
    resolvedStore = store;
  } else {
    return NextResponse.json(
      { error: "Provide either appUrl or storeId + store" },
      { status: 400 }
    );
  }

  let app = await db.app.findUnique({
    where: { store_storeId: { store: resolvedStore, storeId: resolvedStoreId } },
  });

  if (!app) {
    const slug =
      resolvedStoreId
        .replace(/\./g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .toLowerCase() || `app-${Date.now()}`;

    app = await db.app.create({
      data: {
        store: resolvedStore,
        storeId: resolvedStoreId,
        name: resolvedStoreId,
        slug,
      },
    });
  }

  const analysis = await db.analysis.create({
    data: {
      appId: app.id,
      userId,
      threshold,
      timeRange,
      status: "PENDING",
      shareId: (await import("nanoid")).nanoid(10),
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { creditsUsed: { increment: 1 } },
  });

  try {
    await inngest.send({
      name: "analysis/run",
      data: {
        analysisId: analysis.id,
        appId: app.id,
        storeId: resolvedStoreId,
        store: resolvedStore,
        threshold,
        timeRange,
      },
    });
    return NextResponse.json({
      analysisId: analysis.id,
      status: "PENDING",
      message: "Analysis started. Poll /api/report/{id} for results.",
    });
  } catch (err) {
    // Inngest not configured (401, missing keys) - run analysis inline
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401") && !msg.includes("Event key") && !msg.includes("signing key")) {
      throw err;
    }
    await runAnalysisCore({
      analysisId: analysis.id,
      storeId: resolvedStoreId,
      store: resolvedStore,
      threshold,
      timeRange,
    });
    const updated = await db.analysis.findUnique({
      where: { id: analysis.id },
    });
    return NextResponse.json({
      analysisId: analysis.id,
      status: updated?.status ?? "COMPLETE",
      message: "Analysis completed (ran inline - Inngest not configured).",
    });
  }
}
