# CalendAir — Project Context

## Stack
- **Frontend:** React 19 + TypeScript + Vite + Redux Toolkit + React Query + i18n
- **Backend:** Node.js + Express + Drizzle ORM + PostgreSQL (Neon)
- **Auth:** JWT + Google OAuth
- **Deployment:** Vercel (frontend) + Render (backend)
- **Testing:** Vitest (frontend: @testing-library; backend: supertest)

## Structure
calendar-app/
├── frontend/
│   └── src/
│       ├── features/calendar/   # calendar feature module
│       ├── components/          # shared UI components
│       ├── hooks/               # shared hooks
│       ├── pages/               # route-level components
│       ├── redux/               # store, slices, operations
│       ├── API/                 # axios instance, operations
│       ├── schemas/             # yup validation schemas (frontend forms)
│       ├── types/               # TypeScript types
│       └── locales/             # i18n (en, uk)
└── backend/
└── src/
├── features/            # analytics, auth, calendar, config, events, notifications, system, users
├── controllers/         # request handlers
├── services/            # business logic
├── middleware/          # auth, error handling
├── types/               # TypeScript types
└── utils/               # helpers
## Commands
```bash
# Development
npm run dev --prefix frontend
npm run dev --prefix backend

# Type check
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Database
npm run db:migrate --prefix backend

# Build
npm run build --prefix frontend
npm run build --prefix backend
```

## Testing
- Pre-commit (husky) runs vitest conditionally: frontend tests on frontend/ changes, backend tests on backend/ changes
- Current suites: 19 frontend + 39 backend

## Architecture Decisions
- Monorepo with separate frontend/backend package.json
- Feature-based modular structure on both frontend and backend
- Unified API response contract via apiResponse utility
- calendar feature split: features/calendar/router.ts (events + access) + sharesRouter.ts (calendar shares)
- features/events/router.ts — pure event CRUD
- features/events/eventSerializer.ts — shared event→response serializer (used by calendar & events routers)
- Shared in-memory TTL cache (cache.ts/getOrSetCache) with in-flight dedup for holidays, IP geolocation, AI insights
- In-app notifications replace real email flows (academic demo)
- Demo Mode available for presentation without real account

## Active Branch
- `main` — primary branch

## Code Rules
- Feature-based structure: `src/features/<name>/{components,hooks,api}`
- English comments only — concise, no self-explanatory logic
- No premature optimization (useMemo/useCallback only with measurements)
- All API responses follow unified contract via `apiResponse` utility
- Input validation: frontend forms via Yup (react-hook-form); backend validates request inputs manually
- Drizzle ORM only — no raw SQL except migrations

## Environment
- Frontend: `.env` with `VITE_` prefix variables
- Backend: `.env` with DATABASE_URL, JWT_SECRET, GOOGLE_* vars
- Production URL: `calendar-app-pi-gold.vercel.app`

## Known Constraints
- Render free tier: 512MB RAM, cold starts ~30s
- Neon PostgreSQL: connection pooling required
- Windows dev environment: use PowerShell for compound commands