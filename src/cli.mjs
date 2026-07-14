#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
let playwrightImportError;
try {
  playwright = require('playwright');
} catch (error) {
  playwrightImportError = error;
}

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolDirectory, '..');
const studioDirectory = resolve(toolDirectory, 'studio');
const examplesDirectory = resolve(projectRoot, 'examples');
const renderJobs = new Map();
let browserPromise;

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
  const booleanFlags = new Set(['help', 'manualTextColors', 'noDevice', 'open', 'transparent']);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) {
      result._.push(value);
      continue;
    }
    const key = value.slice(2);
    if (booleanFlags.has(key)) {
      result[key] = true;
      continue;
    }
    const next = values[index + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
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

function findBrowserExecutable() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return browserCandidates().find((candidate) => existsSync(candidate));
}

async function getBrowser() {
  if (!playwright) {
    throw new Error(
      `Playwright is not installed. Run npm install in ${projectRoot}. ` +
        `(Original error: ${playwrightImportError?.message ?? 'module unavailable'})`,
    );
  }
  const executablePath = findBrowserExecutable();
  browserPromise ??= playwright.chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });
  return browserPromise;
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
      timeout: 15_000,
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

function createStudioServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/health') {
        return send(
          response,
          200,
          JSON.stringify({ ok: true, localOnly: true }),
          'application/json',
        );
      }

      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
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

      const requestedFile = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const allowedFiles = new Set([
        'index.html',
        'render.html',
        'scene.css',
        'scene.js',
        'studio.css',
        'studio.js',
      ]);
      if (!allowedFiles.has(requestedFile)) return send(response, 404, 'Not found');
      const path = resolve(studioDirectory, requestedFile);
      return send(response, 200, await readFile(path), MIME_TYPES[extname(path)]);
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
  if (server.listening) {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

function openUrl(url) {
  if (platform() === 'darwin') execFile('open', [url]);
  else if (platform() === 'win32') execFile('cmd', ['/c', 'start', '', url]);
  else execFile('xdg-open', [url]);
}

async function serve(flags) {
  const server = createStudioServer();
  const requestedPort = Number(flags.port ?? 4312);
  const port = await listen(server, requestedPort, flags.port === undefined);
  const url = `http://127.0.0.1:${port}`;
  console.log(`Mockup Studio: ${url}`);
  if (port !== requestedPort) {
    console.log(`Port ${requestedPort} was busy, so Mockup Studio selected ${port}.`);
  }
  console.log('Local-only renderer. Nothing is uploaded. Press Ctrl+C to stop.');
  if (flags.open) openUrl(url);

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
    customFontName: flags.customFontName ?? fileConfig.customFontName ?? 'Mockup Studio Custom',
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
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, png);
    const sha256 = createHash('sha256').update(png).digest('hex');
    console.log(`Rendered ${outputPath} (${config.width}×${config.height})`);
    console.log(`SHA-256 ${sha256}`);
  } finally {
    await closeResources(server);
  }
}

const [command = 'serve', ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);
const usage = `Usage:
  mockup-studio serve [--port 4312] [--open]
  mockup-studio render --input screenshot.png --output mockup.png [options]

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
