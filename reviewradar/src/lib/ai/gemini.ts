import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ComplaintCategoryResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/**
 * Send a categorization request to Gemini.
 */
export async function categorizeBatchGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<ComplaintCategoryResult[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent({
    contents: [
      { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
    ],
  });

  const text = result.response.text();

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
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
    console.error("Failed to parse Gemini response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
