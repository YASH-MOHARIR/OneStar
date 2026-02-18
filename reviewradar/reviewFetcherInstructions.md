# ReviewRadar — Cursor Build Prompt

## What You're Building

ReviewRadar is a SaaS web app where users paste an app store link (or search by name), and the app scrapes negative reviews, sends them to an LLM, and returns ranked complaint categories. Think "What's broken in this app?" — answered in 60 seconds.

**Two audiences:**
1. App owners — "What are my users complaining about?"
2. Builders/entrepreneurs — "What's broken in this market? What should I build?"

---

## Tech Stack (Use exactly these. Do not substitute.)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) with TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Clerk |
| Payments | Stripe |
| Charts | Recharts |
| State | Zustand |
| LLM (primary) | Gemini 2.5 Flash via `@google/generative-ai` |
| LLM (fallback) | GPT-4o Mini via `openai` |
| Scraping | `google-play-scraper` (npm) for Google Play, `app-store-scraper` (npm) for Apple |
| Background Jobs | Inngest |
| Caching | Upstash Redis |
| PDF Export | `@react-pdf/renderer` |
| Email | Resend |
| Analytics | PostHog |
| Validation | Zod |
| Hosting | Vercel |

---

## Build Order (Follow sequentially. Each step depends on the previous.)

### Step 1: Project Setup

```bash
npx create-next-app@latest reviewradar --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd reviewradar
```

Install all dependencies:

```bash
# Core
npm install prisma @prisma/client
npm install google-play-scraper
npm install app-store-scraper
npm install @google/generative-ai
npm install openai

# Auth
npm install @clerk/nextjs

# Payments
npm install stripe @stripe/stripe-js

# State & Data
npm install zustand swr

# UI & Charts
npm install recharts lucide-react clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install @radix-ui/react-tooltip @radix-ui/react-accordion
npm install framer-motion

# Background Jobs
npm install inngest

# Caching
npm install @upstash/redis @upstash/ratelimit

# PDF, Email, SEO
npm install @react-pdf/renderer resend next-sitemap

# Analytics
npm install posthog-js

# Utils
npm install zod date-fns nanoid

# Dev
npm install -D @types/app-store-scraper prisma
```

Create `.env.local`:
```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# LLM
GEMINI_API_KEY=""
OPENAI_API_KEY=""

# Stripe
STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_STARTER_PRICE_ID=""
STRIPE_PRO_PRICE_ID=""
STRIPE_TEAM_PRICE_ID=""

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Inngest
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# Email (Resend)
RESEND_API_KEY=""

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ReviewRadar"
```

Configure `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "play-lh.googleusercontent.com" },
      { protocol: "https", hostname: "is1-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is2-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is3-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is4-ssl.mzstatic.com" },
      { protocol: "https", hostname: "is5-ssl.mzstatic.com" },
    ],
  },
};

export default nextConfig;
```

