import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
runInNewContext(await readFile(resolve(root, 'src/studio/scene.js'), 'utf8'), context);

const scene = context.window.MockupScene;
assert.ok(scene, 'scene helpers should load');

const iphone = scene.applyCanvasPreset(scene.DEFAULT_CONFIG, 'apple-iphone-69', 'portrait');
assert.equal(iphone.width, 1320);
assert.equal(iphone.height, 2868);

const iphoneLandscape = scene.applyCanvasPreset(iphone, 'apple-iphone-69', 'landscape');
assert.equal(iphoneLandscape.width, 2868);
assert.equal(iphoneLandscape.height, 1320);

const feature = scene.applyCanvasPreset(scene.DEFAULT_CONFIG, 'google-feature', 'portrait');
assert.equal(feature.orientation, 'landscape');
assert.equal(feature.width, 1024);
assert.equal(feature.height, 500);

assert.deepEqual(
  { ...scene.matchCanvasPreset(1080, 1920) },
  { id: 'google-phone', orientation: 'portrait' },
);
assert.deepEqual(
  { ...scene.matchCanvasPreset(1920, 1080) },
  { id: 'google-phone', orientation: 'landscape' },
);

const legacyPreset = JSON.parse(
  await readFile(resolve(root, 'examples/editorial-preset.json'), 'utf8'),
);
const migrated = scene.normalizeConfig(legacyPreset.config);
assert.equal(migrated.headline, 'Design, in perspective.');
assert.equal(migrated.fontFamily, 'system');
assert.equal(migrated.backgroundImageFit, 'cover');
assert.equal(migrated.autoTextColors, true);

const fittedWide = scene.fitComposition({ ...migrated, width: 1024, height: 500 });
assert.ok(fittedWide.copyWidth < 0.5);
assert.ok(fittedWide.x > 0.2);

console.log('Mockup Studio config and preset migration checks passed.');
