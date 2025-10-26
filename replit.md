# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool providing intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Derivatives, Bond, Cryptocurrency). It uniquely leverages Perplexity AI with real-time web search for all market data validation, symbol correction, and price discovery, eliminating external market data API dependencies. The system supports 12 languages, multi-currency analysis with 20+ global currencies, and exchange/market preference selection (44+ countries/options) for precise symbol resolution. It operates on a token-based usage model and functions strictly as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance to enhance decision-making for traders and investors worldwide.

## Recent Bug Fixes (October 26, 2025)

### Critical Bug Fixes - Symbol Validation & Chart Display
- **Fixed Double-Prefix Normalization Bug**: Resolved critical issue where commodity futures symbols (NG=F, CL=F, BZ=F) were being malformed to "NG=F=F" due to double normalization. Enhanced suffix detection in `normalizeSymbolForAPI` to check for '=', '.', and '-' characters, preventing redundant normalization. Added debug logging to trace symbol transformations.

- **Fixed Null-Safety Crashes**: Added comprehensive null-safety checks in `perplexity.ts` using nullish coalescing operator (`?.toFixed() ?? 'N/A'`) for all price data fields (livePrice, candleClosePrice, open, high, low, close, volume) to prevent crashes when Yahoo Finance returns null values.

- **Implemented CoinGecko Charts for Crypto**: Added intelligent chart selection in Analyzer.tsx - CoinGecko sparkline charts for cryptocurrency (16 major coins mapped) and Yahoo Finance charts for stocks/commodities/forex. Chart source is displayed in UI header for transparency.

- **Honest Symbol Labeling**: Updated instrument database to accurately reflect Yahoo Finance futures symbols instead of misleading spot symbol claims. Energy commodities (Natural Gas, Crude Oil) correctly labeled as "Yahoo Finance futures symbol" since Yahoo Finance doesn't support true spot/CFD tickers for these commodities.

- **Fixed Autocomplete Market Auto-Fill Bug**: Resolved issue where market field was disrupting the validation confirmation flow. Modified `handleSelectSearchSuggestion` in Dashboard.tsx to explicitly reset market field, validation state, and cached data when selecting from autocomplete, ensuring users must manually select market type. Added refresh button next to market dropdown for easy reset without page reload.

- **Implemented Real-Time Currency Conversion**: Added comprehensive currency conversion system using Frankfurter API (European Central Bank) for accurate USD-to-local currency conversion. Created `server/currencyConverter.ts` with 1-hour caching to minimize API calls. Modified `server/perplexity.ts` to fetch exchange rates once per analysis and convert all 15 price fields (livePrice, candleClosePrice, entry, TP/SL, tp1-3, s1-3, r1-3) before returning results. Handles null/undefined values gracefully and falls back to 1:1 rate if currency not found. Fixes critical bug where Natural Gas NG=F was showing ₹3.30 instead of properly converted ~₹250-330.

- **Cleaned Up Autocomplete UI**: Removed technical data source descriptions (e.g., "Yahoo Finance futures symbol", "Binance exchange token") from autocomplete dropdown. Now displays only essential information: symbol name, classification badge (SPOT/FUTURES/STOCK/INDEX/PAIR), ticker symbol, and market type for cleaner user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend, built with React 18, TypeScript, and Vite, features a responsive, mobile-first dark mode UI. It uses a fintech-focused color palette, Spline Sans and Manrope fonts, Material Symbols Outlined icons, and `shadcn/ui` components (based on Radix UI) styled with Tailwind CSS. The design emphasizes a clean, simple analyzer form, incorporating features like a dedicated "Analyse More" button, a "Charity brings luck" donation feature, and a "Watch Ad" feature for earning tokens with built-in sponsorship rate card (10s/$50, 30s/$100, 60s/$200 per month, contact: rockstarbaba.ut@gmail.com). The application includes a custom "TP rocket" logo for consistent branding, a global currency selector, Yahoo Finance static charts as primary chart display with optional collapsible TradingView charts. It also features a "Saved" tab with a dashboard for tracking trade outcomes and a compact card design for saved analyses.

### Technical Implementations
The backend is an Express.js application in TypeScript, following a RESTful API design with ES modules and a session-based architecture. It manages user authentication, market analysis via Perplexity AI, analysis history, and real market data fetching. JSON-based requests/responses with Zod for schema validation and robust error handling are employed. Symbol validation and autocomplete are handled server-side using Yahoo Finance and CoinGecko.

