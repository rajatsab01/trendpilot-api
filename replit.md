# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool providing intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Derivatives, Bond, Cryptocurrency). It leverages Perplexity AI with real-time web search as the exclusive source for all market data validation, symbol correction, and price discovery. The system supports 12 languages, operates on a token-based usage model, and functions solely as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance, enhancing decision-making for traders and investors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite, featuring a responsive, mobile-first dark mode UI. State management uses TanStack Query for server state and React Context API for global state. Wouter handles client-side routing with protected routes. UI components are `shadcn/ui` (based on Radix UI), styled with Tailwind CSS, using a fintech-focused color palette, Spline Sans and Manrope fonts, and Material Symbols Outlined icons.

### Backend
The backend is an Express.js application in TypeScript, following a RESTful API design with ES modules and session-based architecture. It manages user authentication, market analysis via Perplexity AI, analysis history, and real market data fetching. JSON-based requests/responses, Zod for schema validation, and robust error handling are employed.

### Data Storage
Neon serverless PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The data model includes `Users`, `Analyses` (historical records), and `Brokers`, utilizing UUIDs for primary keys.

### Authentication & Authorization
Authentication uses Phone.Email for phone number verification. Authorization is `userId`-based, with API endpoints validating user existence. Security measures include SSRF protection, HTTPS enforcement, Zod input validation, and Drizzle ORM for SQL injection protection.

### System Design
Trend Pilot supports 12 languages and a token-based usage model, providing advisory-only recommendations. Perplexity AI (sonar-pro model) is the single source of truth for all market data, including symbol validation, correction, price discovery, market type auto-detection, and analysis using real-time web search. This eliminates external market data API dependencies. The system generates structured analysis, including technical indicators, bracket order calculations, risk-reward ratios, multiple take-profit targets, support/resistance levels, probability meters, and trailing stop recommendations.

### UI/UX Decisions
The design emphasizes a clean, simple analyzer form. The application features a dedicated "Analyse More" button and a "Charity brings luck" donation feature integrated with Razorpay. A "Watch Ad" feature allows users to earn tokens by viewing ads, with rate limiting for security. The application incorporates a custom "TP rocket" logo for consistent branding and removes unnecessary UI elements like the market selection dropdown, as market type is now auto-detected by AI.

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model) - primary source for market data, symbol validation, and analysis
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay
## Recent Changes

### 5-Minute Candle Price Accuracy & Testing Period Token Cap (October 25, 2025)
- **🔒 CRITICAL SECURITY: Token cap during Razorpay testing** - Prevents financial loss from test token accumulation
  - **Problem solved:** Users could accumulate 20,000+ "free" test tokens during Razorpay test mode, causing major financial loss when switching to live payments
  - **Implementation:** 10-token maximum cap enforced server-side across all token-granting endpoints
  - **Configuration:** `TEST_MODE_ACTIVE = true` and `TEST_MODE_TOKEN_CAP = 10` in `server/routes.ts`
  - **Protected endpoints:**
    - `/api/payment/verify` - Token purchases (both demo and real Razorpay)
    - `/api/claim-install-bonus` - PWA installation bonus (+5 tokens)
    - `/api/watch-ad` - Ad watching rewards (+2 tokens)
  - **User experience:** Clear error message explains testing period limit and that cap will be removed at launch
  - **Benefits:**
    - ✅ Prevents exploitation during test period
    - ✅ Protects business from financial loss
    - ✅ Easy to disable by setting `TEST_MODE_ACTIVE = false` when going live
    - ✅ Transparent communication with users about temporary limitation

