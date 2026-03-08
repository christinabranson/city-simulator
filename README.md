# City Sim MVP (Next.js + React)

Mechanics-first city builder prototype with:

- Grid placement
- Building construction queue with timestamps
- Deterministic resource simulation (no polling loop)
- LocalStorage persistence + optional cloud sync
- Optional social-like stubs (visiting mock cities and gifting resources)

## Stack

- Next.js (pages router) + React + TypeScript
- Zustand for state management
- TailwindCSS for UI

## Project Structure

- `pages/` - app entry and top-level pages
- `components/` - UI components
- `game/models/` - building definitions + mock social city data
- `game/simulation/` - simulation engine
- `game/state/` - Zustand store + gameplay actions
- `game/persistence/` - LocalStorage load/save
- `hooks/` - hydration and interaction hooks
- `types/` - shared TypeScript models

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Clerk + Supabase Setup (Cloud Save)

1. Copy `.env.example` to `.env.local` and fill in keys.
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. Start app and sign in via Clerk.
4. When signed in, snapshot sync runs through `pages/api/cloud/snapshot.ts`:
   - `GET` loads cloud snapshot (if present)
   - `PUT` upserts latest game snapshot

Notes:
- Signed-out users continue using LocalStorage-only saves.
- Cloud sync is local-first with fallback; if cloud is unavailable, local gameplay still works.

## Mechanics Notes

- Simulation runs on:
  - load/hydration
  - focus return
  - interaction actions (`placeBuilding`, `giftResource`, manual `simulateNow`)
- Construction completion and production are timestamp-based.
- Per-building production uses completed cycle math:
  - `cycles = floor((now - lastProducedAt) / cycleDuration)`
- Entire snapshot is serialized to LocalStorage (`city-sim-mvp-v1`).
