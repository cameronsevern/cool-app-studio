import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
delete env.CHROME_PATH;

const { stdout, stderr } = await execFileAsync(
  process.execPath,
  ['src/cli.mjs', 'doctor'],
  { cwd: root, env },
);

assert.equal(stderr, '');
assert.match(stdout, /^Cool App Studio doctor\n/);
assert.match(stdout, /Status: PASS/);
assert.match(stdout, /Node: \d+\.\d+\.\d+ \(supported\)/);
assert.match(stdout, /Platform: .+ \(.+\/.+, kernel .+\)/);
assert.match(stdout, /Playwright: 1\.61\.1/);
assert.match(stdout, /Managed browser: .+ \(installed\)/);
assert.match(stdout, /Renderer: pinned \(reproducible\)/);
assert.match(stdout, /Browser version: 149\.0\.7827\.55/);
assert.match(stdout, /Input screenshots: PNG, JPEG, WebP, SVG/);
assert.match(stdout, /Local fonts: WOFF2, WOFF, TTF, OTF/);
assert.match(stdout, /Projects and presets: \.cool-app-studio, JSON presets/);
assert.match(stdout, /Exports: PNG, ordered ZIP/);
assert.match(stdout, /Remediation: none needed\./);

console.log('Cool App Studio doctor checks passed.');
