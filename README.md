# Travel Planner Web

Next.js frontend for the **Muslim-Friendly Travel Planner**. Connects to the [Travel Planner API](../travel-planner-api) for auth, trips, planning, expenses, prayer times, and nearby places.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI · Google Maps · UploadThing

## Prerequisites

- Node.js **≥ 20**
- Running [Travel Planner API](../travel-planner-api) (default `http://localhost:4000`)

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Set `NEXT_PUBLIC_API_URL` to your API base URL.
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   App runs at `http://localhost:3000`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (e.g. `http://localhost:4000`) |
| `UPLOADTHING_TOKEN` | For trip images | Token from [UploadThing](https://uploadthing.com) dashboard |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | For map tab | Google Maps JavaScript API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | No | Optional advanced map styling ID |

## Authentication

Supports **email/password** and **Google/GitHub OAuth** (when configured on the API).

1. User signs in on `/login`.
2. **OAuth:** redirects to API `/auth/google` or `/auth/github` → callback to `/auth/callback?token=JWT`.
3. **Email:** `POST /auth/login` or `/auth/signup` via API; JWT stored in cookie.
4. Frontend stores JWT in an `jwt` cookie and sends `Authorization: Bearer <token>` on API calls.
5. **Logout:** calls `POST /auth/logout`, clears cookie, redirects home.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (features, sign-up CTA) |
| `/login` | Sign in (email + OAuth) |
| `/auth/callback` | OAuth return handler |
| `/dashboard` | User dashboard and trip overview |
| `/trips` | List all trips |
| `/trips/new` | Create a new trip |
| `/trips/[tripId]` | Trip detail (tabs below) |
| `/trips/[tripId]/itinerary/new` | Add a destination to a trip |
| `/globe` | 3D globe of visited locations |
| `/profile` | Profile, home city, timezone, password |
| `/admin` | Admin dashboard (ADMIN role only) |

### Trip detail tabs (`/trips/[tripId]`)

| Tab | Description |
|-----|-------------|
| **Overview** | Trip dates, stats, per-day activity summary |
| **Locations** | Drag-and-drop saved destinations |
| **Planner** | Day-by-day timed itinerary (see below) |
| **Expenses** | Trip budget + expense tracking by category |
| **Prayer Times** | Daily salah for trip destination |
| **Nearby** | Mosques and Halal restaurants |
| **Map** | Google Maps of all trip stops |

### Planner tab

The planner is organized around **day tabs** at the top, then three sub-views:

| Sub-tab | Description |
|---------|-------------|
| **Timeline** | Timed activities for the selected day, drag-to-reorder, travel gap estimates, optional prayer times on timeline |
| **Discover** | One-click activity recommendations near saved locations (filter by category) |
| **Places** | Saved trip destinations — drag onto timeline or quick-add to the selected day |

Empty trips show a **getting started** guide (add destinations → pick a day → add activity).

## Key features

- **Day-by-day planner** with timed activities and overlap detection
- **Smart recommendations** from Google Places near saved locations
- **Travel time estimates** between stops (driving / transit / walking)
- **Prayer times** on timeline and dedicated tab (Aladhan API)
- **Nearby mosques & Halal** food around trip locations
- **Trip budget** with per-category limits and expense logging
- **Activity-linked expenses** — tie spending to a planned activity
- **Interactive map** and **3D globe** of visited places
- **Trip images** via UploadThing
- **Responsive layout** for mobile, tablet, and desktop

## Project structure

```
app/                  # Next.js App Router pages
components/           # UI components (planner, map, expenses, etc.)
lib/                  # API client, auth, planner helpers
types/                # Shared TypeScript types (ApiTrip, ApiActivity, …)
```

### Notable components

| Component | Role |
|-----------|------|
| `trip-detail.tsx` | Trip page with tab navigation |
| `itinerary-activities.tsx` | Planner (Timeline / Discover / Places) |
| `planner-stretch-timeline.tsx` | Visual day timeline with prayer times |
| `trip-expenses-panel.tsx` | Expenses list and form |
| `trip-budget-card.tsx` | Budget setup and progress |
| `prayer-times-panel.tsx` | Prayer times tab |
| `nearby-places-panel.tsx` | Mosques & Halal tab |
| `globe-explorer.tsx` | 3D globe page |
| `sortable-itinerary.tsx` | Drag-and-drop locations |

## API client

All backend calls go through `lib/api.ts` (`api.getTrips()`, `api.createActivity()`, etc.). The client reads the JWT from cookies and attaches it to every request.

## Related repos

- **Backend:** [../travel-planner-api](../travel-planner-api) — Express + Prisma API
- **Plan:** [../PROJECT_PLAN.md](../PROJECT_PLAN.md) — development timeline

## Local development (both repos)

```bash
# Terminal 1 — API
cd travel-planner-api
cp .env.example .env   # fill in values
npm install && npm run db:push && npm run dev

# Terminal 2 — Web
cd travel-planner-web
cp .env.example .env.local
npm install && npm run dev
```

Open `http://localhost:3000`, sign in, create a trip, add a location, then explore the Planner tab.
