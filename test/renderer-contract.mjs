import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const lockfile = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const browsers = JSON.parse(
  await readFile(resolve(root, 'node_modules/playwright-core/browsers.json'), 'utf8'),
);
const contract = await readFile(resolve(root, 'docs/RENDERER_CONTRACT.md'), 'utf8');
const cli = await readFile(resolve(root, 'src/cli.mjs'), 'utf8');
const scene = await readFile(resolve(root, 'src/studio/scene.js'), 'utf8');
const workflow = await readFile(resolve(root, '.github/workflows/ci.yml'), 'utf8');

const expectedPlaywright = '1.61.1';
const expectedBrowser = {
  revision: '1228',
  browserVersion: '149.0.7827.55',
  title: 'Chrome for Testing',
};
const chromium = browsers.browsers.find(({ name }) => name === 'chromium');

assert.equal(packageJson.dependencies.playwright, expectedPlaywright);
assert.equal(packageJson.engines.node, '>=22');
assert.equal(lockfile.packages[''].dependencies.playwright, expectedPlaywright);
assert.equal(lockfile.packages['node_modules/playwright'].version, expectedPlaywright);
assert.ok(chromium, 'Playwright should include Chromium metadata');
assert.deepEqual(
  {
    revision: chromium.revision,
    browserVersion: chromium.browserVersion,
    title: chromium.title,
  },
  expectedBrowser,
);

for (const value of [
  'Playwright',
  '`1.61.1`',
  'Chromium revision `1228`',
  '149.0.7827.55',
  '`--force-color-profile=srgb`',
  '`deviceScaleFactor: 1`',
  'WOFF2',
  'WOFF',
  'TTF',
  'OTF',
]) {
  assert.match(contract, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(cli, /headless:\s*true/);
assert.match(cli, /'--hide-scrollbars'/);
assert.match(cli, /'--force-color-profile=srgb'/);
assert.match(cli, /deviceScaleFactor:\s*1/);
for (const extension of ['.woff2', '.woff', '.ttf', '.otf']) {
  assert.match(cli, new RegExp(`'${extension.replace('.', '\\.')}'`));
}
for (const family of ['system', 'geometric', 'rounded', 'serif', 'mono']) {
  assert.match(scene, new RegExp(`\\b${family}:`));
}
for (const os of ['macos-latest', 'ubuntu-latest', 'windows-latest']) {
  assert.match(workflow, new RegExp(os));
}
for (const node of ['22', '24']) {
  assert.match(workflow, new RegExp(`- ${node}`));
}

console.log('Cool App Studio renderer contract checks passed.');
