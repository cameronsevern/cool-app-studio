import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDirectory = resolve(root, '.tmp');

const renders = [
  {
    name: 'custom-square',
    width: 720,
    height: 720,
    args: ['--width', '720', '--height', '720'],
  },
  {
    name: 'apple-iphone-69',
    width: 1320,
    height: 2868,
    args: ['--canvas', 'apple-iphone-69'],
  },
  {
    name: 'apple-ipad-13',
    width: 2064,
    height: 2752,
    args: ['--canvas', 'apple-ipad-13'],
  },
  {
    name: 'google-phone-landscape',
    width: 1920,
    height: 1080,
    args: ['--canvas', 'google-phone', '--orientation', 'landscape'],
  },
  {
    name: 'google-feature-background',
    width: 1024,
    height: 500,
    args: [
      '--canvas',
      'google-feature',
      '--backgroundImage',
      'examples/sample-iphone.svg',
      '--backgroundOverlayOpacity',
      '0.35',
    ],
  },
];

await rm(tempDirectory, { recursive: true, force: true });
await mkdir(tempDirectory, { recursive: true });

for (const render of renders) {
  const output = resolve(tempDirectory, `${render.name}.png`);
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
      ...render.args,
    ],
    { cwd: root },
  );

  const png = await readFile(output);
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(png.readUInt32BE(16), render.width, `${render.name} width`);
  assert.equal(png.readUInt32BE(20), render.height, `${render.name} height`);
  assert.ok(png.length > 50_000, `${render.name} should contain a real composition`);
}

await rm(tempDirectory, { recursive: true, force: true });
console.log(`App Screenshot Forge rendered ${renders.length} verified store targets.`);
