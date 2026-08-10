import assert from 'node:assert/strict';
import { selectRenderer } from '../src/renderer.mjs';

const available = new Set(['/managed/chrome', '/system/chrome']);
const isAvailable = (path) => available.has(path);

assert.deepEqual(
  selectRenderer({
    managedPath: '/managed/chrome',
    overridePath: undefined,
    systemPaths: ['/system/chrome'],
    isAvailable,
  }),
  {
    mode: 'pinned',
    executablePath: '/managed/chrome',
    fallback: false,
    reason: null,
  },
  'the managed renderer should be preferred when installed',
);

assert.deepEqual(
  selectRenderer({
    managedPath: '/managed/chrome',
    overridePath: '/system/chrome',
    systemPaths: [],
    isAvailable,
  }),
  {
    mode: 'system-override',
    executablePath: '/system/chrome',
    fallback: false,
    reason: 'CHROME_PATH explicitly selected this browser',
  },
  'an explicit CHROME_PATH should be visible as an override',
);

assert.deepEqual(
  selectRenderer({
    managedPath: '/managed/missing',
    overridePath: undefined,
    systemPaths: ['/system/chrome'],
    isAvailable,
  }),
  {
    mode: 'system-fallback',
    executablePath: '/system/chrome',
    fallback: true,
    reason: 'Playwright-managed Chromium is not installed',
  },
  'a system browser should be used only as an explicit fallback',
);

assert.deepEqual(
  selectRenderer({
    managedPath: '/managed/missing',
    overridePath: undefined,
    systemPaths: ['/system/missing'],
    isAvailable,
  }),
  {
    mode: 'unavailable',
    executablePath: '/managed/missing',
    fallback: false,
    reason: 'Playwright-managed Chromium is not installed and no supported system browser was found',
  },
  'missing browsers should produce an actionable unavailable state',
);

console.log('Cool App Studio renderer selection checks passed.');
