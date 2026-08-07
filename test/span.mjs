import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDirectory = resolve(root, '.tmp', 'span-test');
const archivePath = resolve(tempDirectory, 'set.zip');
const extractedDirectory = resolve(tempDirectory, 'exported');
const sample = await readFile(resolve(root, 'examples/sample-iphone.svg'));
const sampleDataUrl = `data:image/svg+xml;base64,${sample.toString('base64')}`;
const child = spawn(process.execPath, ['src/cli.mjs', 'serve', '--port', '0'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Span test server timed out. ${stderr}`)), 10_000);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/App Screenshot Forge: (http:\/\/127\.0\.0\.1:\d+)/);
    if (!match) return;
    clearTimeout(timer);
    resolveUrl(match[1]);
  });
  child.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Span test server exited with ${code}. ${stderr}`));
  });
});

const editor = await fetch(`${serverUrl}/`);
const editorHtml = await editor.text();
const capabilityMatch = editorHtml.match(
  /<meta name="app-screenshot-forge-capability" content="([^"]+)">/,
);
if (!capabilityMatch) throw new Error('Span test could not find the process capability token');
const capabilityToken = capabilityMatch[1];
const apiHeaders = {
  'Content-Type': 'application/json',
  'X-App-Screenshot-Forge-Capability': capabilityToken,
};

const items = [
  {
    filename: '01-left.png',
    screenshotAssetId: 'screen',
    config: { width: 360, height: 640, background: 'solid', backgroundColorA: '#111827' },
  },
  {
    filename: '02-right.png',
    screenshotAssetId: 'screen',
    config: { width: 360, height: 640, background: 'solid', backgroundColorA: '#111827' },
  },
];
const spanDevice = {
  enabled: true,
  startIndex: 0,
  endIndex: 1,
  sourceIndex: 0,
  x: 0.5,
  y: 0.08,
  scale: 1.1,
  rotateX: 5,
  rotateY: -25,
  rotateZ: -7,
};
const requestBody = JSON.stringify({ items, assets: { screen: sampleDataUrl }, spanDevice });

try {
  await rm(tempDirectory, { recursive: true, force: true });
  await mkdir(extractedDirectory, { recursive: true });
  const response = await fetch(`${serverUrl}/api/render-batch`, {
    method: 'POST',
    headers: apiHeaders,
    body: requestBody,
  });
  const responseError = response.ok ? '' : await response.text();
  assert.equal(response.status, 200, responseError);
  await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
  await execFileAsync('unzip', ['-q', archivePath, '-d', extractedDirectory]);

  for (const filename of ['01-left.png', '02-right.png']) {
    const png = await readFile(resolve(extractedDirectory, filename));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(png.readUInt32BE(16), 360);
    assert.equal(png.readUInt32BE(20), 640);
    assert.ok(png.length > 20_000, `${filename} should contain a real panel crop`);
  }

  const currentResponse = await fetch(`${serverUrl}/api/render-batch`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ items, assets: { screen: sampleDataUrl }, spanDevice, outputIndex: 1 }),
  });
  const currentError = currentResponse.ok ? '' : await currentResponse.text();
  assert.equal(currentResponse.status, 200, currentError);
  assert.match(currentResponse.headers.get('content-type') ?? '', /^image\/png/);
  const currentPng = Buffer.from(await currentResponse.arrayBuffer());
  assert.equal(currentPng.readUInt32BE(16), 360);
  assert.equal(currentPng.readUInt32BE(20), 640);

  const invalidResponse = await fetch(`${serverUrl}/api/render-batch`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({
      items,
      assets: { screen: sampleDataUrl },
      spanDevice: { ...spanDevice, x: 'not-a-number' },
    }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.match(await invalidResponse.text(), /transform is invalid/);
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
  await rm(tempDirectory, { recursive: true, force: true });
}

console.log('App Screenshot Forge spanning-device crop checks passed.');
