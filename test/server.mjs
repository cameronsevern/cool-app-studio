import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, ['src/cli.mjs', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
let browser;
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Server test timed out. ${stderr}`)), 10_000);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/Cool App Studio: (http:\/\/127\.0\.0\.1:\d+)/);
    if (!match) return;
    clearTimeout(timer);
    resolveUrl(match[1]);
  });
  child.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Server test exited with ${code}. ${stderr}`));
  });
});

function requestWithHost(path, host) {
  const url = new URL(path, serverUrl);
  return new Promise((resolveResponse, reject) => {
    const req = request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { Host: host },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveResponse({
        status: response.statusCode,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.once('error', reject);
    req.end();
  });
}

try {
  const editor = await fetch(`${serverUrl}/`);
  assert.equal(editor.status, 200);
  const editorHtml = await editor.text();
  assert.match(editorHtml, /<title>Cool App Studio<\/title>/);
  assert.match(editorHtml, /<h1>Cool App Studio<\/h1>/);
  assert.match(
    editorHtml,
    /accept="\.cool-app-studio,\.screenshot-forge,\.mockup-studio,application\/json,\.json"/,
  );
  const capabilityMatch = editorHtml.match(
    /<meta name="cool-app-studio-capability" content="([^"]+)">/,
  );
  assert.ok(capabilityMatch, 'editor should receive a process capability token');
  const capabilityToken = capabilityMatch[1];
  assert.equal(capabilityToken.length, 64);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'app-screenshot-forge.project.v4',
      JSON.stringify({ config: { headline: 'Legacy autosave restored' } }),
    );
  });
  await page.goto(serverUrl);
  await page.waitForFunction(() => window.studioReady === true);
  assert.equal(await page.locator('#headlineInput').inputValue(), 'Legacy autosave restored');
  assert.equal(
    await page.evaluate(() => window.coolAppStudio === window.mockupStudio),
    true,
    'the renamed browser API should retain its legacy alias',
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      canonical: Boolean(window.localStorage.getItem('cool-app-studio.project.v4')),
      legacy: window.localStorage.getItem('app-screenshot-forge.project.v4'),
    })),
    { canonical: true, legacy: null },
  );
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#projectSaveButton').click();
  const projectDownload = await downloadPromise;
  assert.match(projectDownload.suggestedFilename(), /\.cool-app-studio$/);

  const health = await fetch(`${serverUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, localOnly: true });
  assert.match(health.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('referrer-policy'), 'no-referrer');

  const invalidHost = await requestWithHost('/health', 'attacker.invalid');
  assert.equal(invalidHost.status, 421);
  assert.match(invalidHost.body, /host is not allowed/);

  const invalidOrigin = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://attacker.invalid',
    },
    body: '{}',
  });
  assert.equal(invalidOrigin.status, 403);

  const missingCapability = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(missingCapability.status, 403);
  assert.match(await missingCapability.text(), /capability token is not valid/);

  const invalidCapability = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cool-App-Studio-Capability': 'invalid',
    },
    body: '{}',
  });
  assert.equal(invalidCapability.status, 403);

  const validCapability = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cool-App-Studio-Capability': capabilityToken,
    },
    body: '{}',
  });
  assert.equal(validCapability.status, 400);
  assert.match(await validCapability.text(), /image screenshot is required/);

  const invalidContentType = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}',
  });
  assert.equal(invalidContentType.status, 415);
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

console.log('Cool App Studio local-server security checks passed.');
