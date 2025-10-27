# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool designed to provide intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Cryptocurrency). It utilizes Perplexity AI with real-time web search for market data validation, symbol correction, and price discovery, eliminating the need for external market data APIs. The system supports 12 languages, multi-currency analysis with over 20 global currencies, and offers exchange/market preference selection for precise symbol resolution. Operating on a token-based usage model, it functions strictly as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance to enhance decision-making for traders and investors globally. The project aims to provide a social trading network, allowing users to publish analyses, follow others, and engage with community features like reactions and pinned traders.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, featuring a responsive, mobile-first dark mode UI. It uses a fintech-focused color palette, Spline Sans and Manrope fonts, Material Symbols Outlined icons, and `shadcn/ui` components (based on Radix UI) styled with Tailwind CSS. The design emphasizes a clean, simple analyzer form, incorporating features like a dedicated "Analyse More" button, a "Charity brings luck" donation feature, and a "Watch Ad" feature for earning tokens. The application includes a custom "TP rocket" logo, a global currency selector, and an embedded TradingView chart. It also features a "Saved" tab with a dashboard for tracking trade outcomes and a compact card design for saved analyses. Community features include reaction buttons for published analyses and the ability to pin favorite traders.

### Technical Implementations
The backend is an Express.js application in TypeScript, following a RESTful API design with ES modules and a session-based architecture. It manages user authentication, market analysis via Perplexity AI, analysis history, and real market data fetching. JSON-based requests/responses with Zod for schema validation and robust error handling are employed. Symbol validation and autocomplete are handled server-side using Yahoo Finance and CoinGecko. The system includes backend API routes for community features such as reactions and pinning traders, with version guard protection and cache invalidation.

### Feature Specifications
Trend Pilot supports 12 languages and multi-currency analysis (20+ global currencies) across 44+ countries/regions. It operates on a token-based usage model, providing advisory-only recommendations. Perplexity AI (sonar-pro model) is the single source of truth for market data, handling symbol validation, market type auto-detection, exchange-aware symbol resolution, and analysis using real-time web search with market-specific research sources. The system generates structured analysis covering technical indicators, bracket order calculations (ensuring a minimum 1:3 risk-reward ratio), risk-reward ratios, multiple take-profit targets, support/resistance levels, probability meters (requiring 60%+), and trailing stop recommendations. It incorporates a comprehensive PWA installation strategy. Analysis results display both live market prices and analysis-based candle close prices with timestamps (converted to user's preferred currency), along with an embedded TradingView chart dynamically matching the analysis timeframe. Users can save analyses and track their trade status and performance. Community features allow users to publish analyses, react to them, and pin traders.

### System Design Choices
State management uses TanStack Query for server state and React Context API for global state. Wouter handles client-side routing with protected routes. Neon serverless PostgreSQL is the primary database, with Drizzle ORM for type-safe operations. The data model includes `Users` (with `currency` and `exchange` preferences), `Analyses` (storing `currency` and `exchange` per analysis), `Brokers`, `reactions`, and `pinnedTraders`, using UUIDs for primary keys. Authentication uses Phone.Email for phone number verification, and authorization is `userId`-based. Security measures include SSRF protection, HTTPS enforcement, Zod input validation, and Drizzle ORM for SQL injection protection. Perplexity AI automatically detects market type, uses exchange preference for precise symbol resolution, and ensures mandatory candle close prices with duration-specific timeframes for accurate analysis. All prices are converted to the user's preferred currency, with scalping analyses incorporating live prices for entry/TP/SL. A comprehensive 4-tier symbol validation system ensures data quality and prevents wasted AI tokens, including a Symbol Registry, Instrument Database, Symbol Tester, and Pre-flight Validation. The application includes a mandatory version checking system and a social trading network with an admin system for moderation and monitoring.

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay
*   **Symbol Validation:** Yahoo Finance, CoinGecko
*   **Charting:** TradingView (embedded widget)