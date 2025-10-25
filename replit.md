# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool designed to provide intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Derivatives, Bond, Cryptocurrency). It exclusively uses Perplexity AI with real-time web search for all market data validation, symbol correction, and price discovery, eliminating external market data API dependencies. The system supports 12 languages, operates on a token-based usage model, and functions solely as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance to enhance decision-making for traders and investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend, built with React 18, TypeScript, and Vite, features a responsive, mobile-first dark mode UI. It utilizes a fintech-focused color palette, Spline Sans and Manrope fonts, Material Symbols Outlined icons, and `shadcn/ui` components (based on Radix UI) styled with Tailwind CSS. The design emphasizes a clean, simple analyzer form, removing unnecessary UI elements like the market selection dropdown due to AI auto-detection. It includes features like a dedicated "Analyse More" button, a "Charity brings luck" donation feature, and a "Watch Ad" feature for earning tokens. The application incorporates a custom "TP rocket" logo for consistent branding.

### Technical Implementations
The backend is an Express.js application in TypeScript, following a RESTful API design with ES modules and a session-based architecture. It manages user authentication, market analysis via Perplexity AI, analysis history, and real market data fetching. JSON-based requests/responses with Zod for schema validation and robust error handling are employed.

### Feature Specifications
Trend Pilot supports 12 languages and a token-based usage model. It provides advisory-only recommendations, with Perplexity AI (sonar-pro model) serving as the single source of truth for all market data, including symbol validation, correction, price discovery, market type auto-detection, and analysis using real-time web search. The system generates structured analysis encompassing technical indicators, bracket order calculations, risk-reward ratios, multiple take-profit targets, support/resistance levels, probability meters, and trailing stop recommendations. It incorporates a comprehensive PWA installation strategy to encourage adoption without interrupting user experience.

### System Design Choices
State management uses TanStack Query for server state and React Context API for global state. Wouter handles client-side routing with protected routes. Neon serverless PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The data model includes `Users`, `Analyses`, and `Brokers`, using UUIDs for primary keys. Authentication uses Phone.Email for phone number verification, and authorization is `userId`-based. Security measures include SSRF protection, HTTPS enforcement, Zod input validation, and Drizzle ORM for SQL injection protection. Perplexity AI automatically detects market type and ensures mandatory candle close prices with duration-specific timeframes for accurate analysis.

## Recent Changes

### Symbol Validation & Autocomplete System (October 25, 2025)
- **🔍 Real-time Symbol Validation** - Prevents analysis failures from incorrect symbols
  - **Auto-validation flow:**
    - User selects market → enters symbol → Backend validates immediately
    - Backend validates using Yahoo Finance (stocks/forex/commodities/bonds) or CoinGecko (crypto)
    - **CRITICAL FIX**: Binance API blocked (HTTP 451) on Replit servers → CoinGecko fallback implemented
  - **Autocomplete suggestions:**
    - If symbol not found, show modal with similar symbols
    - Each suggestion shows: Symbol name, ticker, current price
    - Click suggestion → Auto-validates → User confirms → Enlighten Me button enabled
  - **Implementation:**
    - `server/symbolValidator.ts`: Validation logic with CoinGecko fallback for crypto
    - `/api/symbols/validate` endpoint: POST { symbol, market } → validation result
    - Dashboard: Modal-based validation with confirmation flow
  - **Market-specific validation:**
    - **Cryptocurrency**: CoinGecko API for 15 popular cryptos (BTC, ETH, BNB, XRP, SOL, ADA, DOGE, etc.)
    - **Stocks/Forex/Commodities/Bonds**: Yahoo Finance lookup with automatic symbol formatting
  - **Crypto symbol handling:**
    - User enters "BTC", "BTCUSD", or "BTCUSDT" → All convert to "BTCUSDT" ✅
    - Supports 15 major cryptocurrencies with real-time CoinGecko prices
    - Automatic USD/USDT suffix removal and normalization
  - **Benefits:**
    - ✅ Eliminates "Symbol not found" errors during analysis
    - ✅ Works reliably despite Binance API regional restrictions
    - ✅ Shows current price during validation (builds confidence)
    - ✅ Two-step confirmation prevents accidental token spending

