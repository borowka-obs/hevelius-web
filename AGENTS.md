# Agent guide: Hevelius full-stack development

This project has an **Angular 20** frontend (this repo) and a **Flask** backend (separate repo: `hevelius-backend`). When you implement features, frontend and backend changes must stay in sync.

## Stack

- **Frontend**: Angular 20, `src/`; API base URL: `Hevelius.apiUrl` → `http://localhost:5000/api` (see `src/hevelius.ts`).
- **Backend**: Flask (Python), in another repository. If the backend is open in the workspace or you have access, implement both sides in the same task.

## How to develop features with agents

### 1. One feature = one scope (frontend + backend)

- **Describe the full feature** in a single request: e.g. “Add an endpoint GET /api/observations that returns a list; add an Observations page in Angular that calls it and shows the list.”
- Prefer **one agent task per feature** so the same context handles both the API contract and the UI.
- If the backend repo is not in the workspace, either open it in the same workspace or paste the relevant backend snippets (routes, request/response shapes) into the chat so the agent can align types and endpoints.

### 2. Define the API contract first

- Decide **method, path, query/body, and response shape** before coding.
- **Frontend**: Types live in `src/app/models/`. Add or update interfaces to match the backend (e.g. `task.ts` documents the `/api/tasks` shape and points to `flask/app.py` in hevelius-backend).
- **Backend**: Keep route handlers and response JSON consistent with those TypeScript interfaces (same field names and types).
- If you add a new endpoint, add or update the corresponding model under `src/app/models/` and use it in the service that calls the API.

### 3. Where the frontend talks to the API

- **API base**: `Hevelius.apiUrl` in `src/hevelius.ts` (no trailing slash).
- **Services**: `src/app/services/*.service.ts` (e.g. `task.service.ts`, `tasks.service.ts`, `login.service.ts`, `catalogs.service.ts`, `telescope.service.ts`, `night-plan.service.ts`). New API calls should go in a dedicated service or an existing one.
- **Auth**: `AuthInterceptor` and `LoginService`; authenticated requests use headers from `LoginService.getAuthHeaders()` where required.

### 4. Keeping FE and BE in sync

- **Same names and types**: Request/response field names and types (string, number, boolean, arrays) should match between Flask and Angular models.
- **Document the source of truth**: In `src/app/models/*.ts`, add a short comment pointing to the backend route or module (e.g. “See `app.py` in hevelius-backend”).
- **Optional**: Maintain a small API overview (e.g. in `doc/api.md` or in this file) listing endpoints, methods, and main DTOs so agents (and humans) can see the contract in one place.

### 5. Quick reference: existing API surface

- Auth: `POST /login`, `GET /version` (and token usage via interceptor).
- Tasks: `GET/POST /tasks`, `POST /task-add`, `POST /task-update`, `GET /task-get`.
- Catalogs: `GET /catalogs/search`, `GET /catalogs/list`. List accepts optional query params: `page`, `per_page`, `sort_by`, `sort_order`, `catalog`, `name`, `constellation` (IAU 3-letter abbreviation, e.g. Cyg, Sgr). Backend must filter by these when provided.
- Other: `GET /scopes` (telescopes), `POST /night-plan`.

When adding a new endpoint, add the route and DTOs on the backend, then add or update the Angular model and a service method that calls `Hevelius.apiUrl + '/your-path'` with the same contract.
