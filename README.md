# 🚆 Chalo Transit Ticketing & Pass Architecture Simulator

A full-stack implementation and interactive simulator of the core ticketing mechanisms discovered from reverse-engineering the Chalo Transit Android app (`CHALO_TICKETING_ARCHITECTURE.md`).

This project captures the essential mechanics of modern digital transit ticketing: **mTickets**, **SuperPass Subscriptions**, **Dynamic Anti-Fraud QR Codes**, **BLE Proximity Punches**, **Tap-In / Tap-Out (TITO)**, and **Tamper-Proof Time Synchronization**.

---

## 📸 Key Features & Architecture

### 1. Dual-Terminal Interactive Experience
- **Passenger Mobile Smartphone View**:
  - Book single/multi-journey mTickets with route, stage, and fare calculation.
  - Post-purchase activation gate (`isActivationRequired == true`).
  - Active ticket screen with **Dynamic 15-second Rotating QR** (`TicketQrSchemaType.DYNAMIC_BMRCL`).
  - **Visual Verification Ribbon**: Pulsating animated gradient banner with 3-character security hash (`GenerateHashCodeForEasyVerificationUseCase.java`) to prevent screenshot fraud.
  - **4-Hour Countdown Clock**: Deterministic 14,400,000ms countdown timer (`MTicketUtilsHelper.java`).
  - **Tap-In / Tap-Out (TITO)** turnstile gate simulator (`TITOValidationEntity.java`).
  - **SuperPass Subscriptions**: Daily Unlimited, Weekly Commuter (30 rides), and Monthly Prime passes.
  - **1-Tap Pass Renewal**: Instant re-purchase pre-filled with previous route and KYC (`RenewSuperPassHelper.java`).
  - **Digital Trip Receipts**: Detailed fare, CGST/SGST tax breakdown, conductor ID, and cryptographic proof (`MTicketTripReceipt.java`).

- **Conductor ETM (Electronic Ticketing Machine) Terminal**:
  - Modeled after authentic rugged transit handheld ticketing terminals.
  - **BLE Proximity Radar**: Scans for active passenger devices broadcasting BLE beacons and executes 1-click **Punch Ticket** (`MTicketProductValidationConfig.java`).
  - **Dynamic QR Laser Scanner**: Verifies cryptographic digital signature and validates that the 15-second epoch window is active (flags screenshot replays and expired tickets).
  - **Visual Code Matcher**: Quick verification of 3-digit security hash.
  - **ETM Shift Ledger**: Tracks punched tickets, passenger counts, and fare revenue.
  - **Audio Feedback**: Realistic synthesized terminal beeps and punch chimes via Web Audio API.

- **Architecture Audit Trail & Time-Warp Controls**:
  - **Time-Warp Toolbar**: Advance clock by `+15m`, `+1h`, `+4h` (instantly expire mTickets), `+1d`, or `+30d` (expire SuperPasses) to demonstrate lifecycle transitions live in a presentation or project defense.
  - **Live Audit Trail**: Stream of real-time events displaying the exact decompiled Android class names and methods.

---

## 🗺️ Codebase to Decompiled Class Mapping

Every component in this project maps directly to the findings in `CHALO_TICKETING_ARCHITECTURE.md`:

| Project Module | Original Decompiled Android Class | Architectural Responsibility |
| :--- | :--- | :--- |
| `public/scripts/models/MTicket.js` | [`MTicket.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/models/mticketing/MTicket.java) | mTicket data model, 4h countdown duration, dynamic QR payload generator. |
| `public/scripts/models/SuperPass.js` | [`SuperPass.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/superpass/data/models/entities/SuperPass.java) | Subscription pass entity, ride quotas, daily fraud limits (`maxRidesPerDay`). |
| `public/scripts/models/TITOEntity.js` | [`TITOValidationEntity.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/tito/data/model/entity/TITOValidationEntity.java) | Tap-In / Tap-Out gate validator state machine (`NOT_USED` ➔ `TAPPED_IN` ➔ `TAPPED_OUT`). |
| `public/scripts/engine/TimeSyncEngine.js` | [`ChaloTimeSyncWorker.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/workers/ChaloTimeSyncWorker.java) | Calibrated server clock offset to defeat device clock spoofing. |
| `public/scripts/engine/ValidationEngine.js` | [`MTicketProductValidationConfig.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/mTicketing/validation/MTicketProductValidationConfig.java) | BLE advertiser on passenger device, ETM proximity punch handshake, QR signature validation. |
| `public/scripts/conductor/ConductorETM.js` | `validationsdk/blevalidation/` | Conductor handheld hardware simulator, BLE radar sweep, punch logging. |
| `public/scripts/passenger/PassengerApp.js` | [`MyTicketsViewState.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/zophop/homescreen/MyTicketsViewState.java) & [`RenewSuperPassHelper.java`](file:///d:/REA/decompiled_chalo/sources/app/chalo/superpass/utils/RenewSuperPassHelper.java) | Passenger UI, post-purchase gate, expired UI state (`ExpiredQrTicketUIState.java`), 1-tap renewal. |
| `server.js` | `TicketDao.java` & `SuperPassDao.java` | In-memory Room DB simulation, REST endpoints, and WebSocket real-time push events. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher installed)
- npm

