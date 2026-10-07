# College Staff Fingerprint Attendance System — Implementation Reference

## System Architecture

```text
                     WINDOWS ATTENDANCE KIOSK PC
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Electron Desktop Shell (apps/desktop)                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ React + Vite + Tailwind UI (apps/web)                      │  │
│  │                                                            │  │
│  │  1. Screen A: Reading Mode (Kiosk "Place your finger")     │  │
│  │  2. Admin Login & First-Run Security Setup                │  │
│  │  3. Admin Dashboard (Real-time Punches & Device Card)      │  │
│  │  4. Staff & Multi-Finger Biometric Enrollment             │  │
│  │  5. Attendance Timelines & Admin Overrides                 │  │
│  │  6. Official Reports & PDFKit Generation                  │  │
│  │  7. Timing Policies & Late-In Compensation Rules          │  │
│  │  8. Backup, Verification & Automated Inbox Restore         │  │
│  │  9. Hardware Diagnostics & Simulation Controls            │  │
│  │ 10. Security & Operational Audit Log                       │  │
│  └──────────────────────────────┬─────────────────────────────┘  │
│                                 │ HTTP / IPC                     │
│                                 ▼                                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Node.js + Express Local API (apps/local-api)               │  │
│  │                                                            │  │
│  │  • SQLite Adapter (better-sqlite3 / native node:sqlite)   │  │
│  │  • Attendance Calculation Engine (Rules + Overrides)       │  │
│  │  • Real-time Punch Controller (Check-in/Out, Debounce)     │  │
│  │  • PDFKit Report Generator                                 │  │
│  │  • Disaster Recovery & Restore Inbox Scanner               │  │
│  │  • Admin JWT Authentication & Bcrypt Hashing               │  │
│  └──────────────┬─────────────────────────────┬───────────────┘  │
│                 │                             │                  │
│                 ▼                             ▼                  │
│       ┌──────────────────┐          ┌────────────────────┐       │
│       │ SQLite DB        │          │ C# MFS100 Bridge   │       │
│       │                  │          │ (hardware/mfs100)  │       │
│       │ • staff          │          │                    │       │
│       │ • fingerprints   │          │ • MFS100 SDK       │       │
│       │ • punches (raw)  │          │ • 1:N Identify     │       │
│       │ • rules          │          │ • Optical Capture  │       │
│       │ • overrides      │          │ • Localhost 8765   │       │
│       │ • admins         │          └─────────┬──────────┘       │
│       │ • audit_logs     │                    │ USB              │
│       └──────────────────┘                    ▼                  │
│                                      ┌──────────────────┐        │
│                                      │ Mantra MFS100 V54│        │
│                                      └──────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

## Default Credentials
- **Username:** `niadmin`
- **Initial Password:** `ni2027` (Enforces change upon first administrator login)
- **Recovery Key:** Configured in `config/security.json` (`RECOVERY-NICETECH-2027-KEY-SECURE`)

