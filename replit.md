# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool providing intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Cryptocurrency). It uniquely leverages Perplexity AI with real-time web search for all market data validation, symbol correction, and price discovery, eliminating external market data API dependencies. The system supports 12 languages, multi-currency analysis with 20+ global currencies, and exchange/market preference selection for precise symbol resolution. It operates on a token-based usage model and functions strictly as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance to enhance decision-making for traders and investors worldwide.

## Recent Bug Fixes (October 26, 2025)

**SESSION 4 FIXES - Latest:**

1. **Added Exchange Rate Display** - Analysis results now show live conversion rates:
   - Added `exchangeRate` field to database schema (captures rate like "83.45")
   - Perplexity service now returns exchange rate when currency conversion occurs
   - UI displays: "Prices converted from USD to INR at 1 USD = ₹83.45"
   - Rate is null for forex pairs (prices ARE the rate) and same-currency scenarios

2. **Fixed Static Probability Scores (~72% bias)** - Dynamic probability generation:
   - Enhanced Perplexity prompt with explicit probability bands
   - Strong setups: 75-90%, Moderate: 55-74%, Weak: 40-54%
   - AI now analyzes real indicator confluence instead of defaulting to ~70%

3. **Fixed "No Analyses Yet" Bug in Community** - Public feed now working:
   - Changed `getPublishedAnalysesFeed()` from "followed users only" to "all published analyses"
   - Removed restrictive INNER JOIN with follows table
   - Now shows ALL published analyses (public feed) except from blocked users

4. **Database Schema Ready for Community Overhaul:**
   - Users: Added alias (10 char), rulesAccepted, lastSeen, isBanned fields
   - Messages: New table for direct user-to-user messaging (1000 char limit)
   - Reports: Enhanced with reportedUserId/reportedAnalysisId for community moderation
   - All schema changes pushed successfully and ready for UI implementation

**LATEST CRITICAL FIXES (Session 3):**

1. **Fixed Bracket Trade Prices Showing 0.0000** - Resolved critical bug where Entry, Take Profit, and Stop Loss displayed 0.0000 even when analysis succeeded:
   - **Root Cause**: Perplexity AI prompt template provided text descriptions instead of numeric examples for bracket prices
   - **Prompt Fix**: Updated lines 242-261 in server/perplexity.ts to provide numeric placeholders calculated from base price (e.g., takeProfit: 153.87, stopLoss: 152.65)
   - **Defensive Parsing**: Added validatePrice() function with multi-tier fallback system:
     - Primary: livePrice (for scalping) or candleClosePrice (for other durations)
     - Secondary: candleClosePrice
     - Tertiary: OHLCV close price
     - Last resort: Safe mid-price of 100 (extreme edge case)
   - **Guarantee**: Bracket prices NEVER show 0.0000, even if AI returns invalid data
   - **Logging**: Added detailed logging to monitor when fallbacks are used

**LATEST CRITICAL FIXES (Session 2 - Earlier Tonight):**

1. **Fixed Forex Pair Currency Conversion Bug** - CAD/USD now analyzes correctly as CAD/USD instead of being incorrectly converted to CAD/INR:
   - Moved `getExchangeCurrency()` call BEFORE all conversion logic in perplexity.ts (line 457)
   - Added `isForexPairSymbol` check that detects forex pairs (=X suffix, slash format, 6-letter currency codes) and skips conversion entirely
   - Forex pairs now use 4 decimal precision (e.g., 1.3547 for CAD/USD exchange rate)
   - The "price" of forex pairs IS the exchange rate itself, not a convertible price

2. **Fixed Double Currency Conversion Regression** - TATAMOTORS.NS now shows ₹403.50 instead of ₹35,637:
   - Added `isSameCurrency` check to detect when source currency matches target currency (lines 464-537)
   - When Yahoo Finance returns INR prices and user currency is INR, prices are used as-is without conversion
   - Previously: INR price (403.50) was treated as USD, then converted to INR (403.50 × 83.45 = 33,630) - DOUBLE CONVERSION BUG
   - Now: If source=target currency, prices are formatted directly without conversion
   - Conversion only happens when truly needed (e.g., USD stock price → INR for Indian user)

