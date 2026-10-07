# Mantra MFS100 V54 C# Hardware Bridge

## 1. Overview

The `MFS100Bridge` is a lightweight, localhost-only HTTP microservice written in C# (.NET Framework 4.8 / x86). It acts as the hardware bridge between the **Mantra MFS100 V54 USB optical fingerprint scanner** and the local Node.js / Electron application.

## 2. Requirements on Windows Attendance PC

1. **Windows 10 / 11 64-bit or 32-bit**
2. **.NET Framework 4.8**
3. **Mantra MFS100 Driver v9.2.0.0+** (Install from official Mantra Softech download portal)
4. **Mantra MFS100 SDK v9.0.0.0+**
5. **Mantra Client Service / MFS100.dll**

## 3. Architecture & API Endpoints

The bridge listens exclusively on `http://127.0.0.1:8765/`:

- `GET /status` — Device health check (USB, driver, SDK, scanner readiness)
- `POST /initialize` — Initializes MFS100 SDK and opens USB connection
- `POST /reconnect` — Reconnects and resets sensor communication
- `POST /test` — Triggers optical sensor self-test
- `POST /capture` — Captures fingerprint template (ANSI-378 / ISO-19794-2)
- `POST /identify` — 1:N fingerprint template matching against enrolled gallery
- `POST /enroll` — Captures high-quality template for staff registration

## 4. Building on Windows

Using MSBuild or Visual Studio:

```cmd
nuget restore MFS100Bridge.sln
msbuild MFS100Bridge.sln /p:Configuration=Release /p:Platform=x86
```

The compiled executable will be placed in `MFS100Bridge\bin\Release\MFS100Bridge.exe`.

## 5. Running as a Background Windows Service or Auto-start

You can configure `MFS100Bridge.exe` to run on Windows startup via Task Scheduler or as a Windows Service using NSSM:

```cmd
nssm install MFS100Bridge "C:\Program Files\CollegeStaffAttendance\bridge\MFS100Bridge.exe"
nssm start MFS100Bridge
```

## 6. Development & Cross-Platform Support

When developing on macOS or Linux, the Node.js backend automatically detects that the C# bridge is not reachable and seamlessly switches to **Virtual Simulator Mode**. This allows all UI screens, kiosk workflows, punch calculations, late compensations, and report exports to be tested end-to-end without physical hardware.

