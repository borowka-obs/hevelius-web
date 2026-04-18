# Installation

You need **Node.js 18.19+**, 20.x, or 22.x (LTS recommended). The project uses Angular 19.

- **Linux (Debian/Ubuntu):**
  `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
  then install Node as usual for your distro.

- **Windows:** See [Windows setup](windows.md) for installing Node, Chrome (for tests), and running the project.

After installing Node, install dependencies and run the app:

```bash
npm install
npx ng serve
```

Navigate to `http://localhost:4200/`. The app will reload when you change source files. If `ng` is not in your PATH, use `npx ng` or add `./node_modules/.bin` to your PATH (e.g. `export PATH=$PATH:./node_modules/.bin` on Linux/macOS).

# Deployment

You need to have hevelius backend running. See https://github.com/borowka-obs/hevelius-backend for details.

## Options

1. Manual deployment (edit API URL, run build, copy files manually over SSH/SCP/rsync).
2. Automated deployment with local `.deploy` file and `ng run hevelius:deploy` (recommended).

## Automated deployment (recommended)

Copy `.deploy.example` to `.deploy` and set your server details:

```bash
cp .deploy.example .deploy
```

`.deploy` format:

```bash
hostname=your.server.example
username=deploy-user
# Optional:
# ssh-port=2222
path=/var/www/hevelius
api-url=https://your.server.example:5001/api
```

Then run:

```bash
npx ng run hevelius:deploy
```

or:

```bash
npm run deploy
```

This will:

1. Apply `api-url` to `src/hevelius.ts` for the build.
2. Run `ng build --configuration production`, `ng test`, `ng lint`.
3. Copy `dist/hevelius/browser/` to `username@hostname:path` using `rsync --delete` (with custom SSH port if `ssh-port` is set).
4. Print:

```text
don't forget to run sudo systemctl restart gunicorn-hevelius on the server
```

The script restores your original local `src/hevelius.ts` after deployment.

## Manual deployment

Edit `src/hevelius.ts` to point to your running backend, for example:

```typescript
    // Make sure there is no trailing slash
    static apiUrl = 'https://hevelius.borowka.space:5001/api';
```

Then make `ng build`.

Then copy over `dist/hevelius/browser/*` to your running server. You might want to
see [example NGINX config](nginx-deploy.md) for some tips how to deploy on NGINX.
This is just an example. The app should work on any other web server.