### Installation & Launch
```bash
# Navigate to project directory
cd d:/REA/chalo-ticketing-app

# Install dependencies (Express, WS, QRCode)
npm install

# Start the application server
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🎯 Step-by-Step Demo Guide (For Presentations / Project Defense)

### Demo 1: Booking & Activation Lifecycle
1. In the **Passenger Smartphone View**, click the **"Book Ride"** tab.
2. Select Route `335-E Express` (Majestic ↔ ITPL Whitefield).
3. Choose boarding stop `Majestic Station` and destination `ITPL Main Gate`.
4. Click **"Proceed to Pay ₹60"**.
5. Observe the state transition: the ticket is created in `UNUSED` status with an **"Activate Ticket Now"** prompt (post-purchase gating).
6. Click **"Activate Ticket Now"**:
   - The **4-hour countdown clock** begins (`03:59:59 left`).
   - The **Anti-Fraud Security Ribbon** starts pulsing with an animated gradient and a 3-character visual code (e.g. `A84`).
   - The **Dynamic QR Code** starts rotating every 15 seconds.
   - The virtual **BLE Beacon** activates.

### Demo 2: Conductor Proximity BLE Punch
1. Keep the active ticket open on the Passenger phone.
2. Look at the **Conductor ETM Terminal** on the right side under the **"BLE Radar"** mode.
3. The ETM automatically detects the nearby passenger ticket with signal strength (e.g. `-52 dBm`).
4. Click **"⚡ Punch Ticket (ETM #ETM-9042)"** on the conductor terminal.
5. Watch the real-time synchronization:
   - Conductor ETM plays a transit confirmation chime and logs the punch.
   - Passenger phone immediately updates with a bright green **"✓ Validated by Conductor ETM"** badge.
   - Click **"📄 Trip Receipt"** on the passenger ticket to view the itemized digital tax invoice with conductor ID and crypto signature.

### Demo 3: Simulating Expiry & 1-Tap Pass Renewal
1. In the top toolbar, click the **"+4h (Expire Ticket)"** button.
2. Watch the deterministic expiration:
   - The countdown bar drops to `00:00:00`.
   - The QR code is instantly revoked and replaced with the **Expired Shield State** (`ExpiredQrTicketUIState`).
   - The BLE beacon shuts down.
   - The Architecture Trace at the bottom logs: `[EXPIRY_ENGINE] MTicketUtilsHelper.java: mTicket expired`.
3. Now switch to the **"SuperPass"** tab and click **"+30d (Expire Pass)"** in the top bar.
4. The SuperPass card transitions to `EXPIRED` and reveals the **"🔄 1-Tap Renew Pass"** button (`RenewSuperPassHelper.java`).
5. Click **"1-Tap Renew Pass"** to instantly re-issue a renewed pass with restored ride quotas!

### Demo 4: Tap-In / Tap-Out (TITO) Turnstiles
1. On an active ticket, scroll to the **"Metro / Gate Validator (TITO)"** section.
2. Click **"Tap In at Majestic"** (status changes to `TAPPED_IN`).
3. Click **"Tap Out at ITPL"** (journey completes, status changes to `TAPPED_OUT / USED`).

---

## 🛠️ Project Structure

```
chalo-ticketing-app/
├── package.json               # Dependencies and launch scripts
├── server.js                  # Express backend, WebSocket server & Room DB simulation
├── public/
│   ├── index.html             # Presentation layout: Passenger App + ETM Terminal + Inspector
│   ├── styles/
│   │   ├── main.css           # Design tokens, typography, header clock, modals, receipt
│   │   ├── passenger.css      # Smartphone mockup, pulsating security ribbon, dynamic QR
│   │   ├── conductor.css      # Rugged ETM hardware skin, BLE radar sweep, laser reticle
│   │   └── inspector.css      # Architecture audit feed & category badges
│   └── scripts/
│       ├── qrcode.min.js      # Bundled zero-latency client QR code renderer
│       ├── models/
│       │   ├── MTicket.js     # mTicket entity, 4h countdown, dynamic payload
│       │   ├── SuperPass.js   # Subscription pass entity, ride quotas, daily limits
│       │   └── TITOEntity.js  # Tap-In / Tap-Out validation lifecycle
│       ├── engine/
│       │   ├── TimeSyncEngine.js   # Calibrated server clock (ChaloTimeSyncWorker) & Time Warp
│       │   ├── ValidationEngine.js # BLE beacon broadcaster, QR crypto verifier, audio synth
│       │   └── StateStore.js       # Reactive state management & WebSocket event sync
│       ├── passenger/
│       │   └── PassengerApp.js     # Passenger booking, activation, QR rendering, pass renewal
│       ├── conductor/
│       │   └── ConductorETM.js     # Conductor ETM hardware logic, BLE punch, QR scan
│       └── app.js                  # Main bootstrap, header clock, inspector binding
└── README.md                  # Comprehensive architectural guide & presentation walkthrough
```

---

## 💡 Ideas for Future Project Extensions
- Connect with physical BLE using the Web Bluetooth API (`navigator.bluetooth`).
- Integrate real camera scanning with the Web Barcode Detection API or `jsQR`.
- Add SQLite persistence via `sqlite3` or `better-sqlite3` to simulate Android Room SQL queries directly.
- Add multi-passenger group booking with split QR codes.
