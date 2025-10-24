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