export const SYSTEM_PROMPT = `You are a product analyst specializing in app review analysis.
Given a batch of negative app reviews, extract and categorize the complaints.

For each complaint category, return a JSON object with:
- category: Short, specific label (e.g., "App crashes on launch", "Search not returning results")
- parent_category: Broader group (e.g., "Performance", "UX", "Features", "Content", "Billing")
- count: How many reviews in THIS BATCH mention this complaint
- severity: "critical" | "high" | "medium" | "low"
  - critical: App is unusable (crashes, data loss, can't login)
  - high: Core feature broken (main functionality doesn't work)
  - medium: Significant annoyance (poor UX, missing features)
  - low: Minor issues (visual bugs, nice-to-haves)
- sample_reviews: 2-3 representative excerpts (max 100 chars each, copied from the reviews)

RULES:
- Merge similar complaints into ONE category (e.g., "crashes", "keeps closing", "force stops" = "App crashes")
- A single review CAN belong to multiple categories
- Ignore reviews with no text or only emojis
- Ignore generic complaints like "bad app" or "doesn't work" unless they describe a specific issue
- Focus on ACTIONABLE, FIXABLE issues the developer could address
- Return a valid JSON array ONLY — no markdown, no explanation, no code fences

PARENT CATEGORIES (use these or create new ones if needed):
- Performance (crashes, slow, freezing, battery drain)
- UX/Design (confusing UI, navigation issues, layout problems)
- Features (missing features, broken features, feature requests)
- Content (wrong results, poor recommendations, missing content)
- Billing (subscription issues, charges, refund problems)
- Ads (too many ads, intrusive ads, irrelevant ads)
- Account (login issues, data sync, profile problems)
- Compatibility (device-specific issues, OS version problems)
- Audio/Video (playback issues, quality problems, streaming)
- Notifications (too many, missing, notification bugs)`;

export function buildBatchPrompt(
  appName: string,
  platform: string,
  category: string,
  reviews: { score: number; text: string }[],
  batchNumber: number,
  totalBatches: number
): string {
  const reviewLines = reviews
    .map((r, i) => `[${i + 1}] ★${r.score} — "${r.text}"`)
    .join("\n");

  return `App: ${appName} (${platform})
Category: ${category}
Batch: ${batchNumber}/${totalBatches}
Reviews (${reviews.length}):

${reviewLines}

Analyze these reviews and return categorized complaints as a JSON array.`;
}

export const MERGE_PROMPT = `You are merging complaint categories from multiple batches of the same app's reviews.

You will receive multiple JSON arrays of complaint categories from different batches.
Your job is to:
1. MERGE duplicate/similar categories into one (e.g., "App crashes" and "Crashes on startup" = one category)
2. SUM the counts from merged categories
3. Recalculate severity based on the merged count (higher count = higher severity)
4. Keep the best 2-3 sample_reviews from across batches
5. RANK results by count (highest first)
6. Return a single JSON array with the consolidated results

Return valid JSON array ONLY — no markdown, no explanation, no code fences.`;
