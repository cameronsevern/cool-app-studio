import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  await readFile(resolve(root, 'test/fixtures/visual-regression.json'), 'utf8'),
);
const require = createRequire(import.meta.url);
const managedRendererPath = require('playwright').chromium.executablePath();
assert.ok(
  existsSync(managedRendererPath),
  'visual fixtures require the Playwright-managed Chromium; run npx playwright install chromium',
);
if (process.env.CHROME_PATH) {
  assert.equal(
    resolve(process.env.CHROME_PATH),
    resolve(managedRendererPath),
    'visual fixtures require CHROME_PATH to point at the managed Chromium',
  );
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function inspectPng(png) {
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'render should be a PNG');
  let width;
  let height;
  let bitDepth;
  let colorType;
  const imageParts = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      imageParts.push(data);
    }
    offset += 12 + length;
    if (type === 'IEND') break;
  }

  assert.equal(bitDepth, 8, 'visual fixtures use 8-bit PNG output');
  assert.ok([2, 6].includes(colorType), `unsupported PNG color type ${colorType}`);
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const decoded = inflateSync(Buffer.concat(imageParts));
  assert.equal(decoded.length, (stride + 1) * height, 'PNG scanlines should be complete');
  const pixels = Buffer.alloc(width * height * 4);
  let cursor = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = decoded[cursor];
    cursor += 1;
    const row = Buffer.from(decoded.subarray(cursor, cursor + stride));
    cursor += stride;
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? row[index - channels] : 0;
      const up = previous[index] ?? 0;
      const upperLeft = index >= channels ? previous[index - channels] ?? 0 : 0;
      if (filter === 1) row[index] = (row[index] + left) & 0xff;
      else if (filter === 2) row[index] = (row[index] + up) & 0xff;
      else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[index] = (row[index] + paeth(left, up, upperLeft)) & 0xff;
      else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);
    }
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      pixels[target] = row[source];
      pixels[target + 1] = row[source + 1];
      pixels[target + 2] = row[source + 2];
      pixels[target + 3] = channels === 4 ? row[source + 3] : 255;
    }
    previous = row;
  }

  let transparentPixels = 0;
  let opaquePixels = 0;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] === 0) transparentPixels += 1;
    if (pixels[index] > 0) opaquePixels += 1;
  }
  return { width, height, pixels, transparentPixels, opaquePixels };
}

function pixelAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [...image.pixels.subarray(offset, offset + 4)];
}

const anchorRatios = [
  { x: 0.02, y: 0.02 },
  { x: 0.98, y: 0.02 },
  { x: 0.02, y: 0.98 },
  { x: 0.98, y: 0.98 },
  { x: 0.92, y: 0.12 },
  { x: 0.50, y: 0.90 },
];

function anchorPixels(image, anchors = anchorRatios) {
  return anchors.map(({ x, y }) => ({
    x,
    y,
    rgba: pixelAt(
      image,
      Math.round((image.width - 1) * x),
      Math.round((image.height - 1) * y),
    ),
  }));
}