3. **Improved TradingView Chart Compatibility** - Charts now work for all markets with better exchange detection:
   - Removed forced NASDAQ: prefix for US stocks (line 127 in utils.ts)
   - TradingView now auto-detects correct exchange (NYSE, NASDAQ, ARCA) for better compatibility
   - Indian stocks: Use base symbol only (TATAMOTORS instead of NSE:TATAMOTORS) to let TradingView auto-detect exchange
   - Commodities: GC=F → TVC:GOLD, CL=F → TVC:USOIL
   - Forex: CADUSD=X → FX_IDC:USDCAD
   - Crypto: BTCUSDT → BINANCE:BTCUSDT

4. **Added Comprehensive Forex Pair Autocomplete** - 80+ explicit forex pairs to prevent Yahoo Finance auto-conversion:
   - All major pairs: EURUSD=X, GBPUSD=X, USDJPY=X, USDCHF=X, AUDUSD=X, NZDUSD=X, USDCAD=X
   - Cross pairs: EURGBP=X, EURJPY=X, GBPJPY=X, EURAUD=X, GBPAUD=X, AUDJPY=X, etc.
   - Emerging market pairs: USDINR=X, USDCNY=X, USDBRL=X, USDMXN=X, USDZAR=X, USDKRW=X, etc.
   - Both directions: CADUSD=X (CAD/USD) AND USDCAD=X (USD/CAD) to cover all user preferences
   - Updated server/instrumentSearch.ts with explicit 6-letter format (e.g., JPYGBP=X instead of ambiguous JPY=X)

**Critical Fixes - Previous Session:**

1. **Fixed Critical Currency Conversion Math Error** - Resolved incorrect price conversion bug where TATAMOTORS.NS was showing ₹35,637 instead of ₹403.50. Issue was prices being multiplied by exchange rate instead of divided. Implemented smart currency conversion system:
   - Added `getExchangeCurrency()` function that maps exchange suffixes to native currencies (.NS/.BO→INR, US→USD, .L→GBP, .T→JPY, etc.)
   - Yahoo Finance returns prices in exchange's native currency, conversion only happens when source currency differs from user's selected currency
   - Added `sourceCurrency` field to database schema to track original price currency
   - Updated `convertPrice()` to accept source and target currencies, returns both converted price and exchange rate
   - Analysis disclaimer now shows conversion info: "Prices converted from INR to USD at 1 USD = ₹83.45" or "Prices in native currency (INR)"

2. **Fixed Null-Safety Crash in Perplexity Analysis** - Resolved "Cannot read properties of null (reading 'toFixed')" error when analyzing symbols like TATAMOTORS.NS. Added optional chaining (`?.toFixed()`) with fallback values in perplexity.ts lines 220, 221, 236, 266. Prevents crashes when Yahoo Finance returns null prices.

3. **Fixed Duplicate Market Dropdown Labels** - Corrected market dropdown showing "Commodity/Forex/MCX Market" twice. Updated translations.ts to display distinct labels: "Commodity Market" and "Forex Market" for clearer user experience.

4. **Enhanced Currency Conversion in Confirmation Popup** - Symbol validation popup now shows prices in user's selected currency (e.g., ₹34,145.85 for INR) instead of hardcoded USD. Implemented getCurrencySymbol() helper and convertPrice() function using Frankfurter API for real-time exchange rates with proper currency symbols (₹, €, £, ¥, etc.).

**Latest TradingView Chart Integration & Exchange Options:**
- Added "Commodity" and "Forex" exchange options in dropdown (placed after "Crypto") for users analyzing gold, crude oil, or forex pairs
- Fixed critical forex pair bug: CAD/USD now analyzes correctly as CAD/USD instead of being converted to user's currency (e.g., CAD/INR)
- Implemented smart forex pair detection: symbols with =X suffix, / separator, or 6-letter currency pairs (EURUSD, CADUSD) bypass currency conversion
- **Switched to TradingView charts for ALL markets** (stocks, commodities, forex, cryptocurrency) - Yahoo Finance static images removed
- Created comprehensive symbol converter for TradingView compatibility:
  - Stocks: .NS → NSE:, .BO → BSE:, .L → LSE:, .T → TSE:, .HK → HKEX:, .AX → ASX:, .TO → TSX:, US stocks → NASDAQ:
  - Commodities: GC=F → TVC:GOLD, SI=F → TVC:SILVER, CL=F → TVC:USOIL, NG=F → TVC:NATURALGAS
  - Forex: CADUSD=X → FX_IDC:USDCAD, EURUSD → FX_IDC:EURUSD
  - Crypto: BTCUSDT → BINANCE:BTCUSDT (unchanged)

