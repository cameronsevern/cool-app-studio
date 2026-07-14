import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDirectory = resolve(root, '.tmp');
const output = resolve(tempDirectory, 'smoke.png');

await mkdir(tempDirectory, { recursive: true });
await execFileAsync(
  process.execPath,
  [
    'src/cli.mjs',
    'render',
    '--input',
    'examples/sample-pixel.svg',
    '--output',
    output,
    '--config',
    'examples/editorial-preset.json',
    '--width',
    '720',
    '--height',
    '720',
  ],
  { cwd: root },
);

const png = await readFile(output);
assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
assert.equal(png.readUInt32BE(16), 720);
assert.equal(png.readUInt32BE(20), 720);
assert.ok(png.length > 50_000, 'rendered PNG should contain a real composition');

await rm(tempDirectory, { recursive: true, force: true });
console.log('Mockup Studio smoke render passed (720×720 PNG).');