Extend `tailwind.config.ts` with brand colors:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
          800: "#1e40af", 900: "#1e3a8a", 950: "#172554",
        },
        severity: {
          critical: "#ef4444",
          high: "#f97316",
          medium: "#eab308",
          low: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### Step 2: Folder Structure

Create this exact structure:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # Landing page
│   ├── globals.css
│   ├── sitemap.ts
│   │
│   ├── (marketing)/
│   │   ├── pricing/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   └── apps/
│   │       ├── page.tsx                 # Browse analyzed apps
│   │       ├── [slug]/page.tsx          # Public app analysis (SEO page)
│   │       └── [slug]/vs/[compareSlug]/page.tsx
│   │
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # Dashboard shell (sidebar + nav)
│   │   ├── dashboard/page.tsx           # User home
│   │   ├── analyze/page.tsx             # Search/paste + trigger analysis
│   │   ├── report/[id]/page.tsx         # Full report view
│   │   ├── history/page.tsx             # Past analyses
│   │   └── settings/page.tsx            # Account + billing
│   │
│   └── api/
│       ├── analyze/route.ts             # POST: start analysis
│       ├── search/route.ts              # GET: search apps
│       ├── report/[id]/route.ts         # GET: fetch report
│       ├── export/[id]/route.ts         # GET: PDF export
│       ├── history/route.ts             # GET: user history
│       ├── webhooks/clerk/route.ts
│       ├── webhooks/stripe/route.ts
│       └── inngest/route.ts
│
├── components/
│   ├── ui/                              # button, input, card, badge, skeleton, progress, dialog, tabs, accordion, tooltip, dropdown
│   ├── landing/                         # hero, how-it-works, features, pricing-section, faq, cta-banner
│   ├── analyze/                         # app-search-bar, app-search-results, app-card, analysis-config, analysis-progress
│   ├── report/                          # report-header, complaint-list, complaint-card, complaint-chart, severity-badge, sample-reviews, trend-chart, paywall-blur, export-button
│   ├── dashboard/                       # recent-analyses, usage-meter, quick-analyze
│   └── shared/                          # navbar, sidebar, footer, logo, upgrade-prompt
│
├── lib/
│   ├── db.ts                            # Prisma singleton
│   ├── scraper/
│   │   ├── google-play.ts
│   │   ├── app-store.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── ai/
│   │   ├── gemini.ts
│   │   ├── openai.ts
│   │   ├── prompts.ts
│   │   └── categorize.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── plans.ts
│   │   └── checkout.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions.ts
│   ├── redis.ts
│   ├── email.ts
│   ├── analytics.ts
│   ├── rate-limit.ts
│   ├── utils.ts
│   └── constants.ts
│
├── hooks/
│   ├── use-analysis.ts
│   ├── use-search.ts
│   └── use-user-plan.ts
│
├── stores/
│   └── analysis-store.ts
│
└── types/
    └── index.ts
```

---

### Step 3: Database Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id               String     @id
  email            String     @unique
  name             String?
  imageUrl         String?
  plan             Plan       @default(FREE)
  creditsUsed      Int        @default(0) @map("credits_used")
  creditsLimit     Int        @default(3) @map("credits_limit")
  creditsResetAt   DateTime?  @map("credits_reset_at")
  stripeCustomerId String?    @unique @map("stripe_customer_id")
  stripeSubId      String?    @unique @map("stripe_sub_id")
  createdAt        DateTime   @default(now()) @map("created_at")
  updatedAt        DateTime   @updatedAt @map("updated_at")
  analyses         Analysis[]
  @@map("users")
}

enum Plan { FREE STARTER PRO TEAM }

model App {
  id           Int        @id @default(autoincrement())
  store        Store
  storeId      String     @map("store_id")
  name         String
  slug         String     @unique
  iconUrl      String?    @map("icon_url")
  rating       Float?
  totalRatings Int?       @map("total_ratings")
  category     String?
  developer    String?
  url          String?
  lastScraped  DateTime?  @map("last_scraped")
  createdAt    DateTime   @default(now()) @map("created_at")
  reviews      Review[]
  analyses     Analysis[]
  @@unique([store, storeId])
  @@map("apps")
}

enum Store { GOOGLE_PLAY APP_STORE }

model Review {
  id            Int       @id @default(autoincrement())
  appId         Int       @map("app_id")
  storeReviewId String    @map("store_review_id")
  score         Int
  title         String?
  text          String?
  userName      String?   @map("user_name")
  date          DateTime?
  version       String?
  thumbsUp      Int       @default(0) @map("thumbs_up")
  scrapedAt     DateTime  @default(now()) @map("scraped_at")
  app           App       @relation(fields: [appId], references: [id], onDelete: Cascade)
  @@unique([appId, storeReviewId])
  @@index([appId, score])
  @@index([appId, date(sort: Desc)])
  @@map("reviews")
}

model Analysis {
  id              Int                  @id @default(autoincrement())
  appId           Int                  @map("app_id")
  userId          String               @map("user_id")
  status          AnalysisStatus       @default(PENDING)
  threshold       Int                  @default(3)
  timeRange       TimeRange            @default(LAST_6_MONTHS) @map("time_range")
  totalReviews    Int?                 @map("total_reviews")
  negativeReviews Int?                 @map("negative_reviews")
  processingTime  Int?                 @map("processing_time")
  shareId         String?              @unique @map("share_id")
  isPublic        Boolean              @default(true) @map("is_public")
  createdAt       DateTime             @default(now()) @map("created_at")
  completedAt     DateTime?            @map("completed_at")
  app             App                  @relation(fields: [appId], references: [id], onDelete: Cascade)
  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  complaints      ComplaintCategory[]
  @@index([userId, createdAt(sort: Desc)])
  @@index([appId, createdAt(sort: Desc)])
  @@map("analyses")
}

enum AnalysisStatus { PENDING SCRAPING ANALYZING COMPLETE FAILED }
enum TimeRange { LAST_MONTH LAST_3_MONTHS LAST_6_MONTHS LAST_YEAR ALL_TIME }

model ComplaintCategory {
  id             Int      @id @default(autoincrement())
  analysisId     Int      @map("analysis_id")
  category       String
  parentCategory String?  @map("parent_category")
  count          Int
  percentage     Float
  severity       Severity
  sampleReviews  String[] @map("sample_reviews")
  rank           Int
  trending       Trend    @default(STABLE)
  analysis       Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  @@index([analysisId, rank])
  @@map("complaint_categories")
}

enum Severity { CRITICAL HIGH MEDIUM LOW }
enum Trend { INCREASING STABLE DECREASING }
```

Then run:
```bash
npx prisma generate
npx prisma db push
```

Create `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma || new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query"] : [] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

---

### Step 4: Scraping Pipeline (Option A — Node.js, sort by rating)

**CRITICAL CONTEXT:** The `google-play-scraper` npm package has a hard ceiling of ~5,000-6,000 unique reviews before results start recycling. This is a Google backend limitation, not a library bug. BUT — for our use case, we only need negative reviews (1-3 stars). We sort by RATING (lowest first), so the first ~3,000 results are the most negative reviews. This is more than enough for AI categorization. We also deduplicate by `storeReviewId` to catch any recycled reviews.

The `app-store-scraper` npm package caps at ~500 reviews per country via Apple's RSS feed. For MVP, this is acceptable.

**`src/lib/scraper/types.ts`:**
```typescript
export interface ScrapeOptions {
  num?: number;
  sort?: "newest" | "rating" | "helpfulness";
  lang?: string;
  country?: string;
}

export interface ScrapeResult {
  app: {
    storeId: string;
    name: string;
    iconUrl: string;
    rating: number;
    totalRatings: number;
    category: string;
    developer: string;
    url: string;
  };
  reviews: {
    storeReviewId: string;
    score: number;
    title?: string;
    text: string;
    userName?: string;
    date: Date;
    version?: string;
    thumbsUp?: number;
  }[];
}
```

**`src/lib/scraper/google-play.ts`:**
```typescript
import gplay from "google-play-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

export async function searchGooglePlay(term: string, num = 10) {
  const results = await gplay.search({ term, num });
  return results.map((app) => ({
    storeId: app.appId,
    store: "GOOGLE_PLAY" as const,
    name: app.title,
    iconUrl: app.icon,
    rating: app.score,
    developer: app.developer,
    url: app.url,
  }));
}

export async function getGooglePlayApp(appId: string) {
  const app = await gplay.app({ appId });
  return {
    storeId: app.appId,
    name: app.title,
    iconUrl: app.icon,
    rating: app.score,
    totalRatings: app.ratings,
    category: app.genre,
    developer: app.developer,
    url: app.url,
  };
}

/**
 * Scrape Google Play reviews sorted by RATING (lowest first).
 * This ensures we get the most negative reviews first.
 *
 * IMPORTANT: Google Play silently recycles reviews after ~5,000-6,000 unique results.
 * We deduplicate by storeReviewId and cap at `num` unique reviews.
 * For negative review analysis, 3,000 sorted by lowest rating is more than enough.
 */
export async function scrapeGooglePlayReviews(
  appId: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, sort = "rating", lang = "en", country = "us" } = options;

  const appDetails = await getGooglePlayApp(appId);

  const uniqueReviews = new Map<string, ScrapeResult["reviews"][0]>();
  let nextToken: string | null = null;
  let emptyBatches = 0;

  while (uniqueReviews.size < num) {
    const batchSize = Math.min(150, num - uniqueReviews.size);

    const sortMap = {
      newest: gplay.sort.NEWEST,
      rating: gplay.sort.RATING,
      helpfulness: gplay.sort.HELPFULNESS,
    };

    const result = await gplay.reviews({
      appId,
      sort: sortMap[sort],
      num: batchSize,
      lang,
      country,
      paginate: true,
      nextPaginationToken: nextToken ?? undefined,
    });

    const reviews = result.data;
    if (!reviews || reviews.length === 0) break;

    let newInBatch = 0;
    for (const review of reviews) {
      if (!uniqueReviews.has(review.id)) {
        uniqueReviews.set(review.id, {
          storeReviewId: review.id,
          score: review.score,
          title: review.title || undefined,
          text: review.text || "",
          userName: review.userName || undefined,
          date: new Date(review.date),
          version: review.version || undefined,
          thumbsUp: review.thumbsUp || 0,
        });
        newInBatch++;
      }
    }

    // If we got 0 new unique reviews in a batch, Google is recycling — stop
    if (newInBatch === 0) {
      emptyBatches++;
      if (emptyBatches >= 2) break;
    } else {
      emptyBatches = 0;
    }

    nextToken = result.nextPaginationToken;
    if (!nextToken) break;

    // Rate limiting between pagination calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    app: appDetails,
    reviews: Array.from(uniqueReviews.values()),
  };
}

