"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnalysisStats } from "@/components/report/analysis-stats";
import type { ReportResponse } from "@/types";

const clayCard =
  "rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_32px_rgba(31,38,135,0.1)]";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-blue-100 text-blue-800",
};

function getProgressMessage(data: ReportResponse, threshold: number): string {
  const { analysis } = data;
  switch (analysis.status) {
    case "PENDING":
      return "Starting analysis...";
    case "SCRAPING":
      return "Scraping reviews...";
    case "ANALYZING": {
      const tr = analysis.totalReviews ?? 0;
      const tot = analysis.totalRatings ?? 0;
      const neg = analysis.negativeReviews ?? 0;
      if (tot > 0) {
        return `Found ${tr.toLocaleString()} written reviews (out of ${tot.toLocaleString()} total ratings). Filtered ${neg.toLocaleString()} negative reviews (≤${threshold} stars). AI categorizing complaints...`;
      }
      return `Filtered ${neg.toLocaleString()} negative reviews (≤${threshold} stars). AI categorizing complaints...`;
    }
    case "COMPLETE": {
      const cats = (data as ReportResponse & { complaints: unknown[] }).complaints?.length ?? 0;
      const sec = analysis.processingTime ?? 0;
      return `Done! ${cats} categories found in ${sec} seconds.`;
    }
    case "FAILED":
      return "Analysis failed. Please try again.";
    default:
      return "Processing...";
  }
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threshold = 3;

  useEffect(() => {
    if (!id) return;

    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/report/${id}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to load report");
          return;
        }
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      }
    };

    fetchReport();
    const interval = setInterval(fetchReport, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (data?.analysis?.status === "COMPLETE") {
      router.prefetch(`/report/${id}`);
    }
  }, [data?.analysis?.status, id, router]);

  if (error) {
    return (
      <div className={`p-6 ${clayCard}`}>
        <p className="text-red-600">{error}</p>
        <a href="/analyze" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to Analyze
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`p-6 ${clayCard}`}>
        <p className="text-slate-600">Loading report...</p>
      </div>
    );
  }

  const { analysis, app, complaints } = data;
  const isComplete = analysis.status === "COMPLETE";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analysis Report</h1>
        <p className="mt-1 text-slate-600">
          {app.name} — {app.store.replace("_", " ")}
        </p>
      </div>

      {!isComplete && (
        <div className={`p-6 ${clayCard}`}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="font-medium text-slate-800">
              {getProgressMessage(data, threshold)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{
                width:
                  analysis.status === "SCRAPING"
                    ? "25%"
                    : analysis.status === "ANALYZING"
                      ? "75%"
                      : "100%",
              }}
            />
          </div>
        </div>
      )}

      {isComplete && (
        <>
          <div className={`flex items-center gap-4 p-6 ${clayCard}`}>
            {app.iconUrl && (
              <Image
                src={app.iconUrl}
                alt=""
                width={64}
                height={64}
                className="rounded-2xl"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{app.name}</h2>
              <p className="text-slate-600">
                {app.store.replace("_", " ")}
              {app.category != null && ` • ${app.category}`}
              </p>
            </div>
          </div>

          <AnalysisStats
            totalRatings={analysis.totalRatings ?? app.totalRatings ?? null}
            totalReviews={analysis.totalReviews}
            negativeReviews={analysis.negativeReviews}
            categoriesFound={complaints?.length ?? 0}
            processingTimeSeconds={analysis.processingTime}
            threshold={threshold}
          />

          {complaints && complaints.length > 0 && (
            <div className={`p-6 ${clayCard}`}>
              <h3 className="mb-4 font-semibold text-slate-800">
                Complaint Categories
              </h3>
              <div className="space-y-4">
                {complaints.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/80 bg-white/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        #{c.rank} {c.category}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          SEVERITY_COLORS[c.severity] ?? "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {c.severity}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                      <span>{c.count} reviews</span>
                      <span>•</span>
                      <span>{c.percentage.toFixed(1)}%</span>
                    </div>
                    {c.sampleReviews?.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm text-slate-700">
                        {c.sampleReviews.slice(0, 2).map((s, j) => (
                          <p key={j} className="italic">&quot;{s}&quot;</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
