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

Edit `src/hevelius.ts` to point to your running backend, e.g.

```typescript
    // Make sure there is no trailing slash
    static apiUrl = 'https://hevelius.borowka.space:5001/api';
```

Then make `ng build`.

The copy over `dist/hevelius/browser/*` to your running server. You might want to
see [example NGINX config](nginx-deploy.md) for some tips how to deploy on NGINX.
This is just an example. The app should work on any other web server.
