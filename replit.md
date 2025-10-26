# Trend Pilot - AI Trading Assistant

## Overview
Trend Pilot is an AI-powered financial advisory tool providing intelligent buy/sell recommendations and bracket order analysis across various financial markets (Stock, Commodity, Forex, Derivatives, Bond, Cryptocurrency). It uniquely leverages Perplexity AI with real-time web search for all market data validation, symbol correction, and price discovery, eliminating external market data API dependencies. The system supports 12 languages, multi-currency analysis with 20+ global currencies, and exchange/market preference selection for precise symbol resolution. It operates on a token-based usage model and functions strictly as an ADVISORY-ONLY tool without trade execution capabilities. Its core ambition is to offer comprehensive, AI-driven financial guidance to enhance decision-making for traders and investors worldwide.

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