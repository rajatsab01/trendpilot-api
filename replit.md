# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial advisory tool for comprehensive financial markets. It delivers intelligent buy/sell recommendations and bracket order analysis by examining financial symbols across multiple timeframes (long-term, short-term, scalping). It uses Perplexity AI with real-time web search as the **exclusive source** for all market data validation, symbol correction, and price discovery. The system supports 12 languages and operates on a token-based usage model. It is an ADVISORY-ONLY tool and does NOT execute trades automatically.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript using Vite, featuring a mobile-first, responsive dark mode UI. State management is handled by TanStack Query for server state and React Context API for global state. Wouter manages client-side routing with protected authentication-required routes. UI components are `shadcn/ui` based on Radix UI, styled with Tailwind CSS, and feature a fintech-focused color palette. Typography uses Spline Sans and Manrope fonts with Material Symbols Outlined icons.

### Backend Architecture

The backend is an Express.js application written in TypeScript, following a RESTful API design. It uses ES modules and a session-based architecture with `userId` stored client-side. API endpoints manage user authentication, market analysis via Perplexity AI (with real-time web search), analysis history, and real market data fetching. Requests and responses are JSON-based, with Zod for schema validation and robust error handling.

### Data Storage Solutions

PostgreSQL, specifically Neon serverless PostgreSQL, is the primary database. Drizzle ORM provides type-safe database operations and schema management. The data model includes `Users`, `Analyses` (historical records), and `Brokers` (integration configurations). UUIDs are used for primary keys.

### Authentication & Authorization

Authentication uses Phone.Email for phone number verification, allowing login/registration without app downloads. It supports automatic migration of legacy phone numbers to international format. Authorization is userId-based, with API endpoints validating user existence. Security measures include SSRF protection, HTTPS enforcement, input validation via Zod, and SQL injection protection through Drizzle ORM.

### System Design Choices

The application supports 12 languages, a token-based usage model, and provides advisory-only recommendations. **Perplexity AI (sonar-pro model) is the single source of truth for ALL market data** - it validates symbols, corrects misspellings, discovers current prices, and performs analysis using real-time web search. There are no external market data API dependencies (CoinGecko, Yahoo Finance). This generates structured analysis including technical indicators and bracket order calculations based on actual market prices sourced by Perplexity. The system calculates and displays a risk-reward ratio for trade evaluation. Market types include: Stock Market (Equities), Commodity Market, Forex, Derivatives (Futures), Bond Market, and Cryptocurrency Market.

## External Dependencies

*   **AI Service & Market Data:** Perplexity AI (sonar-pro model) - **single source of truth** for symbol validation, price discovery, and market analysis via real-time web search
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment:** Razorpay for token purchases
## Recent Changes (October 24, 2025)

### New Features: Analyse More & Charity Donation (October 24, 2025)
- **"Analyse More" button on Analyzer results screen**
  - Green button at bottom of results navigates back to Dashboard
  - Allows users to perform another analysis immediately
  - Translated across all 12 languages
- **"Charity brings luck" donation feature**
  - Gradient heart-icon button on Dashboard and dedicated /charity page
  - Flexible donation amounts (₹10 minimum)
  - Quick amount buttons: ₹50, ₹100, ₹500
  - Razorpay integration for secure payments
  - Receipt format: `char_${shortUserId}_${timestamp}` (~22 chars)
  - Payment verification via HMAC SHA256 signature
  - **Enhanced Good Karma section** with inspirational content about money's energy and trading philosophy
  - **Stories section** featuring five karma stories:
    - "The Trader's Pause" - about good karma as a risk management tool
    - "The Missed Trade" - about the universe paying interest on kindness
    - "The Coin That Returned" - about money leaving with blessings and returning with interest
    - "The Analyst's Gift" - about sharing knowledge and receiving support
    - "The Candle in the Chart" - about The Karma Portfolio and gratitude in trading
  - **Note:** Donations not currently persisted to database (enhancement opportunity)

