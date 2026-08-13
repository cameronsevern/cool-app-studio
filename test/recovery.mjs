import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const samplePath = resolve(root, 'examples/sample-pixel.svg');
const child = spawn(process.execPath, ['src/cli.mjs', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
let browser;
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Recovery test timed out. ${stderr}`)), 10_000);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/Cool App Studio: (http:\/\/127\.0\.0\.1:\d+)/);
    if (!match) return;
    clearTimeout(timer);
    resolveUrl(match[1]);
  });
  child.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Recovery test server exited with ${code}. ${stderr}`));
  });
});

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(serverUrl);
  await page.waitForFunction(() => window.studioReady === true);

  assert.equal(await page.locator('#recoveryInput').isChecked(), false);
  assert.equal(await page.locator('#clearRecoveryButton').isDisabled(), true);
  assert.equal(await page.locator('#recoveryStatus').getAttribute('data-state'), 'off');

  await page.locator('#canvasPresetSelect').selectOption('apple-iphone-69');
  await page.waitForFunction(() => window.coolAppStudio.getProject().project.shared.width === 1320
    && window.coolAppStudio.getProject().project.shared.height === 2868);
  assert.match(await page.locator('#previewMeta').textContent(), /1320 × 2868/);

  await page.locator('#sourceInput').setInputFiles(samplePath);
  await page.waitForFunction(() => Object.values(window.coolAppStudio.getProject().project.assets)
    .some((asset) => asset.name === 'sample-pixel.svg' && asset.dataUrl));

  await page.locator('#recoveryInput').check();
  await page.waitForFunction(
    () => document.getElementById('recoveryStatus')?.dataset.state === 'saved',
    null,
    { timeout: 10_000 },
  );
  assert.equal(await page.locator('#clearRecoveryButton').isDisabled(), false);

  await page.reload();
  await page.waitForFunction(() => window.studioReady === true);
  await page.waitForFunction(
    () => ['recovered', 'saved'].includes(document.getElementById('recoveryStatus')?.dataset.state),
  );
  assert.equal(await page.locator('#recoveryInput').isChecked(), true);
  assert.match(await page.locator('#sourceName').textContent(), /sample-pixel\.svg/);
  assert.equal(
    await page.evaluate(() => Object.values(window.coolAppStudio.getProject().project.assets)
      .some((asset) => asset.name === 'sample-pixel.svg' && asset.dataUrl)),
    true,
  );

  await page.locator('#clearRecoveryButton').click();
  await page.waitForFunction(
    () => document.getElementById('recoveryStatus')?.dataset.state === 'empty',
  );
  assert.equal(await page.locator('#clearRecoveryButton').isDisabled(), true);

  await page.reload();
  await page.waitForFunction(() => window.studioReady === true);
  assert.equal(await page.locator('#recoveryStatus').getAttribute('data-state'), 'empty');
  assert.match(await page.locator('#sourceName').textContent(), /sample-pixel\.svg · reselect/);
  assert.equal(
    await page.evaluate(() => Object.values(window.coolAppStudio.getProject().project.assets)
      .some((asset) => asset.name === 'sample-pixel.svg' && asset.dataUrl)),
    false,
  );
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

console.log('Cool App Studio local recovery retention and clearing checks passed.');
