# MediDispense Admin (Next.js)

Hospital admin dashboard for the IoT-Based Automated Medicine Dispensing
Conveyor System project. Talks to the FastAPI backend in `../backend` over
REST + WebSocket.

## Quickstart

Make sure the backend is running first (see `../backend/README.md`), then:

```bash
cd admin-web
npm install
cp .env.example .env.local   # defaults already point at http://localhost:8000
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`.

Default seed login (created automatically by the backend on first run):
**admin@medidispense.com / admin123**

Only accounts with the `admin` role can sign into this site — doctors,
nurses, pharmacists, and technicians use the Android app instead.

## Pages

- `/login` — admin sign-in
- `/dashboard` — live tiles (active deliveries, open alerts, conveyor status,
  today's count) + a conveyor simulator panel standing in for the real
  ESP32/IR-sensor hardware
- `/patients` — register patients, view/print their QR code
- `/users` — create/remove doctor/nurse/pharmacist/technician/admin accounts
- `/prescriptions` — every prescription + its delivery pipeline, expandable
  to see the full stage-by-stage timeline
- `/alerts` — medicine-mismatch and conveyor-failure alerts, acknowledge/resolve
- `/reports` — deliveries/day and alerts-by-type charts (recharts)

## Live updates

The dashboard, alerts, and prescriptions pages subscribe to the backend's
`/ws/conveyor`, `/ws/alerts`, and `/ws/prescriptions` WebSocket channels
(see `src/lib/use-live-channel.ts`) and refetch the relevant data the moment
the backend broadcasts an event — no polling.

## Build

```bash
npm run build
npm run start
```

## Notes

- Auth: JWT from `/auth/login` is stored in `localStorage` and attached to
  every API request via an axios interceptor (`src/lib/api.ts`). This is an
  MVP choice; for a hardened deployment, move to an httpOnly cookie set by a
  Next.js route handler instead.
- Two ESLint rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`)
  are downgraded to warnings in `eslint.config.mjs` — they're new
  React-Compiler-prep rules that flag the plain fetch-in-effect and
  ref-holds-latest-callback patterns used throughout this app.