### Critical Razorpay Fix (October 24, 2025)
- **Fixed token purchase error - Razorpay receipt length issue**
  - **Problem:** Receipt field exceeded Razorpay's 40-character limit, causing 400 errors
  - **Root Cause:** `receipt_${userId}_${Date.now()}` generated 57+ character strings
  - **Solution:** Shortened to `rcpt_${shortUserId}_${timestamp}` format (~22 chars)
    - Uses first 8 chars of UUID + last 8 digits of timestamp
    - Full userId preserved in order `notes` field for tracking
  - **Status:** Token purchases now working correctly

### Logo & Branding (October 24, 2025)
- **Integrated custom TP rocket logo across application**
  - Logo file: `attached_assets/logo 3_1761320611938.png`
  - Added to: Language Selection, Welcome screen, Dashboard header
  - Set as app favicon and icon
  - **Layout changed to vertical:** Logo on top, "Trend Pilot" text below
  - Consistent branding across all screens

### Watch Ad Feature (October 24, 2025)
- **Implemented free token earning via ad watching**
  - **Frontend:** 60-second countdown modal with progress bar
  - **Reward:** +2 tokens per ad completion
  - **UX Features:**
    - Animated token count update (scale 1.5x + green color)
    - Skip button (visible after 5 seconds, but user loses reward)
    - Toast notifications for success/skip
  - **Security:** 60-second rate limiting per user (in-memory)
    - Returns 429 status if user tries too quickly
    - Demo mode implementation (production requires real Google AdSense)
  - **Location:** Watch Ad button on Dashboard and Analyzer screens

### Perplexity AI Integration (October 24, 2025)
- **Replaced OpenAI with Perplexity AI for superior real-time analysis**
  - Perplexity has real-time web search built-in for latest market news and trends
  - Can access current earnings reports, market sentiment, and price movements
  - More cost-effective: ~$0.001-0.005 per request vs OpenAI's ~$0.01-0.03
  - Model: sonar-pro (advanced search with grounding)
  - Better for factual, research-based trading advisory
  - Integrated via Replit Perplexity blueprint
- **Market Type Reorganization**
  - Changed from regional markets to universal financial market categories
  - New market types: Stock Market (Equities), Commodity Market, Foreign Exchange (Forex) Market, Derivatives Market (Futures), Bond Market, Cryptocurrency Market
  - No default market selection - users must explicitly choose category
  - Market selection now required before analysis (validation added)
  - Database schema updated with new market enum values
- **Perplexity-First Architecture (DEPRECATED external APIs)**
  - **All market data now sourced exclusively from Perplexity AI**
  - No dependencies on CoinGecko or Yahoo Finance APIs
  - Perplexity validates symbols, corrects misspellings, discovers current prices
  - Single API call for complete analysis (simpler, more reliable)
- **UI/UX Improvements**
  - Removed Settings wheel icon from Dashboard header (cleaner design)
  - Market selection dropdown visible on both Dashboard and Analyzer
  - Validation prevents submission without market selection
  - Error messages guide users to select market type

### Perplexity-First Complete Implementation (October 24, 2025)
- **Removed all external market data API dependencies**
  - **Problem:** Previous implementation still called CoinGecko/Yahoo Finance before Perplexity
  - **Solution:** Completely removed fetchMarketData imports and calls from server/perplexity.ts
  - **Architecture Change:** Perplexity now 100% responsible for ALL market data
- **Single Source of Truth Implementation**
  - Perplexity prompt instructs AI to use real-time web search for ALL data
  - No coordination between multiple APIs needed
  - Symbol validation, price discovery, and analysis all in one API call
  - Entry price matches currentPrice (both from Perplexity)
- **Required Field Validation**
  - Added post-parse validation for: correctedSymbol, assetName, currentPrice, priceSource
  - Throws descriptive error if any required field missing
  - Error message: "Perplexity response missing required fields: [list]. This indicates Perplexity could not validate the symbol or find market data."
  - Ensures data integrity before persisting to database
- **Benefits Realized**
  - ✅ No CoinGecko/Yahoo Finance downtime/rate limit issues
  - ✅ Simpler codebase with fewer dependencies
  - ✅ Price displayed always matches price analyzed
  - ✅ Symbol correction happens automatically via web search
  - ✅ Single API call reduces latency and complexity
