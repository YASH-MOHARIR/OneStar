"use client";

import { useState, useRef } from "react";
import Image from "next/image";

function parseAppUrl(url: string): { store: "GOOGLE_PLAY" | "APP_STORE"; appId: string } | null {
  try {
    if (url.includes("play.google.com")) {
      const parsed = new URL(url);
      const id = parsed.searchParams.get("id");
      return id ? { store: "GOOGLE_PLAY", appId: id } : null;
    }
    if (url.includes("apps.apple.com")) {
      const match = url.match(/\/id(\d+)/);
      return match ? { store: "APP_STORE", appId: match[1]! } : null;
    }
  } catch {}
  return null;
}

interface SearchResult {
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  name: string;
  iconUrl: string;
  rating: number;
  developer: string;
  url?: string;
}

interface Review {
  storeReviewId: string;
  score: number;
  title?: string;
  text: string;
  userName?: string;
  date: string;
  version?: string;
  thumbsUp?: number;
}

// Claymorphism card style
const clayCard =
  "rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_32px_rgba(31,38,135,0.1)] hover:shadow-[0_12px_40px_rgba(31,38,135,0.12)] transition-shadow";

export default function AnalyzePage() {
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<SearchResult | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [appInfo, setAppInfo] = useState<{ name: string; iconUrl?: string; totalRatings?: number } | null>(null);
  const [starFilter, setStarFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState<"idle" | "search" | "reviews">("idle");
  const [progress, setProgress] = useState<{ fetched: number; totalEstimate: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isUrl = (s: string) =>
    s.includes("play.google.com") || s.includes("apps.apple.com");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setError(null);

    if (isUrl(input.trim())) {
      const parsed = parseAppUrl(input.trim());
      if (parsed) {
        setSelectedApp({
          storeId: parsed.appId,
          store: parsed.store,
          name: "Loading...",
          iconUrl: "",
          rating: 0,
          developer: "",
        });
        setSearchResults([]);
        void fetchReviewsStreaming(parsed.appId, parsed.store);
        return;
      }
      setError("Invalid app URL");
      return;
    }

    setLoading("search");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(input.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchResults(data.results ?? []);
      setSelectedApp(null);
      setReviews([]);
      setAppInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading("idle");
    }
  };

  const fetchReviewsStreaming = async (appId: string, store: "GOOGLE_PLAY" | "APP_STORE") => {
    setLoading("reviews");
    setError(null);
    setProgress(null);
    setReviews([]);
    setAppInfo(null);

    abortRef.current = new AbortController();

    try {
      const appInfoRes = await fetch(
        `/api/app-info?appId=${encodeURIComponent(appId)}&store=${store}`
      );
      const appData = await appInfoRes.json();
      if (!appInfoRes.ok) throw new Error(appData.error || "Failed to fetch app info");

      const totalEstimate = appData.totalRatings ?? 10000;
      setAppInfo({
        name: appData.name ?? "App",
        iconUrl: appData.iconUrl,
        totalRatings: totalEstimate,
      });
      setProgress({ fetched: 0, totalEstimate });

      const streamUrl = `/api/reviews/stream?appId=${encodeURIComponent(appId)}&store=${store}&num=50000`;
      const res = await fetch(streamUrl, { signal: abortRef.current.signal });

      if (!res.ok || !res.body) throw new Error("Failed to start stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const accumulatedReviews: Review[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                const batch = (data.batch ?? []).map((r: Review) => ({
                  ...r,
                  date: r.date ?? new Date().toISOString(),
                }));
                accumulatedReviews.push(...batch);
                setProgress({ fetched: data.fetched, totalEstimate });
                setReviews([...accumulatedReviews]);
              } else if (data.type === "done") {
                setAppInfo((prev) =>
                  prev ? { ...prev, name: data.app?.name ?? prev.name, iconUrl: data.app?.iconUrl } : prev
                );
                setProgress(null);
              } else if (data.type === "error") {
                throw new Error(data.message ?? "Stream error");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      setProgress(null);
      if (selectedApp?.storeId === appId) {
        setSelectedApp((prev) =>
          prev ? { ...prev, name: appData.name ?? prev.name } : null
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
      setProgress(null);
    } finally {
      setLoading("idle");
    }
  };

  const handleSelectApp = (app: SearchResult) => {
    setSelectedApp(app);
    void fetchReviewsStreaming(app.storeId, app.store);
  };

  const filteredReviews =
    starFilter === "all"
      ? reviews
      : reviews.filter((r) => r.score === starFilter);

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: reviews.filter((r) => r.score === s).length,
  }));

  const progressPercent =
    progress && progress.totalEstimate > 0
      ? Math.min(100, (progress.fetched / progress.totalEstimate) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Review Analyzer</h1>
        <p className="mt-1 text-slate-600">
          Search for an app or paste a Google Play / App Store URL to fetch all reviews
        </p>
      </div>

      <div className={`p-6 ${clayCard}`}>
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Health Connect or https://play.google.com/store/apps/details?id=..."
            className="flex-1 rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 text-slate-800 placeholder-slate-500 shadow-inner backdrop-blur-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading !== "idle"}
            className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-600 disabled:opacity-50"
          >
            {loading === "search" ? "Searching..." : loading === "reviews" ? "Fetching..." : "Go"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {progress && (
        <div className={`p-6 ${clayCard}`}>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-slate-800">
              Fetching reviews...
            </span>
            <span className="text-slate-600">
              {progress.fetched.toLocaleString()} / ~{progress.totalEstimate.toLocaleString()}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            This may take a few minutes for apps with many reviews. Progress updates in real time.
          </p>
        </div>
      )}

      {searchResults.length > 0 && !selectedApp && (
        <div className={`p-6 ${clayCard}`}>
          <h2 className="mb-4 font-semibold text-slate-800">Select an app</h2>
          <div className="space-y-3">
            {searchResults.map((app, i) => (
              <button
                key={`${app.storeId}-${i}`}
                onClick={() => handleSelectApp(app)}
                className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition ${clayCard} hover:scale-[1.01]`}
              >
                {app.iconUrl && (
                  <Image
                    src={app.iconUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-xl"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{app.name}</div>
                  <div className="text-sm text-slate-600">{app.developer}</div>
                </div>
                <div className="text-sm text-slate-500">{app.store.replace("_", " ")}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && appInfo && !progress && (
        <>
          <div className={`flex flex-wrap items-center gap-4 p-6 ${clayCard}`}>
            {appInfo.iconUrl && (
              <Image
                src={appInfo.iconUrl}
                alt=""
                width={64}
                height={64}
                className="rounded-2xl"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{appInfo.name}</h2>
              <p className="text-slate-600">{reviews.length.toLocaleString()} reviews loaded</p>
            </div>
          </div>

          <div className={`p-6 ${clayCard}`}>
            <h3 className="mb-4 font-semibold text-slate-800">Star filter</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStarFilter("all")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  starFilter === "all"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-white/60 text-slate-700 hover:bg-white/80"
                }`}
              >
                All
              </button>
              {starCounts.map(({ stars, count }) => (
                <button
                  key={stars}
                  onClick={() => setStarFilter(stars)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    starFilter === stars
                      ? "bg-amber-400 text-amber-900 shadow-md"
                      : "bg-white/60 text-slate-700 hover:bg-white/80"
                  }`}
                >
                  {"★".repeat(stars)} ({count.toLocaleString()})
                </button>
              ))}
            </div>
          </div>

          <div className={`p-6 ${clayCard}`}>
            <h3 className="mb-4 font-semibold text-slate-800">
              Reviews ({filteredReviews.length.toLocaleString()})
            </h3>
            <div className="max-h-[600px] space-y-4 overflow-y-auto">
              {filteredReviews.map((r, i) => (
                <div
                  key={r.storeReviewId || i}
                  className="rounded-xl border border-white/80 bg-white/50 p-4 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-amber-500">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span>
                    {r.userName && (
                      <span className="text-sm text-slate-500">{r.userName}</span>
                    )}
                  </div>
                  {r.title && (
                    <div className="mb-1 font-medium text-slate-800">{r.title}</div>
                  )}
                  <p className="text-slate-700">{r.text}</p>
                  {r.date && (
                    <div className="mt-2 text-xs text-slate-500">
                      {new Date(r.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
