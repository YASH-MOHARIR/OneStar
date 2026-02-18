# ReviewRadar

AI-powered app review analysis for Google Play & App Store. Scrape reviews, categorize complaints with LLMs, and surface actionable insights.

## Quick Start

1. **Install dependencies** (already done)
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add:
   - `DATABASE_URL` + `DIRECT_URL` — PostgreSQL (e.g. Supabase)
   - `GEMINI_API_KEY` — For LLM categorization
   - `OPENAI_API_KEY` — Fallback LLM (optional)
   - `NEXT_PUBLIC_CLERK_*` + `CLERK_SECRET_KEY` — For auth (analyze requires sign-in)

3. **Database setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run dev server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `src/lib/scraper/` — Google Play & App Store scraping
- `src/lib/ai/` — Gemini/OpenAI categorization pipeline
- `src/lib/inngest/` — Background jobs (analysis runs async)
- `src/app/api/` — Search, analyze, report endpoints

## API Endpoints

- `GET /api/search?q=spotify` — Search apps by name
- `POST /api/analyze` — Start analysis (requires auth)
- `GET /api/report/[id]` — Get analysis results

## Spec

Full implementation spec: `../ReviewRadar-Cursor-Spec.md`
