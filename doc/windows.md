# Running Hevelius Web on Windows

This guide helps you install and configure the tools needed to develop and run the Angular project on Windows.

## 1. Node.js

Angular 19 requires **Node.js 18.19+, 20.11+, or 22+**. Use an LTS version (20 or 22) for best compatibility.

### Option A: Official installer (recommended)

1. Go to [https://nodejs.org/](https://nodejs.org/) and download the **LTS** Windows installer (.msi).
2. Run the installer. Ensure **"Add to PATH"** is checked.
3. Restart your terminal (PowerShell or Command Prompt), then verify:

   ```powershell
   node -v
   npm -v
   ```

   You should see versions like `v20.x.x` and `10.x.x` (or similar).

### Option B: Winget

```powershell
winget install OpenJS.NodeJS.LTS
```

### Option C: nvm-windows (multiple Node versions)

1. Download [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) (nvm-setup.exe).
2. Install, then in a **new** terminal:

   ```powershell
   nvm install lts
   nvm use lts
   node -v
   ```

## 2. Project setup

Open a terminal in the project folder (e.g. `e:\devel\hevelius-web`) and install dependencies:

```powershell
cd e:\devel\hevelius-web
npm install
```

If you see **EACCES** or permission errors, avoid running the terminal as Administrator. Prefer a user folder and ensure your user has write access to the project directory.

## 3. Chrome (for unit tests)

Unit tests use **Karma** with **Chrome** (or Chrome Headless). You need Chrome installed in a standard location.

- **If Chrome is already installed:** No extra step. Karma will use it automatically.
- **If you use a different path or Chromium:** Set the `CHROME_BIN` environment variable (PowerShell, current session):

  ```powershell
  $env:CHROME_BIN = "C:\Path\To\your\chrome.exe"
  ```

  Or set it permanently in **System Properties → Environment Variables**.

## 4. Running the app and tests

Use `npx` so the local Angular CLI is used (no global install required):

```powershell
# Development server
npx ng serve
# Then open http://localhost:4200/

# Run unit tests once (CI-style)
npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI

# Or interactive tests (watches for changes)
npx ng test

# Lint
npx ng lint

# Production build
npx ng build --configuration=production
```

If `ng` is not found, use `npx ng` or add the project’s `node_modules\.bin` to your PATH for this project.

## 5. Optional: global Angular CLI

Not required, but if you prefer the `ng` command everywhere:

```powershell
npm install -g @angular/cli@19
ng serve
```

## 6. Troubleshooting

| Problem | What to try |
|--------|--------------|
| `node` or `npm` not found | Restart the terminal after installing Node; ensure Node is on PATH. |
| **ERESOLVE** / `@angular/common@undefined` | Do a clean install: delete `node_modules` and `package-lock.json`, then run `npm install` (not `npm update`). See below. |
| `ENOENT` or path errors | Use short paths (e.g. `e:\devel\hevelius-web`). Avoid very long or synced (OneDrive/Google Drive) paths. |
| Tests fail with “Chrome not found” | Install Chrome or set `CHROME_BIN` to your browser executable. |
| Port 4200 in use | Stop other apps using 4200, or run `npx ng serve --port 4201`. |
| `npm install` fails (network/proxy) | Configure npm proxy if behind a corporate firewall: `npm config set proxy ...` / `npm config set https-proxy ...`. |

### Clean install (fix ERESOLVE / undefined dependency)

If you see `ERESOLVE unable to resolve dependency tree` or `Found: @angular/common@undefined`:

1. In the project folder, remove the install and lockfile:
   - **PowerShell:** `Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json`
   - **Command Prompt:** `rmdir /s /q node_modules` then `del package-lock.json`
2. Install again: `npm install` (use **install**, not **update**). If it still fails: `npm install --legacy-peer-deps`

After dependency updates, run `npm install` again and then:

```powershell
npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI
npx ng lint
```

to confirm tests and lint pass cleanly.
