# College Staff Fingerprint Attendance System — Architecture

## 1. Goal

A Windows kiosk-style application for **staff-only attendance** using the **Mantra MFS100 V54 fingerprint scanner**.

The application must:

- Start automatically when the Windows PC starts/logs in.
- Open directly in **fingerprint reading mode**.
- Save attendance locally in **SQLite** first.
- Allow staff to punch without login.
- Show **Welcome, Staff Name** for check-in.
- Show **Thank you, Staff Name** for checkout.
- Prevent accidental duplicate punches.
- Provide an **Admin Login** with username/password.
- Let an admin add, edit, remove/deactivate staff.
- Enroll or update staff fingerprints.
- View all saved attendance data.
- Filter attendance by date/date range/staff/department/status.
- Generate and download date-wise PDF reports.
- Configure attendance timings and half-day rules.
- Create downloadable backup files.
- Automatically detect and restore a valid newer backup on another computer.
- Keep working when the internet/server is temporarily unavailable.

---

## 2. Recommended Technology Stack

### Desktop / UI

- **Electron** — packages the application as a Windows `.exe` and allows auto-start.
- **React + Vite** — modern web-style user interface.
- **Tailwind CSS** — styling.
- **React Router** — Admin pages/routes.
- **Axios** — API requests.
- **Lucide React** — icons.

### Local backend

- **Node.js + Express**
- **SQLite + better-sqlite3**
- **Zod** — request/config validation.
- **bcryptjs** — admin password hashing.
- **jsonwebtoken** — admin session token.
- **PDFKit** — PDF reports.
- **date-fns** — attendance/date calculations.
- **Pino** — application logs.

### Fingerprint hardware layer

- **C#**
- **.NET Framework 4.8**
- **Mantra MFS100 V54 driver + SDK**
- Optional: **Newtonsoft.Json** if the C# bridge communicates using JSON over localhost HTTP.

The MFS100 SDK and driver are vendor components. They are not npm packages.

---

## 3. High-Level Architecture

```text
                         WINDOWS ATTENDANCE PC
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Electron Desktop App                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ React + Vite + Tailwind UI                           │  │
│  │                                                      │  │
│  │  READING MODE                                        │  │
│  │  "Place your finger"                                 │  │
│  │                                                      │  │
│  │  ADMIN LOGIN                                         │  │
│  │      ↓                                               │  │
│  │  DASHBOARD                                            │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │ HTTP / IPC                      │
│                          ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Node.js + Express Local API                          │  │
│  │                                                      │  │
│  │ Staff      Attendance      Settings      Backup      │  │
│  │ Reports    Admin Auth      Sync          Audit Log   │  │
│  └──────────────┬───────────────────────┬───────────────┘  │
│                 │                       │                  │
│                 ▼                       ▼                  │
│       ┌──────────────────┐    ┌────────────────────────┐  │
│       │ SQLite           │    │ C# MFS100 Bridge       │  │
│       │                  │    │                        │  │
│       │ Staff            │    │ MFS100 SDK             │  │
│       │ Fingerprints     │    │ Capture                 │  │
│       │ Attendance       │    │ Identify                │  │
│       │ Admins           │    │ Device status           │  │
│       │ Settings         │    └───────────┬────────────┘  │
│       │ Audit logs       │                │ USB            │
│       └──────────────────┘                ▼                │
│                                  ┌──────────────────┐      │
│                                  │ MFS100 V54       │      │
│                                  └──────────────────┘      │
│                                                            │
└───────────────────────────────┬────────────────────────────┘
                                │ HTTPS (optional sync)
                                ▼
                     ┌─────────────────────────┐
                     │ College Central Server  │
                     │ Express / MongoDB       │
                     └─────────────────────────┘
```

---

## 4. Important Design Choice: Offline First

Attendance should **never depend on internet access**.

### Punch flow

```text
Finger
  ↓
MFS100
  ↓
C# bridge
  ↓
Identify staff locally
  ↓
Node.js attendance logic
  ↓
SQLite
  ↓
Show result immediately
  ↓
Optional background sync to college server
```

If the server/internet is down:

```text
Attendance → SQLite → Sync queue
```

When the connection returns:

```text
SQLite sync queue → College API → Mark synced
```

---

## 5. Startup Flow

When Windows starts:

```text
Windows login
     ↓
Electron auto-start
     ↓
Start Node local API
     ↓
Start MFS100 C# bridge
     ↓
Check scanner
     ↓
Load React UI
     ↓
READING MODE
```

The user should never need to open a browser manually.

Use Electron's startup capability or Windows Task Scheduler for the deployment PC.

---

## 6. Main Screens

### Screen A — Attendance Reading Mode

This is the screen visible all day.

```text
┌─────────────────────────────────────────────┐
│ COLLEGE STAFF ATTENDANCE      ● READY       │
│                                             │
│                                             │
│              Good Morning                  │
│                                             │
│             Place your finger              │
│                                             │
│                 [ FINGER ]                 │
│                                             │
│             Waiting for scan...             │
│                                             │
│          07 October 2026  09:12 AM         │
│                                             │
│                            [ Admin Login ]  │
└─────────────────────────────────────────────┘
```