**Market Simplification & Previous Fixes:**
- Simplified market types from 6 to 4 options: Stock (includes futures/derivatives), Cryptocurrency, Commodity, Forex
- Fixed exchange persistence bug (added 'exchange' to backend validation)
- Implemented 4-tier symbol validation system (51 verified symbols)
- Real-time currency conversion for all price fields using Frankfurter API

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend, built with React 18, TypeScript, and Vite, features a responsive, mobile-first dark mode UI. It uses a fintech-focused color palette, Spline Sans and Manrope fonts, Material Symbols Outlined icons, and `shadcn/ui` components (based on Radix UI) styled with Tailwind CSS. The design emphasizes a clean, simple analyzer form, incorporating features like a dedicated "Analyse More" button, a "Charity brings luck" donation feature, and a "Watch Ad" feature for earning tokens. The application includes a custom "TP rocket" logo, a global currency selector, Yahoo Finance static charts as primary chart display with optional collapsible TradingView charts. It also features a "Saved" tab with a dashboard for tracking trade outcomes and a compact card design for saved analyses.

### Technical Implementations
The backend is an Express.js application in TypeScript, following a RESTful API design with ES modules and a session-based architecture. It manages user authentication, market analysis via Perplexity AI, analysis history, and real market data fetching. JSON-based requests/responses with Zod for schema validation and robust error handling are employed. Symbol validation and autocomplete are handled server-side using Yahoo Finance and CoinGecko.

### Feature Specifications
Trend Pilot supports 12 languages, multi-currency analysis (20+ global currencies), and exchange/market preference selection across 44+ countries/regions. It operates on a token-based usage model, providing advisory-only recommendations. Perplexity AI (sonar-pro model) is the single source of truth for market data, including symbol validation, market type auto-detection, exchange-aware symbol resolution, and analysis using real-time web search with market-specific research sources. The system generates structured analysis covering technical indicators, bracket order calculations (ensuring a minimum 1:3 risk-reward ratio), risk-reward ratios, multiple take-profit targets, support/resistance levels, probability meters (requiring 60%+), and trailing stop recommendations. It incorporates a comprehensive PWA installation strategy. Analysis results display both live market prices and analysis-based candle close prices with timestamps (converted to user's preferred currency), and an embedded TradingView chart dynamically matches the analysis timeframe. Users can save analyses and track their trade status and performance.

### System Design Choices
State management uses TanStack Query for server state and React Context API for global state. Wouter handles client-side routing with protected routes. Neon serverless PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The data model includes `Users` (with `currency` and `exchange` preferences), `Analyses` (storing `currency` and `exchange` per analysis), and `Brokers`, using UUIDs for primary keys. Authentication uses Phone.Email for phone number verification, and authorization is `userId`-based. Security measures include SSRF protection, HTTPS enforcement, Zod input validation, and Drizzle ORM for SQL injection protection. Perplexity AI automatically detects market type, uses exchange preference for precise symbol resolution, and ensures mandatory candle close prices with duration-specific timeframes for accurate analysis. All prices are converted to the user's preferred currency, with scalping analyses incorporating live prices for entry/TP/SL.

The application includes a mandatory version checking system to ensure users are always on the latest version. A complete social trading network allows users to publish analyses, build followers, and receive notifications. An admin system provides capabilities for viewing user reports, managing their status, and monitoring symbol validation health.

A comprehensive 4-tier symbol validation system ensures data quality and prevents wasted AI tokens. This system includes a Symbol Registry (central source of truth for 51 verified symbols), an Instrument Database (79 verified symbols across 6 markets), a Symbol Tester (automated test suite), and Pre-flight Validation (validates symbols before sending to Perplexity AI). The Admin Dashboard provides tools for monitoring symbol health and running tests.

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay
*   **Symbol Validation:** Yahoo Finance, CoinGecko
*   **Charting:** TradingView (embedded widget)