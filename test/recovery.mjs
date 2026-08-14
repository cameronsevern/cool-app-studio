import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_PROJECT_FILE_BYTES = 50 * 1024 * 1024;
const child = spawn(process.execPath, ['src/cli.mjs', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
let browser;
const contexts = [];
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

async function openCleanPage() {
  const context = await browser.newContext({ acceptDownloads: true });
  contexts.push(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto(serverUrl);
  await page.waitForFunction(() => window.studioReady === true);
  return { context, page, pageErrors };
}

async function waitForText(page, selector, text) {
  await page.waitForFunction(
    ({ selector: target, expected }) => document.querySelector(target)?.textContent?.includes(expected),
    { selector, expected: text },
    { timeout: 10_000 },
  );
}

async function seedRecoverySnapshot(page, metadata, snapshot) {
  await page.evaluate(async ({ metadata: storedMetadata, snapshot: storedSnapshot }) => {
    localStorage.clear();
    localStorage.setItem('cool-app-studio.recovery.v1.enabled', 'true');
    localStorage.setItem('cool-app-studio.project.v4', JSON.stringify(storedMetadata));
    await new Promise((resolveDatabase, rejectDatabase) => {
      const request = indexedDB.open('cool-app-studio.recovery.v1', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('projects')) {
          request.result.createObjectStore('projects');
        }
      };
      request.onerror = () => rejectDatabase(request.error ?? new Error('Could not seed recovery storage'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('projects', 'readwrite');
        transaction.objectStore('projects').put(storedSnapshot, 'current');
        transaction.oncomplete = () => {
          database.close();
          resolveDatabase();
        };
        transaction.onerror = () => {
          database.close();
          rejectDatabase(transaction.error ?? new Error('Could not write recovery snapshot'));
        };
      };
    });
  }, { metadata, snapshot });
  await page.reload();
  await page.waitForFunction(() => window.studioReady === true);
}

try {
  browser = await chromium.launch({ headless: true });

  {
    const { context, page, pageErrors } = await openCleanPage();
    assert.equal(await page.locator('#recoveryInput').isChecked(), false);
    assert.equal(await page.locator('#clearRecoveryButton').isDisabled(), true);
    assert.equal(await page.locator('#recoveryStatus').getAttribute('data-state'), 'off');

    await page.locator('#canvasPresetSelect').selectOption('apple-iphone-69');
    await page.waitForFunction(() => window.coolAppStudio.getProject().project.shared.width === 1320
      && window.coolAppStudio.getProject().project.shared.height === 2868);
    assert.match(await page.locator('#previewMeta').textContent(), /1320 × 2868/);

    await page.locator('#sourceInput').setInputFiles(resolve(root, 'examples/sample-pixel.svg'));
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
    assert.equal(pageErrors.length, 0);
    await context.close();
  }

  {
    const { context, page, pageErrors } = await openCleanPage();
    await seedRecoverySnapshot(
      page,
      { config: { headline: 'Metadata survives corrupt recovery' } },
      { savedAt: Date.now(), payload: { project: { slides: [null] } } },
    );
    assert.equal(await page.locator('#headlineInput').inputValue(), 'Metadata survives corrupt recovery');
    await page.waitForFunction(
      () => document.getElementById('recoveryStatus')?.dataset.state === 'saved',
      null,
      { timeout: 10_000 },
    );
    assert.equal(await page.locator('#recoveryInput').isChecked(), true);
    assert.equal(pageErrors.length, 0, 'corrupt recovery should not crash the editor');
    await context.close();
  }

  {
    const { context, page, pageErrors } = await openCleanPage();
    const beforeName = await page.locator('#projectNameInput').inputValue();
    await page.evaluate((oversizedBytes) => {
      const file = new File(['{}'], 'oversized.cool-app-studio', { type: 'application/json' });
      Object.defineProperty(file, 'size', { configurable: true, value: oversizedBytes });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.getElementById('projectInput');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, MAX_PROJECT_FILE_BYTES + 1);
    await waitForText(page, '#statusToast', 'Project file exceeds the 50 MB local limit');
    assert.equal(await page.locator('#projectNameInput').inputValue(), beforeName);
    assert.equal(pageErrors.length, 0, 'oversized project bundles should fail in the UI');
    await context.close();
  }

  {
    const { context, page, pageErrors } = await openCleanPage();
    const payload = await page.evaluate(() => window.coolAppStudio.getProject());
    const missingAssetId = 'missing-screenshot';
    payload.project.name = 'Missing screenshot set';
    payload.project.slides[0].screenshotAssetId = missingAssetId;
    payload.project.assets[missingAssetId] = {
      id: missingAssetId,
      name: 'captured-screen.png',
      type: 'image',
      isSample: false,
    };
    await page.locator('#projectInput').setInputFiles({
      name: 'missing-screenshot.cool-app-studio',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await page.waitForFunction(
      () => document.getElementById('sourceName')?.textContent?.includes('captured-screen.png · reselect'),
    );
    assert.match(await page.locator('#preflightStatus').textContent(), /reselect this slide’s screenshot/);
    await page.locator('#exportButton').click();
    await waitForText(page, '#statusToast', 'Export failed: Reselect screenshots');
    assert.equal(await page.locator('#exportButton').isDisabled(), false);
    assert.equal(await page.locator('#exportButton').textContent(), 'Export PNG');
    assert.equal(pageErrors.length, 0, 'missing assets should produce a recoverable export message');
    await context.close();
  }

  {
    const { context, page, pageErrors } = await openCleanPage();
    const payload = await page.evaluate(() => window.coolAppStudio.getProject());
    const unsupportedFontId = 'unsupported-font';
    payload.project.name = 'Unsupported font set';
    payload.project.shared.fontFamily = 'custom';
    payload.project.shared.customFontName = 'Unsupported local font';
    payload.project.fontAssetId = unsupportedFontId;
    payload.project.assets[unsupportedFontId] = {
      id: unsupportedFontId,
      name: 'unsupported-font.ttf',
      type: 'font',
      isSample: false,
      dataUrl: 'data:font/ttf;base64,AAAA',
    };
    await page.locator('#projectInput').setInputFiles({
      name: 'unsupported-font.cool-app-studio',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await page.waitForFunction(() => document.getElementById('fontFamilySelect')?.value === 'system');
    assert.match(await page.locator('#fontFileName').textContent(), /unsupported-font\.ttf · reselect/);
    assert.equal(
      await page.evaluate(() => window.coolAppStudio.getProject().project.assets['unsupported-font'].dataUrl),
      '',
    );
    assert.equal(await page.locator('#fontFamilySelect').inputValue(), 'system');
    assert.equal(pageErrors.length, 0, 'unsupported fonts should fall back without crashing the editor');
    await context.close();
  }

  {
    const { context, page, pageErrors } = await openCleanPage();
    await page.route('**/api/render', (route) => route.abort());
    await page.locator('#exportButton').click();
    await waitForText(page, '#statusToast', 'Export failed:');
    assert.equal(await page.locator('#exportButton').isDisabled(), false);
    assert.equal(await page.locator('#exportButton').textContent(), 'Export PNG');
    await page.unroute('**/api/render');
    assert.equal(pageErrors.length, 0, 'interrupted exports should restore the export control');
    await context.close();
  }
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

console.log('Cool App Studio recovery retention and boundary checks passed.');