### Check-in success

```text
✓ WELCOME

Staff Name
Department

CHECK IN
09:26:10 AM
Late by 1 minute
```

### Checkout success

```text
✓ THANK YOU

Staff Name
Department

CHECK OUT
05:31:10 PM
```

### Already completed

```text
Attendance already completed for today.
```

### Scanner problem

```text
Fingerprint scanner not detected.
Please reconnect the MFS100.
```

---

## 7. Admin Login

Only the admin side requires login.

```text
Username
Password

[ LOGIN ]
```

Password must be stored as a **bcrypt hash**, never as plain text.

Admin session is separate from staff attendance.

---

## 8. Admin Dashboard

```text
Dashboard
├── Overview
├── Staff
│   ├── Add Staff
│   ├── Edit Staff
│   ├── Deactivate Staff
│   └── Fingerprint
│       ├── Enroll
│       ├── Update
│       └── Replace
├── Attendance
│   ├── Today
│   ├── Date-wise
│   ├── Date Range
│   ├── Staff-wise
│   └── Department-wise
├── Reports
│   └── Download PDF
├── Settings
│   ├── Check-in time
│   ├── Check-out time
│   ├── Half-day settings
│   ├── Late-in rules
│   └── Early-out rules
├── Backup
│   ├── Create Backup
│   ├── Download Backup
│   ├── Restore Backup
│   └── Restore History
└── Audit Log
```

---

## 9. Staff Data Model

### staff

```text
id
staff_code
name
department
designation
phone (optional)
email (optional)
active
created_at
updated_at
```

### fingerprints

```text
id
staff_id
finger_index
template_data
template_format
created_at
updated_at
```

Store the **fingerprint template/data required for identification**, not unnecessary raw fingerprint images.

---

## 10. Attendance Data Model

### attendance

```text
id
staff_id
attendance_date
session_type
in_time
out_time
in_status
out_status
late_minutes
early_out_minutes
expected_out_time
source_terminal
created_at
updated_at
```

### session_type

Possible values:

```text
FULL_DAY
HALF_DAY
```

### in_status

Possible values:

```text
ON_TIME
LATE
```

### out_status

Possible values:

```text
ON_TIME
EARLY_OUT
LATE_OUT
```

---

## 11. Attendance Logic

### Default check-in time

```text
09:25
```

The admin can change this.

### Check-in

First successful punch of the day:

```text
punch_time <= configured_checkin_time
        ↓
ON_TIME

punch_time > configured_checkin_time
        ↓
LATE
late_minutes = punch_time - configured_checkin_time
```

No grace period should be assumed unless the admin configures one.

---

## 12. Late Check-in Compensation

Your requested rule:

> If a staff member checks in 5 minutes late in the morning, the expected checkout should move 5 minutes later in the afternoon.

Implement:

```text
configured checkout = 17:30

late check-in = 5 minutes

expected checkout = 17:35
```

Therefore:

```text
expected_out_time =
    configured_out_time + late_minutes
```

This must be configurable so the college can disable the rule later.

---

## 13. Early Checkout

Example:

```text
Expected checkout = 17:35

Actual checkout = 17:34

Result = EARLY_OUT
Early by = 1 minute
```

There should be **no automatic 1-minute grace period** unless the admin enables one.

---

## 14. Full-Day / Half-Day Logic

Admin should configure:

```text
Full Day Check-in   = 09:25
Full Day Checkout   = 17:30

Half Day Start      = configurable
Half Day Checkout   = configurable
```

A practical rule is:

```text
Morning first punch
        ↓
FULL_DAY session

First punch after configured half-day start
        ↓
HALF_DAY session
```

For a half-day session:

```text
Half-day IN
      ↓
Half-day OUT
```

The exact half-day cutoff should be a setting, not hard-coded.

---

## 15. Punch State Machine

For each staff member on a date:

```text
NO ATTENDANCE
      │
      │ first punch
      ▼
CHECKED_IN
      │
      │ second valid punch
      ▼
CHECKED_OUT
```

For half-day:

```text
NO ATTENDANCE
      │
      ▼
HALF_DAY_CHECKED_IN
      │
      ▼
HALF_DAY_CHECKED_OUT
```

If `CHECKED_OUT`:

```text
Reject further punch
```

This prevents accidental duplicate attendance.

---

## 16. SQLite Database

Recommended local database:

```text
data/
└── attendance.db
```

SQLite should be the **source of truth for the terminal**.

Do not store database files inside the application installation folder.

Use a writable application-data directory, for example:

```text
%ProgramData%\CollegeStaffAttendance\
    data\
    backups\
    restore-inbox\
    logs\
```

---

## 17. Backup Architecture

### Manual backup

Admin clicks:

```text
BACKUP → CREATE BACKUP
```

Generate:

```text
attendance-backup-2026-10-07-101500.db
```

Then allow:

```text
[ DOWNLOAD BACKUP ]
```

