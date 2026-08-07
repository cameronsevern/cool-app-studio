import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip } from '../src/zip.mjs';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDirectory = resolve(root, '.tmp', 'zip-test');
const archivePath = resolve(tempDirectory, 'screenshot-set.zip');
const entries = [
  { name: '01-hero.png', data: Buffer.from('first image') },
  { name: '02-details.png', data: Buffer.from('second image') },
];

await rm(tempDirectory, { recursive: true, force: true });
await mkdir(tempDirectory, { recursive: true });

const archive = createZip(entries);
assert.equal(archive.readUInt32LE(0), 0x04034b50, 'ZIP should begin with a local file header');
assert.equal(archive.readUInt32LE(archive.length - 22), 0x06054b50, 'ZIP should include an end record');
assert.equal(archive.readUInt16LE(archive.length - 12), entries.length, 'ZIP should list every slide');
assert.deepEqual(createZip(entries), archive, 'ZIP output should be deterministic');

await writeFile(archivePath, archive);
const { stdout } = await execFileAsync('unzip', ['-Z1', archivePath]);
assert.deepEqual(stdout.trim().split('\n'), entries.map((entry) => entry.name));

await rm(tempDirectory, { recursive: true, force: true });
console.log('Cool App Studio batch ZIP checks passed.');