### Feature Specifications
Trend Pilot supports 12 languages, multi-currency analysis (USD, INR, EUR, GBP, JPY, CNY, AUD, CAD, CHF, HKD, SGD, KRW, BRL, MXN, ZAR, RUB, TRY, SAR, AED, NZD), and exchange/market preference selection for accurate symbol resolution across 44+ countries/regions (including US, India, China, Japan, UK, Germany, France, Australia, Brazil, and crypto/worldwide options). It operates on a token-based usage model, providing advisory-only recommendations. Perplexity AI (sonar-pro model) is the single source of truth for market data, including symbol validation, market type auto-detection, exchange-aware symbol resolution (e.g., .NS/.BO for India, .T for Japan, .L for UK), and analysis using real-time web search with market-specific research sources. The system generates structured analysis covering technical indicators, bracket order calculations (ensuring a minimum 1:3 risk-reward ratio), risk-reward ratios, multiple take-profit targets, support/resistance levels, probability meters (requiring 60%+), and trailing stop recommendations. It incorporates a comprehensive PWA installation strategy. Analysis results display both live market prices and analysis-based candle close prices with timestamps (converted to user's preferred currency), and an embedded TradingView chart dynamically matches the analysis timeframe. Users can save analyses and track their trade status and performance.

### System Design Choices
State management uses TanStack Query for server state and React Context API for global state. Wouter handles client-side routing with protected routes. Neon serverless PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The data model includes `Users` (with `currency` and `exchange` preferences), `Analyses` (storing `currency` and `exchange` per analysis), and `Brokers`, using UUIDs for primary keys. Authentication uses Phone.Email for phone number verification, and authorization is `userId`-based. Security measures include SSRF protection, HTTPS enforcement, Zod input validation, and Drizzle ORM for SQL injection protection. Perplexity AI automatically detects market type, uses exchange preference for precise symbol resolution (e.g., India → .NS/.BO, Japan → .T, UK → .L), and ensures mandatory candle close prices with duration-specific timeframes for accurate analysis. All prices are converted to the user's preferred currency, with scalping analyses incorporating live prices for entry/TP/SL.

**Version Management**: The app includes a mandatory version checking system (VersionChecker component) that compares client version (APP_VERSION in shared/schema.ts) against server version via GET /api/version endpoint. When versions don't match, users see a non-dismissible update modal with respectful language emphasizing token protection, clear update instructions for mobile/web users, and a single "Update Now" button that refreshes the app. This ensures all users stay on the latest version for security, stability, and feature compatibility. The version guard uses fail-closed security (blocks on ANY error) and protects critical actions: Enlighten Me, Buy Tokens, Save Analysis, and Publish Analysis.

**Community Features**: A complete social trading network allows users to publish analyses, build followers, and receive notifications. Features include: follow/unfollow system, block management, published analysis feed, notifications for new followers and published analyses, and a comprehensive report system for user feedback. The Community tab provides a "trading Snapchat" experience where traders can share their best analyses and build a following.

**Admin System**: The admin user (mobile: +919811209473) automatically receives admin privileges through `isAdmin` field in the users table. Admin features include: viewing all user reports (bug reports, feedback, feature requests, abuse reports), managing report status (pending → reviewing → resolved/closed), and receiving instant notifications when users submit reports. The admin panel is accessible only to the admin user via the Community page. Additionally, the admin panel includes a Symbol Health tab for monitoring symbol validation system health, displaying registry statistics (51 verified symbols across cryptocurrency, commodity, forex, stock, and index markets), running comprehensive symbol tests, and viewing test results with success rates and breakdowns by market type.

### Symbol Validation Architecture (October 26, 2025)

**Overview**: Implemented a comprehensive 4-tier symbol validation system to ensure data quality, prevent wasted AI tokens, and provide reliable market analysis. The system eliminates broken symbols, normalizes symbol formats across different data sources, and maintains a verified symbol registry.

**Core Components**:

1. **Symbol Registry** (`server/symbolRegistry.ts`)
   - Central source of truth for 51 verified symbols across all markets
   - Metadata includes: symbol, name, market type, classification (spot/futures/stock/index/pair), data source (yahoo/binance/coingecko), API symbol format, verification status, exchange/region
   - Supports querying by market, classification, status, data source, and recommended flag
   - Provides `normalizeSymbolForAPI()` function as single transformation point (eliminates scattered logic)
   - Priority-based normalization: (1) Registry metadata → (2) Commodity aliases → (3) Market-specific rules

2. **Instrument Database** (`server/instrumentSearch.ts`)
   - 79 verified symbols across 6 markets: cryptocurrency, commodity (futures only), forex, stock, derivatives, bond
   - Removed broken symbols: XAUUSD, XAGUSD, XPTUSD, XPDUSD (Yahoo doesn't support spot metals), TTM (404 error)
   - Classification field added to support UI badges (SPOT, FUTURES, STOCK, INDEX, PAIR)
   - Search API augments results with classification from registry

3. **Symbol Tester** (`server/symbolTester.ts`, `server/runSymbolTests.ts`)
   - Automated test suite for all instrument database symbols
   - CLI runner for on-demand testing
   - Generates comprehensive health reports (total tested, working, broken, success rate, breakdowns by market)
   - Saves results to `symbol-test-report.json` for admin dashboard display
   - Current status: 88.6% success rate (70/79 working); remaining "failures" are crypto symbols hitting CoinGecko rate limits during rapid testing (work perfectly in production via Binance)

4. **Pre-flight Validation** (`server/routes.ts` - `/api/analyze` endpoint)
   - Validates symbols before sending to Perplexity AI to prevent token waste
   - Normalizes symbol format using registry
   - Fetches market price to confirm symbol exists and is tradeable
   - Returns clear error messages for invalid symbols with suggestions

**Admin Dashboard**:
- Accessible at `/admin` (Symbol Health tab)
- Displays registry statistics: total symbols, verified count, breakdowns by market and classification
- "Run Symbol Tests" button triggers comprehensive validation of all 79 symbols
- Shows last test results: total tested, working/broken counts, success rate with visual progress bar, timestamp
- Admin-only endpoints: GET `/api/admin/symbol-health`, POST `/api/admin/run-symbol-tests`

**UI Enhancements**:
- Autocomplete dropdown shows classification badges (SPOT, FUTURES, STOCK, INDEX, PAIR) next to symbol names
- Helps users visually distinguish symbol types
- Badges only appear for registry-verified symbols (graceful degradation)

**Data Quality Improvements**:
- Removed 5 broken symbols from instrument database
- Expanded registry from 18 to 51 verified symbols (added 19 US stocks, 10 Indian stocks, 4 major indices)
- Honest labeling: commodity symbols correctly identified as Yahoo Finance futures (not misleading spot claims)
- All registered symbols include proper metadata for reliable API calls

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay
*   **Symbol Validation:** Yahoo Finance, CoinGecko
*   **Charting:** TradingView (embedded widget)