### Safe backup procedure

Before backup:

```text
SQLite backup
    ↓
Validate backup
    ↓
Save backup file
    ↓
Record audit log
```

---

## 18. Automatic Restore on Another PC

Recommended mechanism:

```text
restore-inbox/
```

When a backup file is copied to the second Windows computer:

```text
restore-inbox/
└── attendance-backup-2026-10-07.db
```

On application startup:

```text
1. Scan restore-inbox
2. Validate SQLite database
3. Check backup metadata/version
4. Compare backup timestamp
5. Create safety backup of current DB
6. Restore newer backup
7. Record restore event
8. Move processed backup to:
   restore-inbox/processed/
```

For safety, never blindly replace a database without creating a current backup first.

### Important

A backup cannot appear on a second computer automatically unless both computers have access to a shared location or the backup file is copied/synced there.

For a later version, you can use:

```text
Shared NAS
Google Drive
OneDrive
College server
Network share
```

and let the application automatically fetch the newest valid backup.

---

## 19. Recommended Backup Format

Keep SQLite backup as a database file:

```text
attendance-backup-YYYY-MM-DD-HHMMSS.db
```

Optional future format:

```text
attendance-backup-YYYY-MM-DD-HHMMSS.zip
    ├── attendance.db
    ├── manifest.json
    └── checksum.sha256
```

A manifest can contain:

```json
{
  "app_version": "1.0.0",
  "schema_version": 1,
  "created_at": "2026-10-07T10:15:00+05:30",
  "record_count": 2450
}
```

A checksum helps detect corrupted or modified backups.

---

## 20. PDF Report

Admin chooses:

```text
From Date: 01-10-2026
To Date:   07-10-2026

Department: All
Staff:      All

[ DOWNLOAD PDF ]
```

PDF can contain:

```text
COLLEGE STAFF ATTENDANCE REPORT

Date | Staff ID | Staff Name | Department | In Time |
     | Out Time | Status | Late | Early Out
```

Also include summary:

```text
Total Staff
Present
Half Day
Absent
Late
Early Out
```

Use **PDFKit** for PDF generation.

---

## 21. Suggested API

Local API:

```text
POST   /api/auth/login

GET    /api/device/status
POST   /api/device/capture
POST   /api/device/enroll
POST   /api/device/verify

GET    /api/staff
POST   /api/staff
GET    /api/staff/:id
PUT    /api/staff/:id
DELETE /api/staff/:id
POST   /api/staff/:id/fingerprint

POST   /api/attendance/punch
GET    /api/attendance/today
GET    /api/attendance
GET    /api/attendance/:staffId

GET    /api/reports/attendance.pdf

GET    /api/settings
PUT    /api/settings

POST   /api/backup/create
GET    /api/backup/list
POST   /api/backup/restore

POST   /api/sync
GET    /api/sync/status
```

---

## 22. Fingerprint Bridge API

The C# bridge can expose a localhost-only API such as:

```text
GET  http://127.0.0.1:8765/status
POST http://127.0.0.1:8765/capture
POST http://127.0.0.1:8765/enroll
POST http://127.0.0.1:8765/identify
```

Only the Electron/Node application should be allowed to use it.

Never expose the MFS100 bridge to the LAN or public internet.

---

## 23. Project Folder Structure

```text
college-staff-attendance/
│
├── apps/
│   ├── desktop/
│   │   ├── electron/
│   │   │   ├── main.js
│   │   │   ├── preload.js
│   │   │   └── startup.js
│   │   │
│   │   └── package.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── ReadingMode/
│   │   │   │   ├── Login/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Staff/
│   │   │   │   ├── Attendance/
│   │   │   │   ├── Reports/
│   │   │   │   ├── Settings/
│   │   │   │   └── Backup/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── local-api/
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── database/
│       │   ├── attendance/
│       │   ├── reports/
│       │   ├── backup/
│       │   ├── sync/
│       │   └── middleware/
│       └── package.json
│
├── hardware/
│   └── mfs100-bridge/
│       ├── MFS100Bridge.sln
│       ├── MFS100Bridge/
│       ├── vendor/
│       │   └── mantra/
│       └── README.md
│
├── database/
│   ├── schema.sql
│   └── migrations/
│
├── scripts/
│   ├── build-windows.ps1
│   ├── install-startup.ps1
│   └── restore-backup.ps1
│
├── docs/
│   └── architecture.md
│
├── .gitignore
└── README.md
```

---

## 24. Development on Mac vs Deployment on Windows

### Mac

You can develop:

```text
React
Vite
Tailwind
Node.js
Express
SQLite logic
PDF reports
Admin dashboard
Attendance logic
```

You can test almost all business logic on macOS.

### Windows

The Windows PC is required for:

```text
Mantra MFS100 driver
MFS100 SDK
C# fingerprint bridge
Final Electron Windows build testing
Actual fingerprint capture
```

You should not expect the MFS100 hardware layer to run on macOS just because the rest of the application is cross-platform.

---

## 25. Package Baseline

### npm runtime packages

