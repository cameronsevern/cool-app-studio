#!/usr/bin/env node

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectRenderer } from './renderer.mjs';
import { createZip } from './zip.mjs';

const require = createRequire(import.meta.url);
let playwright;
let playwrightImportError;
let playwrightVersion;
try {
  playwright = require('playwright');
  playwrightVersion = require('playwright/package.json').version;
} catch (error) {
  playwrightImportError = error;
}

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolDirectory, '..');
const studioDirectory = resolve(toolDirectory, 'studio');
const examplesDirectory = resolve(projectRoot, 'examples');
const renderJobs = new Map();
const renderReadyTimeoutMs = 60_000;
let browserPromise;
let rendererSelection;
const CAPABILITY_HEADER = 'x-cool-app-studio-capability';
const CAPABILITY_TOKEN_PLACEHOLDER = '__COOL_APP_STUDIO_CAPABILITY_TOKEN__';
const PROCESS_CAPABILITY_TOKEN = randomBytes(32).toString('hex');

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data: blob:",
    "media-src 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'none'",
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const CANVAS_PRESETS = {
  'apple-iphone-69': { width: 1320, height: 2868, orientation: 'portrait', allowOrientation: true },
  'apple-ipad-13': { width: 2064, height: 2752, orientation: 'portrait', allowOrientation: true },
  'google-phone': { width: 1080, height: 1920, orientation: 'portrait', allowOrientation: true },
  'google-feature': { width: 1024, height: 500, orientation: 'landscape', allowOrientation: false },
};

const samplePaths = {
  iphone: resolve(examplesDirectory, 'sample-iphone.svg'),
  pixel: resolve(examplesDirectory, 'sample-pixel.svg'),
};

function parseFlags(values) {
  const result = { _: [] };
  const booleanFlags = new Set([
    'help',
    'manualTextColors',
    'noDevice',
    'noOpen',
    'open',
    'transparent',
  ]);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      result._.push(value);
      continue;
    }
    const rawKey = value.slice(2);
    const key = rawKey === 'no-open' ? 'noOpen' : rawKey;
    if (booleanFlags.has(key)) {
      result[key] = true;
      continue;
    }
    const next = values[index + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Missing value for --${rawKey}`);
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function hasCapabilityToken(request) {
  const supplied = request.headers[CAPABILITY_HEADER];
  if (typeof supplied !== 'string') return false;
  const expectedBuffer = Buffer.from(PROCESS_CAPABILITY_TOKEN, 'utf8');
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function validateRequest(request, response, server, url) {
  const address = server.address();
  if (!address || typeof address === 'string') {
    send(response, 503, 'Local server is not ready');
    return false;
  }

  const expectedHost = `127.0.0.1:${address.port}`;
  if (request.headers.host !== expectedHost) {
    send(response, 421, 'Request host is not allowed');
    return false;
  }

  const isApiRequest = url.pathname.startsWith('/api/');
  if (!isApiRequest) return true;

  if (request.method === 'POST') {
    const expectedOrigin = `http://${expectedHost}`;
    const origin = request.headers.origin;
    if (origin && origin !== expectedOrigin) {
      send(response, 403, 'Request origin is not allowed');
      return false;
    }

    const contentType = String(request.headers['content-type'] ?? '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== 'application/json') {
      send(response, 415, 'API requests must use application/json');
      return false;
    }
  }

  if (!hasCapabilityToken(request)) {
    send(response, 403, 'Render capability token is not valid');
    return false;
  }

  return true;
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100 * 1024 * 1024) {
      throw new Error('Request exceeds the 100 MB local limit');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function browserCandidates() {
  const home = homedir();
  if (platform() === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ];
  }
  if (platform() === 'win32') {
    return [
      process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ].filter(Boolean);
  }
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ];
}

function getRendererSelection() {
  if (rendererSelection) return rendererSelection;
  rendererSelection = selectRenderer({
    managedPath: playwright.chromium.executablePath(),
    overridePath: process.env.CHROME_PATH,
    systemPaths: browserCandidates(),
    isAvailable: existsSync,
  });
  return rendererSelection;
}

