import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDirectory = resolve(root, '.tmp', 'features-test');
const archivePath = resolve(tempDirectory, 'export.zip');
const child = spawn(process.execPath, ['src/cli.mjs', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
let browser;
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Feature test timed out. ${stderr}`)), 10_000);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/Cool App Studio: (http:\/\/127\.0\.0\.1:\d+)/);
    if (!match) return;
    clearTimeout(timer);
    resolveUrl(match[1]);
  });
  child.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Feature test server exited with ${code}. ${stderr}`));
  });
});

async function waitFor(page, predicate, timeout = 20_000) {
  await page.waitForFunction(predicate, null, { timeout });
}

try {
  await rm(tempDirectory, { recursive: true, force: true });
  await mkdir(tempDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(serverUrl);
  await waitFor(page, () => window.studioReady === true);

  await page.locator('#sourceInput').setInputFiles([
    resolve(root, 'examples/sample-iphone.svg'),
    resolve(root, 'examples/sample-pixel.svg'),
  ]);
  await waitFor(page, () => window.coolAppStudio.getProject().project.slides.length === 2);
  assert.equal(await page.locator('#slideCount').textContent(), '2 slides');
  assert.match(await page.locator('#sourceName').textContent(), /sample-iphone\.svg/);
  assert.deepEqual(
    await page.evaluate(() => Object.values(window.coolAppStudio.getProject().project.assets)
      .filter((asset) => asset.dataUrl)
      .map((asset) => asset.name)
      .sort()),
    ['sample-iphone.svg', 'sample-pixel.svg'],
    'the imported set should retain both screenshot assets',
  );

  await page.locator('#safeAreaInput').check();
  await waitFor(page, () => document.getElementById('exportFrame')?.classList.contains('is-safe-area-visible'));
  await page.locator('#canvasPresetSelect').selectOption('apple-iphone-69');
  await waitFor(page, () => document.getElementById('preflightList')?.textContent?.includes('dimensions match'));
  assert.match(await page.locator('#preflightList').textContent(), /Selected screenshot is available/);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportSetButton').click();
  const download = await downloadPromise;
  await waitFor(page, () => document.getElementById('exportProgress')?.dataset.state === 'completed', 60_000);
  assert.match(await page.locator('#exportProgressCount').textContent(), /2 \/ 2/);
  await download.saveAs(archivePath);

  const { stdout: manifestText } = await execFileAsync(
    'unzip',
    ['-p', archivePath, '_cool-app-studio-manifest.json'],
    { cwd: root },
  );
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.target, 'apple-iphone-69');
  assert.equal(manifest.outputs.length, 2);
  assert.match(manifest.outputs[0].sha256, /^[a-f0-9]{64}$/);

  await page.evaluate(async () => {
    while (window.coolAppStudio.getProject().project.slides.length < 10) {
      await window.coolAppStudio.addSlide();
    }
  });
  await page.locator('#exportSetButton').click();
  await waitFor(page, () => document.getElementById('exportProgress')?.dataset.state === 'running', 20_000);
  await page.locator('#cancelExportButton').click();
  await waitFor(page, () => document.getElementById('exportProgress')?.dataset.state === 'cancelled', 60_000);
  assert.equal(await page.locator('#retryExportButton').isHidden(), false);
  await context.close();
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
  await rm(tempDirectory, { recursive: true, force: true });
}

console.log('Cool App Studio import, preflight, and export-job checks passed.');
