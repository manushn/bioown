# College Staff Fingerprint Attendance System

Offline-first Windows kiosk-style attendance system built for college faculty and staff using the **Mantra MFS100 V54 optical biometric fingerprint scanner**.

---

## 1. Key Capabilities

- **Direct Kiosk Mode:** Starts automatically on Windows login and opens directly in **Fingerprint Reading Mode** ("*Place your finger*").
- **Offline-First SQLite:** All attendance records and biometric templates are stored locally in SQLite (`better-sqlite3` / native `node:sqlite`). Internet connectivity is never required to record staff punches.
- **Accidental Duplicate Punch Prevention:** Debounces rapid scans (< 60 seconds) and rejects repeated scans after daily checkout is finalized.
- **Intelligent Attendance Engine:**
  - Standard check-in target: `09:25 AM`.
  - **Late Check-in Compensation:** If a staff member checks in late by $X$ minutes, expected checkout automatically shifts $X$ minutes later in the afternoon (configurable).
  - Midday leave and return tracking (Punch 1: Check-in, Punch 2: Half check-out, Punch 3: Half check-in, Punch 4: Final check-out).
  - Minimum full-day (7h) and half-day (3.5h) duration compliance.
- **Administrator Dashboard:**
  - Default bootstrap account: `niadmin` / `ni2027` (forces password change on first login, bcrypt encrypted).
  - Password recovery mechanism via secure recovery key (`config/security.json`).
  - Full staff profile management with **multi-finger biometric enrollment** (Right/Left thumb, index, middle, ring, pinky).
  - Real-time attendance monitoring, raw punch timelines, and **official administrative overrides** with reason audit logs.
  - Institutional date-filtered reports with **PDFKit export**.
  - **Disaster Recovery & Backup Manager:** Snapshot creation, checksum validation, mandatory pre-restore safety backups, and automated restore inbox polling.
  - **MFS100 Health Monitor:** Live diagnostics for USB connection, driver layer, SDK initialization, and sensor readiness.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | Electron (Windows Kiosk mode, auto-start, NSIS installer) |
| **User Interface** | React 19, Vite, Tailwind CSS, Lucide React, React Router |
| **Local API** | Node.js, Express, SQLite (`better-sqlite3`), Zod, bcryptjs, JWT, PDFKit |
| **Biometric Bridge** | C# (.NET Framework 4.8 / x86), Mantra MFS100 SDK & Drivers |

---

## 3. Project Directory Structure

```text
custom_attendance/
├── apps/
│   ├── desktop/               # Electron kiosk wrapper & auto-start
│   │   ├── electron/
│   │   │   ├── main.js
│   │   │   ├── preload.js
│   │   │   └── startup.js
│   │   └── package.json
│   ├── web/                   # React + Vite + Tailwind UI
│   │   ├── src/
│   │   │   ├── pages/         # ReadingMode, Login, Dashboard, Staff, etc.
│   │   │   ├── components/    # AdminLayout, DeviceCard, etc.
│   │   │   └── services/      # Axios API client
│   │   └── package.json
│   └── local-api/             # Node.js + Express + SQLite backend
│       ├── src/
│       │   ├── attendance/    # Attendance calculation & rule engine
│       │   ├── backup/        # Backup manager & restore-inbox processor
│       │   ├── controllers/   # Auth, Device, Attendance, Staff, Rules, Reports, Backup, Audit
│       │   ├── database/      # SQLite adapter & initialization
│       │   ├── reports/       # PDFKit generator
│       │   └── services/      # MFS100 Bridge & Simulator client
│       └── package.json
├── hardware/
│   └── mfs100-bridge/         # C# .NET localhost HTTP bridge (port 8765)
│       ├── MFS100Bridge.sln
│       ├── MFS100Bridge/
│       │   ├── Program.cs
│       │   └── MFS100Bridge.csproj
│       └── README.md
├── database/
│   ├── schema.sql             # Complete SQLite schema
│   └── seed.sql               # Seed rules, staff profiles, app settings
├── scripts/
│   ├── build-windows.ps1      # PowerShell build script for Windows
│   ├── install-startup.ps1    # Kiosk registry auto-start configuration
│   └── restore-backup.ps1     # Offline database rollback script
├── docs/
│   └── architecture.md
├── package.json
└── README.md
```

---

## 4. Running the System

### Quick Start (Development & Testing)

1. **Initialize the SQLite database:**
   ```bash
   node apps/local-api/src/database/init.js
   ```

2. **Start the Local API backend (Port 5000):**
   ```bash
   npm --prefix apps/local-api start
   ```

3. **Start the React UI with Vite (Port 5173):**
   ```bash
   npm --prefix apps/web run dev
   ```

4. Open `http://localhost:5173` in your browser.
   - The application immediately displays the full-screen **Reading Mode** ("*Place your finger*").
   - You can test staff scans instantly using the built-in simulator controls or click **Admin Login** (`niadmin` / `ni2027`) to access the dashboard.

---

## 5. Deployment on Windows PC with Mantra MFS100 Scanner

1. Connect the **Mantra MFS100 V54** USB scanner to the Windows PC.
2. Install the **Mantra MFS100 Driver** and **MFS100 SDK** from Mantra Softech.
3. Build and run the C# bridge service:
   ```cmd
   msbuild hardware/mfs100-bridge/MFS100Bridge.sln /p:Configuration=Release /p:Platform=x86
   ```
4. Build the Electron Windows installer:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1
   ```
5. Install the generated installer. The attendance terminal will launch on Windows startup in kiosk mode.