```text
react
react-dom
react-router-dom
axios
lucide-react
clsx

express
cors
zod
better-sqlite3
bcryptjs
jsonwebtoken
pdfkit
date-fns
pino
```

### npm development/build packages

```text
vite
@vitejs/plugin-react
tailwindcss
@tailwindcss/vite

electron
electron-builder
concurrently
wait-on

vitest
supertest
playwright
```

### Windows-only

```text
.NET Framework 4.8
Mantra MFS100 Driver
Mantra MFS100 SDK
Optional: Newtonsoft.Json NuGet package
```

### Install command concept

```bash
npm install react react-dom react-router-dom axios lucide-react clsx
npm install express cors zod better-sqlite3 bcryptjs jsonwebtoken pdfkit date-fns pino
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
npm install -D electron electron-builder concurrently wait-on
npm install -D vitest supertest playwright
```

**Do not run the Windows MFS100 installation commands on the Mac.** Install the Mantra driver/SDK on the Windows deployment machine.

---

## 26. Recommended First Version

Build in this order:

```text
PHASE 1
MFS100 scanner
     ↓
C# bridge
     ↓
capture + identify
```

```text
PHASE 2
SQLite
     ↓
staff enrollment
     ↓
fingerprint template storage
```

```text
PHASE 3
Reading mode
     ↓
IN / OUT logic
     ↓
Welcome / Thank you screen
```

```text
PHASE 4
Admin login
     ↓
Dashboard
     ↓
Staff management
```

```text
PHASE 5
Reports
     ↓
PDF
     ↓
Date filters
```

```text
PHASE 6
Settings
     ↓
09:25 check-in
     ↓
checkout rules
     ↓
late-in compensation
     ↓
early-out
     ↓
half-day
```

```text
PHASE 7
Backup
     ↓
Download
     ↓
Restore
     ↓
Automatic restore-inbox detection
```

```text
PHASE 8
Electron packaging
     ↓
Windows .exe
     ↓
Auto-start
     ↓
Kiosk-style deployment
```

---

## 27. Final Recommendation

For your exact requirements:

```text
Frontend        React + Vite + Tailwind
Desktop shell   Electron
Local backend   Node.js + Express
Local database  SQLite / better-sqlite3
Fingerprint     C# + .NET Framework 4.8 + MFS100 SDK
PDF             PDFKit
Authentication  bcryptjs + JWT
Date logic      date-fns
Build           electron-builder
Deployment      Windows .exe
```

The key architectural rule is:

```text
React UI
   ↓
Node.js local backend
   ↓
C# MFS100 bridge
   ↓
MFS100 V54
```

and:

```text
Node.js local backend
   ↓
SQLite
   ↓
Optional college-server sync
```

This gives you a **web-style interface**, **native Windows fingerprint access**, **offline attendance**, **admin management**, **PDF reporting**, and **backup/restore** without making the fingerprint device dependent on your internet connection.


---

## 28. Backup Manager

The Admin Dashboard should have a dedicated **Backup & Restore** page.

### Admin UI

```text
BACKUP & RESTORE

Database Status
● Healthy

Last Backup
07 Oct 2026, 10:15 AM

[ CREATE BACKUP ]
[ DOWNLOAD LATEST BACKUP ]

Restore Database
[ Choose Backup File ]   attendance-backup-2026-10-07.db

[ VALIDATE BACKUP ]
[ RESTORE BACKUP ]

Recent Backups
------------------------------------------------
Date/Time            Size       Status
07-10-2026 10:15     2.4 MB     Valid
06-10-2026 18:05     2.3 MB     Valid
05-10-2026 18:00     2.2 MB     Valid
```

### Download backup flow

```text
Admin clicks CREATE BACKUP
        ↓
SQLite safe backup
        ↓
Validate backup
        ↓
Generate backup metadata/checksum
        ↓
Save to backup folder
        ↓
Admin clicks DOWNLOAD
        ↓
Save .db or .zip file anywhere
```

### Restore by selecting a file

The admin should be able to choose a backup directly from Windows:

```text
[ Choose Backup File ]

attendance-backup-2026-10-07-101500.zip
                    ↓
              Validate file
                    ↓
          Show backup details
                    ↓
       Create safety backup first
                    ↓
             Confirm restore
                    ↓
          Restore SQLite database
                    ↓
          Restart local services
                    ↓
             Return to login
```

Before restoring:

```text
WARNING

Restoring this backup will replace the current
local attendance database.

A safety backup of the current database will
be created automatically.

[ CANCEL ]     [ CONTINUE ]
```

### Never overwrite blindly

Every restore should first create:

```text
pre-restore-backup-YYYY-MM-DD-HHMMSS.db
```

This gives you a rollback path if an incorrect backup is selected.

### Backup package

Prefer:

```text
attendance-backup-YYYY-MM-DD-HHMMSS.zip
```

containing:

```text
attendance.db
manifest.json
checksum.sha256
```

`manifest.json` can contain:

