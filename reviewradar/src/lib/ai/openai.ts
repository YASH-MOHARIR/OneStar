import OpenAI from "openai";
import type { ComplaintCategoryResult } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

/**
 * Fallback: Send a categorization request to GPT-4o Mini.
 */
export async function categorizeBatchOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<ComplaintCategoryResult[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "[]";

  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : parsed.categories ?? [];
    return arr.map((c: Record<string, unknown>) => ({
      category: String(c.category ?? ""),
      parentCategory: String(c.parent_category ?? c.parentCategory ?? ""),
      count: Number(c.count ?? 0),
      severity: ["critical", "high", "medium", "low"].includes(String(c.severity))
        ? (c.severity as "critical" | "high" | "medium" | "low")
        : "medium",
      sampleReviews: Array.isArray(c.sample_reviews)
        ? c.sample_reviews.map(String)
        : Array.isArray(c.sampleReviews)
          ? c.sampleReviews.map(String)
          : [],
    }));
  } catch (error) {
    console.error("Failed to parse OpenAI response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
