#!/usr/bin/env node
/**
 * Deploy frontend build to a remote server over SSH.
 *
 * Reads configuration from ".deploy" in project root:
 *   hostname=example.com
 *   username=deploy
 *   path=/var/www/hevelius
 *   api-url=https://example.com:5001/api
 *   ssh-port=22 (optional)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const deployConfigPath = path.join(projectRoot, '.deploy');
const heveliusPath = path.join(projectRoot, 'src', 'hevelius.ts');
const buildOutputPath = path.join(projectRoot, 'dist', 'hevelius', 'browser') + path.sep;

function parseDeployConfig(raw) {
  const config = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) {
      throw new Error(`Invalid line in .deploy: "${line}"`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    config[key] = value;
  }

  return config;
}

function configValue(config, keys) {
  for (const key of keys) {
    if (config[key]) {
      return config[key];
    }
  }
  return '';
}

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

if (!fs.existsSync(deployConfigPath)) {
  console.error('Missing .deploy file in project root.');
  console.error('Copy .deploy.example to .deploy and fill your values.');
  process.exit(1);
}

const rawConfig = fs.readFileSync(deployConfigPath, 'utf-8');
const config = parseDeployConfig(rawConfig);

const hostname = configValue(config, ['hostname', 'host', 'DEPLOY_HOSTNAME']);
const username = configValue(config, ['username', 'user', 'DEPLOY_USERNAME']);
const remotePath = configValue(config, ['path', 'remote-path', 'DEPLOY_PATH']);
const apiUrl = configValue(config, ['api-url', 'api_url', 'API_URL']);
const sshPort = configValue(config, ['ssh-port', 'ssh_port', 'port', 'DEPLOY_SSH_PORT']);

const missing = [];
if (!hostname) missing.push('hostname');
if (!username) missing.push('username');
if (!remotePath) missing.push('path');
if (!apiUrl) missing.push('api-url');

if (missing.length > 0) {
  console.error(`Missing required .deploy settings: ${missing.join(', ')}`);
  process.exit(1);
}

if (apiUrl.endsWith('/')) {
  console.error('Invalid api-url: trailing slash is not allowed.');
  process.exit(1);
}

if (sshPort && !/^\d+$/.test(sshPort)) {
  console.error('Invalid ssh-port: must be a number.');
  process.exit(1);
}

if (sshPort) {
  const portNumber = Number(sshPort);
  if (portNumber < 1 || portNumber > 65535) {
    console.error('Invalid ssh-port: must be between 1 and 65535.');
    process.exit(1);
  }
}

if (!fs.existsSync(heveliusPath)) {
  console.error(`File not found: ${heveliusPath}`);
  process.exit(1);
}

const originalHevelius = fs.readFileSync(heveliusPath, 'utf-8');

function setApiUrl(source, nextUrl) {
  const pattern = /(static\s+apiUrl\s*=\s*)(['"])([^'"]*)(\2)(\s*;)/;
  if (!pattern.test(source)) {
    throw new Error('Could not find "static apiUrl = ..." in src/hevelius.ts');
  }
  return source.replace(pattern, `$1'${nextUrl}'$5`);
}

function escapeShellArg(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

try {
  const updatedHevelius = setApiUrl(originalHevelius, apiUrl);
  fs.writeFileSync(heveliusPath, updatedHevelius, 'utf-8');
  console.log(`Updated src/hevelius.ts apiUrl -> ${apiUrl}`);

  run('npx ng build --configuration production');
  run('npx ng test --watch=false');
  run('npx ng lint');

  if (!fs.existsSync(buildOutputPath)) {
    throw new Error(`Build output not found: ${buildOutputPath}`);
  }

  const remote = `${username}@${hostname}:${remotePath}`;
  const sshTransport = sshPort ? `-e ${escapeShellArg(`ssh -p ${sshPort}`)}` : '';
  run(
    `rsync -avz --delete ${sshTransport} ${escapeShellArg(buildOutputPath)} ${escapeShellArg(remote)}`
  );
} finally {
  fs.writeFileSync(heveliusPath, originalHevelius, 'utf-8');
  console.log('Restored original src/hevelius.ts');
}

console.log(
  "don't forget to run sudo systemctl restart gunicorn-hevelius on the server"
);