```json
{
  "app_version": "1.0.0",
  "schema_version": 1,
  "created_at": "2026-10-07T10:15:00+05:30",
  "staff_count": 84,
  "attendance_count": 12450
}
```

### Restore validation

Before restoring, verify:

```text
✓ File exists
✓ ZIP/DB format is valid
✓ SQLite database opens successfully
✓ Required tables exist
✓ Schema version is supported
✓ Checksum matches
✓ Backup is not corrupted
```

---

## 29. MFS100 Device Status / Health Monitor

The application should continuously show the fingerprint device state.

### Top-bar indicator

```text
┌──────────────────────────────────────────────────────┐
│ COLLEGE STAFF ATTENDANCE          ● MFS100 READY     │
└──────────────────────────────────────────────────────┘
```

Possible states:

```text
● READY
● INITIALIZING
● SCANNER BUSY
● NOT CONNECTED
● DRIVER ERROR
● SDK ERROR
```

Use a clear status card in the Admin Dashboard.

### Device health page

```text
FINGERPRINT DEVICE

Device              MFS100 V54
Connection          ● Connected
USB                  ● Detected
Driver               ● OK
SDK                  ● OK
Scanner              ● Ready
Last successful test  10:27:14 AM

[ TEST SCANNER ]
[ RECONNECT ]
```

### What "OK" should mean

Do not show **Connected** merely because Windows sees a USB device.

The health check should confirm:

```text
1. USB/device detected
2. MFS100 SDK initialized
3. Device opened successfully
4. Fingerprint capture interface responds
5. Device is ready for a scan
```

Only then show:

```text
● MFS100 READY
```

### Device status API

Local Node API:

```text
GET /api/device/status
```

Example response:

```json
{
  "device": "MFS100 V54",
  "usbDetected": true,
  "sdkInitialized": true,
  "deviceOpened": true,
  "scannerReady": true,
  "status": "READY",
  "lastCheckedAt": "2026-10-07T10:27:14+05:30"
}
```

The status can be refreshed every few seconds.

### C# bridge

The C# MFS100 bridge should provide:

```text
GET  /status
POST /initialize
POST /reconnect
POST /capture
POST /identify
POST /enroll
```

The Node.js backend reads the bridge status and exposes it to React.

### Automatic recovery

If the scanner disconnects:

```text
MFS100 READY
      ↓
USB disconnected
      ↓
NOT CONNECTED
      ↓
Show warning
      ↓
Attempt reconnect
      ↓
SDK initialize
      ↓
Device open
      ↓
READY
```

The attendance screen should also change to:

```text
Fingerprint scanner unavailable

Please reconnect the MFS100 device.
```

Staff should not be told to log in or restart the whole application just because the scanner temporarily disconnected.

---

## 30. Dashboard Device Card

Show the current device health directly on the dashboard:

```text
┌────────────────────────────────┐
│ FINGERPRINT DEVICE             │
│                                │
│ MFS100 V54                     │
│                                │
│ USB       ● Connected          │
│ Driver    ● OK                 │
│ SDK       ● OK                 │
│ Scanner   ● Ready              │
│                                │
│ Last check: 10:27:14 AM        │
│                                │
│ [ TEST ]   [ RECONNECT ]       │
└────────────────────────────────┘
```

This makes it easy for a college administrator to immediately determine whether a problem is the scanner, software, or database.

---

## 31. Updated Admin Navigation

```text
Dashboard
├── Overview
├── Device
│   ├── MFS100 Status
│   ├── Test Scanner
│   └── Reconnect
├── Staff
│   ├── Add Staff
│   ├── Edit Staff
│   ├── Deactivate Staff
│   └── Fingerprint
│       ├── Enroll
│       ├── Update
│       └── Replace
├── Attendance
│   ├── Today
│   ├── Date-wise
│   ├── Date Range
│   ├── Staff-wise
│   └── Department-wise
├── Reports
│   └── Download PDF
├── Settings
│   ├── Check-in time
│   ├── Check-out time
│   ├── Half-day settings
│   ├── Late-in rules
│   └── Early-out rules
├── Backup & Restore
│   ├── Create Backup
│   ├── Download Backup
│   ├── Restore from File
│   └── Restore History
└── Audit Log
```

---

## 32. Updated Backup APIs

```text
POST   /api/backup/create
GET    /api/backup/list
GET    /api/backup/:id/download
POST   /api/backup/validate
POST   /api/backup/restore
GET    /api/backup/restore-history
```

For a selected Windows file, Electron can pass the local file path to the local backend rather than uploading the database to a remote server.

---

## 33. Updated Device APIs

```text
GET    /api/device/status
POST   /api/device/initialize
POST   /api/device/reconnect
POST   /api/device/test
POST   /api/device/capture
POST   /api/device/identify
POST   /api/device/enroll
```

---

## 34. Final User Experience

Normal staff:

```text
PC ON
 ↓
Application opens automatically
 ↓
MFS100 status = READY
 ↓
"Place your finger"
 ↓
Staff punches
 ↓
Welcome / Thank You
 ↓
Back to reading mode
```

Admin:

