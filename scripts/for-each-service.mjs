#!/usr/bin/env node
/**
 * Runs one npm script in every service directory, sequentially, and reports a
 * pass/fail table at the end instead of stopping at the first failure.
 *
 *   node scripts/for-each-service.mjs install
 *   node scripts/for-each-service.mjs run build
 *   node scripts/for-each-service.mjs run typecheck
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVICES } from './services.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);

if (!args.length) {
  console.error('usage: for-each-service.mjs <npm args...>   e.g. "run build"');
  process.exit(1);
}

// `npm run <script>` is a no-op error in a service that does not define it,
// so skip those rather than reporting a false failure.
const script = args[0] === 'run' ? args[1] : null;
const results = [];

for (const svc of SERVICES) {
  const pkg = JSON.parse(
    await import('node:fs').then((fs) => fs.readFileSync(path.join(ROOT, svc.dir, 'package.json'), 'utf8')),
  );
  if (script && !pkg.scripts?.[script]) {
    results.push([svc.dir, 'skip', `no "${script}" script`]);
    continue;
  }

  console.log(`\n──────── ${svc.dir}: npm ${args.join(' ')} ────────`);
  const r = spawnSync('npm', args, {
    cwd: path.join(ROOT, svc.dir),
    stdio: 'inherit',
    env: process.env,
  });
  results.push([svc.dir, r.status === 0 ? 'pass' : 'FAIL', r.status === 0 ? '' : `exit ${r.status}`]);
}

console.log(`\n════════ npm ${args.join(' ')} ════════`);
for (const [dir, status, note] of results) {
  console.log(`  ${status.padEnd(5)} ${dir.padEnd(24)} ${note}`);
}

const failed = results.filter(([, s]) => s === 'FAIL');
console.log(`\n${results.filter(([, s]) => s === 'pass').length} passed, ${failed.length} failed, ${results.filter(([, s]) => s === 'skip').length} skipped\n`);
process.exit(failed.length ? 1 : 0);
