# Game Day by Bowlo - Lawn Bowls Tracking Application

## Overview

Game Day by Bowlo is a progressive web application designed to track and analyze lawn bowls performance in pennant games (four-player format). This is the first app in the Bowlo suite - future apps will include drill tracking and training tools. The application enables players to record detailed statistics for each bowl delivered during a game, including hand position, accuracy metrics, and game outcomes. It provides comprehensive analysis tools to help players improve their performance through data-driven insights.

The application follows a modern full-stack architecture with a React frontend, Express backend, and PostgreSQL database using Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Branding

- **App Name**: Game Day (by Bowlo)
- **Product Suite**: Bowlo - future apps will include drill tracking
- **Primary Color**: Lawn green (#22c55e)
- **Accent Color**: Gold
- **Logo**: Green and gold geometric lawn bowls icon (jack and bowl design)
- **Tagline**: Track. Analyse. Improve.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- TanStack Query (React Query) for server state management and caching
- Wouter for lightweight client-side routing
- Tailwind CSS v4 with custom theming for styling
- shadcn/ui component library (New York variant) for consistent UI components

**Design Pattern:**
The frontend follows a component-based architecture with separation of concerns:
- **Pages** (`client/src/pages/`): Route-level components (Home, GameSetup, GameRecording, Games, Analysis, Account, Admin, Landing)
- **Components** (`client/src/components/`): Reusable UI components from shadcn/ui
- **Hooks** (`client/src/hooks/`): Custom React hooks for data fetching and UI state
- **Library** (`client/src/lib/`): Utility functions, API client, and query client configuration

**State Management:**
- TanStack Query handles server state with automatic caching and invalidation
- React hooks manage local component state
- Form state managed by react-hook-form with Zod validation

**Routing Structure:**
- `/` - Dashboard showing active and completed games
- `/new-game` - Game setup form
- `/play/:id` - Active game recording interface with 3x3 grid for bowl position tracking
- `/games` - Game history with filtering capabilities
- `/analysis` - Statistical analysis dashboard with filtering options
- `/account` - User profile and settings
- `/admin` - Admin dashboard (admin users only)

### Backend Architecture

**Technology Stack:**
- Express.js for HTTP server
- Node.js with TypeScript (ESM modules)
- Drizzle ORM for database interactions
- PostgreSQL for data persistence
- Zod for runtime validation
- Replit Auth for authentication (Google OAuth)

**Design Pattern:**
The backend follows a layered architecture:
- **Routes Layer** (`server/routes.ts`): HTTP endpoint definitions and request handling
- **Storage Layer** (`server/storage.ts`): Database abstraction with IStorage interface
- **Database Layer** (`server/db.ts`): Database connection and Drizzle initialization
- **Schema Layer** (`shared/schema.ts`): Shared type definitions and validation schemas
- **Auth Layer** (`server/replitAuth.ts`): Authentication middleware and session handling

**API Design:**
RESTful API with standard HTTP methods:
- `POST /api/games` - Create new game
- `GET /api/games` - List all games for current user
- `GET /api/games/:id` - Get single game
- `GET /api/games/:id/full` - Get game with all ends and bowls
- `PATCH /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- Similar patterns for `/api/ends` and `/api/bowls` endpoints
- Admin endpoints at `/api/admin/*` for user management

**Error Handling:**
- Zod validation errors converted to user-friendly messages using zod-validation-error
- Standard HTTP status codes (400 for validation, 404 for not found, 500 for server errors)
- Structured error responses with error messages

### Authentication & Authorization

**Authentication:**
- Replit Auth integration with Google OAuth
- Session-based authentication with PostgreSQL session store
- Automatic user creation on first login

**Authorization:**
- All game data is scoped to the authenticated user
- Admin role-based access control (isAdmin field on users)
- Server-side middleware protects all routes

**Admin System:**
- User search and listing
- Suspend/activate user accounts
- Delete user accounts and all associated data
- Audit logging for all admin actions
- To make a user admin: `UPDATE users SET is_admin = true WHERE email = 'user@example.com';`

### Data Storage Solutions

**Database Schema:**
Five main tables with cascading relationships:

1. **users** - User accounts
   - Profile data (firstName, lastName, email, club)
   - Authentication (id from Replit Auth)
   - Admin flags (isAdmin, isSuspended)
   - Timestamps (createdAt, updatedAt)

2. **sessions** - Authentication sessions
   - Session data for connect-pg-simple

3. **audit_logs** - Admin action tracking
   - Admin user, action type, target user, details, timestamp

4. **games** - Core game information
   - Game metadata (opponent, venue, surface, rink, type)
   - Configuration (totalEnds, position)
   - Status tracking (IN_PROGRESS or COMPLETED)
   - User ownership (userId)
   - UUID primary key with automatic generation

5. **ends** - Individual end records
   - Foreign key to games with cascade delete
   - End-specific data (endNumber, jackEffective, length)
   - Scoring (scoreFor, scoreAgainst)
   - State flags (isDead, isCompleted)

6. **bowls** - Individual bowl deliveries
   - Foreign key to ends with cascade delete
   - Bowl metadata (bowlNumber, hand)
   - Result classification (9 possible outcomes based on 3x3 grid)

**ORM Strategy:**
Drizzle ORM provides:
- Type-safe database queries with TypeScript inference
- Automatic migration generation from schema definitions
- Runtime validation through drizzle-zod integration
- Efficient query building with method chaining

**Data Access Pattern:**
Repository pattern implemented through DatabaseStorage class:
- Interface-based design (IStorage) for testability
- Encapsulation of all database operations
- Consistent error handling and return types
- Transaction support through Drizzle's query builder

### External Dependencies

**Database:**
- PostgreSQL (configured via DATABASE_URL environment variable)
- Connection pooling via pg.Pool
- Drizzle Kit for schema management and migrations

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui built on top of Radix UI with Tailwind styling
- Lucide React for consistent iconography

**Build and Development Tools:**
- Vite with custom plugins for meta image handling and Replit integration
- ESBuild for server-side bundling with selective dependency bundling
- TypeScript compiler for type checking (noEmit mode)

**Styling:**
- Tailwind CSS v4 with custom theme
- Custom CSS variables for lawn green and sport tech theme
- PostCSS with autoprefixer

**Validation:**
- Zod for schema validation on both client and server
- @hookform/resolvers for React Hook Form integration
- drizzle-zod for automatic schema generation from database models

**Date Handling:**
- date-fns for date manipulation and formatting
- react-day-picker for calendar UI components

**Development Enhancements:**
- Replit-specific plugins (vite-plugin-runtime-error-modal, cartographer, dev-banner)
- Custom vite-plugin-meta-images for OpenGraph image handling
- Hot module replacement through Vite

**Notable Design Decisions:**
- Shared schema definitions between client and server in `/shared` directory for type safety
- Progressive Web App capabilities through proper meta tags and manifest
- Mobile-first responsive design with sheet components for navigation
- Custom theme emphasizing lawn green (#22c55e) and gold accent colors
- Statistical analysis calculations performed client-side for responsiveness
- Cascading deletes ensure data integrity when removing games
- Toast notifications positioned at bottom center with compact pill design
- Green bowl icon featured prominently in navigation and landing page