```text
Click Admin Login
 ↓
Username + Password
 ↓
Dashboard
 ↓
See:
  • today's attendance
  • MFS100 health
  • staff
  • reports
  • settings
  • backup
```

Backup:

```text
Create Backup
 ↓
Download Backup
 ↓
Store backup file safely
```

Restore:

```text
Admin Login
 ↓
Backup & Restore
 ↓
Choose backup file
 ↓
Validate
 ↓
Create safety backup
 ↓
Restore
 ↓
Restart local services
 ↓
Continue using application
```

Device failure:

```text
MFS100 disconnected
 ↓
Dashboard: NOT CONNECTED
 ↓
Attendance screen: scanner unavailable
 ↓
Reconnect scanner
 ↓
Automatic health check
 ↓
READY
```


---

## 35. Default Admin Account and Password Reset

### Default admin credentials

On the first installation, create:

```text
Username: niadmin
Password: ni2027
```

The password must **not** be stored in plain text.

Store:

```text
username
password_hash
```

using `bcrypt`.

### First login

After the first successful login with the default credentials, show:

```text
SECURITY SETUP

You are using the default administrator password.

For security, please change your password.

[ CHANGE PASSWORD ]
[ CONTINUE ]
```

Recommended behavior:

```text
Default password detected
        ↓
Force password change
        ↓
New password
Confirm new password
        ↓
Hash with bcrypt
        ↓
Save new password hash
        ↓
Default password disabled
```

The system should record the password change in the audit log.

---

## 36. Admin Password Reset

Add a **Reset Password** option on the admin login page.

### Login screen

```text
ADMIN LOGIN

Username
Password

[ LOGIN ]

Forgot / Reset Password
```

### Recommended reset process

Because this is a college-local application, use an administrator-controlled recovery mechanism rather than exposing an unrestricted reset endpoint.

Preferred flow:

```text
Click Reset Password
        ↓
Enter admin username
        ↓
Recovery verification
        ↓
Set new password
        ↓
Hash with bcrypt
        ↓
Save
        ↓
Audit log
```

The recovery verification can be implemented using a **one-time recovery code** or another admin-controlled secret configured during installation.

Do not allow:

```text
POST /reset-password
```

with only a username and no verification.

### Recovery settings

Keep recovery configuration outside the SQLite attendance tables, for example:

```text
C:\ProgramData\NICETECH\BiometricAttendance\config\
    security.json
```

Do not put recovery secrets directly inside the Electron renderer or React source code.

---

## 37. Password Security Rules

Minimum recommended requirements:

```text
Minimum length: 8 characters
```

Prefer:

```text
8–12+ characters
Uppercase
Lowercase
Number
Special character
```

The system should:

```text
✓ Hash passwords with bcrypt
✓ Never save plaintext passwords
✓ Never show stored passwords
✓ Never log passwords
✓ Rate-limit failed admin logins
✓ Record successful/failed login events
✓ Invalidate active admin sessions after password reset
```

### Audit events

Record events such as:

```text
ADMIN_LOGIN_SUCCESS
ADMIN_LOGIN_FAILED
PASSWORD_CHANGED
PASSWORD_RESET
```

---

## 38. Updated Admin Login UX

```text
┌────────────────────────────────────────────┐
│                                            │
│        NICETECH BIOMETRIC ATTENDANCE       │
│                                            │
│               ADMIN LOGIN                  │
│                                            │
│ Username                                   │
│ [____________________________]             │
│                                            │
│ Password                                   │
│ [____________________________]             │
│                                            │
│ [ LOGIN ]                                  │
│                                            │
│ Reset Password                             │
│                                            │
└────────────────────────────────────────────┘
```

After installation, the first login is:

```text
niadmin
ni2027
```

and the application should encourage or require changing it immediately.

---

## 39. Installer First-Run Security

Installation sequence:

```text
Install NICETECH
        ↓
Create SQLite
        ↓
Create default admin:
    username = niadmin
    password = bcrypt(ni2027)
        ↓
Set must_change_password = true
        ↓
Start application
```

Database record:

```text
admins
------------------------------------------------
id
username
password_hash
must_change_password
active
created_at
updated_at
last_login_at
```

The default credential should exist only as the initial bootstrap credential. Once changed, the original password should no longer work.


---

## 40. Revised Attendance Model — Separate Staff, Punches, Rules, and Reports

The attendance system should **not store the final report as the only source of truth**.

Keep these data sets separate:

```text
STAFF
  ↓
Who the employee is

FINGERPRINTS
  ↓
How the employee is identified

PUNCHES
  ↓
What actually happened at the scanner

ATTENDANCE RULES
  ↓
How punches should be interpreted

ATTENDANCE REPORT
  ↓
Merged/calculated result shown to admin
```

This is important because the same raw punches may be interpreted differently if the administrator changes the attendance rules later.

---

## 41. Staff Table

`staff` stores only staff information.

```text
staff
------------------------------------------------
id
staff_id
name
department
designation
active
created_at
updated_at
```

Do not put today's attendance times directly into the staff table.

---

