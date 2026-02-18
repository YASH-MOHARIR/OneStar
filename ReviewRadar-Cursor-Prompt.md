# ReviewRadar — Cursor Prompt

> **Apply on top of ReviewRadar-Cursor-Spec.md.** This document adds critical context about app store data, scraping strategy, and trust-building UI.

---

## 1. CRITICAL CONTEXT (Read before building anything)

**Ratings ≠ Reviews.** When Google Play shows "10,000 ratings," ~97-99% are star-only taps with NO text. An app with 10k ratings typically has only 500-1,500 written reviews. The scraper only fetches written reviews — this is correct behavior, not a bug. The total ratings number (the big one on the Play Store page) and the written review count must be tracked and displayed separately.

**Google Play caps review access at ~5,000-6,000 unique results** per pagination stream. After that, tokens recycle the same reviews silently. We detect this and stop.

**Sort by RATING, never by relevance.** Google's "Most Relevant" is personalized to the viewer and mixes star levels unpredictably. Sorting by RATING (lowest first) ensures we get the most negative reviews first — exactly what we need. This is hardcoded, not user-configurable.

**This ceiling is not a product limitation.** Complaint patterns emerge within 500-2,000 reviews. More data doesn't change the rankings.

---

## 2. Scraper Strategy

- **Sort**: Always RATING (lowest first). Not configurable.
- **Deduplication**: By `storeReviewId`. Track `duplicatesDetected` when IDs recycle.
- **Stop conditions**: `target_reached`, `no_more_results`, `recycling_detected`, or `error`.
- **scrapeMeta**: Return `totalFetched`, `uniqueCount`, `duplicatesDetected`, `stoppedReason` with every scrape result.

---

## 3. Report & Progress UI

**Analysis Stats Component**: Show `totalRatings` vs `totalReviews` vs `negativeReviews` with written-review percentage. Include info tooltip: "Most users just tap a star rating without writing text. We analyze all available written reviews to surface complaint patterns."

**Progress Stages** (when polling `/api/report/{id}`):
1. "Scraping reviews..."
2. "Found X written reviews (out of Y total ratings)"
3. "Filtered Z negative reviews (≤N stars)"
4. "AI categorizing complaints..."
5. "Done! N categories found in X seconds."

---

## 4. Data Flow

| Field | Source |
|-------|--------|
| `totalRatings` | `scrapeResult.app.totalRatings` (store page number) |
| `totalReviews` | `scrapeResult.scrapeMeta.uniqueCount` (written reviews fetched) |
| `negativeReviews` | Filtered by threshold (≤N stars) |

---

## Summary of Implementation

| What | Change |
|------|--------|
| Scraper sort | Hardcoded to RATING (lowest first). Removed from options. |
| ScrapeResult | Added `scrapeMeta` object tracking dupes and stop reason |
| Analysis model | Added `totalRatings` field (separate from `totalReviews`) |
| ReportResponse | Added `totalRatings` + `scrapeMeta` |
| Report page | New `analysis-stats.tsx` component showing ratings vs reviews |
| Progress screen | Shows "X written reviews (out of Y total ratings)" during analysis |
| Future features | Parked in `FUTURE_FEATURES.md`, not built during MVP |
