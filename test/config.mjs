import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
runInNewContext(await readFile(resolve(root, 'src/studio/scene.js'), 'utf8'), context);
runInNewContext(await readFile(resolve(root, 'src/studio/project.js'), 'utf8'), context);

const scene = context.window.MockupScene;
const projects = context.window.MockupProject;
assert.ok(scene, 'scene helpers should load');
assert.ok(projects, 'project helpers should load');

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

const project = projects.createFromConfig(
  { ...scene.DEFAULT_CONFIG, headline: 'First slide' },
  { name: 'Launch set' },
);
assert.equal(project.schemaVersion, 4);
assert.equal(project.slides.length, 1);
assert.equal(project.shared.width, scene.DEFAULT_CONFIG.width);
assert.equal(project.slides[0].config.headline, 'First slide');
assert.equal(project.spanDevice.enabled, false);

const screenshotAssetId = projects.createAsset(project, {
  name: 'screenshot.png',
  dataUrl: 'data:image/png;base64,c2NyZWVuc2hvdA==',
});
const backgroundAssetId = projects.createAsset(project, {
  name: 'background.png',
  dataUrl: 'data:image/png;base64,YmFja2dyb3VuZA==',
});
projects.createAsset(project, {
  name: 'unused.png',
  dataUrl: 'data:image/png;base64,dW51c2Vk',
});
project.slides[0].screenshotAssetId = screenshotAssetId;
project.backgroundAssetId = backgroundAssetId;

const localMetadata = projects.serialize(project, false).project;
assert.equal(Object.keys(localMetadata.assets).length, 2, 'orphaned assets should not be saved');
assert.equal(localMetadata.assets[screenshotAssetId].dataUrl, undefined);

const portableBundle = projects.serialize(project, true).project;
assert.equal(portableBundle.assets[screenshotAssetId].dataUrl, 'data:image/png;base64,c2NyZWVuc2hvdA==');

project.slides.push({
  id: 'slide-two',
  name: 'Second slide',
  config: { ...project.slides[0].config, headline: 'Second slide' },
  screenshotAssetId,
});
project.spanDevice = projects.normalizeSpanDevice(
  {
    enabled: true,
    startSlideId: project.slides[0].id,
    endSlideId: project.slides[1].id,
    sourceSlideId: project.slides[0].id,
    x: 0.55,
    y: 0.1,
    scale: 1.2,
    rotateY: -18,
  },
  project.slides,
  scene.DEFAULT_CONFIG,
);
const resolvedSpan = projects.resolveSpanDevice(project);
assert.equal(resolvedSpan.startIndex, 0);
assert.equal(resolvedSpan.endIndex, 1);
assert.equal(resolvedSpan.sourceIndex, 0);
assert.equal(resolvedSpan.scale, 1.2);
projects.syncConfig(project, { ...projects.composeConfig(project), width: 1024, headline: 'Updated first' });
assert.equal(project.shared.width, 1024);
assert.equal(project.slides[0].config.headline, 'Updated first');
assert.equal(projects.composeConfig(project, project.slides[1]).width, 1024);
assert.equal(projects.composeConfig(project, project.slides[1]).headline, 'Second slide');

const historyState = projects.historyState(project);
project.name = 'Changed name';
const restored = projects.restoreHistory(project, historyState);
assert.equal(restored.name, 'Launch set');
assert.equal(restored.assets[screenshotAssetId].dataUrl, 'data:image/png;base64,c2NyZWVuc2hvdA==');
assert.equal(restored.spanDevice.enabled, true);
assert.equal(restored.spanDevice.rotateY, -18);

const legacyProject = projects.normalizeProject({ config: legacyPreset.config }, scene.DEFAULT_CONFIG);
assert.equal(legacyProject.schemaVersion, 4);
assert.equal(legacyProject.slides.length, 1);
assert.equal(projects.composeConfig(legacyProject).headline, 'Design, in perspective.');
assert.equal(projects.safeFilename('  App Store: Launch!  '), 'app-store-launch');

console.log('Cool App Studio config, project, asset, and migration checks passed.');