- **📊 Enhanced Price Accuracy: 5-Minute Candle Close Prices** - Addresses user complaints about price differences
  - **Problem solved:** Users reported inconsistent prices and differences between analyses
  - **Root cause:** Perplexity was returning various price types (tick prices, 1m candles, live bid/ask) causing inconsistency
  - **Solution:** Mandatory 5-minute candle close price as standardized data source
  - **Implementation in `server/perplexity.ts`:**
    - **Prompt strengthening (3 layers):**
      - User prompt: "MANDATORY PRICE REQUIREMENT" with explicit instructions on what to look for/avoid
      - System message: Reinforces 5-minute candle requirement
      - JSON field descriptions: Updated currentPrice, priceSource, entry to specify 5min candle close
    - **New metadata fields in Perplexity JSON response:**
      - `candleCloseTime`: Optional timestamp of 5-minute candle close
      - `timeframe`: Must be "5m" or "5min" to confirm data source
    - **3-layer validation system:**
      - **Layer 1:** Timeframe field check - Must be "5m" or "5min" (strongest validation)
      - **Layer 2:** Price source check - Must mention 5-minute data in description
      - **Layer 3:** Numeric validation - Throws error if price is not valid positive number
    - **Comprehensive logging:**
      - ✅ FULL VALIDATION PASSED - Both timeframe and price source confirm 5-minute data
      - ⚠️ PARTIAL VALIDATION - Only one validation check passes
      - ❌ VALIDATION WARNING - Neither check passes (flags for monitoring but doesn't block)
  - **Benefits:**
    - ✅ Standardized pricing across all markets (crypto, stocks, forex, commodities)
    - ✅ Consistent data source for reliable entry points
    - ✅ Better user trust with confirmed 5-minute candle closes
    - ✅ Monitoring capability to track when AI deviates from requirements
    - ✅ Reduces price discrepancy complaints

### Complete Application Localization (October 25, 2025)
- **Added 18 new translation keys across all 12 languages** - Completed comprehensive localization of user-facing UI elements
  - Translation keys added: `pinToHomeScreen`, `quickAccessDesc`, `aiTradingAssistant`, `tokensAdded`, `earnedTokensFromAd`, `dailyLimitReached`, `adSkipped`, `watchFullAd`, `bonusClaimed`, `bonusClaimedDesc`, `failedToClaimBonus`, `failedToAnalyze`, `enterSymbolError`, `failedToVerifyPhone`, `failedToLogin`, `error`
  - All keys translated across: English, Hindi, Spanish, Chinese, Arabic, French, German, Portuguese, Russian, Japanese, Korean, Italian
- **Replaced hardcoded English strings with translation keys** across all core pages:
  - **Welcome.tsx**: PWA install prompts now fully localized (`pinToHomeScreen`, `quickAccessDesc`)
  - **Dashboard.tsx**: All toast messages, error messages, and user notifications now localized (tokens added, ad watching, bonus claiming, analysis errors, insufficient tokens)
  - **Login.tsx**: Error messages and branding text localized (`aiTradingAssistant`, `failedToVerifyPhone`, `failedToLogin`)
  - **LanguageSelection.tsx**: Intentionally kept in English as it's the entry point before language selection
- **Dynamic string interpolation support**: `bonusClaimedDesc` correctly handles {balance}/{max} placeholders using `.replace()` for all languages
- **Removed unnecessary toast**: Language change confirmation toast removed as UI update makes change obvious
- **Benefits:**
  - ✅ Complete 12-language support for all user-facing interactions
  - ✅ No hardcoded English strings in post-onboarding UI
  - ✅ Consistent user experience across all supported languages
  - ✅ Professional localization for financial terminology
  - ✅ Scalable translation infrastructure for future additions

### UI/UX Refinements & Token System Enhancement (October 25, 2025)
- **Removed help icons** - Eliminated question mark/help icons from Language Selection and Welcome screens for cleaner UI
- **Added settings wheel** - Settings gear icon now available on both Welcome and Dashboard screens
  - Settings modal includes language selection (all 12 languages)
  - PWA install button (when browser supports it) for "Pin to Home Screen" functionality
- **Enhanced Login page** - Added Trend Pilot logo and branding (logo image + "Trend Pilot" text + "AI Trading Assistant" subtitle)
- **Updated AI description** - Changed Welcome screen text from "recommendations" to emphasize AI advantages over human analysis
  - New copy highlights: real-time analysis, removing emotional bias, faster decisions, consistent precision
  - Educates users about benefits of AI-powered vs. human trading analysis
- **Token display system overhaul** - Changed from fixed "current/20" to dynamic "current/max" display
  - Added `maxTokens` field to users table to track highest token count ever owned
  - System now displays actual capacity based on tokens purchased (e.g., if user bought 100 tokens with 2 free remaining, shows 102/102)
  - `maxTokens` automatically increases when tokens are added (purchases, ad watching, donations, PWA install bonus)
  - `maxTokens` stays constant when tokens are spent (analysis costs)
  - Benefits: Users see their true token capacity, not a misleading fixed denominator
- **Ad watching restrictions** - Limited to 2 ads per 24-hour period with user-friendly error messaging
  - Backend tracks ad watch history per user (count + first watch timestamp)
  - Soft error message: "You've reached the daily limit of 2 ads. Please try again in X hours."
  - Resets automatically after 24 hours from first watch
- **Comprehensive PWA Installation Strategy** - Multi-phase approach to encourage app installation without being pushy
  - **Phase 1 (Soft Introduction):** Optional PWA install prompt after accepting terms on Welcome screen
    - Shows benefits: instant access, offline history, faster performance, + 5 bonus tokens
    - Prominent "Skip for Now" option - respects user choice
  - **Phase 2 (Incentive After Engagement):** Bonus token card appears on Dashboard after first analysis
    - Offers 5 free tokens for installing the app
    - Card is dismissible and won't show again if dismissed
    - API endpoint `/api/claim-install-bonus` credits tokens automatically upon installation
  - **Phase 3 (Gentle Reminder):** After 5+ analyses, shows toast notification once per week maximum
    - Only appears after completing an analysis (not on page load)
    - Soft reminder with bonus token incentive
    - Never blocks core functionality
  - **Best Practices Implemented:**
    - Never blocks core features - users can always analyze markets without installing
    - "Skip" buttons always visible and prominent
    - Timed correctly - prompts appear at natural points (after terms, after analysis)
    - Clear benefits explained - instant access, bonus tokens, faster performance
    - Respects dismissal - once dismissed, won't nag again (except weekly gentle reminder after 5+ analyses)
    - Tracks installation status in localStorage to prevent repeated prompts

### Market Type Auto-Detection (October 24, 2025)
- **Removed market type dropdown** - Perplexity AI now automatically detects market type via real-time web search
- **Removed symbol autocomplete** - Simplified to pure text input (Perplexity validates all symbols anyway)
- **Problem solved:**
  - Users selecting wrong market type (e.g., "Stock Market" for BTC) caused incorrect analysis
  - Symbol autocomplete only worked for cryptocurrency, limiting usability to one market
- **Solution:**
  - Perplexity AI automatically identifies whether symbol is: cryptocurrency, stock, forex, commodity, bond, or derivative
  - Direct symbol input with multi-market examples in placeholder: "BTC, AAPL, EURUSD, GOLD"
  - Perplexity validates and corrects symbols using web search, regardless of market type
- **Benefits:**
  - ✅ Eliminates user errors from wrong market selection
  - ✅ Simpler UI - just symbol and duration fields (was 3 fields, now 2)
  - ✅ Smarter analysis - AI determines correct market context automatically
  - ✅ Works for ANY financial instrument across all markets
  - ✅ No market-specific limitations
- **Implementation:**
  - Backend: Removed `market` parameter from `/api/analyze` endpoint; Perplexity returns auto-detected `marketType`
  - Frontend: Removed market dropdown, symbol autocomplete dropdown, and all market-related validation
  - Database: Still stores `market` field (now AI-populated instead of user-selected)
  - Perplexity prompt: Enhanced to explicitly detect and return market type in JSON response
