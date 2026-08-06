[![NodeJS 20](https://github.com/borowka-obs/hevelius-web/actions/workflows/node-20.yml/badge.svg)](https://github.com/borowka-obs/hevelius-web/actions/workflows/node-20.yml)
[![NodeJS 22](https://github.com/borowka-obs/hevelius-web/actions/workflows/node-22.yml/badge.svg)](https://github.com/borowka-obs/hevelius-web/actions/workflows/node-22.yml)
[![CodeQL](https://github.com/borowka-obs/hevelius-web/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/borowka-obs/hevelius-web/actions/workflows/github-code-scanning/codeql)

# Hevelius

![Hevelius](src/assets/images/hevelius.jpg)

This is a web interface (web app) for Hevelius, an astronomy processing software and observatory management system.
It's in the very early stages of development. It requires [hevelius backend](https://github.com/tomaszmrugalski/hevelius-backend)
to be running. There's also the [the runner component](https://github.com/tomaszmrugalski/hevelius-runner) that should be
running on a machine that is controlling the telescope. The hevelius-web is not interacting with the runner directly.

The web interface is implemented using Angular and Typescript.

## Status

As of July 2026, the following features are available:

- Login with JWT sessions (activity extends timeout); user profile with Gravatar
- Tasks: list, add, edit; sorting, filtering, and pagination
- Sensors: add, edit, list, sort camera sensors and their parameters.
- Telescopes: add, edit, list, sort telescopes and their parameters.
  detailed view (optics, sensor, FOV, location map), default camera
  rotation; filters and sensors management
- Projects: create/edit/delete, subframes and integration progress, publications
  (AstroBin, Facebook, X, Flickr, and more), catalog lookup for RA/Dec on create.
- Objects (`/objects`): search and filter by catalog, name, constellation, and
  sky proximity; Catalogs page (`/catalogs`) lists installed catalogs
- Sky Map (`/sky-map`): Aladin Lite all-sky view of active projects with FOV
  overlays; project detail includes a DSS sky view with the project FOV
- Night plan (`/night-plan`): per-telescope, per-night plan of tasks and
  projects with max altitude, Moon separation, and best observing time, plus an
  "explain" mode listing excluded candidates and the constraints they failed
- About panel

The interface is responsive (phone-friendly layouts for Objects, Catalogs, and
projects). It was tested on desktop (Ubuntu, Windows) and mobile (iPhone).

## Documentation

- [Installation](doc/install.md)
- [Windows setup](doc/windows.md) - Node, Chrome, and running the project on Windows
- [Example NGINX deployment](doc/nginx-deploy.md)
- [Developer's Guide](doc/devel.md)
  - [Queries](doc/queries.md)
