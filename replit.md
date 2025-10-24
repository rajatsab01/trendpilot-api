# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial advisory tool for comprehensive financial markets. It delivers intelligent buy/sell recommendations and bracket order analysis by examining financial symbols across multiple timeframes (long-term, short-term, scalping). It utilizes real-time market data from CoinGecko (crypto) and Yahoo Finance (stocks/forex) and leverages Perplexity AI with real-time web search for analysis. The system supports 12 languages and operates on a token-based usage model. It is an ADVISORY-ONLY tool and does NOT execute trades automatically.

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

The application supports 12 languages, a token-based usage model, and provides advisory-only recommendations. Real market data is fetched from CoinGecko (crypto) and Yahoo Finance (stocks/forex). AI analysis uses Perplexity AI (llama-3.1-sonar-large-128k-online) with real-time web search capabilities to access latest news, market trends, and price data. This generates structured analysis including technical indicators and bracket order calculations based on actual market prices. The system calculates and displays a risk-reward ratio for trade evaluation. Market types include: Stock Market (Equities), Commodity Market, Forex, Derivatives (Futures), Bond Market, and Cryptocurrency Market.

## External Dependencies

*   **AI Service:** Perplexity AI for market analysis using llama-3.1-sonar-large-128k-online with real-time web search
*   **Market Data:** CoinGecko API (crypto, free), Yahoo Finance API (stocks/forex, free)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment:** Razorpay for token purchases
## Recent Changes (October 24, 2025)

### Perplexity AI Integration (October 24, 2025)
- **Replaced OpenAI with Perplexity AI for superior real-time analysis**
  - Perplexity has real-time web search built-in for latest market news and trends
  - Can access current earnings reports, market sentiment, and price movements
  - More cost-effective: ~$0.001-0.005 per request vs OpenAI's ~$0.01-0.03
  - Model: llama-3.1-sonar-large-128k-online (128k context window)
  - Better for factual, research-based trading advisory
  - Integrated via Replit Perplexity blueprint
- **Market Type Reorganization**
  - Changed from regional markets to universal financial market categories
  - New market types: Stock Market (Equities), Commodity Market, Foreign Exchange (Forex) Market, Derivatives Market (Futures), Bond Market, Cryptocurrency Market
  - No default market selection - users must explicitly choose category
  - Market selection now required before analysis (validation added)
  - Database schema updated with new market enum values
- **Real Market Data Strategy**
  - Cryptocurrency: CoinGecko API provides real-time price, volume, market cap
  - Forex: Yahoo Finance API provides real-time exchange rates
  - Stock Equities: Yahoo Finance API (defaults to US market)
  - Commodities, Derivatives, Bonds: Perplexity researches current prices via web search
- **UI/UX Improvements**
  - Removed Settings wheel icon from Dashboard header (cleaner design)
  - Market selection dropdown visible on both Dashboard and Analyzer
  - Validation prevents submission without market selection
  - Error messages guide users to select market type