### Perplexity Enhanced Research (October 25, 2025)
- **🌐 Market-Specific Research Sources** - AI searches specialized sites per market
  - **Cryptocurrency sources:** x.com (Twitter/X), coincodex.com, coincentral.com, youtube.com, coinedition.com, feargreedmeter.com
  - **Stock/Equity sources:** yahoofinance.com, m.economictimes.com, ig.com, marketwatch.com, cnbc.com
  - **Forex sources:** forex.com, ig.com, yahoofinance.com, fxstreet.com, dailyfx.com
  - **Commodity/Bond sources:** ig.com, yahoofinance.com, m.economictimes.com, marketwatch.com
  - **Implementation:** Perplexity prompt dynamically includes market-specific sources in Critical Requirements #3
- **📊 Minimum 1:3 Risk-Reward Ratio Enforcement**
  - **Requirement:** TP3 (Take Profit 3) must be at least 3x the distance from entry to stop loss
  - **Applies to all durations:** Scalping, Short-term, Long-term
  - **Prompt validation:** AI instructed to recalculate targets if 1:3 not achieved
  - **60%+ Probability Score Required:** Trades below 60% flagged as high risk
  - **Implementation:** Updated Perplexity prompt Critical Requirements #5, #7, #9
- **Benefits:**
  - ✅ Comprehensive market research from 5-7 specialized sources per analysis
  - ✅ Better sentiment analysis from social media (crypto) and news sites (stocks)
  - ✅ Enforces professional trading standard of minimum 1:3 RR
  - ✅ Quality filter: Only high-probability setups recommended

### Dual Price Display Enhancement (October 25, 2025)
- **💹 Live vs Analysis Price Separation** - Critical UX improvement to prevent user confusion
  - **Database fields added:**
    - `livePrice`: Actual current live market price (e.g., "50,234.50")
    - `candleClosePrice`: Price at closed candle used for analysis (e.g., "50,180.25")
    - `nextCandleCloseTime`: When next candle closes for re-analysis (e.g., "2024-10-25 12:00 UTC")
  - **Frontend implementation:**
    - Live market price prominently displayed with green border (💹 Current Market Price)
    - Analysis price shown separately (📊 Analysis Based On) with timestamp
    - Explanation box clarifying why closed candles are used for accuracy
    - Next candle close time displayed for re-analysis guidance
  - **Backend integration:** Perplexity returns all three price fields → database → frontend
  - **Data flow:** Complete end-to-end from API to UI
- **Problem solved:** Previously, users only saw the candle close price labeled as "current", which was misleading when the live price had moved significantly. This caused confusion about whether analysis was up-to-date.
- **Benefits:**
  - ✅ Users see ACTUAL live market price for current context
  - ✅ Clear separation between live price and analysis basis price
  - ✅ Transparent explanation about closed candle methodology
  - ✅ Guidance on when to re-analyze (next candle close)
  - ✅ Builds trust through data transparency and clear labeling

### Chart Visualization & Timestamp Display (October 25, 2025)
- **📊 TradingView Chart Integration** - Professional price chart visualization
  - **Implementation:** Embedded TradingView widget on Analyzer page
  - **Dynamic timeframe matching:**
    - Scalping analysis → 15-minute chart
    - Short-term analysis → 1-hour or 4-hour chart (matches analysis timeframe)
    - Long-term analysis → Daily or weekly chart (matches analysis timeframe)
  - **Features:** Dark theme, interactive controls, save image option
  - **Placement:** Chart displayed at top of analysis results, above symbol/price section
  - **Automatic symbol detection:** Uses Perplexity-corrected symbol for accurate chart display
