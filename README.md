[![NodeJS 18](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-18.yml/badge.svg)](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-18.yml)
[![NodeJS 20](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-20.yml/badge.svg)](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-20.yml)
[![NodeJS 22](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-22.yml/badge.svg)](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/node-22.yml)
[![CodeQL](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/tomaszmrugalski/hevelius-web/actions/workflows/github-code-scanning/codeql)

# Hevelius

![Hevelius](src/assets/images/hevelius.jpg)

This is a web interface (web app) for Hevelius, an astronomy processing software and observatory management system.
It's in the very early stages of development. It requires [hevelius backend](https://github.com/tomaszmrugalski/hevelius-backend)
to be running. There's also the [the runner component](https://github.com/tomaszmrugalski/hevelius-runner) that should be
running on a machine that is controlling the telescope. The hevelius-web is not interacting with the runner directly.

The software is implemented in Angular and Typescript.

## Status

As of May 2025, the following features are available:

- Login
- List of tasks
- Adding new tasks
- Editing tasks (long press a task)
- List of telescopes
- Catalogs (NGC,IC,Messier,Caldwell)

The interface is responsive and should work on any device. It was tested on desktop (Ubuntu 24, Windows), and mobile (iPhone 14 Pro).

## Documentation

- [Installation](doc/install.md)
- [Windows setup](doc/windows.md) - Node, Chrome, and running the project on Windows
- [Example NGINX deployment](doc/nginx-deploy.md)
- [Developer's Guide](doc/devel.md)
  - [Queries](doc/queries.md)
