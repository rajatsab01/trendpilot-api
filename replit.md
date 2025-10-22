# Trend Pilot - AI Trading Assistant

## Overview

Trend Pilot is an AI-powered financial trading assistant that provides intelligent buy/sell recommendations and bracket order placement for crypto and stock markets. The application uses Google's Gemini AI to analyze financial symbols across different trading timeframes (long-term, short-term, and scalping) and delivers comprehensive technical analysis with trading recommendations.

**Core Features:**
- AI-driven market analysis using Google Gemini
- Multi-timeframe trading strategies (long-term, short-term, scalping)
- Token-based usage system
- Broker integration capabilities
- Multi-language support (English and Hindi)
- Analysis history tracking

**Tech Stack:**
- Frontend: React with TypeScript, Vite
- Backend: Express.js with TypeScript
- Database: PostgreSQL via Drizzle ORM
- AI: Google Gemini API
- UI Framework: shadcn/ui with Radix UI primitives
- Styling: Tailwind CSS

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Mobile-first responsive design approach
- Dark mode primary UI theme with fintech-focused design system

**State Management:**
- TanStack Query (React Query) for server state management
- React Context API for global state (Language, Theme)
- Local storage for persistence (userId, language preference)

**Routing:**
- Wouter for lightweight client-side routing
- Route structure: Language Selection → Login → Welcome → Dashboard → Analyzer/Settings
- Protected routes require userId in localStorage

**UI Component System:**
- shadcn/ui component library with Radix UI primitives
- Custom theme using CSS variables with HSL color space
- Consistent design tokens defined in `tailwind.config.ts`
- Material Symbols Outlined icons for visual elements
- Typography: Spline Sans (primary) and Manrope (secondary)

**Design Principles:**
- Data clarity over decoration
- High contrast ratios for accessibility
- Fintech-focused color palette (dark green #38e07b as primary)
- Hover and active state elevations for interactive elements
- Mobile-optimized with bottom navigation

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- ES modules (type: "module")
- RESTful API design pattern
- Session-based architecture (userId stored client-side)

**API Endpoints:**
- `POST /api/auth/login` - User authentication/creation
- `GET /api/user/:userId` - Fetch user details
- `POST /api/analyze` - Market analysis via Gemini AI
- `GET /api/analysis/:analysisId` - Retrieve specific analysis
- `GET /api/analyses/:userId` - User's analysis history
- `POST /api/brokers` - Add broker integration
- `GET /api/brokers/:userId` - List user's brokers
- `PATCH /api/brokers/:id` - Update broker details
- `DELETE /api/brokers/:id` - Remove broker

**Request/Response Pattern:**
- JSON-based request/response format
- Zod schema validation for input validation
- Error handling with appropriate HTTP status codes
- Request logging middleware for API routes

### Data Storage Solutions

**Database:**
- PostgreSQL as the primary database
- Neon serverless PostgreSQL client (`@neondatabase/serverless`)
- Database connection via `DATABASE_URL` environment variable

**ORM & Schema:**
- Drizzle ORM for type-safe database operations
- Schema-first approach with automatic TypeScript type inference
- Drizzle Kit for migrations management

**Data Models:**

1. **Users Table:**
   - Stores user authentication and profile data
   - Fields: id (UUID), name, mobile (unique), language, tokens (balance), createdAt
   - Mobile number used as unique identifier for login

2. **Analyses Table:**
   - Historical record of all market analyses
   - Fields: id, userId, symbol, duration, recommendation (BUY/SELL), confidence, sentiment, technical indicators (RSI, MACD, Stochastic, Bollinger Bands), bracket order data (entry, takeProfit, stopLoss), createdAt
   - Linked to users via userId

3. **Brokers Table:**
   - Broker integration configurations
   - Fields: id, userId, name, apiKey, webhookUrl, isConnected (boolean as integer), createdAt
   - Supports multiple brokers per user

**Storage Strategy:**
- In-memory storage implementation (`MemStorage`) for development
- Production-ready with PostgreSQL migration path
- UUID-based primary keys for distributed system compatibility

### Authentication & Authorization

**Authentication Flow:**
1. User selects language preference
2. User enters name and mobile number
3. Server creates new user or retrieves existing by mobile
4. UserId stored in localStorage for subsequent requests
5. No traditional session management - stateless API with client-side userId

**Authorization:**
- Simple userId-based access control
- No JWT or OAuth implementation (simplified MVP approach)
- API endpoints validate userId existence before operations

**Security Considerations:**
- No password-based authentication (mobile-based identification)
- HTTPS enforced in production
- Input validation via Zod schemas
- SQL injection protection via Drizzle ORM parameterized queries

### External Dependencies

**AI Service Integration:**
- **Google Gemini AI** (`@google/genai`)
  - Model: gemini-2.5-flash or gemini-2.5-pro
  - API Key authentication via `GEMINI_API_KEY` environment variable
  - Used for financial market analysis and trading recommendations
  - Provides technical indicators and bracket order calculations
  - Structured prompt engineering for consistent analysis output

**Database Service:**
- **Neon PostgreSQL** (`@neondatabase/serverless`)
  - Serverless PostgreSQL hosting
  - Connection pooling and automatic scaling
  - Accessed via DATABASE_URL environment variable

**Third-Party UI Libraries:**
- **Radix UI**: Accessible, unstyled component primitives
- **shadcn/ui**: Pre-built component library based on Radix
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

**Font Services:**
- Google Fonts: Spline Sans and Manrope font families
- Material Symbols: Outlined icon font

**Development Tools:**
- Replit-specific plugins for development environment
- Vite plugins: runtime error overlay, cartographer, dev banner

**Payment/Token System:**
- Currently implemented as mock (no actual payment gateway)
- Designed for future integration with payment providers
- Token-based consumption model (2 tokens per analysis)