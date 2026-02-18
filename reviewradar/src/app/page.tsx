import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 dark:from-slate-950 dark:to-slate-900">
      <main className="mx-auto max-w-3xl text-center">
        <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
          ReviewRadar
        </h1>
        <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">
          AI-powered app review analysis for Google Play & App Store
        </p>
        <p className="mt-2 text-slate-500 dark:text-slate-500">
          Scrape reviews, categorize complaints, and surface actionable insights
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Get Started
          </Link>
          <Link
            href="/api/search?q=spotify"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Try Search API
          </Link>
        </div>
        <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">Scrape</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Fetch reviews from Google Play and App Store
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">Categorize</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              LLM-powered complaint extraction and clustering
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">Insights</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ranked by severity with sample reviews
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
