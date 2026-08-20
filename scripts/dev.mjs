#!/usr/bin/env node
/**
 * Starts services in watch mode with one labelled log stream per service.
 *
 *   npm run dev                     the frontend and every service in the dev set
 *   npm run dev -- flight auth      only those two
 *   npm run dev -- --backend-only   everything except the web app
 *   npm run dev -- --list           show what is available and exit
 *
 * A service that crashes does NOT take the others down — the whole point is
 * that you can work on flights while insurance is missing its API key.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ALL, byName } from './services.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);

if (args.includes('--list')) {
  for (const s of ALL) {
    console.log(`  ${s.name.padEnd(14)} :${s.port}  ${s.dir.padEnd(30)} ${s.summary}`);
  }
  process.exit(0);
}

const requested = args.filter((a) => !a.startsWith('-'));
let selected;

if (requested.length) {
  selected = requested.map((name) => {
    const svc = byName(name);
    if (!svc) {
      console.error(`Unknown service "${name}". Run \`npm run dev -- --list\` to see the options.`);
      process.exit(1);
    }
    return svc;
  });
} else {
  selected = ALL.filter((s) => !s.excludeFromDevAll)
    .filter((s) => !(args.includes('--backend-only') && s.isFrontend));
}

console.log('Starting:');
for (const s of selected) console.log(`  ${s.name.padEnd(14)} http://localhost:${s.port}`);
console.log('');

// Run concurrently's entry point with the current node rather than the
// node_modules/.bin shim: on Windows that shim is a .cmd, which spawn will not
// execute, and the extensionless one is a POSIX shell script.
const concurrently = path.join(ROOT, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');
const child = spawn(
  process.execPath,
  [
    concurrently,
    // Keep every service alive independently.
    '--kill-others-on-fail=false',
    '--handle-input',                 // ctrl-c reaches the children
    '--prefix', 'name',
    '--names', selected.map((s) => s.name).join(','),
    '--prefix-colors', selected.map((s) => s.colour).join(','),
    ...selected.map((s) => `npm --prefix ./${s.dir} run dev`),
  ],
  { cwd: ROOT, stdio: 'inherit' },
);

child.on('exit', (code) => process.exit(code ?? 0));