## 42. Fingerprint Table

`fingerprints` stores biometric template information separately.

```text
fingerprints
------------------------------------------------
id
staff_id
finger_index
template_data
template_format
active
created_at
updated_at
```

A staff member can have more than one enrolled finger.

---

## 43. Raw Punch Table

Every successful fingerprint event should be stored as a **separate punch**.

```text
punches
------------------------------------------------
id
staff_id
punch_date
punch_time
terminal_id
capture_type
created_at
```

Example:

```text
staff_id = STF104
date     = 2026-10-07
time     = 09:24:36
```

Later:

```text
staff_id = STF104
date     = 2026-10-07
time     = 13:02:18
```

Later:

```text
staff_id = STF104
date     = 2026-10-07
time     = 15:11:04
```

Later:

```text
staff_id = STF104
date     = 2026-10-07
time     = 17:34:51
```

The system should **never overwrite these raw punch records**.

---

## 44. Attendance Rules Table

Rules should be stored separately so the admin can change the college timing without changing program code.

```text
attendance_rules
------------------------------------------------
id
rule_name
checkin_start
checkin_end

half_checkout_start
half_checkout_end

half_checkin_start
half_checkin_end

checkout_start
checkout_end

full_day_required_minutes
half_day_required_minutes

late_compensation_enabled
allow_admin_override

active
created_at
updated_at
```

The exact column set can be expanded, but the principle is:

> **Rules are configuration data, not hard-coded business logic.**

---

## 45. Suggested Configurable Time Windows

The admin should be able to set:

```text
Full Check-in Time
Full Check-in Window

Half Check-out Period

Half Check-in Period

Full Check-out Time
Full Check-out Window

Minimum Full-Day Working Minutes

Minimum Half-Day Working Minutes
```

Example configuration:

```text
Check-in:
09:20 – 10:00

Half Check-out:
12:00 – 14:59

Half Check-in:
15:00 – 15:30

Checkout:
16:00 – 18:00
```

These are only examples. The admin can change the values.

---

# 46. Punch Classification

Raw punches should be classified by the current active rule.

The logical sequence is:

```text
PUNCH 1 → CHECK-IN
PUNCH 2 → HALF CHECK-OUT
PUNCH 3 → HALF CHECK-IN
PUNCH 4 → CHECK-OUT
```

For the normal full-day case:

```text
09:20–10:00
      ↓
CHECK-IN

Later checkout
      ↓
CHECK-OUT
```

For a midday leave/re-entry case:

```text
09:20–10:00
      ↓
CHECK-IN

Staff leaves during the day
      ↓
12:00–14:59
      ↓
HALF CHECK-OUT

Staff returns
      ↓
15:00+
      ↓
HALF CHECK-IN

End of working day
      ↓
CHECK-OUT
```

The system should allow the admin to configure these time periods.

---

# 47. First Punch of the Day

The first successful punch for a staff member on a date should establish their attendance presence.

```text
FIRST PUNCH
    ↓
Staff is PRESENT
```

If the punch occurs within the configured full check-in window:

```text
CHECK-IN
```

If it occurs outside the normal check-in window, the rules determine whether it should be treated as:

```text
LATE CHECK-IN
```

or, where configured, a half-day/midday entry.

Do not lose the original punch time.

---

# 48. Midday Leave / Return Scenario

Example:

```text
09:24    CHECK-IN
13:05    HALF CHECK-OUT
15:02    HALF CHECK-IN
17:34    CHECK-OUT
```

The raw `punches` table stores all four events.

The report then merges them into:

```text
Staff ID:        STF104
Name:            Staff Name
Date:            07-10-2026

Check-in:        09:24
Half check-out:  13:05
Half check-in:   15:02
Check-out:       17:34

Status:          PRESENT / FULL DAY
```

The report is therefore generated from the punch records + active rules.

---

# 49. Determining Full Day vs Half Day

The system should distinguish **presence** from **attendance duration**.

### Presence

If a staff member has at least one valid punch:

```text
PRESENT
```

### Full day

Calculate the effective working time according to the configured rules.

For a simple full-day case:

```text
Check-out time - Check-in time
```

For a midday leave case:

```text
(half check-out - check-in)
+
(check-out - half check-in)
```

Example:

```text
09:24 → 13:05 = 3h 41m

15:02 → 17:34 = 2h 32m

Total = 6h 13m
```

Compare the result with:

```text
full_day_required_minutes
```

If it meets the configured minimum:

```text
FULL DAY
```

Otherwise:

```text
HALF DAY
```

The admin can manually change the final status.

---

# 50. Admin Attendance Override

The administrator should be able to change the calculated result without deleting raw punches.

Example:

```text
System result:
HALF DAY

Admin changes:
FULL DAY

Reason:
Official permission
```

Store this separately:

```text
attendance_overrides
------------------------------------------------
id
staff_id
attendance_date
original_status
override_status
reason
admin_id
created_at
```

This preserves both:

```text
System calculation
+
Official admin decision
```

---

# 51. Attendance Report

The report page should be a **merged view**.