async function getBrowser() {
  if (!playwright) {
    throw new Error(
      `Playwright is not installed. Run npm install in ${projectRoot}. ` +
        `(Original error: ${playwrightImportError?.message ?? 'module unavailable'})`,
    );
  }
  const selection = getRendererSelection();
  if (selection.mode === 'unavailable') {
    throw new Error(
      `${selection.reason}. Run npx playwright install chromium or set CHROME_PATH to a Chromium-family browser.`,
    );
  }
  browserPromise ??= playwright.chromium.launch({
    headless: true,
    executablePath: selection.executablePath,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-gpu'],
  });
  return browserPromise;
}

async function getRendererMetadata() {
  const browser = await getBrowser();
  const selection = getRendererSelection();
  return {
    selection: selection.mode,
    fallback: selection.fallback,
    reproducible: selection.mode === 'pinned',
    reason: selection.reason,
    playwrightVersion,
    browserVersion: browser.version(),
  };
}

function clampDimension(value, fallback = 1600) {
  return Math.max(320, Math.min(4096, Number(value ?? fallback)));
}

async function renderBuffer(baseUrl, config, assets) {
  const width = clampDimension(config.width);
  const height = clampDimension(config.height);
  const jobId = randomUUID();
  renderJobs.set(jobId, {
    config: { ...config, width, height },
    assets,
  });

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/render.html?job=${encodeURIComponent(jobId)}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.renderReady || window.renderError, null, {
      timeout: renderReadyTimeoutMs,
    });
    const renderError = await page.evaluate(() => window.renderError ?? null);
    if (renderError) throw new Error(renderError);
    if (consoleErrors.length > 0) {
      throw new Error(`Browser render error: ${consoleErrors.join(' | ')}`);
    }
    return await page.locator('#exportFrame').screenshot({
      type: 'png',
      omitBackground: config.background === 'transparent',
      animations: 'disabled',
    });
  } finally {
    renderJobs.delete(jobId);
    await page.close();
  }
}

async function renderSpanBuffers(baseUrl, items, assetData, spanDevice) {
  const width = clampDimension(items[0].config?.width);
  const height = clampDimension(items[0].config?.height);
  const totalWidth = width * items.length;
  if (totalWidth > 20_480 || totalWidth * height > 100_000_000) {
    throw new Error('The spanning range is too large to render safely; use fewer panels or a smaller canvas');
  }
  const jobId = randomUUID();
  renderJobs.set(jobId, {
    items: items.map((item) => ({
      ...item,
      config: { ...item.config, width, height },
    })),
    assets: assetData,
    spanDevice,
  });

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: totalWidth, height },
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/render-set.html?job=${encodeURIComponent(jobId)}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.renderReady || window.renderError, null, {
      timeout: renderReadyTimeoutMs,
    });
    const renderError = await page.evaluate(() => window.renderError ?? null);
    if (renderError) throw new Error(renderError);
    if (consoleErrors.length > 0) {
      throw new Error(`Browser set render error: ${consoleErrors.join(' | ')}`);
    }
    // Prime the full composited surface before taking individual crop clips.
    // Chromium can defer rasterizing an off-screen 3D layer until its first
    // clip capture, which would make the first panel observation timing-sensitive.
    await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: totalWidth, height },
      animations: 'disabled',
    });
    const buffers = [];
    for (let index = 0; index < items.length; index += 1) {
      buffers.push(await page.screenshot({
        type: 'png',
        clip: { x: index * width, y: 0, width, height },
        omitBackground: items[index].config?.background === 'transparent',
        animations: 'disabled',
      }));
    }
    return buffers;
  } finally {
    renderJobs.delete(jobId);
    await page.close();
  }
}

function createStudioServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (!validateRequest(request, response, server, url)) return;

      if (request.method === 'GET' && url.pathname === '/health') {
        return send(
          response,
          200,
          JSON.stringify({ ok: true, localOnly: true }),
          'application/json',
        );
      }

      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204, {
          ...SECURITY_HEADERS,
          'Cache-Control': 'public, max-age=86400',
        });
        return response.end();
      }

      if (request.method === 'GET' && url.pathname.startsWith('/sample/')) {
        const device = url.pathname.split('/').pop();
        const path = samplePaths[device];
        if (!path) return send(response, 404, 'Unknown sample');
        return send(response, 200, await readFile(path), MIME_TYPES[extname(path)]);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/job/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/job/'.length));
        const job = renderJobs.get(id);
        if (!job) {
          return send(
            response,
            404,
            JSON.stringify({ error: 'Render job expired' }),
            'application/json',
          );
        }
        return send(response, 200, JSON.stringify(job), 'application/json');
      }

      if (request.method === 'POST' && url.pathname === '/api/render') {
        const payload = await readRequestJson(request);
        const assets = payload.assets ?? { screenImageUrl: payload.imageDataUrl };
        if (!assets.screenImageUrl?.startsWith('data:image/')) {
          return send(response, 400, 'An image screenshot is required');
        }
        if (assets.backgroundImageUrl && !assets.backgroundImageUrl.startsWith('data:image/')) {
          return send(response, 400, 'The background must be an image');
        }
        if (assets.fontDataUrl && !assets.fontDataUrl.startsWith('data:')) {
          return send(response, 400, 'The font must be a local data URL');
        }
        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const png = await renderBuffer(baseUrl, payload.config ?? {}, assets);
        return send(response, 200, png, 'image/png');
      }

      if (request.method === 'POST' && url.pathname === '/api/render-batch') {
        const payload = await readRequestJson(request);
        if (!Array.isArray(payload.items) || payload.items.length === 0) {
          return send(response, 400, 'A batch requires at least one slide');
        }
        if (payload.items.length > 10) {
          return send(response, 400, 'A batch can contain at most 10 slides');
        }
        const assetData = payload.assets ?? {};
        let spanDevice = null;
        if (payload.spanDevice?.enabled) {
          const startIndex = Number(payload.spanDevice.startIndex);
          const endIndex = Number(payload.spanDevice.endIndex);
          const sourceIndex = Number(payload.spanDevice.sourceIndex);
          if (![startIndex, endIndex, sourceIndex].every(Number.isInteger)) {
            return send(response, 400, 'The spanning panel range is invalid');
          }
          if (startIndex < 0 || endIndex >= payload.items.length || endIndex <= startIndex) {
            return send(response, 400, 'A spanning device requires at least two adjacent panels');
          }
          if (endIndex - startIndex + 1 > 5) {
            return send(response, 400, 'A spanning device can cross at most five panels');
          }
          if (sourceIndex < startIndex || sourceIndex > endIndex) {
            return send(response, 400, 'The spanning screenshot source must be inside its panel range');
          }
          const spanValues = {
            x: Number(payload.spanDevice.x ?? 0.5),
            y: Number(payload.spanDevice.y ?? 0.08),
            scale: Number(payload.spanDevice.scale ?? 1),
            rotateX: Number(payload.spanDevice.rotateX ?? 5),
            rotateY: Number(payload.spanDevice.rotateY ?? -25),
            rotateZ: Number(payload.spanDevice.rotateZ ?? -7),
          };
          if (!Object.values(spanValues).every(Number.isFinite)) {
            return send(response, 400, 'The spanning device transform is invalid');
          }
          const spanWidth = clampDimension(payload.items[startIndex].config?.width);
          const spanHeight = clampDimension(payload.items[startIndex].config?.height);
          const dimensionsMatch = payload.items
            .slice(startIndex, endIndex + 1)
            .every((item) => clampDimension(item.config?.width) === spanWidth
              && clampDimension(item.config?.height) === spanHeight);
          if (!dimensionsMatch) {
            return send(response, 400, 'Spanning panels must use the same canvas dimensions');
          }
          spanDevice = {
            enabled: true,
            startIndex,
            endIndex,
            sourceIndex,
            x: Math.max(0, Math.min(1, spanValues.x)),
            y: Math.max(-0.5, Math.min(0.5, spanValues.y)),
            scale: Math.max(0.4, Math.min(2, spanValues.scale)),
            rotateX: Math.max(-24, Math.min(24, spanValues.rotateX)),
            rotateY: Math.max(-46, Math.min(46, spanValues.rotateY)),
            rotateZ: Math.max(-18, Math.min(18, spanValues.rotateZ)),
          };
        }
        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const buffers = new Array(payload.items.length);
        for (const [index, item] of payload.items.entries()) {
          const assets = {
            screenImageUrl: assetData[item.screenshotAssetId] ?? '',
            backgroundImageUrl: item.backgroundAssetId
              ? (assetData[item.backgroundAssetId] ?? '')
              : '',
            fontDataUrl: item.fontAssetId ? (assetData[item.fontAssetId] ?? '') : '',
          };
          const isSpanned = spanDevice && index >= spanDevice.startIndex && index <= spanDevice.endIndex;
          const needsOwnScreenshot = !isSpanned || index === spanDevice.sourceIndex;
          if (needsOwnScreenshot && !assets.screenImageUrl.startsWith('data:image/')) {
            return send(response, 400, `Slide ${index + 1} is missing a screenshot`);
          }
          if (item.config?.background === 'image' && !assets.backgroundImageUrl.startsWith('data:image/')) {
            return send(response, 400, `Slide ${index + 1} is missing the shared background image`);
          }
          if (item.config?.fontFamily === 'custom' && !assets.fontDataUrl.startsWith('data:')) {
            return send(response, 400, `Slide ${index + 1} is missing the shared font`);
          }
          if (!isSpanned) buffers[index] = await renderBuffer(baseUrl, item.config ?? {}, assets);
        }
        if (spanDevice) {
          const spanItems = payload.items.slice(spanDevice.startIndex, spanDevice.endIndex + 1);
          const spanBuffers = await renderSpanBuffers(
            baseUrl,
            spanItems,
            assetData,
            {
              ...spanDevice,
              startIndex: 0,
              endIndex: spanItems.length - 1,
              sourceIndex: spanDevice.sourceIndex - spanDevice.startIndex,
            },
          );
          spanBuffers.forEach((buffer, index) => {
            buffers[spanDevice.startIndex + index] = buffer;
          });
        }
        if (payload.outputIndex !== undefined) {
          const outputIndex = Number(payload.outputIndex);
          if (!Number.isInteger(outputIndex) || outputIndex < 0 || outputIndex >= buffers.length) {
            return send(response, 400, 'The requested output panel is invalid');
          }
          return send(response, 200, buffers[outputIndex], 'image/png');
        }
        const entries = payload.items.map((item, index) => {
          const filename = String(item.filename ?? `slide-${index + 1}.png`)
            .split(/[\\/]/)
            .pop()
            .replace(/[^a-zA-Z0-9._-]+/g, '-');
          return { name: filename || `slide-${index + 1}.png`, data: buffers[index] };
        });
        return send(response, 200, createZip(entries), 'application/zip');
      }

      const requestedFile = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const allowedFiles = new Set([
        'index.html',
        'render.html',
        'render-set.html',
        'scene.css',
        'scene.js',
        'project.js',
        'studio.css',
        'studio.js',
      ]);
      if (!allowedFiles.has(requestedFile)) return send(response, 404, 'Not found');
      const path = resolve(studioDirectory, requestedFile);
      const file = await readFile(path, 'utf8');
      return send(
        response,
        200,
        file.replaceAll(CAPABILITY_TOKEN_PLACEHOLDER, PROCESS_CAPABILITY_TOKEN),
        MIME_TYPES[extname(path)],
      );
    } catch (error) {
      console.error(error);
      return send(response, 500, error.message);
    }
  });
  return server;
}

