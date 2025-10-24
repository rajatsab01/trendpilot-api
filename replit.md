# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial trading assistant designed for crypto and stock markets. It leverages Google's Gemini AI to provide intelligent buy/sell recommendations and bracket order placement by analyzing financial symbols across long-term, short-term, and scalping timeframes. The project's ambition is to offer comprehensive technical analysis and trading recommendations, supported by a token-based usage system and multi-language capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It follows a mobile-first, responsive design approach with a primary dark mode UI theme. State management is handled by TanStack Query for server state and React Context API for global state. Wouter is used for lightweight client-side routing, with protected routes requiring user authentication. The UI is constructed using `shadcn/ui` components based on Radix UI primitives, styled with Tailwind CSS, and features a fintech-focused color palette (dark green #38e07b). Typography uses Spline Sans and Manrope fonts, complemented by Material Symbols Outlined icons.

### Backend Architecture

The backend is an Express.js application written in TypeScript, implementing a RESTful API design pattern. It uses ES modules and a session-based architecture where the `userId` is stored client-side. Key API endpoints manage user authentication, market analysis via Gemini AI, analysis history, broker integrations, and trade execution via webhooks. Requests and responses are JSON-based, with Zod for schema validation and robust error handling.

### Data Storage Solutions

PostgreSQL is the primary database, utilizing Neon serverless PostgreSQL for scalability. Drizzle ORM is employed for type-safe database operations and schema management. The data model includes `Users` (for authentication and tokens), `Analyses` (historical market analysis records), and `Brokers` (for integration configurations, including webhook message templates). UUIDs are used for primary keys.

### Authentication & Authorization

Authentication uses Phone.Email for phone number verification, allowing users to log in or register without app downloads. The system supports automatic migration of legacy phone numbers to an international format. Authorization is userId-based, with API endpoints validating user existence. Security considerations include SSRF protection, HTTPS enforcement, input validation via Zod, and SQL injection protection through Drizzle ORM.

### System Design Choices

The application is designed for multi-language support (12 languages), token-based usage, and integration with broker webhooks for automated trade execution. The AI analysis uses Google Gemini 2.5 Flash with structured prompt engineering for consistent output and includes technical indicators and bracket order calculations.

## External Dependencies

