# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial trading assistant designed for crypto and stock markets. It leverages Google's Gemini AI to provide intelligent buy/sell recommendations and bracket order placement by analyzing financial symbols across long-term, short-term, and scalping timeframes. The project's ambition is to offer comprehensive technical analysis and trading recommendations, supported by a token-based usage system and multi-language capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. It follows a mobile-first, responsive design approach with a primary dark mode UI theme. State management is handled by TanStack Query for server state and React Context API for global state. Wouter is used for lightweight client-side routing, with protected routes requiring user authentication. The UI is constructed using `shadcn/ui` components based on Radix UI primitives, styled with Tailwind CSS, and features a fintech-focused color palette (dark green #38e07b). Typography uses Spline Sans and Manrope fonts, complemented by Material Symbols Outlined icons.

### Backend Architecture

The backend is an Express.js application written in TypeScript, implementing a RESTful API design pattern. It uses ES modules and a session-based architecture where the `userId` is stored client-side. Key API endpoints manage user authentication, market analysis via Gemini AI, analysis history, and broker integrations. Requests and responses are JSON-based, with Zod for schema validation and robust error handling.

### Data Storage Solutions

PostgreSQL is the primary database, utilizing Neon serverless PostgreSQL for scalability. Drizzle ORM is employed for type-safe database operations and schema management. The data model includes `Users` (for authentication and tokens), `Analyses` (historical market analysis records), and `Brokers` (for integration configurations, including webhook message templates). UUIDs are used for primary keys.

### Authentication & Authorization

Authentication uses Phone.Email for phone number verification, allowing users to log in or register without app downloads. The system supports automatic migration of legacy phone numbers to an international format. Authorization is userId-based, with API endpoints validating user existence. Security considerations include SSRF protection, HTTPS enforcement, input validation via Zod, and SQL injection protection through Drizzle ORM.

### System Design Choices

The application is designed for multi-language support (12 languages), token-based usage, and future integration with payment gateways and real-time market data providers. The AI analysis uses structured prompt engineering for consistent output and includes technical indicators and bracket order calculations.

## External Dependencies

*   **AI Service:** Google Gemini AI (`@google/genai`) for market analysis.
*   **Database Service:** Neon PostgreSQL (`@neondatabase/serverless`) for cloud database hosting.
*   **Authentication:** Phone.Email for phone number verification.
*   **UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Lucide React (icons).
*   **Fonts:** Google Fonts (Spline Sans, Manrope), Material Symbols.
*   **Payment (Planned):** Stripe and Razorpay for future payment gateway integration.