async function listenOnce(server, port) {
  await new Promise((resolveListen, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolveListen();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
  return server.address().port;
}

async function listen(server, port, fallbackToAvailable = false) {
  try {
    return await listenOnce(server, port);
  } catch (error) {
    if (!fallbackToAvailable || error.code !== 'EADDRINUSE') throw error;
    return await listenOnce(server, 0);
  }
}

async function closeResources(server) {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
  rendererSelection = undefined;
  if (server.listening) {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

function openUrl(url) {
  let command = 'xdg-open';
  let args = [url];
  if (platform() === 'darwin') command = 'open';
  else if (platform() === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  }
  execFile(command, args, (error) => {
    if (error) {
      console.warn(`Could not open a browser automatically. Open ${url} manually.`);
    }
  });
}

async function serve(flags) {
  const server = createStudioServer();
  const requestedPort = Number(flags.port ?? 4312);
  const port = await listen(server, requestedPort, flags.port === undefined);
  const url = `http://127.0.0.1:${port}`;
  console.log(`Cool App Studio: ${url}`);
  if (requestedPort !== 0 && port !== requestedPort) {
    console.log(`Port ${requestedPort} was busy, so Cool App Studio selected ${port}.`);
  }
  console.log('Local-only renderer. Nothing is uploaded. Press Ctrl+C to stop.');
  if (flags.open && !flags.noOpen) openUrl(url);

  const stop = async () => {
    await closeResources(server);
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

function numericFlag(flags, config, key, fallback) {
  const value = flags[key] ?? config[key] ?? fallback;
  return Number(value);
}

async function loadConfig(path) {
  if (!path) return {};
  const parsed = JSON.parse(await readFile(resolve(path), 'utf8'));
  return parsed.config ?? parsed;
}

async function fileDataUrl(path, expectedType) {
  if (!path) return '';
  const resolvedPath = resolve(path);
  const extension = extname(resolvedPath).toLowerCase();
  const mime = MIME_TYPES[extension];
  if (!mime || (expectedType && !mime.startsWith(`${expectedType}/`))) {
    throw new Error(`Unsupported ${expectedType} type: ${extension}`);
  }
  return `data:${mime};base64,${(await readFile(resolvedPath)).toString('base64')}`;
}

function canvasDimensions(canvas, orientation) {
  if (!canvas) return { width: 1600, height: 1600, orientation };
  const resolvedOrientation = canvas.allowOrientation ? orientation : canvas.orientation;
  const shouldSwap = resolvedOrientation !== canvas.orientation;
  return {
    width: shouldSwap ? canvas.height : canvas.width,
    height: shouldSwap ? canvas.width : canvas.height,
    orientation: resolvedOrientation,
  };
}

async function render(flags) {
  if (!flags.input || !flags.output) {
    throw new Error('render requires --input SCREENSHOT and --output FILE.png');
  }
  const outputPath = resolve(flags.output);
  const fileConfig = await loadConfig(flags.config);
  const requestedCanvas = flags.canvas ?? fileConfig.canvasPreset ?? 'custom';
  const canvas = CANVAS_PRESETS[requestedCanvas];
  const requestedOrientation = flags.orientation
    ?? fileConfig.orientation
    ?? canvas?.orientation
    ?? 'portrait';
  const canvasSize = canvasDimensions(canvas, requestedOrientation);
  const canvasWasExplicit = flags.canvas !== undefined;
  const width = flags.width !== undefined
    ? Number(flags.width)
    : (canvasWasExplicit ? canvasSize.width : Number(fileConfig.width ?? canvasSize.width));
  const height = flags.height !== undefined
    ? Number(flags.height)
    : (canvasWasExplicit ? canvasSize.height : Number(fileConfig.height ?? canvasSize.height));
  const backgroundImageUrl = await fileDataUrl(flags.backgroundImage, 'image');
  const fontDataUrl = await fileDataUrl(flags.fontFile, 'font');
  const assets = {
    screenImageUrl: await fileDataUrl(flags.input, 'image'),
    backgroundImageUrl,
    fontDataUrl,
  };
  const config = {
    ...fileConfig,
    width,
    height,
    canvasPreset: requestedCanvas === 'custom'
      ? 'custom'
      : (canvas ? requestedCanvas : (fileConfig.canvasPreset ?? 'custom')),
    orientation: canvasSize.orientation,
    device: flags.device ?? fileConfig.device ?? 'iphone',
    shell: flags.shell ?? fileConfig.shell ?? 'graphite',
    background: flags.transparent
      ? 'transparent'
      : (flags.background ?? (backgroundImageUrl ? 'image' : fileConfig.background) ?? 'midnight'),
    backgroundColorA: flags.backgroundColorA ?? fileConfig.backgroundColorA ?? '#050b0f',
    backgroundColorB: flags.backgroundColorB ?? fileConfig.backgroundColorB ?? '#10202a',
    backgroundAngle: numericFlag(flags, fileConfig, 'backgroundAngle', 145),
    backgroundImageFit: flags.backgroundImageFit ?? fileConfig.backgroundImageFit ?? 'cover',
    backgroundImageX: numericFlag(flags, fileConfig, 'backgroundImageX', 50),
    backgroundImageY: numericFlag(flags, fileConfig, 'backgroundImageY', 50),
    backgroundImageZoom: numericFlag(flags, fileConfig, 'backgroundImageZoom', 1),
    backgroundImageBlur: numericFlag(flags, fileConfig, 'backgroundImageBlur', 0),
    backgroundOverlay: flags.backgroundOverlay ?? fileConfig.backgroundOverlay ?? '#000000',
    backgroundOverlayOpacity: numericFlag(flags, fileConfig, 'backgroundOverlayOpacity', 0.18),
    preset: flags.preset ?? fileConfig.preset ?? 'hero-right',
    accent: flags.accent ?? fileConfig.accent ?? '#6ee7f5',
    showDevice: flags.noDevice ? false : (fileConfig.showDevice ?? true),
    fontFamily: fontDataUrl ? 'custom' : (flags.fontFamily ?? fileConfig.fontFamily ?? 'system'),
    customFontName: flags.customFontName ?? fileConfig.customFontName ?? 'Cool App Studio Custom',
    textAlign: flags.textAlign ?? fileConfig.textAlign ?? 'left',
    autoTextColors: flags.manualTextColors ? false : (fileConfig.autoTextColors ?? true),
    headlineSize: numericFlag(flags, fileConfig, 'headlineSize', 102),
    headlineWeight: numericFlag(flags, fileConfig, 'headlineWeight', 820),
    headlineLineHeight: numericFlag(flags, fileConfig, 'headlineLineHeight', 0.98),
    headlineTracking: numericFlag(flags, fileConfig, 'headlineTracking', -0.052),
    headlineColor: flags.headlineColor ?? fileConfig.headlineColor ?? '#f7f5f0',
    subheadSize: numericFlag(flags, fileConfig, 'subheadSize', 38),
    subheadWeight: numericFlag(flags, fileConfig, 'subheadWeight', 520),
    subheadLineHeight: numericFlag(flags, fileConfig, 'subheadLineHeight', 1.2),
    subheadColor: flags.subheadColor ?? fileConfig.subheadColor ?? '#aebbc4',
    kickerSize: numericFlag(flags, fileConfig, 'kickerSize', 24),
    kickerColor: flags.kickerColor ?? fileConfig.kickerColor ?? '#6ee7f5',
    copyWidth: numericFlag(flags, fileConfig, 'copyWidth', 0.72),
    copyTop: numericFlag(flags, fileConfig, 'copyTop', 0.075),
    copyLeft: numericFlag(flags, fileConfig, 'copyLeft', 0.065),
    kicker: flags.kicker ?? fileConfig.kicker ?? 'PRODUCT STORY',
    headline: flags.headline ?? fileConfig.headline ?? 'Design, in perspective.',
    subhead:
      flags.subhead ?? fileConfig.subhead ?? 'Local, adjustable, export-ready.',
  };
  for (const key of ['rotateX', 'rotateY', 'rotateZ', 'x', 'y', 'scale']) {
    if (flags[key] !== undefined) config[key] = Number(flags[key]);
  }

  const server = createStudioServer();
  const port = await listen(server, 0);
  try {
    const png = await renderBuffer(`http://127.0.0.1:${port}`, config, assets);
    const renderer = await getRendererMetadata();
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, png);
    const sha256 = createHash('sha256').update(png).digest('hex');
    const metadataPath = `${outputPath}.json`;
    await writeFile(
      metadataPath,
      `${JSON.stringify({
        schemaVersion: 1,
        renderer,
        output: {
          format: 'png',
          width: clampDimension(config.width),
          height: clampDimension(config.height),
          sha256,
        },
      }, null, 2)}\n`,
    );
    console.log(`Rendered ${outputPath} (${config.width}×${config.height})`);
    console.log(`SHA-256 ${sha256}`);
    console.log(`Renderer ${renderer.selection} (${renderer.browserVersion})`);
    console.log(`Metadata ${metadataPath}`);
  } finally {
    await closeResources(server);
  }
}

const commandLine = process.argv.slice(2);
const hasExplicitCommand = Boolean(commandLine[0] && !commandLine[0].startsWith('--'));
const command = hasExplicitCommand ? commandLine[0] : 'serve';
const rest = hasExplicitCommand ? commandLine.slice(1) : commandLine;
const flags = parseFlags(rest);
if (!hasExplicitCommand && !flags.noOpen) flags.open = true;
const usage = `Usage:
  cool-app-studio [--port 4312] [--no-open]
  cool-app-studio serve [--port 4312] [--open]
  cool-app-studio render --input screenshot.png --output mockup.png [options]

Render options:
  --config preset.json
  --canvas apple-iphone-69|apple-ipad-13|google-phone|google-feature|custom
  --orientation portrait|landscape
  --device iphone|pixel
  --preset hero-right|hero-left|floating|low-angle|upright
  --shell graphite|silver|gold|cyan
  --background midnight|studio|cobalt|aurora|solid|gradient|image|transparent
  --backgroundImage path/to/image.png --backgroundImageFit cover|contain|fill
  --backgroundColorA '#050b0f' --backgroundColorB '#10202a' --backgroundAngle 145
  --backgroundImageX 50 --backgroundImageY 50 --backgroundImageZoom 1
  --backgroundImageBlur 0 --backgroundOverlay '#000000' --backgroundOverlayOpacity 0.18
  --width 1600 --height 1600 --accent '#6ee7f5'
  --kicker TEXT --headline TEXT --subhead TEXT
  --fontFamily system|geometric|rounded|serif|mono --fontFile path/to/font.woff2
  --textAlign left|center|right --manualTextColors
  --headlineSize 102 --headlineWeight 820 --headlineLineHeight 0.98
  --headlineTracking -0.052 --headlineColor '#f7f5f0'
  --subheadSize 38 --subheadWeight 520 --subheadLineHeight 1.2
  --subheadColor '#aebbc4' --kickerSize 24 --kickerColor '#6ee7f5'
  --copyWidth 0.72
  --copyTop 0.075 --copyLeft 0.065
  --rotateX 5 --rotateY -25 --rotateZ -7 --x 0.10 --y 0.08 --scale 0.92
  --noDevice | --transparent`;

try {
  if (command === 'help' || command === '--help' || flags.help) console.log(usage);
  else if (command === 'serve') await serve(flags);
  else if (command === 'render') await render(flags);
  else throw new Error(usage);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
