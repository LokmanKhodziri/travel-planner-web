# Travel Planner Web

Next.js frontend for the Travel Planner app. Talks to the **Travel Planner API** (Express) for auth and data.

## Setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to your API (e.g. `http://localhost:4000`).
2. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   App runs at `http://localhost:3000`.

## Auth flow

- **Login**: User clicks “Sign in with Google/GitHub” → redirects to API `/auth/google` or `/auth/github` → API redirects back to `/auth/callback?token=JWT` → frontend stores JWT in a cookie and redirects to `/trips`.
- **API calls**: All requests to the API send `Authorization: Bearer <token>` (token from cookie).
- **Logout**: Call API `POST /auth/logout`, clear cookie, redirect to `/`.

## Env

- `NEXT_PUBLIC_API_URL` – base URL of the Travel Planner API (required).
- `UPLOADTHING_TOKEN` – optional; for trip image uploads.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – optional; for the map component.

## Repos

- **Backend**: [../travel-planner-api](../travel-planner-api) – Express + Prisma + auth.
- **Frontend**: this repo – Next.js UI only.