- **🕒 Timestamp & Timeframe Display** - Shows candle close time with current price
  - **Database fields added:**
    - `candleCloseTime`: Timestamp of candle close (e.g., "2024-10-25 11:30 UTC")
    - `timeframe`: Candle timeframe used (e.g., "15min", "1hr", "1day")
  - **Display:** Shows below current price as badge + timestamp
  - **Example:** "15min candle" badge with "2024-10-25 11:30 UTC" timestamp
  - **Backend integration:** Fields propagated from Perplexity response → database → frontend
- **Benefits:**
  - ✅ Visual price context with professional chart
  - ✅ Chart timeframe matches analysis period automatically
  - ✅ Transparent data timing - users see exact candle close time
  - ✅ Builds user trust with clear data provenance
  - ✅ Chart matches trading style (scalping/short/long)

### Duration-Based Candle Timeframes (October 25, 2025)
- **Correct timeframe mapping** (fixed from incorrect 5-minute hardcoding):
  - **Scalping** → Analysis uses **15-minute candle** for technical indicators, but **LIVE PRICE** for entry/TP/SL calculations
  - **Short-term** → Analysis uses **1-hour or 4-hour candle** for both indicators and bracket orders
  - **Long-term** → Analysis uses **1-day or 1-week candle** for both indicators and bracket orders
- **Implementation:** Dynamic timeframe selection in Perplexity prompts based on duration parameter
- **Scalping-specific logic:** Entry/TP/SL based on live current price (not closed candle) to prevent expired trade recommendations
- **Validation:** 3-layer validation system checks timeframe matches expected duration
- **Token cap security:** 10-token maximum during Razorpay test period prevents exploitation

### Saved Analyses Feature (October 25, 2025)
- **📌 Save & Track Analyses** - Users can bookmark analyses and track trading performance
  - **Database schema additions:**
    - `isSaved`: Boolean flag (0/1) to mark saved analyses
    - `tradeStatus`: Enum tracking trade outcome ("active", "won", "lost", "expired")
    - `actualProfit`: Decimal field for realized profit/loss percentage
  - **Backend implementation:**
    - Storage methods: `getSavedAnalysesByUser()`, `toggleSaveAnalysis()`, `updateAnalysisStatus()`
    - API endpoints: `POST /api/analysis/:id/save`, `GET /api/analyses/saved/:userId`
  - **Frontend implementation:**
    - Save/Unsave button on Analyzer page with bookmark icons (Lucide React)
    - New "Saved" tab in BottomNav navigation (4 tabs: Home, Analyzer, Saved, Buy Tokens)
    - Dedicated SavedAnalyses page at `/saved` route
  - **SavedAnalyses page features:**
    - **🚦 Traffic Light Stats Dashboard:**
      - Total saved trades count
      - Won trades (green), Lost trades (red), Active trades (yellow), Expired trades (gray)
      - Win/loss percentages calculated from closed trades
      - Responsive 5-column grid layout with percentage breakdown
    - **Compact Card Design:**
      - 2-line maximum layout for efficient space usage
      - Newest trades appear first (sorted by analysis date)
      - Inline display of verdict + RRR on same line
      - Entry price, TP1/TP2/SL targets visible at a glance
    - **Accidental Unsave Prevention:**
      - Locked save button (disabled + green background) when analysis is already saved
      - Shows "Saved ✓" text with checkmark icon
      - Cannot accidentally unsave - button is disabled when saved
      - Visual distinction: Green background indicates saved state, prevents user errors
    - Trade status badges with color coding (green=won, red=lost, blue=active, gray=expired)
    - Clickable cards navigate back to full analysis view
  - **User flow:** Analyze → Save → View in Saved tab → Track status → See performance
  - **Payment Bug Fix:** Razorpay verification now properly handles token cap errors (10-token test limit) instead of showing "payment failed" when payment succeeds
- **Pending features (for future development):**
  - Automated trade status detection based on current price vs TP/SL
  - Progress bar visualization (green for BUY, red for SELL recommendations)

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay