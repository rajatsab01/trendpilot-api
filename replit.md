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

## External Dependencies
*   **AI Service & Market Data:** Perplexity AI (sonar-pro model)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment Gateway:** Razorpay