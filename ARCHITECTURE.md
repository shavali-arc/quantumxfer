# QuantumXfer Architecture & Technical Overview

**Scope**: High-level architecture, process boundaries, data flows, and operational notes for the QuantumXfer Electron + React SSH/SFTP client. Complements existing validation and handler guides.

## Runtime Topology
```
+-------------------+           +---------------------------+
| React Renderer    |  IPC via  | Electron Main Process     |
| (Vite, App_new)   +<--------->+ (main.js, validation,     |
| UI, state, tabs   |  context  | IPC handlers, services)   |
+---------+---------+  isolated +-----------+---------------+
          ^                                    |
          | preload-exposed API                | calls
          | (contextBridge)                    v
+---------+---------+                +---------+-----------+
| Preload Bridge    |                | SSH Service         |
| (preload.js)      |                | (ssh-service.js)    |
| whitelisted IPC   |                | ssh2, SFTP, pool    |
+-------------------+                +---------------------+
                                                |
                                                v
                                        Remote SSH/SFTP hosts
```

## Components & Responsibilities
- **Renderer (React, Vite)**: UI/UX, multi-session terminal and SFTP views, profiles/bookmarks panels, notifications. Uses `window.electronAPI` from the preload bridge. Primary code lives in [src/App_new.tsx](src/App_new.tsx) and [src/main.tsx](src/main.tsx).
- **Preload bridge**: Context-isolated bridge exposing a constrained API surface: version, dialogs, log writing, profile/history save-load, terminal window spawn, SSH operations, bookmarks CRUD, menu events, and listener removal. Defined in [electron/preload.js](electron/preload.js).
- **Main process**: Window lifecycle (splash + main), app menu, dev/production bootstrapping, IPC handler registration, and orchestration of services. Core entry is [electron/main.js](electron/main.js). Validation wraps IPC handlers via `HandlerValidator.createValidatedHandler` (see Validation section).
- **Services**: SSH connection and SFTP operations implemented with `ssh2` in [electron/ssh-service.js](electron/ssh-service.js); maps connection IDs to live clients, manages keepalives, and normalizes results. Additional services handle bookmarks and profiles (JSON-backed) invoked by IPC handlers documented in [HANDLER-INTEGRATION-GUIDE.md](HANDLER-INTEGRATION-GUIDE.md).

## IPC Surface (summary)
- **SSH**: `ssh-connect`, `ssh-execute-command`, `ssh-list-directory`, `ssh-list-directory-recursive`, `ssh-download-file`, `ssh-upload-file`, `ssh-disconnect`, `ssh-get-connections`.
- **Bookmarks**: `bookmarks-list`, `bookmarks-add`, `bookmarks-remove`.
- **Profiles & history**: `save-profiles-to-file`, `load-profiles-from-file`, `save-command-history`, `load-command-history`, `append-command-history`.
- **UI/menu**: renderer receives menu events (`menu-new-connection`, `menu-logs-directory`, `menu-manage-profiles`, `menu-export-profiles`, `menu-import-profiles`) and can request a dedicated terminal window.
- All SSH/file/bookmark/profile handlers are validated before execution per [HANDLER-INTEGRATION-GUIDE.md](HANDLER-INTEGRATION-GUIDE.md) and the validation framework docs.

## Validation & Security Model
- **Context isolation**: `nodeIntegration` disabled and `contextIsolation` enabled on the main window; only the preload bridge is exposed.
- **IPC validation**: Handler middleware (`HandlerValidator.createValidatedHandler`) enforces type/format constraints for every SSH/file/bookmark/profile call. See [VALIDATION-DEVELOPER-GUIDE.md](VALIDATION-DEVELOPER-GUIDE.md) and [VALIDATION-QUICK-START.md](VALIDATION-QUICK-START.md).
- **Renderer hardening**: `window.open` is blocked in the preload to prevent unexpected external navigation. Menu actions are funneled through IPC rather than direct file access.
- **SSH safety**: `ssh-service` sets keepalive intervals and constrains algorithms; passwords are not persisted alongside connection metadata.

## Data & State
- **Connections**: Held in-memory in the main process (`Map` of connectionId → client/state) within [electron/ssh-service.js](electron/ssh-service.js). Cleans up on `close`/`end`.
- **Profiles/Bookmarks**: Exposed via IPC for save/load; stored as JSON files chosen via dialog in the renderer. Validation ensures well-formed objects.
- **Command history & logs**: Renderer maintains per-session logs locally; global command history is centralized via IPC helpers (stored under the app data path, see `App_new` comments). Log export is done through `write-log-file` in the preload API.
- **Renderer state**: Multiple terminal sessions, bookmarks, SFTP search filters, and notifications live in React state ([src/App_new.tsx](src/App_new.tsx)).

## Build, Run, Package
- **Toolchain**: Node 22+, npm 10+, Vite for bundling, Electron for desktop packaging.
- **Local dev**: `npm run electron:dev` starts the Vite dev server and Electron (devtools enabled in `main.js`).
- **Production build**: `npm run build` outputs web assets; Electron loads from `dist/` when `NODE_ENV` is not `development`.
- **Automation**: [build_and_run.py](build_and_run.py) wraps install, build, run, and optional TFTP server start; platform scripts (`build.bat`/`build.sh`) package to `dist-electron/`.

## Testing Posture
- **Unit/Integration**: Extensive validator and handler coverage (350+ unit tests, partial integration coverage) per project docs.
- **Gaps**: Functional/E2E coverage is limited; [TESTING-INFRASTRUCTURE-ANALYSIS.md](TESTING-INFRASTRUCTURE-ANALYSIS.md) recommends Playwright for Electron UI flows. Add smoke E2E around SSH connect, command exec, and file transfer paths.

## Operational Notes
- **Window creation**: Splash screen shown until renderer ready; main window defaults to 1400x900 with dark background.
- **Platform paths**: Bookmarks/profiles/log exports use OS file dialogs (renderer-controlled). Global command history is stored under `%APPDATA%/quantumxfer/command-history/` on Windows (see renderer comments).
- **Packaging outputs**: Release zips emitted to `dist-packager/` and executables to `dist-electron/` during build scripts.

## Roadmap & Known Follow-Ups
- Harden E2E coverage and add CI jobs for Playwright-based flows.
- Document bookmark/profile persistence formats and retention policies.
- Add REST API server notes once #64 implementation lands (see [REST-API-ANALYSIS.md](REST-API-ANALYSIS.md)).
- Capture logging, audit, and deployment details in dedicated guides (related to issues #59 and #62).
