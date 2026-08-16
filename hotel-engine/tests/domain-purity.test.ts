import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Phase 2's definition of done says "no I/O in domain/". A comment saying so
 * decays; this fails the build.
 *
 * The domain is the part of the system that must be trivially testable and
 * identical in every environment. The moment it can read a clock, a database or
 * an environment variable, pricing becomes irreproducible and the reference
 * implementation's central problem — supplier and infrastructure concerns
 * smeared through business logic — starts growing back.
 */

const DOMAIN = fileURLToPath(new URL('../src/domain', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const domainFiles = walk(DOMAIN)
  .filter((f) => f.endsWith('.ts'))
  .filter((f) => !f.endsWith('.test.ts'));

const FORBIDDEN_MODULES = [
  'node:fs', 'node:http', 'node:https', 'node:net', 'node:child_process',
  'node:crypto', 'node:os', 'node:path', 'node:worker_threads', 'node:dns',
  'fs', 'http', 'https', 'net', 'child_process', 'crypto', 'os', 'dns',
  'axios', 'node-fetch', 'undici', 'mongoose', 'pg', 'ioredis', 'redis',
  'express', 'dotenv', 'mongodb', 'knex', 'prisma',
];

/**
 * Comments must go first. Prose like `distinguishes "no signal" from "not
 * refundable"` contains the exact token sequence an import does, and scanning
 * raw source reported the sentence as a forbidden dependency.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const importSpecifiers = (src: string): string[] => {
  const out: string[] = [];
  const re = /(?:^|[\s;}])(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripComments(src))) !== null) {
    const spec = m[1];
    if (spec !== undefined) out.push(spec);
  }
  return out;
};

describe('domain purity', () => {
  it('finds the domain sources', () => {
    expect(domainFiles.length).toBeGreaterThan(10);
  });

  /**
   * The guard guards itself. Stripping comments to stop prose being read as an
   * import could just as easily stop real imports being read as imports, and a
   * scanner that silently finds nothing passes every file for the wrong reason.
   */
  it('still detects the violations it exists to catch', () => {
    expect(importSpecifiers(`import axios from 'axios';`)).toEqual(['axios']);
    expect(importSpecifiers(`import { readFile } from "node:fs";`)).toEqual(['node:fs']);
    expect(importSpecifiers(`const pg = require('pg');`)).toEqual(['pg']);
    expect(importSpecifiers(`await import("ioredis");`)).toEqual(['ioredis']);
    expect(importSpecifiers(`import type { X } from '../shared/money.js';`)).toEqual([
      '../shared/money.js',
    ]);
    // ...and does not read prose as a dependency.
    expect(importSpecifiers(`/** distinguishes "a" from "b" */`)).toEqual([]);
    expect(importSpecifiers(`// derived from "the total"`)).toEqual([]);
  });

  it('reads real imports out of every domain file', () => {
    // If the scanner returned nothing everywhere, every per-file assertion
    // below would pass vacuously.
    const withImports = domainFiles.filter(
      (f) => importSpecifiers(readFileSync(f, 'utf8')).length > 0,
    );
    expect(withImports.length).toBeGreaterThan(10);
  });

  it.each(domainFiles.map((f) => [relative(DOMAIN, f), f] as const))(
    '%s imports nothing outside the domain',
    (_name, file) => {
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        expect(FORBIDDEN_MODULES, `forbidden import "${spec}"`).not.toContain(spec);
        // Bare specifiers are third-party packages; relative ones must stay in domain/.
        const isRelative = spec.startsWith('.');
        expect(isRelative, `non-relative import "${spec}"`).toBe(true);
        expect(spec.includes('../../'), `escapes domain/: "${spec}"`).toBe(false);
      }
    },
  );

  it.each(domainFiles.map((f) => [relative(DOMAIN, f), f] as const))(
    '%s is deterministic — no clock, randomness or environment',
    (_name, file) => {
      const src = readFileSync(file, 'utf8');
      // `Date.now()` and `Math.random()` make a price irreproducible; a domain
      // function that needs "now" takes it as an argument (see isBookable).
      expect(src).not.toMatch(/\bDate\.now\s*\(/);
      expect(src).not.toMatch(/\bMath\.random\s*\(/);
      expect(src).not.toMatch(/\bnew Date\s*\(\s*\)/);
      expect(src).not.toMatch(/\bprocess\.env\b/);
      expect(src).not.toMatch(/\bconsole\.\w+\s*\(/);
    },
  );
});