Do not duplicate all staff information into the punch table.

The report combines:

```text
STAFF
   +
PUNCHES
   +
ATTENDANCE RULES
   +
OVERRIDES
   ↓
ATTENDANCE REPORT
```

Example report:

```text
┌─────────────────────────────────────────────────────────────┐
│ STAFF ATTENDANCE                                            │
├───────┬──────────────┬────────────┬─────────┬──────────────┤
│ ID    │ Name         │ Date       │ Status  │ Check-in     │
├───────┼──────────────┼────────────┼─────────┼──────────────┤
│ STF01 │ Kumar        │ 07-10-26   │ FULL    │ 09:24        │
│ STF02 │ Anand        │ 07-10-26   │ HALF    │ 09:46        │
└───────┴──────────────┴────────────┴─────────┴──────────────┘
```

Expandable row:

```text
STF01 | Kumar | 07-10-26 | FULL

Check-in       09:24
Half check-out 13:05
Half check-in  15:02
Check-out      17:34

Working time   06:13
Status         FULL DAY
```

---

# 52. What the Report Should Save

The user specifically requested that the attendance information visible in the report be based on:

```text
Staff ID
Name
Check-in status
Time
Date
```

The report can additionally display:

```text
Half check-out
Half check-in
Check-out
Working duration
Attendance status
Late minutes
Early-out minutes
```

But these should be **derived from the raw punches and rules**, not treated as the only original attendance data.

---

# 53. Daily Attendance Calculation

At report-generation time:

```text
For each active staff member
        ↓
Find punches for selected date
        ↓
Sort punches by time
        ↓
Load active attendance rules
        ↓
Classify punches
        ↓
Calculate working duration
        ↓
Determine PRESENT / FULL DAY / HALF DAY
        ↓
Apply admin override if one exists
        ↓
Generate report row
```

Pseudo-flow:

```text
punches = getPunches(staff_id, date)
rules   = getActiveRules(date)
override = getOverride(staff_id, date)

classification = classify(punches, rules)
duration       = calculateWorkingTime(classification, rules)
status         = calculateStatus(duration, rules)

if override exists:
    status = override.status
```

---

# 54. Handling Ambiguous Punches

The system should not blindly assume every second punch is a checkout.

Use the configured time windows.

For example:

```text
First punch:
09:24
→ CHECK-IN
```

Second punch:

```text
13:05
→ HALF CHECK-OUT
```

Third punch:

```text
15:02
→ HALF CHECK-IN
```

Fourth punch:

```text
17:34
→ CHECK-OUT
```

If a punch happens outside any configured period, show it to the attendance engine as:

```text
UNCLASSIFIED
```

and allow the admin to resolve it.

This is safer than silently assigning the wrong attendance status.

---

# 55. More Than Four Punches

The system should store every punch, but the daily rule engine can determine which punches are meaningful.

Example:

```text
09:24  CHECK-IN
13:05  HALF CHECK-OUT
13:07  DUPLICATE / IGNORE
15:02  HALF CHECK-IN
17:34  CHECK-OUT
```

The raw punch remains stored for audit purposes.

Accidental repeated fingerprints should not corrupt attendance.

---

# 56. Updated Database Relationships

```text
staff
  │
  ├────────── fingerprints
  │
  ├────────── punches
  │                 │
  │                 ▼
  │          Attendance Engine
  │                 ▲
  │                 │
  ├────── attendance_overrides
                    │
                    ▼
             attendance_rules
                    │
                    ▼
             Attendance Report
```

The report is a calculated presentation layer, not the raw source.

---

# 57. Recommended Report Filters

Admin should be able to select:

```text
Date
From Date
To Date

Staff
Department

Status:
  PRESENT
  FULL DAY
  HALF DAY
  ABSENT
  EARLY OUT
  LATE

Punch type:
  CHECK-IN
  HALF CHECK-OUT
  HALF CHECK-IN
  CHECK-OUT
```

Then:

```text
[ SEARCH ]
[ EXPORT PDF ]
```

---

# 58. Updated Attendance API

```text
GET /api/attendance
GET /api/attendance/:staffId
GET /api/attendance/date/:date

GET /api/punches
GET /api/punches/:staffId

POST /api/attendance/override
GET /api/attendance/overrides

GET /api/rules
POST /api/rules
PUT /api/rules/:id

GET /api/reports/attendance
GET /api/reports/attendance.pdf
```

The report API should perform the merge/calculation rather than requiring the React UI to implement attendance business rules.

---

# 59. Core Principle

The system should follow this model:

```text
WHAT HAPPENED?
    ↓
PUNCHES

WHO WAS IT?
    ↓
STAFF + FINGERPRINT

WHAT ARE THE COLLEGE RULES?
    ↓
ATTENDANCE RULES

WHAT DOES IT MEAN?
    ↓
ATTENDANCE CALCULATION

WHAT DOES THE ADMIN SEE?
    ↓
MERGED ATTENDANCE REPORT
```

This architecture makes it possible to change the attendance policy later without destroying the original fingerprint punch history.