function dataUrlFor(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function assertSameBytes(actual, expected, label) {
  const actualDigest = sha256(actual);
  const expectedDigest = sha256(expected);
  assert.equal(actual.length, expected.length, `${label} length`);
  assert.equal(actualDigest, expectedDigest, `${label} SHA-256`);
}

async function loadAsset(relativePath) {
  const extension = relativePath.split('.').pop().toLowerCase();
  const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension}`;
  return dataUrlFor(await readFile(resolve(root, relativePath)), mimeType);
}

const child = spawn(process.execPath, ['src/cli.mjs', 'serve', '--port', '0', '--no-open'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk; });

const serverUrl = await new Promise((resolveUrl, reject) => {
  const timer = setTimeout(() => reject(new Error(`Visual fixture server timed out. ${stderr}`)), 10_000);
  const onExit = (code) => {
    clearTimeout(timer);
    reject(new Error(`Visual fixture server exited with ${code}. ${stderr}`));
  };
  child.once('exit', onExit);
  child.stdout.on('data', (chunk) => {
    const match = chunk.toString().match(/Cool App Studio: (http:\/\/127\.0\.0\.1:\d+)/);
    if (!match) return;
    clearTimeout(timer);
    child.off('exit', onExit);
    resolveUrl(match[1]);
  });
});

try {
  const editor = await fetch(`${serverUrl}/`);
  const editorHtml = await editor.text();
  const capabilityMatch = editorHtml.match(
    /<meta name="cool-app-studio-capability" content="([^"]+)">/,
  );
  assert.ok(capabilityMatch, 'visual fixtures should receive the local capability token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Cool-App-Studio-Capability': capabilityMatch[1],
  };

  async function renderPng(path, payload, label) {
    const response = await fetch(`${serverUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, `${label} should render: ${body.toString('utf8')}`);
    assert.match(response.headers.get('content-type') ?? '', /^image\/png/);
    return body;
  }

  async function renderSingle(payload, label) {
    return renderPng('/api/render', payload, label);
  }

  for (const fixture of fixtures.cases) {
    const assets = {
      screenImageUrl: await loadAsset(fixture.assets.screenshot),
    };
    if (fixture.assets.background) {
      assets.backgroundImageUrl = await loadAsset(fixture.assets.background);
    }
    const payload = { config: fixture.config, assets };
    const first = await renderSingle(payload, fixture.id);
    const second = await renderSingle(payload, `${fixture.id} repeat`);
    assertSameBytes(second, first, `${fixture.id} should be byte-identical on repeat`);

    const image = inspectPng(first);
    const digest = sha256(first);
    assert.match(digest, /^[a-f0-9]{64}$/, `${fixture.id} should have a PNG fingerprint`);
    assert.equal(image.width, fixture.expected.width, `${fixture.id} width`);
    assert.equal(image.height, fixture.expected.height, `${fixture.id} height`);
    assert.ok(first.length > fixture.expected.minBytes, `${fixture.id} should contain a real composition`);
    assert.ok(
      image.opaquePixels > fixture.expected.minOpaquePixels,
      `${fixture.id} should contain visible pixels`,
    );
    if (process.env.RECORD_VISUAL_FIXTURES) {
      console.log(`${fixture.id} anchors ${JSON.stringify(anchorPixels(image))}`);
    }
    for (const anchor of fixture.expected.anchors ?? []) {
      const actual = anchorPixels(image, [anchor])[0].rgba;
      assert.deepEqual(actual, anchor.rgba, `${fixture.id} anchor at ${anchor.x},${anchor.y}`);
    }
    if (fixture.expected.alpha === 'opaque') {
      assert.equal(image.transparentPixels, 0, `${fixture.id} should be opaque`);
    } else {
      assert.ok(image.transparentPixels > 0, `${fixture.id} should preserve transparent pixels`);
      assert.ok(image.opaquePixels > 0, `${fixture.id} should preserve the device layer`);
    }
  }

  const spanAssets = { screen: await loadAsset('examples/sample-pixel.svg') };
  const spanPayload = {
    items: fixtures.span.items,
    assets: spanAssets,
    spanDevice: fixtures.span.spanDevice,
  };
  const firstArchive = await fetch(`${serverUrl}/api/render-batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(spanPayload),
  });
  const firstZip = Buffer.from(await firstArchive.arrayBuffer());
  assert.equal(firstArchive.status, 200, 'spanning fixture should export a ZIP');
  assert.match(firstArchive.headers.get('content-type') ?? '', /^application\/zip/);
  const secondArchive = await fetch(`${serverUrl}/api/render-batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(spanPayload),
  });
  const secondZip = Buffer.from(await secondArchive.arrayBuffer());
  assertSameBytes(secondZip, firstZip, 'spanning ZIP should be byte-identical on repeat');
  assert.equal(firstZip.readUInt32LE(0), 0x04034b50, 'spanning output should be a ZIP archive');
  assert.ok(firstZip.length > fixtures.span.expected.minBytes, 'spanning ZIP should contain real panels');

  for (const outputIndex of [0, 1, 2]) {
    const firstPanel = await renderPng(
      '/api/render-batch',
      { ...spanPayload, outputIndex },
      `spanning panel ${outputIndex + 1}`,
    );
    const secondPanel = await renderPng(
      '/api/render-batch',
      { ...spanPayload, outputIndex },
      `spanning panel ${outputIndex + 1} repeat`,
    );
    assertSameBytes(
      secondPanel,
      firstPanel,
      `spanning panel ${outputIndex + 1} should be byte-identical on repeat`,
    );
    const image = inspectPng(firstPanel);
    assert.equal(image.width, fixtures.span.expected.width);
    assert.equal(image.height, fixtures.span.expected.height);
    assert.equal(image.transparentPixels, 0, `spanning panel ${outputIndex + 1} should be opaque`);
    assert.ok(image.opaquePixels > fixtures.span.expected.minOpaquePixels);
  }
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}

console.log(
  `Cool App Studio visual repeat fixtures passed (${fixtures.cases.length} scenes + spanning set).`,
);
