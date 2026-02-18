import { SYSTEM_PROMPT, buildBatchPrompt, MERGE_PROMPT } from "./prompts";
import { categorizeBatchGemini } from "./gemini";
import { categorizeBatchOpenAI } from "./openai";
import type {
  ComplaintCategoryResult,
  MergedCategorizationResult,
} from "@/types";

const BATCH_SIZE = 50;

interface CategorizeOptions {
  appName: string;
  platform: string;
  category: string;
  reviews: { score: number; text: string }[];
  onProgress?: (stage: string, progress: number) => void;
}

/**
 * Main categorization pipeline.
 */
export async function categorizeReviews(
  options: CategorizeOptions
): Promise<MergedCategorizationResult> {
  const { appName, platform, category, reviews, onProgress } = options;

  if (reviews.length === 0) {
    return { categories: [], totalReviewsAnalyzed: 0, totalNegativeReviews: 0 };
  }

  const batches: { score: number; text: string }[][] = [];
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    batches.push(reviews.slice(i, i + BATCH_SIZE));
  }

  const allBatchResults: ComplaintCategoryResult[][] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const userPrompt = buildBatchPrompt(
      appName,
      platform,
      category,
      batch,
      i + 1,
      batches.length
    );

    onProgress?.("analyzing", ((i + 1) / batches.length) * 80);

    try {
      const result = await categorizeBatchGemini(SYSTEM_PROMPT, userPrompt);
      allBatchResults.push(result);
    } catch {
      try {
        const result = await categorizeBatchOpenAI(SYSTEM_PROMPT, userPrompt);
        allBatchResults.push(result);
      } catch {
        // Skip this batch
      }
    }

    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  onProgress?.("merging", 85);

  if (allBatchResults.length === 0) {
    return {
      categories: [],
      totalReviewsAnalyzed: reviews.length,
      totalNegativeReviews: reviews.length,
    };
  }

  if (allBatchResults.length === 1) {
    const ranked = rankCategories(allBatchResults[0]!, reviews.length);
    return {
      categories: ranked,
      totalReviewsAnalyzed: reviews.length,
      totalNegativeReviews: reviews.length,
    };
  }

  const mergePrompt = `Here are complaint categories from ${allBatchResults.length} batches analyzing ${reviews.length} total negative reviews of "${appName}":

${allBatchResults.map((batch, i) => `Batch ${i + 1}:\n${JSON.stringify(batch, null, 2)}`).join("\n\n")}

Merge these into a single consolidated list. Total negative reviews analyzed: ${reviews.length}.`;

  let merged: ComplaintCategoryResult[];

  try {
    merged = await categorizeBatchGemini(MERGE_PROMPT, mergePrompt);
  } catch {
    try {
      merged = await categorizeBatchOpenAI(MERGE_PROMPT, mergePrompt);
    } catch {
      merged = manualMerge(allBatchResults);
    }
  }

  onProgress?.("complete", 100);

  const ranked = rankCategories(merged, reviews.length);
  return {
    categories: ranked,
    totalReviewsAnalyzed: reviews.length,
    totalNegativeReviews: reviews.length,
  };
}

function rankCategories(
  categories: ComplaintCategoryResult[],
  totalReviews: number
): ComplaintCategoryResult[] {
  return categories
    .sort((a, b) => b.count - a.count)
    .map((cat, index) => ({
      ...cat,
      percentage: Math.round((cat.count / totalReviews) * 10000) / 100,
      rank: index + 1,
    }));
}

function manualMerge(
  batchResults: ComplaintCategoryResult[][]
): ComplaintCategoryResult[] {
  const merged = new Map<string, ComplaintCategoryResult & { count: number }>();

  for (const batch of batchResults) {
    for (const cat of batch) {
      const key = cat.category.toLowerCase().trim();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.count += cat.count;
        const allSamples = [...existing.sampleReviews, ...cat.sampleReviews];
        existing.sampleReviews = allSamples.slice(0, 3);
      } else {
        merged.set(key, { ...cat });
      }
    }
  }

  return Array.from(merged.values());
}