- **Database Schema Support**
  - correctedSymbol: Perplexity-validated ticker symbol
  - assetName: Perplexity-validated full asset name
  - priceSource: Attribution for where Perplexity found the price
  - instrumentName: Maintained for backward compatibility (populated from assetName)
- **UI Display**
  - Shows "Searched: [input] → Found: [corrected]" when symbol corrected
  - Asset name as main heading (e.g., "Bitcoin")
  - Corrected symbol below name (e.g., "BTC")
  - Price source attribution (e.g., "via CoinMarketCap")
- **Status:** Architecture now truly Perplexity-first with zero external API dependencies

### Professional Trading Features Enhancement (October 24, 2025)
- **Enhanced Trading Analysis Display**
  - Added minimum 1:2 or 1:3 risk-reward ratios (no more 1:1 basic ratios)
  - Multiple take-profit targets: TP1, TP2, TP3 with booking strategies
  - Support & resistance levels: S1-S3 and R1-R3 for key price levels
  - Probability meter (0-100%) using visual circular gauge
  - Trailing stop strategy recommendations
  - Comprehensive explanatory notes and disclaimers
- **Complete Multilingual Support**
  - 27 new translation keys added across all 12 languages
  - Full localization of all UI elements, error messages, and button labels
  - Probability meter, support/resistance, and professional trading terms translated
  - No hardcoded English strings remaining

### Trading Pair Symbol Parsing (October 24, 2025)
- **Fixed cryptocurrency symbol recognition and display**
  - **Problem:** Users entering "ETHUSDT" or "BTCUSDT" resulted in "Price data unavailable"
  - **Root Cause:** CoinGecko API doesn't recognize trading pairs, only base symbols
  - **Solution:** Implemented `parseBaseSymbol()` function to extract base currency
    - Parses ETHUSDT → ETH, BTCUSDT → BTC, ETH-USD → ETH
    - Supports multiple quote currencies: USDT, USD, USDC, BUSD, EUR, GBP, JPY, INR
    - Removes separators like - or /
  - **Display Format Enhancement:** Shows "Ethereum (ETHUSDT)" instead of just "ETHUSDT"
    - Format: `{CryptoName} ({TradingPair})` when trading pair detected
    - Example: "Bitcoin (BTCUSDT)", "Ethereum (ETHUSDT)"
    - Falls back to crypto name only for simple symbols like "BTC" or "ETH"
  - **Status:** Trading pairs now work correctly, price data displays properly

### Smart Symbol Validator with Real-Time Suggestions (October 24, 2025)
- **Implemented intelligent symbol validation with auto-suggestions**
  - **Backend Search API** (server/marketData.ts, server/routes.ts):
    - Added `searchCryptoSymbols()` function using CoinGecko search API
    - Returns top 5 matching cryptocurrencies with id, symbol, and name
    - Created GET `/api/symbols/search?query=...&market=...` endpoint
    - Currently supports cryptocurrency market only
  - **Frontend Smart Search** (client/src/pages/Analyzer.tsx):
    - Debounced search with 500ms delay to prevent API spam
    - Race condition prevention using `latestQueryRef` to discard stale results
    - Only triggers for cryptocurrency market with valid symbol input
    - Shows loading spinner during search
    - Automatically clears suggestions when switching markets or viewing results
  - **UX Features:**
    - Real-time dropdown suggestions appear as user types
    - Click-to-fill: selecting a suggestion auto-populates the symbol field
    - Displays crypto name and symbol (e.g., "BTC - Bitcoin")
    - Hover effects with forward arrow icon
    - Styled with green accent theme matching app design
  - **Edge Cases Handled:**
    - User types "btc" then "eth" before response → only "eth" results shown
    - Empty symbol or no market selected → no search triggered
    - Rapid typing → debounce prevents excessive API calls
    - Stale responses → validation ensures only latest query updates UI
    - API errors → gracefully fails with empty suggestions
  - **Performance:**
    - 500ms debounce reduces server load
    - Ref-based validation prevents UI flicker from outdated responses
    - Clean UI state management on market switches
  - **Status:** Symbol validation working correctly, improves UX for crypto trading
