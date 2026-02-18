"use client";

import { useState } from "react";

export default function AnalyzePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Analyze an App</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        Search for an app or paste a Google Play / App Store URL
      </p>
      <div className="mt-6 flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="e.g. Spotify or https://play.google.com/..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="font-semibold">Results</h2>
          {(results as { name?: string; store?: string; developer?: string }[]).map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              {r.name} ({r.store}) — {r.developer}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