export function parseGooglePlayUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "play.google.com") {
      return parsed.searchParams.get("id");
    }
    return null;
  } catch {
    return null;
  }
}
```

**`src/lib/scraper/app-store.ts`:**
```typescript
import store from "app-store-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

export async function searchAppStore(term: string, num = 10) {
  const results = await store.search({ term, num, country: "us" });
  return results.map((app: any) => ({
    storeId: String(app.id),
    store: "APP_STORE" as const,
    name: app.title,
    iconUrl: app.icon,
    rating: app.score,
    developer: app.developer,
    url: app.url,
  }));
}

export async function getAppStoreApp(appId: string | number) {
  const app = await store.app({ id: Number(appId) });
  return {
    storeId: String(app.id),
    name: app.title,
    iconUrl: app.icon,
    rating: app.score,
    totalRatings: app.ratings,
    category: app.primaryGenre,
    developer: app.developer,
    url: app.url,
  };
}

/**
 * Scrape Apple App Store reviews.
 * HARD LIMIT: Apple's RSS feed caps at 500 reviews per country (10 pages x ~50).
 */
export async function scrapeAppStoreReviews(
  appId: string | number,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { sort = "newest", country = "us" } = options;

  const appDetails = await getAppStoreApp(appId);
  const allReviews: ScrapeResult["reviews"] = [];

  // Apple RSS: max 10 pages, ~50 per page = ~500 reviews
  for (let page = 1; page <= 10; page++) {
    try {
      const reviews = await store.reviews({
        id: Number(appId),
        sort: sort === "newest" ? store.sort.RECENT : store.sort.HELPFUL,
        page,
        country,
      });

      if (!reviews || reviews.length === 0) break;

      for (const review of reviews) {
        allReviews.push({
          storeReviewId: String(review.id),
          score: review.score,
          title: review.title || undefined,
          text: review.text || "",
          userName: review.userName || undefined,
          date: new Date(review.date),
          version: review.version || undefined,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      break;
    }
  }

  return { app: appDetails, reviews: allReviews };
}

export function parseAppStoreUrl(url: string): string | null {
  try {
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
```

**`src/lib/scraper/index.ts`:**
```typescript
import { searchGooglePlay, scrapeGooglePlayReviews, parseGooglePlayUrl } from "./google-play";
import { searchAppStore, scrapeAppStoreReviews, parseAppStoreUrl } from "./app-store";
import type { ScrapeOptions, ScrapeResult } from "./types";

export type { ScrapeOptions, ScrapeResult };

export function parseAppUrl(url: string): { store: "GOOGLE_PLAY" | "APP_STORE"; appId: string } | null {
  const googleId = parseGooglePlayUrl(url);
  if (googleId) return { store: "GOOGLE_PLAY", appId: googleId };
  const appleId = parseAppStoreUrl(url);
  if (appleId) return { store: "APP_STORE", appId: appleId };
  return null;
}

export async function searchApps(term: string, store?: "GOOGLE_PLAY" | "APP_STORE") {
  if (store === "GOOGLE_PLAY") return searchGooglePlay(term);
  if (store === "APP_STORE") return searchAppStore(term);
  const [google, apple] = await Promise.allSettled([searchGooglePlay(term, 5), searchAppStore(term, 5)]);
  const results = [];
  if (google.status === "fulfilled") results.push(...google.value);
  if (apple.status === "fulfilled") results.push(...apple.value);
  return results;
}

export async function scrapeReviews(appId: string, store: "GOOGLE_PLAY" | "APP_STORE", options?: ScrapeOptions): Promise<ScrapeResult> {
  if (store === "GOOGLE_PLAY") return scrapeGooglePlayReviews(appId, options);
  return scrapeAppStoreReviews(appId, options);
}

/**
 * Filter reviews to only negative ones (at or below threshold).
 * Also filters out empty reviews and very short ones (<10 chars).
 */
export function filterNegativeReviews(reviews: ScrapeResult["reviews"], threshold = 3) {
  return reviews.filter(
    (r) => r.score <= threshold && r.text && r.text.trim().length > 10
  );
}
```

---

### Step 5: LLM Categorization Pipeline

**`src/lib/ai/prompts.ts`:**
```typescript
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
- sample_reviews: 2-3 representative excerpts (max 100 chars each, copied verbatim from the reviews)

RULES:
- Merge similar complaints into ONE category (e.g., "crashes", "keeps closing", "force stops" = "App crashes")
- A single review CAN belong to multiple categories
- Ignore reviews with no actionable content (just "bad app" or emojis)
- Focus on ACTIONABLE, FIXABLE issues the developer could address
- Return a valid JSON array ONLY — no markdown, no explanation, no code fences

PARENT CATEGORIES (use these or create similar):
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
```

**`src/lib/ai/gemini.ts`:**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ComplaintCategoryResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function categorizeBatchGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<ComplaintCategoryResult[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-20",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
  });

  const text = result.response.text();
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed.categories || [];
  } catch {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
```

**`src/lib/ai/openai.ts`:**
```typescript
import OpenAI from "openai";
import type { ComplaintCategoryResult } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

  const text = response.choices[0]?.message?.content || "[]";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.categories || [];
  } catch {
    console.error("Failed to parse OpenAI response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
```

**`src/lib/ai/categorize.ts`:**
```typescript
import { SYSTEM_PROMPT, buildBatchPrompt, MERGE_PROMPT } from "./prompts";
import { categorizeBatchGemini } from "./gemini";
import { categorizeBatchOpenAI } from "./openai";
import type { ComplaintCategoryResult, MergedCategorizationResult } from "@/types";

const BATCH_SIZE = 50;

interface CategorizeOptions {
  appName: string;
  platform: string;
  category: string;
  reviews: { score: number; text: string }[];
}

/**
 * Main categorization pipeline:
 * 1. Split reviews into batches of 50
 * 2. Send each batch to Gemini (fallback: OpenAI)
 * 3. Merge all batch results into consolidated categories
 * 4. Rank by count
 */
export async function categorizeReviews(options: CategorizeOptions): Promise<MergedCategorizationResult> {
  const { appName, platform, category, reviews } = options;

  if (reviews.length === 0) {
    return { categories: [], totalReviewsAnalyzed: 0, totalNegativeReviews: 0 };
  }

  // Create batches
  const batches: { score: number; text: string }[][] = [];
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    batches.push(reviews.slice(i, i + BATCH_SIZE));
  }

  // Process each batch
  const allBatchResults: ComplaintCategoryResult[][] = [];

  for (let i = 0; i < batches.length; i++) {
    const userPrompt = buildBatchPrompt(appName, platform, category, batches[i], i + 1, batches.length);

    try {
      const result = await categorizeBatchGemini(SYSTEM_PROMPT, userPrompt);
      allBatchResults.push(result);
    } catch {
      try {
        const result = await categorizeBatchOpenAI(SYSTEM_PROMPT, userPrompt);
        allBatchResults.push(result);
      } catch (e) {
        console.error(`Both LLMs failed on batch ${i + 1}:`, e);
      }
    }

    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (allBatchResults.length === 0) {
    return { categories: [], totalReviewsAnalyzed: reviews.length, totalNegativeReviews: reviews.length };
  }

  // Single batch — no merge needed
  if (allBatchResults.length === 1) {
    return {
      categories: rankCategories(allBatchResults[0], reviews.length),
      totalReviewsAnalyzed: reviews.length,
      totalNegativeReviews: reviews.length,
    };
  }

  // Multiple batches — merge via LLM
  const mergePrompt = `Merge these ${allBatchResults.length} batches (${reviews.length} total negative reviews of "${appName}"):\n\n${allBatchResults.map((b, i) => `Batch ${i + 1}:\n${JSON.stringify(b)}`).join("\n\n")}`;

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

  return {
    categories: rankCategories(merged, reviews.length),
    totalReviewsAnalyzed: reviews.length,
    totalNegativeReviews: reviews.length,
  };
}

function rankCategories(categories: ComplaintCategoryResult[], total: number): ComplaintCategoryResult[] {
  return categories
    .sort((a, b) => b.count - a.count)
    .map((cat, i) => ({ ...cat, percentage: Math.round((cat.count / total) * 10000) / 100, rank: i + 1 }));
}

function manualMerge(batches: ComplaintCategoryResult[][]): ComplaintCategoryResult[] {
  const merged = new Map<string, ComplaintCategoryResult>();
  for (const batch of batches) {
    for (const cat of batch) {
      const key = cat.category.toLowerCase().trim();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.count += cat.count;
        existing.sampleReviews = [...existing.sampleReviews, ...cat.sampleReviews].slice(0, 3);
      } else {
        merged.set(key, { ...cat });
      }
    }
  }
  return Array.from(merged.values());
}
```

---

### Step 6: Types

Create `src/types/index.ts` with ALL the types used across the app:

```typescript
export interface ComplaintCategoryResult {
  category: string;
  parentCategory: string;
  count: number;
  percentage?: number;
  rank?: number;
  severity: "critical" | "high" | "medium" | "low";
  sampleReviews: string[];
}

export interface MergedCategorizationResult {
  categories: ComplaintCategoryResult[];
  totalReviewsAnalyzed: number;
  totalNegativeReviews: number;
}

export interface AnalyzeRequest {
  appUrl?: string;
  storeId?: string;
  store?: "GOOGLE_PLAY" | "APP_STORE";
  threshold?: number;
  timeRange?: "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "LAST_YEAR" | "ALL_TIME";
}

export interface SearchResult {
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  name: string;
  iconUrl: string;
  rating: number;
  developer: string;
  url: string;
}

export interface ReportResponse {
  analysis: {
    id: number;
    status: string;
    totalReviews: number | null;
    negativeReviews: number | null;
    processingTime: number | null;
    createdAt: string;
    shareId: string | null;
  };
  app: {
    name: string;
    store: string;
    iconUrl: string | null;
    rating: number | null;
    totalRatings: number | null;
    category: string | null;
    developer: string | null;
    slug: string;
  };
  complaints: {
    category: string;
    parentCategory: string | null;
    count: number;
    percentage: number;
    severity: string;
    sampleReviews: string[];
    rank: number;
    trending: string;
  }[];
}

export interface PlanConfig {
  name: string;
  slug: "free" | "starter" | "pro" | "team";
  price: number;
  analysesPerMonth: number;
  features: string[];
  stripePriceId?: string;
  popular?: boolean;
}
```

---

### Step 7-21: Build the Rest

Now build the remaining pieces in this order. For each, refer to the patterns established above:

7. **API routes** — `/api/search` (GET, returns SearchResult[]), `/api/analyze` (POST, validates with Zod, checks credits, creates Analysis record, triggers Inngest job), `/api/report/[id]` (GET, returns ReportResponse, polls during processing)
8. **Inngest** — client + background function that runs: update status → scrape → filter negative → categorize → store complaints → mark complete
9. **Redis** — Upstash client for caching analysis results (24h TTL) and rate limiting (10 analyses/min, 30 searches/min)
10. **Clerk auth** — middleware protecting /dashboard/*, /analyze/*, /report/*, /history/*, /settings/*. Webhook syncing users to DB.
11. **UI components** — Build all `/components/ui/*` primitives. Use Radix UI + Tailwind. Every component needs loading/skeleton state.
12. **Landing page** — Hero with search bar, How It Works (3 steps), Live Demo section (hardcoded example), Features grid, Pricing (4 tiers, Pro highlighted), FAQ accordion, CTA banner
13. **Analyze page** — Large search bar with debounced autocomplete (300ms). On URL paste, detect store + show app card. Config: threshold slider + time range. Analyze button → progress view polling `/api/report/{id}` every 2s → redirect to report on complete.
14. **Report page** — Header (app info + stats), Summary cards (4), Complaint distribution chart (Recharts horizontal bar), Complaint list (ranked cards with expand for sample reviews). FREE TIER: show top 3, blur rest with paywall overlay + "Upgrade to see all" CTA.
15. **Dashboard** — Recent analyses list, usage meter (X/Y credits used), quick analyze search bar
16. **Stripe** — Plans config, checkout session creation, webhook handling subscription events (created/deleted/renewed → update user plan + reset credits)
17. **Pricing page** — 4-column comparison, Stripe checkout on click
18. **SEO pages** — `/apps/[slug]` is SSR, generates dynamic metadata + JSON-LD structured data. Dynamic sitemap from all analyzed apps. `robots.txt` blocking /dashboard and /api.
19. **PDF export** — Generate downloadable report (Starter+ only)
20. **Settings** — Account info, plan management, Stripe customer portal link
21. **Polish** — Loading skeletons everywhere, error toasts, empty states with CTAs, mobile responsive on all pages

---

## Key Design Decisions

- **Primary color:** `#2563eb` (blue-600). Accent: `#7c3aed` (violet-600).
- **Severity colors:** Critical = red, High = orange, Medium = yellow, Low = blue.
- **Cards:** `bg-white rounded-lg border border-slate-200 p-6 shadow-sm`
- **Buttons:** Primary = `bg-brand-600 text-white`, Secondary = `bg-white border text-slate-700`, Ghost = transparent
- **Font:** Inter for body, JetBrains Mono for data/code
- **Never show blank screens.** Every data-dependent component gets a skeleton loader.
- **Every API call gets a try/catch** with user-friendly error messaging.
- **Free tier paywall:** Top 3 complaint categories shown fully, remaining categories blurred with gradient overlay and upgrade CTA.

---

## Pricing Tiers

| Plan | Price | Analyses/mo | Key Features |
|------|-------|-------------|-------------|
| Free | $0 | 3 | Top 3 categories, basic charts |
| Starter | $19/mo | 25 | All categories, PDF export, version comparison |
| Pro | $49/mo | 100 | + Weekly alerts, trend tracking, API access |
| Team | $99/mo | 300 | + Multiple users, white-label reports |

---

## Core User Flow (What the user experiences)

```
1. User lands on homepage → sees hero + search bar
2. Types "Spotify" → autocomplete dropdown shows matching apps
3. Selects "Spotify - Music and Podcasts" (Google Play)
4. Clicks "Analyze"
5. Progress: "Scraping reviews..." → "Found 2,847 negative reviews" → "AI categorizing..." → "Done!"
6. Report page:
   🔴 #1 App crashes after update (34%)
   🟠 #2 Shuffle doesn't work (18%)
   🟡 #3 Can't download for offline (12%)
   ... (remaining blurred for free users)
7. User clicks category → expands to show example reviews
8. User can: Export PDF | Share Link | Track App
```

Start building. Follow the step order exactly.