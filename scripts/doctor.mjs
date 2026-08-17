#!/usr/bin/env node
/**
 * Preflight check for local development.
 *
 *   npm run doctor          report what is missing
 *   npm run setup:env       same, but also create any missing .env from .env.example
 *
 * The point is to fail with one readable list instead of thirteen stack traces.
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVICES } from './services.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIX = process.argv.includes('--fix');

const problems = [];
const notes = [];
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m, hint) => { console.log(`  MISS  ${m}`); problems.push(hint ?? m); };
const warn = (m) => { console.log(`  warn  ${m}`); notes.push(m); };

/** Is something listening on this TCP port? */
const probe = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const sock = net.connect({ port, host });
    const done = (r) => { sock.destroy(); resolve(r); };
    sock.setTimeout(700);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });

/**
 * Keys assigned in a dotenv-style file, ignoring comments and blanks.
 * Splits on \r?\n — several .env files in this repo have CRLF endings, and a
 * trailing \r is not matched by `.`, so a naive split silently parses nothing.
 */
const envKeys = (file) => {
  const out = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (m) out.set(m[1], m[2].trim());
  }
  return out;
};

console.log('\nRuntime');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`node ${process.version}`);
else bad(`node ${process.version} — services declare engines.node >=20`, 'Install Node 20 or newer (see .nvmrc)');

console.log('\nInfrastructure');
const needsMongo = SERVICES.some((s) => s.needs.includes('mongo'));
const needsRedis = SERVICES.some((s) => s.needs.includes('redis'));
if (needsMongo) {
  (await probe(27017))
    ? ok('mongodb on 127.0.0.1:27017')
    : bad('mongodb is not reachable on 127.0.0.1:27017', 'Start MongoDB: `brew services start mongodb-community` (macOS) or `docker run -d -p 27017:27017 mongo`');
}
if (needsRedis) {
  (await probe(6379))
    ? ok('redis on 127.0.0.1:6379')
    : bad('redis is not reachable on 127.0.0.1:6379', 'Start Redis: `brew services start redis` (macOS) or `docker run -d -p 6379:6379 redis`');
}

console.log('\nServices');
for (const svc of SERVICES) {
  const dir = path.join(ROOT, svc.dir);
  const label = svc.name.padEnd(14);

  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    bad(`${label} dependencies not installed`, `Run \`npm run install:all\` (or \`npm --prefix ./${svc.dir} install\`)`);
    continue;
  }

  const envFile = path.join(dir, '.env');
  const examplePath = path.join(dir, '.env.example');

  if (!fs.existsSync(envFile)) {
    if (FIX && fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envFile);
      ok(`${label} .env created from .env.example — fill in its blank values`);
    } else {
      bad(`${label} has no .env`, `Run \`npm run setup:env\`, then fill in ${svc.dir}/.env`);
      continue;
    }
  }

  // Any key the template declares with a value, but the .env omits entirely,
  // is a variable the developer does not know they are missing.
  const example = fs.existsSync(examplePath) ? envKeys(examplePath) : new Map();
  const actual = envKeys(envFile);
  const missing = [...example.keys()].filter((k) => !actual.has(k));
  const blank = [...example.entries()]
    .filter(([k, v]) => v === '' && !actual.get(k))
    .map(([k]) => k);

  if (missing.length) warn(`${label} .env is missing keys: ${missing.join(', ')}`);
  if (blank.length) warn(`${label} needs values for: ${blank.join(', ')}`);
  if (!missing.length && !blank.length) ok(`${label} .env looks complete`);

  if (await probe(svc.port)) {
    warn(`${label} port ${svc.port} is already in use — that service will fail to bind`);
  }
}

console.log('');
if (problems.length) {
  console.log(`${problems.length} thing(s) to fix before \`npm run dev\`:\n`);
  for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
  console.log('');
  process.exit(1);
}
console.log(
  notes.length
    ? `No blockers. ${notes.length} warning(s) above — services will start, but any feature needing a blank credential will fail.\n`
    : 'All checks passed. Run `npm run dev`.\n',
);
