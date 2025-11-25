<!-- Copilot / AI agent instructions for quick onboarding -->
# Project: Athi Estate Access Management System — Agent Instructions

Purpose: Provide concise, project-specific guidance so an AI coding agent can be immediately productive in this repository.

- **Language & stack:** frontend = static HTML/CSS + vanilla JS (files under `frontend/`), backend = Node.js + Express (ES modules), DB = Microsoft SQL Server (accessed via `mssql`). See `backend/package.json` for required Node version (>=18).
- **Run backend:** `cd backend` then `npm install` then `npm run start` (or `npm run dev` to use `nodemon`). The backend `package.json` sets `"type": "module"` so use ESM imports.

Key files to inspect (examples):
- `backend/server.js` — main app entry: builds a global `dbPool`, mounts public routes, then applies `authenticateJWT` to protect remaining routes. Use this file to understand route order and DB pool usage.
- `backend/middleware/authMiddleware.js` — JWT helpers: `generateToken`, `authenticateJWT`, `isAdmin`. The runtime JWT secret is read from `process.env.JWT_SECRET`.
- `backend/controllers/*.js` — controllers query DB using the exported `dbPool` (e.g., `import { dbPool } from "../server.js";` and then `const pool = await dbPool; pool.request()...`). Follow this pattern when adding new DB access.
- `backend/routes/*` — route-to-controller mapping; public routes (auth, membership) are mounted before JWT middleware.
- `backend/config/default.json` and `backend/config/emailConfig.js` — default JWT settings and email transport. Environment variables override secrets (see below).
- `docs/SQL Database.sql` (or `docs/SQL Database.sql.bak`) — schema to create the SQL Server database.

Required environment variables (create `backend/.env`):
- `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME` — used by `backend/server.js` for `mssql` connection.
- `JWT_SECRET` — used by `backend/middleware/authMiddleware.js` (fallback exists but should be replaced in prod).
- `PORT` — optional, defaults to `4050`.
- `EMAIL_USER`, `EMAIL_PASS` — used by `backend/config/emailConfig.js` for sending emails.

Project-specific conventions & patterns (do not change without checking tests/runtime):
- ES module style (`import` / `export`) across backend; `backend/package.json` sets `type: "module"`.
- Single shared DB pool exported from `backend/server.js` as `dbPool`. Controllers `await dbPool` and then call `.request()`.
- Route ordering is intentional: public endpoints (health, payment callback, `/api/auth`, `/api/membership`) are mounted before `authenticateJWT`. Protected endpoints come after the middleware — preserve ordering when adding routes.
- Authentication uses Bearer JWT tokens in `Authorization` header — middleware expects `Authorization: Bearer <token>`.
- SQL queries are often written inline in controllers using `mssql` request/inputs; follow existing parameterization patterns (use `.input()` with typed parameters to avoid injection).

Important developer workflows & commands (Windows `cmd.exe`):
- Start backend (dev):
  ```cmd
  cd backend
  npm install
  npm run dev
  ```
- Start backend (prod-like):
  ```cmd
  cd backend
  npm install
  npm run start
  ```
- DB setup: run `docs/SQL Database.sql` in SQL Server Management Studio, then update `backend/.env`.
- Password tools and scripts: `backend/hashExistingPasswords.js`, `backend/hashPasswords.js`, `backend/resetpassword.js`, and `backend/seed.js` are used for migrating/password maintenance and seeding data. A `passwords_hashed.flag` file indicates hashed-password state.

Integration points to be aware of:
- MPESA payment callback: POST to `/api/residents/payment-callback` (public endpoint). Controllers/processors for payments live under `backend/*payments*`.
- Email: `backend/config/emailConfig.js` uses `nodemailer` with `EMAIL_USER`/`EMAIL_PASS`.
- OAuth: `passport-google-oauth20` is present in dependencies — check any `passport` initialization if adding social login.

Where to look for examples when coding:
- Login flow: `backend/controllers/authController.js` — shows JWT payload shape and response (`accessToken`, `fullName`, `role`, etc.).
- Protected resource example: `backend/controllers/membershipController.js` and `backend/routes/*` for how routes are mounted and protected.
- Frontend API usage: `frontend/js/*` (e.g., `accesslogs.js`) uses `fetch`/AJAX calls to `/api/*` endpoints and expects `Authorization` header for protected calls.

Notes & gotchas discovered in repo:
- `backend/server.js` defines `dbConfig` with `encrypt: true` and `trustServerCertificate: true` — SQL Server TLS settings may require adjusting for your environment.
- Default JWT settings are in `backend/config/default.json` but runtime code reads `process.env.JWT_SECRET`; ensure env vars are present in deployment.
- There are several utility scripts touching passwords and seeds; inspect and run them only when you understand production data implications.

If you need me to modify code, be explicit about the scope. Good next tasks to ask an agent for:
- Add a new protected API route: include controller + route + unit-style test (if adding tests). Show where to mount before/after `authenticateJWT`.
- Replace inline SQL with parameterized stored-proc call: point to the controller to refactor.

If anything above is unclear or you want deeper detail (example SQL patterns, exact env values, or a short runbook for deploying to Azure), tell me which area to expand and I will iterate.

-- End of instructions --
