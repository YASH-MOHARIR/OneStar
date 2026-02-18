"use client";

interface AnalysisStatsProps {
  totalRatings: number | null;
  totalReviews: number | null;
  negativeReviews: number | null;
  categoriesFound: number;
  processingTimeSeconds: number | null;
  threshold?: number;
}

const clayCard =
  "rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_32px_rgba(31,38,135,0.1)]";

export function AnalysisStats({
  totalRatings,
  totalReviews,
  negativeReviews,
  categoriesFound,
  processingTimeSeconds,
  threshold = 3,
}: AnalysisStatsProps) {
  const writtenPct =
    totalRatings != null &&
    totalReviews != null &&
    totalRatings > 0
      ? ((totalReviews / totalRatings) * 100).toFixed(1)
      : null;

  return (
    <div className={`p-6 ${clayCard}`}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
        📊 Analysis Summary
      </h2>
      <div className="space-y-3 text-sm">
        {totalRatings != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">Total ratings</span>
            <span className="font-medium text-slate-800">
              {totalRatings.toLocaleString()}
            </span>
          </div>
        )}
        {totalReviews != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">Written reviews</span>
            <span className="font-medium text-slate-800">
              {totalReviews.toLocaleString()}
              {writtenPct != null && (
                <span className="ml-2 text-slate-500">({writtenPct}%)</span>
              )}
            </span>
          </div>
        )}
        {negativeReviews != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">Negative reviews</span>
            <span className="font-medium text-slate-800">
              {negativeReviews.toLocaleString()} (≤{threshold} stars)
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600">Categories found</span>
          <span className="font-medium text-slate-800">{categoriesFound}</span>
        </div>
        {processingTimeSeconds != null && (
          <div className="flex justify-between">
            <span className="text-slate-600">Analysis time</span>
            <span className="font-medium text-slate-800">
              {processingTimeSeconds}s
            </span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50/80 p-3 text-xs text-slate-600">
        <span className="mt-0.5" title="Info">
          ℹ️
        </span>
        <p>
          Most users rate without writing a review. We analyze all available
          written reviews to find patterns.
        </p>
      </div>
    </div>
  );
}
