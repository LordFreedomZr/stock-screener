# Stock Screener IDX

Smart stock screening with momentum & volume analysis for IDX stocks.

## Features

- **Dashboard Screening** - View all screened stocks with real-time updates
- **Technical Indicators** - RSI, MACD, ROC, RVOL, OBV, ATR
- **Watchlist** - Monitor selected stocks with continuous evaluation
- **Accuracy Dashboard** - Track prediction accuracy over time
- **Dark Mode** - Futuristic dark UI optimized for mobile

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Charts**: TradingView Lightweight Charts
- **Styling**: Tailwind CSS v4
- **PWA**: next-pwa

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL in `supabase/schema.sql`
   - Copy your project URL and anon key

4. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

See `supabase/schema.sql` for the complete database schema.

## License

Personal use only.
