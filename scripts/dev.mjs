#!/usr/bin/env node
/**
 * Starts services in watch mode with one labelled log stream per service.
 *
 *   npm run dev                     every service in the dev set
 *   npm run dev -- flight auth      only those two
 *   npm run dev -- --list           show what is available and exit
 *
 * A service that crashes does NOT take the others down — the whole point is
 * that you can work on flights while insurance is missing its API key.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SERVICES, byName } from './services.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);

if (args.includes('--list')) {
  for (const s of SERVICES) {
    console.log(`  ${s.name.padEnd(14)} :${s.port}  ${s.dir.padEnd(24)} ${s.summary}`);
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
  selected = SERVICES.filter((s) => !s.excludeFromDevAll);
}

console.log('Starting:');
for (const s of selected) console.log(`  ${s.name.padEnd(14)} http://localhost:${s.port}`);
console.log('');

const concurrently = path.join(ROOT, 'node_modules', '.bin', 'concurrently');
const child = spawn(
  concurrently,
  [
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
