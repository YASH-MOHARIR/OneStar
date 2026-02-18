# ReviewRadar — Cursor Implementation Spec

> **Purpose:** This document is a step-by-step engineering blueprint for Cursor AI to build ReviewRadar from scratch. Follow sections in order — each phase builds on the previous one. Do NOT skip ahead.

---

## Table of Contents

1. [Project Setup & Configuration](#1-project-setup--configuration)
2. [Environment Variables](#2-environment-variables)
3. [Folder Structure](#3-folder-structure)
4. [Database — Prisma Schema](#4-database--prisma-schema)
5. [Core Types & Interfaces](#5-core-types--interfaces)
6. [Phase 1: Scraping Pipeline](#6-phase-1-scraping-pipeline)
7. [Phase 2: LLM Categorization Engine](#7-phase-2-llm-categorization-engine)
8. [Phase 3: API Routes](#8-phase-3-api-routes)
9. [Phase 4: Frontend Pages & Components](#9-phase-4-frontend-pages--components)
10. [Phase 5: Authentication (Clerk)](#10-phase-5-authentication-clerk)
11. [Phase 6: Background Jobs (Inngest)](#11-phase-6-background-jobs-inngest)
12. [Phase 7: Caching (Redis/Upstash)](#12-phase-7-caching-redisupstash)
13. [Phase 8: Payments (Stripe)](#13-phase-8-payments-stripe)
14. [Phase 9: SEO Implementation](#14-phase-9-seo-implementation)
15. [Phase 10: PDF Export](#15-phase-10-pdf-export)
16. [Design System & UI Patterns](#16-design-system--ui-patterns)
17. [Error Handling Patterns](#17-error-handling-patterns)
18. [Testing Strategy](#18-testing-strategy)
19. [Deployment Checklist](#19-deployment-checklist)

---

## 1. Project Setup & Configuration

### Initialize the project

```bash
npx create-next-app@latest reviewradar --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd reviewradar
```

### Install all dependencies (run in order)

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

# State & Data Fetching
npm install zustand
npm install swr

# UI & Charts
npm install recharts
npm install lucide-react
npm install clsx tailwind-merge
npm install class-variance-authority
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-accordion
npm install framer-motion

# Background Jobs
npm install inngest

# Caching
npm install @upstash/redis @upstash/ratelimit

# PDF Export
npm install @react-pdf/renderer

# Email
npm install resend

# SEO
npm install next-sitemap

# Analytics
npm install posthog-js

# Utils
npm install zod
npm install date-fns
npm install nanoid

# Dev dependencies
npm install -D @types/app-store-scraper
npm install -D prisma
```

### Config files

**next.config.ts:**
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
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
```

**tailwind.config.ts** — extend with brand colors:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        severity: {
          critical: "#ef4444",
          high: "#f97316",
          medium: "#eab308",
          low: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 2. Environment Variables

Create `.env.local` with every variable the app needs. **Do NOT hardcode any of these.**

```env
# ─── Database (Supabase) ───
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# ─── Auth (Clerk) ───
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ─── LLM APIs ───
GEMINI_API_KEY="AIza..."
OPENAI_API_KEY="sk-..."

# ─── Stripe ───
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAM_PRICE_ID="price_..."

# ─── Redis (Upstash) ───
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# ─── Inngest ───
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# ─── Email (Resend) ───
RESEND_API_KEY="re_..."

# ─── Analytics ───
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# ─── App Config ───
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="ReviewRadar"
```

---

## 3. Folder Structure

```
reviewradar/
├── prisma/
│   └── schema.prisma
├── public/
│   ├── favicon.ico
│   ├── og-default.png              # Default OG image
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Clerk provider, fonts, analytics)
│   │   ├── page.tsx                # Landing page (SSR, SEO-optimized)
│   │   ├── globals.css
│   │   │
│   │   ├── (marketing)/            # Public pages (no auth required)
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx        # Blog index
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # Individual blog post
│   │   │   └── apps/
│   │   │       ├── page.tsx        # Browse all analyzed apps
│   │   │       ├── [slug]/
│   │   │       │   └── page.tsx    # Public app analysis page (SEO)
│   │   │       └── [slug]/vs/[compareSlug]/
│   │   │           └── page.tsx    # Comparison page
│   │   │
│   │   ├── (auth)/                 # Auth pages
│   │   │   ├── sign-in/[[...sign-in]]/
│   │   │   │   └── page.tsx
│   │   │   └── sign-up/[[...sign-up]]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/            # Authenticated pages
│   │   │   ├── layout.tsx          # Dashboard layout (sidebar, nav)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # User home: recent analyses, usage
│   │   │   ├── analyze/
│   │   │   │   └── page.tsx        # Search/paste URL, trigger analysis
│   │   │   ├── report/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    # Full analysis report
│   │   │   ├── history/
│   │   │   │   └── page.tsx        # All past analyses
│   │   │   └── settings/
│   │   │       └── page.tsx        # Account, billing, preferences
│   │   │
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   │   └── route.ts        # POST: start analysis job
│   │   │   ├── search/
│   │   │   │   └── route.ts        # GET: search apps by name
│   │   │   ├── report/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # GET: fetch analysis results
│   │   │   ├── export/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # GET: generate PDF export
│   │   │   ├── history/
│   │   │   │   └── route.ts        # GET: user's analysis history
│   │   │   ├── webhooks/
│   │   │   │   ├── clerk/
│   │   │   │   │   └── route.ts    # POST: Clerk user events
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts    # POST: Stripe payment events
│   │   │   └── inngest/
│   │   │       └── route.ts        # Inngest function handler
│   │   │
│   │   └── sitemap.ts              # Dynamic sitemap generation
│   │
│   ├── components/
│   │   ├── ui/                     # Generic reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── accordion.tsx
│   │   │
│   │   ├── landing/                # Landing page sections
│   │   │   ├── hero.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── features.tsx
│   │   │   ├── pricing-section.tsx
│   │   │   ├── testimonials.tsx
│   │   │   ├── faq.tsx
│   │   │   └── cta-banner.tsx
│   │   │
│   │   ├── analyze/                # Analysis flow components
│   │   │   ├── app-search-bar.tsx        # Search input with autocomplete
│   │   │   ├── app-search-results.tsx    # Dropdown list of matching apps
│   │   │   ├── app-card.tsx              # Display app info (icon, name, rating)
│   │   │   ├── analysis-config.tsx       # Settings before analysis (threshold, time range)
│   │   │   └── analysis-progress.tsx     # Real-time progress indicator
│   │   │
│   │   ├── report/                 # Report page components
│   │   │   ├── report-header.tsx         # App info + summary stats
│   │   │   ├── complaint-list.tsx        # Ranked list of complaint categories
│   │   │   ├── complaint-card.tsx        # Individual complaint with expand
│   │   │   ├── complaint-chart.tsx       # Pie/bar chart of complaint distribution
│   │   │   ├── severity-badge.tsx        # Color-coded severity indicator
│   │   │   ├── sample-reviews.tsx        # Expandable sample review excerpts
│   │   │   ├── trend-chart.tsx           # Complaints over time line chart
│   │   │   ├── paywall-blur.tsx          # Blur overlay for free tier
│   │   │   └── export-button.tsx         # PDF export trigger
│   │   │
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── recent-analyses.tsx
│   │   │   ├── usage-meter.tsx           # Credits used / remaining
│   │   │   └── quick-analyze.tsx         # Small search bar on dashboard
│   │   │
│   │   └── shared/                 # Shared across pages
│   │       ├── navbar.tsx
│   │       ├── sidebar.tsx
│   │       ├── footer.tsx
│   │       ├── logo.tsx
│   │       ├── theme-toggle.tsx
│   │       └── upgrade-prompt.tsx        # CTA shown when user hits limit
│   │
│   ├── lib/
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── scraper/
│   │   │   ├── google-play.ts      # Google Play scraping functions
│   │   │   ├── app-store.ts        # Apple App Store scraping functions
│   │   │   ├── types.ts            # Shared scraper types
│   │   │   └── index.ts            # Unified scraper interface
│   │   ├── ai/
│   │   │   ├── gemini.ts           # Gemini API client + categorization
│   │   │   ├── openai.ts           # OpenAI fallback client
│   │   │   ├── prompts.ts          # All prompt templates
│   │   │   ├── categorize.ts       # Main categorization pipeline
│   │   │   └── types.ts            # AI response types
│   │   ├── stripe/
│   │   │   ├── client.ts           # Stripe client
│   │   │   ├── plans.ts            # Plan definitions + helpers
│   │   │   └── checkout.ts         # Checkout session creation
│   │   ├── redis.ts                # Upstash Redis client
│   │   ├── inngest/
│   │   │   ├── client.ts           # Inngest client
│   │   │   └── functions.ts        # Background job definitions
│   │   ├── email.ts                # Resend email client
│   │   ├── analytics.ts            # PostHog client
│   │   ├── rate-limit.ts           # Rate limiting logic
│   │   ├── utils.ts                # General utility functions
│   │   └── constants.ts            # App-wide constants
│   │
│   ├── hooks/
│   │   ├── use-analysis.ts         # SWR hook for analysis data
│   │   ├── use-search.ts           # Debounced search hook
│   │   └── use-user-plan.ts        # Current user plan + credits
│   │
│   ├── stores/
│   │   └── analysis-store.ts       # Zustand store for analysis state
│   │
│   └── types/
│       └── index.ts                # Global type definitions
│
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── next-sitemap.config.js
```

---

## 4. Database — Prisma Schema

Create `prisma/schema.prisma`. This is the **single source of truth** for the database.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── Users ───
// Synced from Clerk via webhook. Stores billing + usage metadata.
model User {
  id               String     @id // Clerk user ID (e.g., "user_2abc...")
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

enum Plan {
  FREE
  STARTER
  PRO
  TEAM
}

// ─── Apps ───
// Every app that has been analyzed at least once.
model App {
  id           Int        @id @default(autoincrement())
  store        Store
  storeId      String     @map("store_id") // e.g., "com.spotify.music"
  name         String
  slug         String     @unique // URL-safe name: "spotify-music-and-podcasts"
  iconUrl      String?    @map("icon_url")
  rating       Float?
  totalRatings Int?       @map("total_ratings")
  category     String?
  developer    String?
  url          String?    // Play Store or App Store URL
  lastScraped  DateTime?  @map("last_scraped")
  createdAt    DateTime   @default(now()) @map("created_at")
  reviews      Review[]
  analyses     Analysis[]

  @@unique([store, storeId])
  @@map("apps")
}

enum Store {
  GOOGLE_PLAY
  APP_STORE
}

// ─── Reviews ───
// Cached individual reviews from app stores.
model Review {
  id            Int       @id @default(autoincrement())
  appId         Int       @map("app_id")
  storeReviewId String    @map("store_review_id") // Original review ID from store
  score         Int       // 1-5
  title         String?   // Review title (App Store has these)
  text          String?   // Review body text
  userName      String?   @map("user_name")
  date          DateTime?
  version       String?   // App version the review was for
  thumbsUp      Int       @default(0) @map("thumbs_up")
  scrapedAt     DateTime  @default(now()) @map("scraped_at")
  app           App       @relation(fields: [appId], references: [id], onDelete: Cascade)

  @@unique([appId, storeReviewId])
  @@index([appId, score])
  @@index([appId, date(sort: Desc)])
  @@map("reviews")
}

// ─── Analyses ───
// Each time a user runs an analysis on an app.
model Analysis {
  id              Int                  @id @default(autoincrement())
  appId           Int                  @map("app_id")
  userId          String               @map("user_id")
  status          AnalysisStatus       @default(PENDING)
  threshold       Int                  @default(3) // Star rating cutoff (<=)
  timeRange       TimeRange            @default(LAST_6_MONTHS) @map("time_range")
  totalReviews    Int?                 @map("total_reviews")
  negativeReviews Int?                 @map("negative_reviews")
  processingTime  Int?                 @map("processing_time") // seconds
  shareId         String?              @unique @map("share_id") // nanoid for public share links
  isPublic        Boolean              @default(true) @map("is_public") // Show on SEO page
  createdAt       DateTime             @default(now()) @map("created_at")
  completedAt     DateTime?            @map("completed_at")
  app             App                  @relation(fields: [appId], references: [id], onDelete: Cascade)
  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  complaints      ComplaintCategory[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([appId, createdAt(sort: Desc)])
  @@map("analyses")
}

enum AnalysisStatus {
  PENDING
  SCRAPING
  ANALYZING
  COMPLETE
  FAILED
}

enum TimeRange {
  LAST_MONTH
  LAST_3_MONTHS
  LAST_6_MONTHS
  LAST_YEAR
  ALL_TIME
}

// ─── Complaint Categories ───
// AI-generated complaint clusters for each analysis.
model ComplaintCategory {
  id             Int      @id @default(autoincrement())
  analysisId     Int      @map("analysis_id")
  category       String   // e.g., "App crashes on launch"
  parentCategory String?  @map("parent_category") // e.g., "Performance"
  count          Int      // How many reviews mention this
  percentage     Float    // % of negative reviews
  severity       Severity
  sampleReviews  String[] @map("sample_reviews") // 2-3 example excerpts
  rank           Int      // 1 = most frequent
  trending       Trend    @default(STABLE)
  analysis       Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId, rank])
  @@map("complaint_categories")
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum Trend {
  INCREASING
  STABLE
  DECREASING
}
```

After creating the schema, run:
```bash
npx prisma generate
npx prisma db push
```

### Prisma Client Singleton

**`src/lib/db.ts`:**
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

---

## 5. Core Types & Interfaces

**`src/types/index.ts`:**

```typescript
// ─── Scraper Types ───

export interface ScrapedApp {
  storeId: string;
  store: "GOOGLE_PLAY" | "APP_STORE";
  name: string;
  iconUrl: string;
  rating: number;
  totalRatings: number;
  category: string;
  developer: string;
  url: string;
}

export interface ScrapedReview {
  storeReviewId: string;
  score: number;
  title?: string;
  text: string;
  userName?: string;
  date: Date;
  version?: string;
  thumbsUp?: number;
}

// ─── AI / Categorization Types ───

export interface ComplaintCategoryResult {
  category: string;
  parentCategory: string;
  count: number;
  severity: "critical" | "high" | "medium" | "low";
  sampleReviews: string[];
}

export interface CategorizationBatchResult {
  categories: ComplaintCategoryResult[];
  reviewsProcessed: number;
}

export interface MergedCategorizationResult {
  categories: ComplaintCategoryResult[];
  totalReviewsAnalyzed: number;
  totalNegativeReviews: number;
}

// ─── API Request / Response Types ───

export interface AnalyzeRequest {
  appUrl?: string;        // Google Play or App Store URL
  appId?: string;         // Direct store ID
  store?: "GOOGLE_PLAY" | "APP_STORE";
  threshold?: number;     // Default: 3
  timeRange?: "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "LAST_YEAR" | "ALL_TIME";
}

export interface AnalyzeResponse {
  analysisId: number;
  status: "PENDING" | "SCRAPING" | "ANALYZING" | "COMPLETE" | "FAILED";
  message: string;
}

export interface SearchRequest {
  query: string;
  store?: "GOOGLE_PLAY" | "APP_STORE";
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
    totalReviews: number;
    negativeReviews: number;
    processingTime: number;
    createdAt: string;
  };
  app: {
    name: string;
    store: string;
    iconUrl: string;
    rating: number;
    totalRatings: number;
    category: string;
    developer: string;
  };
  complaints: {
    category: string;
    parentCategory: string;
    count: number;
    percentage: number;
    severity: string;
    sampleReviews: string[];
    rank: number;
    trending: string;
  }[];
}

// ─── Component Prop Types ───

export interface AppCardProps {
  name: string;
  iconUrl: string;
  rating: number;
  store: string;
  developer: string;
  onClick?: () => void;
}

export interface ComplaintCardProps {
  rank: number;
  category: string;
  parentCategory: string;
  count: number;
  percentage: number;
  severity: "critical" | "high" | "medium" | "low";
  sampleReviews: string[];
  isBlurred?: boolean; // For free tier paywall
}

// ─── Plan & Billing Types ───

export interface PlanConfig {
  name: string;
  slug: "free" | "starter" | "pro" | "team";
  price: number; // monthly in cents
  analysesPerMonth: number;
  features: string[];
  stripePriceId?: string;
  popular?: boolean;
}
```

---

## 6. Phase 1: Scraping Pipeline

### `src/lib/scraper/types.ts`

```typescript
export interface ScrapeOptions {
  num?: number;        // Max reviews to fetch (default: 3000)
  sort?: "newest" | "rating" | "helpfulness";
  lang?: string;       // Default: "en"
  country?: string;    // Default: "us"
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

### `src/lib/scraper/google-play.ts`

```typescript
import gplay from "google-play-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

/**
 * Search Google Play Store for apps by name.
 * Used for the autocomplete search bar.
 */
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

/**
 * Fetch full app details from Google Play.
 */
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
 * Fetch reviews from Google Play.
 * Paginates automatically to get up to `num` reviews.
 * Returns ALL reviews — filtering by score happens later.
 */
export async function scrapeGooglePlayReviews(
  appId: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, sort = "newest", lang = "en", country = "us" } = options;

  // Fetch app details
  const appDetails = await getGooglePlayApp(appId);

  // Fetch reviews with pagination
  const allReviews: ScrapeResult["reviews"] = [];
  let nextToken: string | null = null;

  while (allReviews.length < num) {
    const batchSize = Math.min(150, num - allReviews.length);

    const result = await gplay.reviews({
      appId,
      sort: gplay.sort[sort.toUpperCase() as keyof typeof gplay.sort],
      num: batchSize,
      lang,
      country,
      paginate: true,
      nextPaginationToken: nextToken ?? undefined,
    });

    const reviews = result.data;
    if (!reviews || reviews.length === 0) break;

    for (const review of reviews) {
      allReviews.push({
        storeReviewId: review.id,
        score: review.score,
        title: review.title || undefined,
        text: review.text || "",
        userName: review.userName || undefined,
        date: new Date(review.date),
        version: review.version || undefined,
        thumbsUp: review.thumbsUp || 0,
      });
    }

    nextToken = result.nextPaginationToken;
    if (!nextToken) break;

    // Rate limiting: wait 500ms between pagination calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { app: appDetails, reviews: allReviews };
}

/**
 * Parse a Google Play URL to extract the app ID.
 * Supports: https://play.google.com/store/apps/details?id=com.spotify.music
 */
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

### `src/lib/scraper/app-store.ts`

```typescript
import store from "app-store-scraper";
import type { ScrapeOptions, ScrapeResult } from "./types";

/**
 * Search Apple App Store for apps by name.
 */
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

/**
 * Fetch full app details from Apple App Store.
 */
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
 * Fetch reviews from Apple App Store.
 * Note: App Store scraper paginates by page (1-10), each page ~50 reviews.
 */
export async function scrapeAppStoreReviews(
  appId: string | number,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { num = 3000, sort = "newest", country = "us" } = options;

  const appDetails = await getAppStoreApp(appId);

  const allReviews: ScrapeResult["reviews"] = [];
  let page = 1;
  const maxPages = Math.ceil(num / 50);

  while (allReviews.length < num && page <= maxPages) {
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

      page++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      break; // App Store often limits to ~500 reviews
    }
  }

  return { app: appDetails, reviews: allReviews };
}

/**
 * Parse an App Store URL to extract the app ID.
 * Supports: https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580
 */
export function parseAppStoreUrl(url: string): string | null {
  try {
    const match = url.match(/\/id(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
```

### `src/lib/scraper/index.ts`

```typescript
import {
  searchGooglePlay,
  scrapeGooglePlayReviews,
  parseGooglePlayUrl,
} from "./google-play";
import {
  searchAppStore,
  scrapeAppStoreReviews,
  parseAppStoreUrl,
} from "./app-store";
import type { ScrapeOptions, ScrapeResult } from "./types";

export type { ScrapeOptions, ScrapeResult };

/**
 * Detect store from a URL and return the store type + app ID.
 */
export function parseAppUrl(url: string): {
  store: "GOOGLE_PLAY" | "APP_STORE";
  appId: string;
} | null {
  const googleId = parseGooglePlayUrl(url);
  if (googleId) return { store: "GOOGLE_PLAY", appId: googleId };

  const appleId = parseAppStoreUrl(url);
  if (appleId) return { store: "APP_STORE", appId: appleId };

  return null;
}

/**
 * Search both stores simultaneously.
 */
export async function searchApps(term: string, store?: "GOOGLE_PLAY" | "APP_STORE") {
  if (store === "GOOGLE_PLAY") return searchGooglePlay(term);
  if (store === "APP_STORE") return searchAppStore(term);

  // Search both stores in parallel
  const [googleResults, appleResults] = await Promise.allSettled([
    searchGooglePlay(term, 5),
    searchAppStore(term, 5),
  ]);

  const results = [];
  if (googleResults.status === "fulfilled") results.push(...googleResults.value);
  if (appleResults.status === "fulfilled") results.push(...appleResults.value);

  return results;
}

/**
 * Scrape reviews from the correct store.
 */
export async function scrapeReviews(
  appId: string,
  store: "GOOGLE_PLAY" | "APP_STORE",
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  if (store === "GOOGLE_PLAY") {
    return scrapeGooglePlayReviews(appId, options);
  }
  return scrapeAppStoreReviews(appId, options);
}

/**
 * Filter reviews by score threshold.
 * Returns only reviews at or below the threshold (e.g., <= 3 stars).
 */
export function filterNegativeReviews(
  reviews: ScrapeResult["reviews"],
  threshold = 3
) {
  return reviews.filter(
    (review) => review.score <= threshold && review.text && review.text.trim().length > 10
  );
}
```

---

## 7. Phase 2: LLM Categorization Engine

### `src/lib/ai/prompts.ts`

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
```

### `src/lib/ai/gemini.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ComplaintCategoryResult } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Send a categorization request to Gemini 2.5 Flash.
 */
export async function categorizeBatchGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<ComplaintCategoryResult[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-20",
    generationConfig: {
      temperature: 0.2, // Low temp for consistent, structured output
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
    // Clean any markdown fences that might leak through
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed.categories || [];
  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
```

### `src/lib/ai/openai.ts`

```typescript
import OpenAI from "openai";
import type { ComplaintCategoryResult } from "@/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

  const text = response.choices[0]?.message?.content || "[]";

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.categories || [];
  } catch (error) {
    console.error("Failed to parse OpenAI response:", text);
    throw new Error("LLM returned invalid JSON");
  }
}
```

### `src/lib/ai/categorize.ts`

This is the **main pipeline**. It batches reviews, sends them to the LLM, and merges results.

```typescript
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
 *
 * 1. Split reviews into batches of 50
 * 2. Send each batch to Gemini (with OpenAI fallback)
 * 3. Merge all batch results into final consolidated categories
 * 4. Rank by count and assign severity
 */
export async function categorizeReviews(
  options: CategorizeOptions
): Promise<MergedCategorizationResult> {
  const { appName, platform, category, reviews, onProgress } = options;

  if (reviews.length === 0) {
    return { categories: [], totalReviewsAnalyzed: 0, totalNegativeReviews: 0 };
  }

  // Step 1: Create batches
  const batches: { score: number; text: string }[][] = [];
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    batches.push(reviews.slice(i, i + BATCH_SIZE));
  }

  // Step 2: Process each batch
  const allBatchResults: ComplaintCategoryResult[][] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
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
      // Try Gemini first
      const result = await categorizeBatchGemini(SYSTEM_PROMPT, userPrompt);
      allBatchResults.push(result);
    } catch (error) {
      console.warn(`Gemini failed on batch ${i + 1}, falling back to OpenAI`);
      try {
        // Fallback to OpenAI
        const result = await categorizeBatchOpenAI(SYSTEM_PROMPT, userPrompt);
        allBatchResults.push(result);
      } catch (fallbackError) {
        console.error(`Both LLMs failed on batch ${i + 1}:`, fallbackError);
        // Skip this batch rather than failing entirely
      }
    }

    // Rate limiting: wait 200ms between batches
    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Step 3: Merge results
  onProgress?.("merging", 85);

  if (allBatchResults.length === 0) {
    return { categories: [], totalReviewsAnalyzed: reviews.length, totalNegativeReviews: reviews.length };
  }

  // If only one batch, no need to merge
  if (allBatchResults.length === 1) {
    const ranked = rankCategories(allBatchResults[0], reviews.length);
    return {
      categories: ranked,
      totalReviewsAnalyzed: reviews.length,
      totalNegativeReviews: reviews.length,
    };
  }

  // Multiple batches — send to LLM for intelligent merging
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
      // Manual merge fallback — just combine and deduplicate by name
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

/**
 * Rank categories by count and calculate percentages.
 */
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

/**
 * Fallback manual merge — combine categories with similar names.
 */
function manualMerge(
  batchResults: ComplaintCategoryResult[][]
): ComplaintCategoryResult[] {
  const merged = new Map<string, ComplaintCategoryResult>();

  for (const batch of batchResults) {
    for (const cat of batch) {
      const key = cat.category.toLowerCase().trim();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.count += cat.count;
        // Keep best sample reviews (max 3)
        const allSamples = [...existing.sampleReviews, ...cat.sampleReviews];
        existing.sampleReviews = allSamples.slice(0, 3);
      } else {
        merged.set(key, { ...cat });
      }
    }
  }

  return Array.from(merged.values());
}
```

---

## 8. Phase 3: API Routes

### `src/app/api/search/route.ts` — App Search

```typescript
import { NextRequest, NextResponse } from "next/server";
import { searchApps } from "@/lib/scraper";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const store = req.nextUrl.searchParams.get("store") as
    | "GOOGLE_PLAY"
    | "APP_STORE"
    | null;

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchApps(query, store ?? undefined);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search apps" },
      { status: 500 }
    );
  }
}
```

### `src/app/api/analyze/route.ts` — Start Analysis

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { parseAppUrl } from "@/lib/scraper";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

const AnalyzeSchema = z.object({
  appUrl: z.string().url().optional(),
  storeId: z.string().optional(),
  store: z.enum(["GOOGLE_PLAY", "APP_STORE"]).optional(),
  threshold: z.number().min(1).max(5).default(3),
  timeRange: z
    .enum(["LAST_MONTH", "LAST_3_MONTHS", "LAST_6_MONTHS", "LAST_YEAR", "ALL_TIME"])
    .default("LAST_6_MONTHS"),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user credits
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.plan === "FREE" && user.creditsUsed >= user.creditsLimit) {
    return NextResponse.json(
      {
        error: "Free analysis limit reached",
        upgradeRequired: true,
        creditsUsed: user.creditsUsed,
        creditsLimit: user.creditsLimit,
      },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await req.json();
  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { appUrl, storeId, store, threshold, timeRange } = parsed.data;

  // Determine app ID and store
  let resolvedStoreId: string;
  let resolvedStore: "GOOGLE_PLAY" | "APP_STORE";

  if (appUrl) {
    const parsed = parseAppUrl(appUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid app URL. Paste a Google Play or App Store link." },
        { status: 400 }
      );
    }
    resolvedStoreId = parsed.appId;
    resolvedStore = parsed.store;
  } else if (storeId && store) {
    resolvedStoreId = storeId;
    resolvedStore = store;
  } else {
    return NextResponse.json(
      { error: "Provide either appUrl or storeId + store" },
      { status: 400 }
    );
  }

  // Find or create the app record
  let app = await db.app.findUnique({
    where: { store_storeId: { store: resolvedStore, storeId: resolvedStoreId } },
  });

  if (!app) {
    // Create a placeholder — the background job will fill in details
    const slug = resolvedStoreId
      .replace(/\./g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();

    app = await db.app.create({
      data: {
        store: resolvedStore,
        storeId: resolvedStoreId,
        name: resolvedStoreId, // Placeholder, updated during scrape
        slug,
      },
    });
  }

  // Create the analysis record
  const analysis = await db.analysis.create({
    data: {
      appId: app.id,
      userId,
      threshold,
      timeRange,
      status: "PENDING",
      shareId: (await import("nanoid")).nanoid(10),
    },
  });

  // Increment credits used
  await db.user.update({
    where: { id: userId },
    data: { creditsUsed: { increment: 1 } },
  });

  // Trigger background job via Inngest
  await inngest.send({
    name: "analysis/run",
    data: {
      analysisId: analysis.id,
      appId: app.id,
      storeId: resolvedStoreId,
      store: resolvedStore,
      threshold,
      timeRange,
    },
  });

  return NextResponse.json({
    analysisId: analysis.id,
    status: "PENDING",
    message: "Analysis started. Poll /api/report/{id} for results.",
  });
}
```

### `src/app/api/report/[id]/route.ts` — Get Report

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysisId = parseInt(id, 10);

  if (isNaN(analysisId)) {
    return NextResponse.json({ error: "Invalid analysis ID" }, { status: 400 });
  }

  const analysis = await db.analysis.findUnique({
    where: { id: analysisId },
    include: {
      app: true,
      complaints: { orderBy: { rank: "asc" } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // If still processing, return status only
  if (analysis.status !== "COMPLETE") {
    return NextResponse.json({
      analysis: {
        id: analysis.id,
        status: analysis.status,
        totalReviews: analysis.totalReviews,
        negativeReviews: analysis.negativeReviews,
      },
      app: {
        name: analysis.app.name,
        store: analysis.app.store,
        iconUrl: analysis.app.iconUrl,
      },
      complaints: [],
    });
  }

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      status: analysis.status,
      totalReviews: analysis.totalReviews,
      negativeReviews: analysis.negativeReviews,
      processingTime: analysis.processingTime,
      createdAt: analysis.createdAt.toISOString(),
      shareId: analysis.shareId,
    },
    app: {
      name: analysis.app.name,
      store: analysis.app.store,
      iconUrl: analysis.app.iconUrl,
      rating: analysis.app.rating,
      totalRatings: analysis.app.totalRatings,
      category: analysis.app.category,
      developer: analysis.app.developer,
      slug: analysis.app.slug,
    },
    complaints: analysis.complaints.map((c) => ({
      category: c.category,
      parentCategory: c.parentCategory,
      count: c.count,
      percentage: c.percentage,
      severity: c.severity,
      sampleReviews: c.sampleReviews,
      rank: c.rank,
      trending: c.trending,
    })),
  });
}
```

### `src/app/api/history/route.ts` — User History

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const [analyses, total] = await Promise.all([
    db.analysis.findMany({
      where: { userId },
      include: { app: true, complaints: { orderBy: { rank: "asc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.analysis.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    analyses: analyses.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      app: {
        name: a.app.name,
        store: a.app.store,
        iconUrl: a.app.iconUrl,
        slug: a.app.slug,
      },
      negativeReviews: a.negativeReviews,
      topComplaints: a.complaints.map((c) => ({
        category: c.category,
        percentage: c.percentage,
        severity: c.severity,
      })),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

---

## 9. Phase 4: Frontend Pages & Components

### Root Layout — `src/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ReviewRadar — Find What's Broken in Any App",
    template: "%s | ReviewRadar",
  },
  description:
    "Paste any app link. See exactly what's broken — ranked by how many users complain about it. Turn thousands of negative reviews into actionable insights in 60 seconds.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "ReviewRadar",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Landing Page — `src/app/page.tsx`

> Build a conversion-focused landing page with these sections IN THIS ORDER:
>
> 1. **Hero** — Headline: "Find What's Broken in Any App". Subheadline: "Paste an app link. Get AI-powered complaint analysis in 60 seconds." + Search bar (functional, same as /analyze) + CTA "Analyze Free"
> 2. **Social Proof Bar** — "Trusted by 500+ product builders" + logos/avatars
> 3. **How It Works** — 3 steps: Paste link → AI scans reviews → See ranked complaints. Use numbered cards with icons.
> 4. **Live Demo / Example** — Show an actual analysis result (hardcoded Spotify or similar) so visitors see the output before signing up.
> 5. **Features Grid** — 6 cards: AI Categorization, Severity Ranking, Trend Detection, PDF Export, Version Comparison, Public Reports
> 6. **Pricing Section** — 4 tiers (Free/Starter/Pro/Team) with the Pro plan highlighted as "Most Popular"
> 7. **FAQ** — 6 common questions using an accordion component
> 8. **Final CTA** — "Start analyzing for free. No credit card required." + Sign up button

### Analyze Page — `src/app/(dashboard)/analyze/page.tsx`

> This is the core product page. Build it with:
>
> 1. **Search Bar** — Large, centered input. Placeholder: "Paste a Google Play or App Store URL, or search by name..."
>    - On text input (debounced 300ms): call `GET /api/search?q={query}`
>    - On URL paste: detect store automatically, show app card
>    - Show dropdown of search results using `<AppSearchResults />`
> 2. **App Card** — When user selects an app, show icon, name, rating, store badge
> 3. **Config Panel** — Star threshold slider (1-5, default 3), time range dropdown
> 4. **Analyze Button** — "Analyze Reviews" → POST to `/api/analyze`
> 5. **Progress View** — Replace the form with `<AnalysisProgress />`:
>    - Poll `GET /api/report/{id}` every 2 seconds
>    - Show stages: "Fetching reviews..." → "Found X negative reviews" → "AI categorizing..." → "Done!"
>    - Use a progress bar with animated stages
> 6. **Redirect** — When complete, redirect to `/report/{id}`

### Report Page — `src/app/(dashboard)/report/[id]/page.tsx`

> The report page is the money page. Build it with:
>
> 1. **Report Header** — App icon, name, store badge, overall rating, total reviews analyzed, negative count, analysis date
> 2. **Summary Stats** — 4 stat cards: Total Reviews, Negative Reviews, Categories Found, Most Critical Issue
> 3. **Complaint Distribution Chart** — Horizontal bar chart or pie chart (Recharts) showing top complaint percentages
> 4. **Complaint List** — Ordered list of `<ComplaintCard />` components:
>    - Rank number (#1, #2, etc.)
>    - Category name + parent category tag
>    - Count and percentage bar
>    - Severity badge (color coded: red/orange/yellow/blue)
>    - Expandable section with sample reviews (accordion)
>    - **FREE TIER**: Show top 3 fully, blur remaining with `<PaywallBlur />` overlay
> 5. **Actions Bar** — "Export PDF", "Share Link" (copy to clipboard), "Track This App" (future)

### Public SEO App Page — `src/app/(marketing)/apps/[slug]/page.tsx`

> This page is critical for SEO. It must be server-rendered.
>
> 1. **Fetch the latest completed analysis** for this app slug
> 2. **Generate dynamic metadata**:
>    ```typescript
>    export async function generateMetadata({ params }): Promise<Metadata> {
>      const app = await db.app.findUnique({ where: { slug: params.slug } });
>      return {
>        title: `${app.name} App Problems — Top User Complaints Analyzed`,
>        description: `Analysis of ${negativeCount} negative ${app.name} reviews reveals...`,
>        openGraph: { ... },
>      };
>    }
>    ```
> 3. **JSON-LD structured data** — SoftwareApplication schema
> 4. **Content**: Same as report page but public, with a CTA: "Run your own analysis — it's free"
> 5. **Internal links**: Link to related apps in the same category, link to category page

---

## 10. Phase 5: Authentication (Clerk)

### Middleware — `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/analyze(.*)",
  "/report(.*)",
  "/history(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Clerk Webhook — `src/app/api/webhooks/clerk/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id")!;
  const svixTimestamp = req.headers.get("svix-timestamp")!;
  const svixSignature = req.headers.get("svix-signature")!;

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let event: any;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    await db.user.create({
      data: {
        id: event.data.id,
        email: event.data.email_addresses[0]?.email_address || "",
        name: `${event.data.first_name || ""} ${event.data.last_name || ""}`.trim(),
        imageUrl: event.data.image_url,
      },
    });
  }

  if (event.type === "user.updated") {
    await db.user.update({
      where: { id: event.data.id },
      data: {
        email: event.data.email_addresses[0]?.email_address,
        name: `${event.data.first_name || ""} ${event.data.last_name || ""}`.trim(),
        imageUrl: event.data.image_url,
      },
    });
  }

  if (event.type === "user.deleted") {
    await db.user.delete({ where: { id: event.data.id } }).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
```

---

## 11. Phase 6: Background Jobs (Inngest)

### `src/lib/inngest/client.ts`

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "reviewradar" });
```

### `src/lib/inngest/functions.ts`

```typescript
import { inngest } from "./client";
import { db } from "@/lib/db";
import { scrapeReviews, filterNegativeReviews } from "@/lib/scraper";
import { categorizeReviews } from "@/lib/ai/categorize";

/**
 * Main analysis background job.
 * Triggered by POST /api/analyze.
 * Runs: scrape → filter → categorize → store.
 */
export const runAnalysis = inngest.createFunction(
  {
    id: "run-analysis",
    retries: 2,
    onFailure: async ({ event }) => {
      // Mark analysis as failed
      const { analysisId } = event.data.event.data;
      await db.analysis.update({
        where: { id: analysisId },
        data: { status: "FAILED" },
      });
    },
  },
  { event: "analysis/run" },
  async ({ event, step }) => {
    const { analysisId, storeId, store, threshold, timeRange } = event.data;
    const startTime = Date.now();

    // Step 1: Update status to SCRAPING
    await step.run("update-status-scraping", async () => {
      await db.analysis.update({
        where: { id: analysisId },
        data: { status: "SCRAPING" },
      });
    });

    // Step 2: Scrape reviews
    const scrapeResult = await step.run("scrape-reviews", async () => {
      const result = await scrapeReviews(storeId, store, { num: 3000 });

      // Update app details
      await db.app.update({
        where: { store_storeId: { store, storeId } },
        data: {
          name: result.app.name,
          iconUrl: result.app.iconUrl,
          rating: result.app.rating,
          totalRatings: result.app.totalRatings,
          category: result.app.category,
          developer: result.app.developer,
          url: result.app.url,
          lastScraped: new Date(),
        },
      });

      // Cache reviews in DB (upsert to avoid duplicates)
      const app = await db.app.findUnique({
        where: { store_storeId: { store, storeId } },
      });

      if (app) {
        for (const review of result.reviews) {
          await db.review.upsert({
            where: {
              appId_storeReviewId: {
                appId: app.id,
                storeReviewId: review.storeReviewId,
              },
            },
            create: {
              appId: app.id,
              storeReviewId: review.storeReviewId,
              score: review.score,
              title: review.title,
              text: review.text,
              userName: review.userName,
              date: review.date,
              version: review.version,
              thumbsUp: review.thumbsUp || 0,
            },
            update: {}, // Don't update existing reviews
          });
        }
      }

      return {
        totalReviews: result.reviews.length,
        appName: result.app.name,
        appCategory: result.app.category || "General",
      };
    });

    // Step 3: Filter negative reviews
    const negativeReviews = await step.run("filter-reviews", async () => {
      const app = await db.app.findUnique({
        where: { store_storeId: { store, storeId } },
      });

      const reviews = await db.review.findMany({
        where: {
          appId: app!.id,
          score: { lte: threshold },
          text: { not: null },
        },
        orderBy: { date: "desc" },
      });

      // Update analysis with counts
      await db.analysis.update({
        where: { id: analysisId },
        data: {
          status: "ANALYZING",
          totalReviews: scrapeResult.totalReviews,
          negativeReviews: reviews.length,
        },
      });

      return reviews
        .filter((r) => r.text && r.text.trim().length > 10)
        .map((r) => ({ score: r.score, text: r.text! }));
    });

    // Step 4: AI Categorization
    const categorized = await step.run("categorize-reviews", async () => {
      return categorizeReviews({
        appName: scrapeResult.appName,
        platform: store === "GOOGLE_PLAY" ? "Google Play" : "App Store",
        category: scrapeResult.appCategory,
        reviews: negativeReviews,
      });
    });

    // Step 5: Store results
    await step.run("store-results", async () => {
      // Delete any existing complaints for this analysis
      await db.complaintCategory.deleteMany({
        where: { analysisId },
      });

      // Insert new complaints
      for (const [index, cat] of categorized.categories.entries()) {
        await db.complaintCategory.create({
          data: {
            analysisId,
            category: cat.category,
            parentCategory: cat.parentCategory || null,
            count: cat.count,
            percentage:
              (cat.count / categorized.totalNegativeReviews) * 100,
            severity: cat.severity?.toUpperCase() as any || "MEDIUM",
            sampleReviews: cat.sampleReviews || [],
            rank: index + 1,
          },
        });
      }

      // Mark analysis as complete
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      await db.analysis.update({
        where: { id: analysisId },
        data: {
          status: "COMPLETE",
          completedAt: new Date(),
          processingTime: elapsed,
        },
      });
    });

    return { analysisId, status: "COMPLETE" };
  }
);
```

### `src/app/api/inngest/route.ts`

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runAnalysis } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runAnalysis],
});
```

---

## 12. Phase 7: Caching (Redis/Upstash)

### `src/lib/redis.ts`

```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache an analysis result by app store ID.
 * TTL: 24 hours. Prevents re-scraping the same app too frequently.
 */
export async function cacheAnalysis(storeId: string, data: any, ttl = 86400) {
  await redis.setex(`analysis:${storeId}`, ttl, JSON.stringify(data));
}

export async function getCachedAnalysis(storeId: string) {
  const cached = await redis.get(`analysis:${storeId}`);
  return cached ? JSON.parse(cached as string) : null;
}
```

### `src/lib/rate-limit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Free users: 3 analyses per month
// Paid users: based on plan
export const analysisRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 per minute (API protection)
  analytics: true,
});

// Search rate limit: prevent abuse
export const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 searches per minute
  analytics: true,
});
```

---

## 13. Phase 8: Payments (Stripe)

### `src/lib/stripe/plans.ts`

```typescript
import type { PlanConfig } from "@/types";

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: "Free",
    slug: "free",
    price: 0,
    analysesPerMonth: 3,
    features: [
      "3 analyses per month",
      "Top 3 complaint categories",
      "Basic charts",
    ],
  },
  starter: {
    name: "Starter",
    slug: "starter",
    price: 1900, // $19.00
    analysesPerMonth: 25,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "25 analyses per month",
      "All complaint categories",
      "Export PDF reports",
      "Version comparison",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro",
    price: 4900, // $49.00
    analysesPerMonth: 100,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    popular: true,
    features: [
      "100 analyses per month",
      "Weekly monitoring alerts",
      "Trend tracking",
      "API access",
      "Priority support",
    ],
  },
  team: {
    name: "Team",
    slug: "team",
    price: 9900, // $99.00
    analysesPerMonth: 300,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID,
    features: [
      "300 analyses per month",
      "Multiple team members",
      "White-label PDF reports",
      "Custom branding",
      "Priority support",
    ],
  },
};

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return Object.values(PLANS).find((p) => p.stripePriceId === priceId);
}

export function getPlanCreditsLimit(plan: string): number {
  return PLANS[plan.toLowerCase()]?.analysesPerMonth || 3;
}
```

### `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getPlanByPriceId, getPlanCreditsLimit } from "@/lib/stripe/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const priceId = session.metadata?.priceId;

      if (userId && priceId) {
        const plan = getPlanByPriceId(priceId);
        if (plan) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan: plan.slug.toUpperCase() as any,
              stripeCustomerId: session.customer as string,
              stripeSubId: session.subscription as string,
              creditsLimit: plan.analysesPerMonth,
              creditsUsed: 0, // Reset on upgrade
            },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await db.user.findFirst({
        where: { stripeSubId: sub.id },
      });

      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: {
            plan: "FREE",
            creditsLimit: 3,
            stripeSubId: null,
          },
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === "subscription_cycle") {
        const user = await db.user.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (user) {
          // Reset credits on new billing cycle
          await db.user.update({
            where: { id: user.id },
            data: { creditsUsed: 0 },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 14. Phase 9: SEO Implementation

### Dynamic Sitemap — `src/app/sitemap.ts`

```typescript
import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
  ];

  // Dynamic app pages — all analyzed apps
  const apps = await db.app.findMany({
    select: { slug: true, lastScraped: true },
    where: { lastScraped: { not: null } },
  });

  const appPages = apps.map((app) => ({
    url: `${baseUrl}/apps/${app.slug}`,
    lastModified: app.lastScraped || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...appPages];
}
```

### JSON-LD Structured Data

Add this to every public app analysis page (`/apps/[slug]/page.tsx`):

```typescript
function generateJsonLd(app: any, analysis: any) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    applicationCategory: app.category,
    operatingSystem: app.store === "GOOGLE_PLAY" ? "Android" : "iOS",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: app.rating,
      ratingCount: app.totalRatings,
    },
    review: {
      "@type": "Review",
      author: { "@type": "Organization", name: "ReviewRadar" },
      reviewBody: `Analysis of ${analysis.negativeReviews} negative reviews reveals ${analysis.complaints[0]?.category} as the top complaint (${analysis.complaints[0]?.percentage}%).`,
    },
  };
}

// In the page component:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(app, analysis)) }}
/>
```

### `robots.txt` — `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /api/

Sitemap: https://reviewradar.io/sitemap.xml
```

---

## 15. Phase 10: PDF Export

### `src/app/api/export/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Generate a PDF report for an analysis.
 * Uses @react-pdf/renderer on the server.
 * Only available for Starter+ plans.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.plan === "FREE") {
    return NextResponse.json(
      { error: "PDF export requires Starter plan or above" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const analysis = await db.analysis.findUnique({
    where: { id: parseInt(id, 10) },
    include: { app: true, complaints: { orderBy: { rank: "asc" } } },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generate PDF using @react-pdf/renderer
  // Implementation: Create a React component that renders the report
  // and use renderToBuffer() to generate the PDF bytes

  // For MVP, return JSON that the frontend converts to PDF client-side
  return NextResponse.json({
    success: true,
    data: analysis,
    message: "Use client-side PDF generation with this data",
  });
}
```

---

## 16. Design System & UI Patterns

### Brand Identity

```
Primary color:    #2563eb (blue-600)
Accent color:     #7c3aed (violet-600)
Background:       #ffffff (light) / #0f172a (dark mode future)
Text primary:     #0f172a (slate-900)
Text secondary:   #64748b (slate-500)
Border:           #e2e8f0 (slate-200)

Severity colors:
  Critical:       #ef4444 (red-500)     bg: #fef2f2 (red-50)
  High:           #f97316 (orange-500)   bg: #fff7ed (orange-50)
  Medium:         #eab308 (yellow-500)   bg: #fefce8 (yellow-50)
  Low:            #3b82f6 (blue-500)     bg: #eff6ff (blue-50)

Border radius:    rounded-lg (0.5rem) for cards, rounded-md (0.375rem) for buttons
Shadow:           shadow-sm for cards, shadow-md for modals
Font:             Inter (sans), JetBrains Mono (code/data)
```

### Component Patterns

**All buttons** should use consistent variants:
```
Primary:    bg-brand-600 text-white hover:bg-brand-700
Secondary:  bg-white text-slate-700 border border-slate-200 hover:bg-slate-50
Ghost:      bg-transparent text-slate-600 hover:bg-slate-100
Danger:     bg-red-600 text-white hover:bg-red-700
```

**All cards** should follow:
```
bg-white rounded-lg border border-slate-200 p-6 shadow-sm
```

**Loading states**: Use Skeleton components (pulsing gray bars) for every data-dependent component. Never show a blank screen.

**Empty states**: Every list/table needs a friendly empty state with an icon, message, and CTA.

**Error states**: Every API call needs a try/catch with a user-friendly error message. Use toast notifications for transient errors.

---

## 17. Error Handling Patterns

```typescript
// Standard API error response shape — use everywhere
interface ApiError {
  error: string;
  code?: string;
  details?: any;
  upgradeRequired?: boolean;
}

// Standard try/catch wrapper for API routes
async function handleApiRoute(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Frontend: SWR error handling pattern
const { data, error, isLoading } = useSWR(`/api/report/${id}`, fetcher, {
  refreshInterval: data?.analysis?.status === "COMPLETE" ? 0 : 2000,
  onError: (err) => toast.error("Failed to load report"),
});
```

---

## 18. Testing Strategy

### Priority Tests (build these first)

1. **Scraper tests**: Can you fetch reviews for 5 different real apps?
2. **URL parser tests**: Does parseAppUrl correctly handle all URL formats?
3. **LLM pipeline test**: Feed 100 real reviews, verify JSON output is valid
4. **API route tests**: Do all routes return correct status codes and shapes?
5. **Plan limits test**: Does the free tier correctly block after 3 analyses?
6. **Stripe webhook test**: Does plan upgrade correctly update the user record?

### Test commands

```bash
# Add to package.json scripts
"test": "vitest",
"test:scraper": "vitest run src/lib/scraper",
"test:ai": "vitest run src/lib/ai"
```

---

## 19. Deployment Checklist

### Vercel Setup

1. Connect GitHub repo to Vercel
2. Set all environment variables in Vercel dashboard
3. Set `DATABASE_URL` and `DIRECT_URL` for Supabase connection pooling
4. Add custom domain (reviewradar.io)
5. Enable Vercel Analytics

### Supabase Setup

1. Create project in Supabase dashboard
2. Run `npx prisma db push` to create tables
3. Enable Row Level Security (RLS) — but for MVP, API routes handle auth

### External Services Setup

1. **Clerk**: Create application, set redirect URLs, configure webhook endpoint
2. **Stripe**: Create products + prices for Starter/Pro/Team, set webhook endpoint
3. **Upstash**: Create Redis database, copy URL + token
4. **Inngest**: Create account, set signing key
5. **Resend**: Verify domain, get API key
6. **PostHog**: Create project, get API key

### Pre-Launch Checks

- [ ] All env vars set in production
- [ ] Clerk webhook registered and verified
- [ ] Stripe webhook registered and verified
- [ ] Inngest functions deployed and visible in dashboard
- [ ] Sitemap accessible at /sitemap.xml
- [ ] robots.txt accessible
- [ ] OG images rendering correctly (test with https://www.opengraph.xyz)
- [ ] Mobile responsive on all pages
- [ ] Free tier limits working
- [ ] PDF export working
- [ ] Error tracking active (Sentry)
- [ ] Analytics tracking active (PostHog)

---

## Build Order for Cursor

**Follow this exact order. Each step depends on the previous one.**

```
Step 1:  Project setup + install deps + Tailwind config
Step 2:  Prisma schema + db.ts + run prisma db push
Step 3:  Folder structure (create all empty files)
Step 4:  Types (src/types/index.ts)
Step 5:  Scraper library (google-play.ts, app-store.ts, index.ts)
Step 6:  AI library (prompts.ts, gemini.ts, openai.ts, categorize.ts)
Step 7:  API routes (search, analyze, report, history)
Step 8:  Inngest (client.ts, functions.ts, route.ts)
Step 9:  Redis + rate limiting
Step 10: Clerk auth (middleware.ts, webhook route, layout provider)
Step 11: UI components (button, card, badge, skeleton, etc.)
Step 12: Landing page (all sections)
Step 13: Analyze page (search bar, app card, progress)
Step 14: Report page (header, complaint list, charts, paywall blur)
Step 15: Dashboard page (recent analyses, usage meter)
Step 16: Stripe (plans.ts, checkout, webhook route)
Step 17: Pricing page
Step 18: SEO pages (apps/[slug], sitemap.ts, JSON-LD)
Step 19: PDF export
Step 20: Settings page
Step 21: Polish (loading states, error states, empty states, mobile)
```

---

*This spec is designed for AI-assisted development with Cursor. Every section includes exact file paths, code patterns, and implementation details. Follow the Build Order section sequentially.*
