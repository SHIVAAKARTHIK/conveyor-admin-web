# MediDispense web app (Next.js)

The one web app for every role: patient, doctor, nurse, technician and admin.
It talks to the FastAPI backend ([conveyor-backend](https://github.com/SHIVAAKARTHIK/conveyor-backend))
over REST and WebSocket, and controls the ESP32 conveyor directly over the local
network ([conveyor-firmware-](https://github.com/SHIVAAKARTHIK/conveyor-firmware-)).
The full setup guide, report and wiring are in [conveyor-docs](https://github.com/SHIVAAKARTHIK/conveyor-docs).

## Quickstart

Needs Node.js 20 or newer (developed on 22) and the backend running first.

```bash
cd admin-web
npm install
copy .env.example .env.local     # macOS/Linux: cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `.env.local` already points at the backend on
`http://localhost:8000`. If the backend runs on another computer, put that
computer's address there, and add this site's address to the backend's
`CORS_ORIGINS`.

Sign in with a demo account (the backend's `seed_demo.py` creates them; the
logins are listed in the setup guide). A patient registers with **Sign up**.

## What each role sees

| Role | Pages |
|---|---|
| Patient | Home (their deliveries, "I received it"), Find a Doctor, My Consultations |
| Doctor | Consultations: Available/Busy switch, accept requests, prescribe, live delivery status |
| Nurse | Bedside confirmation: assign Bed 1 or 2 to patients, confirm arrived deliveries with the wristband code |
| Technician | Conveyor: live hardware control (Dispatch, Start/Stop belt, Push Bed 1/2, Beep), deliveries in progress, alerts; **Install firmware** (flash the ESP32 from the browser) |
| Admin | Dashboard, Patients, Staff, Prescriptions and Deliveries, Consultations, Alerts, Reports |

## Hardware control panel

The technician page and the admin dashboard show **Live hardware control**. The
browser calls the conveyor's own small web server (`http://conveyor.local`) on
the local network, so the computer running the browser must be on the same
WiFi as the conveyor. If `conveyor.local` does not resolve, open **Conveyor
address** on the panel and enter the board's IP address.

## Installing the conveyor firmware from the browser

The **Install firmware** page (technician and admin) flashes an ESP32 over USB with no command line, using
Web Serial and [esptool-js](https://github.com/espressif/esptool-js). It needs **Chrome or Edge on a
computer**, opened at `http://localhost:3000` (or https). The firmware files are in `public/firmware`
with their flash addresses in `manifest.json`. They are built from the placeholder config, so they hold no
WiFi password: the board's own setup page asks for it afterwards. "Keep saved WiFi and login" (on by
default) leaves the board's saved settings alone, which is right for an update.

After the firmware changes, rebuild the files from the firmware repo:

```bash
powershell -ExecutionPolicy Bypass -File .\flash.ps1 -Export ..\conveyor-admin-web\public\firmware
```

## Checks

```bash
npx tsc --noEmit
npm run lint
```