*   **AI Service:** Google Gemini AI (`@google/genai`) for real-time market analysis using Gemini 2.5 Flash model
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`) for cloud database hosting
*   **Authentication:** Phone.Email for phone number verification
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React (icons)
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment:** Razorpay for token purchases (configured with live keys)

## Recent Changes (October 24, 2025)

### Analyzer Page Enhancements (October 24, 2025)
- **Fixed back arrow navigation**
  - Both back arrows (analysis input form and results page) now correctly navigate to dashboard
  - Previous issue: results page back arrow tried to navigate to /analyzer causing confusion
  - Now provides consistent navigation experience throughout the app
- **Implemented trade execution via webhook**
  - Execute button now functional with broker webhook integration
  - Creates JSON payload from analysis data with dynamic placeholder replacement
  - Supported placeholders: {{ticker}}, {{strategy.order.action}}, {{strategy.order.contracts}}, {{timenow}}, {{take_profit}}, {{stop_loss}}
  - Take Profit and Stop Loss checkboxes control whether those values are included in webhook
  - Sends POST request to selected broker's webhook URL
  - Includes broker's API key as Bearer token in Authorization header if configured
  - Shows loading state ("Executing...") during webhook request
  - Provides user feedback via toast notifications (success/error)
  - Backend endpoint: POST /api/execute-trade validates broker, sends webhook, returns response
  - Proper error handling with 502 status for broker webhook failures
- **Activated real Gemini AI analysis**
  - Configured GEMINI_API_KEY via Replit secrets (secure environment variable)
  - System now uses Google Gemini 2.5 Flash for actual market analysis
  - Falls back to mock data if API key unavailable or API call fails
  - Provides real technical indicators (RSI, MACD, Stochastic, Bollinger Bands)
  - Generates bracket orders (entry, take profit, stop loss) based on actual market data
  - Supports all 12 languages with proper AI prompt engineering
  - 3-layer analysis structure maintained (Market Sentiment, Deep Analysis, AI Verdict)

### User Experience Fixes (October 24, 2025)
- **Fixed token display accuracy**
  - Changed token counter from showing `/10` to `/20` to reflect actual free token allocation
  - Dashboard now correctly displays `{currentTokens}/20` format
  - Matches schema default value in shared/schema.ts (20 tokens for new users)
- **Added broker edit functionality**
  - Created new EditBroker page accessible via `/edit-broker/:id` route
  - Pre-fills form with existing broker data (name, API key, webhook URL, webhook message)
  - Updates via PATCH /api/brokers/:id endpoint with correct parameter order
  - Invalidates both list cache and detail cache to prevent stale data
  - Edit button (green) navigates from settings to edit page
- **Added broker delete functionality**
  - Delete button (red) appears next to edit button on each broker in settings
  - Shows confirmation modal before deletion with cancel/confirm options
  - DELETE mutation calls DELETE /api/brokers/:id endpoint correctly
  - Invalidates broker list cache after successful deletion
  - Provides user feedback via toast notifications
- **Added bracket order disclaimer on Analyzer**
  - Placed below bracket order section, above quantity input
  - Text: "Disclaimer: Bracket order will only work if the webhook message provided by the broker has the relevant fields like take profit and stop loss."
  - Styled with semi-transparent background and green accent border for visibility
  - Grammatically correct and user-friendly

### Broker Management Improvements (October 24, 2025)
- **Fixed broker name display on Analyzer screen**
  - Changed from hardcoded dropdown options ("Broker A", "Broker B", "Broker C") to dynamic fetching
  - Analyzer now queries `/api/brokers/:userId` and displays actual broker names from database
  - Query key updated to single-segment format `[\`/api/brokers/${userId}\`]` for proper TanStack Query compatibility
  - Cache invalidation fixed to use correct query key pattern
- **Added webhook message template field to brokers**
  - Database schema: added `webhookMessage` text field to brokers table
  - Successfully pushed schema changes with `npm run db:push` (zero data loss)
  - UI: Added textarea for webhook message template in AddBroker form
  - Field conditionally displays only when webhook URL is provided
  - Monospace font for better JSON readability
  - Placeholder example shows JSON template with dynamic placeholders
  - Backend: Updated POST /api/brokers and PATCH /api/brokers/:id to handle webhookMessage field
  - Storage: Updated both MemStorage and insertBrokerSchema validation
- **Webhook placeholder support**
  - Templates can use dynamic placeholders: {{ticker}}, {{strategy.order.action}}, {{strategy.order.contracts}}, {{timenow}}, {{take_profit}}, {{stop_loss}}
  - Placeholders are replaced when Execute button is clicked on Analyzer page
  - Enables flexible integration with different broker APIs

### Complete Localization Implementation (October 24, 2025)
- **Fully translated all trading terms across all 12 languages:**
  - "Bullish/Bearish" sentiment labels now display in user's language (e.g., "तेजी/मंदी" in Hindi)
  - "BUY/SELL" recommendation labels now display in user's language (e.g., "खरीदें/बेचें" in Hindi)
  - Duration terms (long_term, short_term, scalping) fully localized in AI-generated analysis text
- **Implementation details:**
  - Analyzer page translates sentiment/recommendation by mapping backend's canonical strings
  - Mock Gemini analysis uses per-language duration lookup (e.g., "अल्पकालिक" for short_term in Hindi)
  - Real Gemini prompt includes explicit language instructions for all text fields
  - Graceful fallback to English for unsupported languages
- **Translation coverage:**
  - All UI elements: 100% translated
  - All AI-generated content: 100% translated
  - All trading terminology: 100% translated
  - Brand name "Trend Pilot" remains in English across all languages

### Phone.Email Authentication Integration (October 24, 2025)
- **Replaced TOTP (Google Authenticator) with Phone.Email widget**
  - Eliminated user friction: no app download required
  - FREE for 6 months of usage
  - Phone.Email Client ID: 16614316303161384204
- **Security Implementation:**
  - SSRF protection: validates requests are from user.phone.email domain only
  - HTTPS-only enforcement on verification endpoint
  - Domain whitelist validation before fetching user data
- **Backwards Compatibility:**
  - Automatic migration of legacy 10-digit phone numbers to +country code format
  - Multi-format lookup: tries +country, country code only, and last-10-digits
  - Seamless upgrade path for existing users
- **Database Schema Updates:**
  - Removed `otpSecret` and `otpEnabled` columns from users table
  - Added `updateUserMobile` method to storage interface for migration support

### Database & Schema Management (October 23, 2025)
- **Migrated from in-memory to PostgreSQL database**
  - Replaced MemStorage with DbStorage using Drizzle ORM
  - Database URL provided via environment variable (DATABASE_URL)
  - All CRUD operations now persist to Neon PostgreSQL
  - Storage interface (IStorage) remains unchanged for compatibility
- **Schema structure:**
  - Users table: id (PK), name, mobile (unique), language, tokens
  - Analyses table: id (PK), userId (FK), symbol, duration, recommendation, confidence, sentiment, indicators, bracket orders
  - Brokers table: id (PK), userId (FK), name, apiKey, webhookUrl, webhookMessage
- **Migration process:**
  - Used `npm run db:push` for schema deployment (no manual SQL migrations)
  - Zero data loss during migration
  - All existing features continue to work seamlessly

### Initial Implementation (October 23, 2025)
- **Core features:**
  - Phone.Email authentication (phone number verification)
  - 12-language support (en, hi, es, zh, de, fr, ar, pt, ru, ja, ko, it)
  - Token-based usage system (20 free tokens, 2 tokens per analysis)
  - AI market analysis via Gemini API (3-layer structure)
  - Broker integration management (add/list brokers with API keys and webhooks)
  - Analysis history tracking
  - Razorpay payment integration for token purchases
- **Technical stack:**
  - Frontend: React 18, TypeScript, Vite, TanStack Query, Wouter routing
  - Backend: Express.js, TypeScript, Drizzle ORM, PostgreSQL
  - AI: Google Gemini 2.5 Flash
  - Auth: Phone.Email
  - Payment: Razorpay
  - UI: shadcn/ui, Tailwind CSS, Radix UI
