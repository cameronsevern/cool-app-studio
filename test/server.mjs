import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, ['src/cli.mjs', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Server test timed out. ${stderr}`)), 10_000);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/App Screenshot Forge: (http:\/\/127\.0\.0\.1:\d+)/);
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
  const capabilityMatch = editorHtml.match(
    /<meta name="app-screenshot-forge-capability" content="([^"]+)">/,
  );
  assert.ok(capabilityMatch, 'editor should receive a process capability token');
  const capabilityToken = capabilityMatch[1];
  assert.equal(capabilityToken.length, 64);

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
      'X-App-Screenshot-Forge-Capability': 'invalid',
    },
    body: '{}',
  });
  assert.equal(invalidCapability.status, 403);

  const validCapability = await fetch(`${serverUrl}/api/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Screenshot-Forge-Capability': capabilityToken,
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
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

console.log('App Screenshot Forge local-server security checks passed.');
