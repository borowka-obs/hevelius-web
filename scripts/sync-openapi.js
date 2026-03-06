#!/usr/bin/env node
/**
 * Sync openapi.yaml from the Hevelius backend repo into this frontend repo.
 * The file is gitignored so it is not committed; canonical source stays in backend.
 *
 * Usage:
 *   npm run sync-openapi              # copy from backend (default path or HEVELIUS_BACKEND_PATH)
 *   npm run sync-openapi -- main      # copy from backend's "main" branch (git show)
 *   npm run sync-openapi -- feature/x # copy from backend's "feature/x" branch
 *
 * Env:
 *   HEVELIUS_BACKEND_PATH  Path to backend repo (default: ../hevelius-backend)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const backendPath = path.resolve(
  projectRoot,
  process.env.HEVELIUS_BACKEND_PATH || '../hevelius-backend'
);
const apiDir = path.join(projectRoot, 'api');
const outFile = path.join(apiDir, 'openapi.yaml');
const specPath = 'openapi.yaml';

const branch = process.argv[2]; // first arg after -- from npm run

if (!fs.existsSync(backendPath)) {
  console.error(
    `Backend path not found: ${backendPath}\nSet HEVELIUS_BACKEND_PATH if your backend repo is elsewhere.`
  );
  process.exit(1);
}

let content;
if (branch) {
  try {
    content = execSync(`git show ${branch}:${specPath}`, {
      cwd: backendPath,
      encoding: 'utf-8',
    });
  } catch (e) {
    console.error(
      `Failed to read ${specPath} from branch "${branch}" in ${backendPath}. Ensure the branch exists and contains ${specPath}.`
    );
    process.exit(1);
  }
} else {
  const srcFile = path.join(backendPath, 'api', specPath);
  if (!fs.existsSync(srcFile)) {
    console.error(`File not found: ${srcFile}`);
    process.exit(1);
  }
  content = fs.readFileSync(srcFile, 'utf-8');
}

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}
fs.writeFileSync(outFile, content, 'utf-8');
console.log(
  branch
    ? `Wrote openapi.yaml from backend branch "${branch}".`
    : `Wrote openapi.yaml from ${backendPath}.`
);
