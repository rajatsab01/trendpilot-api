# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial advisory tool for crypto and stock markets. It delivers intelligent buy/sell recommendations and bracket order analysis by examining financial symbols across multiple timeframes (long-term, short-term, scalping). It utilizes real-time market data from CoinGecko (crypto) and Yahoo Finance (stocks) and leverages OpenAI GPT-4o for analysis. The system supports 12 languages and operates on a token-based usage model. It is an ADVISORY-ONLY tool and does NOT execute trades automatically.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript using Vite, featuring a mobile-first, responsive dark mode UI. State management is handled by TanStack Query for server state and React Context API for global state. Wouter manages client-side routing with protected authentication-required routes. UI components are `shadcn/ui` based on Radix UI, styled with Tailwind CSS, and feature a fintech-focused color palette. Typography uses Spline Sans and Manrope fonts with Material Symbols Outlined icons.

### Backend Architecture

The backend is an Express.js application written in TypeScript, following a RESTful API design. It uses ES modules and a session-based architecture with `userId` stored client-side. API endpoints manage user authentication, market analysis via OpenAI GPT-4o, analysis history, and broker configurations. Requests and responses are JSON-based, with Zod for schema validation and robust error handling.

### Data Storage Solutions

PostgreSQL, specifically Neon serverless PostgreSQL, is the primary database. Drizzle ORM provides type-safe database operations and schema management. The data model includes `Users`, `Analyses` (historical records), and `Brokers` (integration configurations). UUIDs are used for primary keys.

### Authentication & Authorization

Authentication uses Phone.Email for phone number verification, allowing login/registration without app downloads. It supports automatic migration of legacy phone numbers to international format. Authorization is userId-based, with API endpoints validating user existence. Security measures include SSRF protection, HTTPS enforcement, input validation via Zod, and SQL injection protection through Drizzle ORM.

### System Design Choices

The application supports 12 languages, a token-based usage model, and provides advisory-only recommendations. Real market data is fetched from CoinGecko (crypto) and Yahoo Finance (stocks). AI analysis uses OpenAI GPT-4o with structured prompt engineering to generate consistent outputs, including technical indicators and bracket order calculations based on actual market prices. The system calculates and displays a risk-reward ratio for trade evaluation.

## External Dependencies

*   **AI Service:** OpenAI (`openai`) for market analysis using GPT-4o
*   **Market Data:** CoinGecko API (crypto), Yahoo Finance API (stocks)
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`)
*   **Authentication:** Phone.Email
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols
*   **Payment:** Razorpay for token purchases