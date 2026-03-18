# Developer tips

Some useful commands:

```
# Use the local ng, if it's not globally installed
export PATH=$PATH:./node_modules/.bin
```

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build and deployment

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use `ng build --configuration=production` for a production build.

## Running tests

Run unit tests via [Karma](https://karma-runner.github.io). **Chrome** (or Chromium) must be installed so Karma can run the browser.

- **Linux:** If Chrome is not the default, set the binary:
  `export CHROME_BIN=$(which chromium-browser)` (or `google-chrome`) then `npm test`.
- **Windows:** See [Windows setup](windows.md). If Chrome is installed in a standard location, no extra config is needed.

Useful commands:

- Run tests once (CI-style):
  `npm test -- --no-watch --no-progress --browsers=ChromeHeadlessCI`
- Or: `npx ng test --no-watch --no-progress --browsers=ChromeHeadlessCI`
- Interactive (watch mode): `ng test` or `npm test`

`--no-watch` runs the suite once and exits; without it, Karma keeps watching and re-runs tests on changes.

## Running linter (eslint)

- `ng lint`
- `npm run lint`

## Dependency hell and some tips how to deal with it

- `npm update` (updates available dependencies in package-lock.json)
- `npm explain foo` (explains why foo is in the dependencies)
- `npm install --save core-js@^3` (upgrade core-js to version 3.x)

## Angular upgrade

 - `npm install @angular/material@^9.0.0` (Upgrading one specific package: )
 - `ng update @angular/core@20 @angular/cli@20` (upgrade whole angular and cli)

^ - means major version must much, minor and patch can be updated.

If dependencies are missing (e.g. after git clean -fxd), install them: `npm
install`.


- `npm list` - list installed packages

- `ng update` - tells what packages to upgrade

- `npm view @angular-devkit/build-angular versions` - list all available versions of @angular-devkit/build-angular

- `npm install --save-dev @angular-devkit/build-angular@0.11` - install specific version
Instead of doing the PATH export, one can use `npx ng ...` to run ng. `npx` is
smart enough to find `ng` locally.

You can also use @latest: `npm i typescript@latest --save-dev`


## Addressing eslint linter complaints:

- `ng generate @angular/core:inject` - addressed issues reported by `ng lint`

Example problem:
````
/home/thomson/devel/hevelius-web/src/app/components/telescope-list/telescope-list.component.ts
  33:15  error  Prefer using the inject() function over constructor parameter injection. Use Angular's migration schematic to automatically refactor: ng generate @angular/core:inject  @angular-eslint/prefer-inject
```

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).
This is currently not used in Hevelius.

## Linter: knip

Knip is a cool tool that lists unused dependencies, unused exports and such.

To run it: `npx knip`


## API debugging

First, generate the MD5 of a password and then get the JWT token:

```
# MD5 of password (macOS uses `md5`, Linux uses `md5sum`)
# macOS:
PASS_MD5=$(echo -n "YOUR_PASSWORD" | md5)
# Linux (GNU):
# PASS_MD5=$(echo -n "YOUR_PASSWORD" | md5sum | cut -d' ' -f1)
# Login and extract token (requires jq: brew install jq)
TOKEN=$(curl -s -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"YOUR_USERNAME\",\"password\":\"$PASS_MD5\"}" \
  | jq -r '.token')
echo "Token: $TOKEN"
```

And then use one of the API points, e.g.

```
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/sensors?active=false"
```

