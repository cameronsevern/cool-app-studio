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

const legacyConfig = {
  width: 1080,
  height: 1920,
  device: 'pixel',
  shell: 'cyan',
  background: 'solid',
  backgroundColorA: '#112233',
  preset: 'floating',
  showDevice: false,
  headline: 'Legacy headline',
  subhead: 'Still available locally.',
};

const presetV1 = {
  schemaVersion: 1,
  config: legacyConfig,
};
const presetV2 = {
  schemaVersion: 2,
  requirementsVerified: '2026-07-14',
  config: legacyConfig,
  assetHints: {
    screenshot: 'captured-screen.png',
    background: 'studio.jpg',
    font: null,
  },
};

function normalizePreset(input) {
  return scene.normalizeConfig(input?.config ?? input);
}

for (const [label, input] of [
  ['raw config', legacyConfig],
  ['preset v1', presetV1],
  ['preset v2', presetV2],
]) {
  const normalized = normalizePreset(input);
  assert.equal(normalized.device, 'pixel', `${label} device`);
  assert.equal(normalized.shell, 'cyan', `${label} shell`);
  assert.equal(normalized.headline, 'Legacy headline', `${label} headline`);
  assert.equal(normalized.backgroundImageFit, 'cover', `${label} defaults`);
  assert.equal(normalized.fontFamily, 'system', `${label} font fallback`);
}

const legacyProject = {
  schemaVersion: 3,
  savedAt: '2026-08-14T01:13:25.000Z',
  localOnly: true,
  project: {
    schemaVersion: 3,
    name: 'Migrated campaign',
    shared: {
      width: 1080,
      height: 1920,
      device: 'pixel',
      background: 'solid',
      backgroundColorA: '#112233',
    },
    slides: [
      {
        id: 'legacy-slide',
        name: 'Legacy panel',
        config: {
          preset: 'floating',
          showDevice: false,
          headline: 'Migrated headline',
        },
        screenshotAssetId: 'screen-1',
      },
      {
        id: 'legacy-slide-2',
        name: 'Second panel',
        config: { headline: 'Second headline' },
        screenshotAssetId: 'screen-2',
      },
    ],
    selectedSlideId: 'legacy-slide-2',
    backgroundAssetId: 'background-1',
    fontAssetId: null,
    spanDevice: {
      enabled: true,
      startSlideId: 'legacy-slide-2',
      endSlideId: 'legacy-slide',
      sourceSlideId: 'legacy-slide-2',
      x: 0.55,
      y: 0.1,
      scale: 1.2,
      rotateY: -18,
    },
    assets: {
      'screen-1': {
        id: 'screen-1',
        name: 'captured-screen.png',
        type: 'image',
        isSample: false,
        dataUrl: 'data:image/png;base64,c2NyZWVu',
      },
      'screen-2': {
        id: 'screen-2',
        name: 'second-screen.png',
        type: 'image',
        isSample: false,
        dataUrl: 'data:image/png;base64,c2Vjb25k',
      },
      'background-1': {
        id: 'background-1',
        name: 'studio.jpg',
        type: 'image',
        isSample: false,
        dataUrl: 'data:image/jpeg;base64,YmFja2dyb3VuZA==',
      },
    },
  },
};

const migratedProject = projects.normalizeProject(legacyProject, scene.DEFAULT_CONFIG);
assert.equal(migratedProject.schemaVersion, projects.SCHEMA_VERSION);
assert.equal(migratedProject.name, 'Migrated campaign');
assert.equal(migratedProject.slides.length, 2);
assert.equal(migratedProject.selectedSlideId, 'legacy-slide-2');
assert.equal(migratedProject.shared.device, 'pixel');
assert.equal(migratedProject.slides[0].config.headline, 'Migrated headline');
assert.equal(migratedProject.slides[0].config.showDevice, false);
assert.equal(migratedProject.slides[1].config.headline, 'Second headline');
assert.equal(migratedProject.assets['screen-1'].dataUrl, 'data:image/png;base64,c2NyZWVu');

const resolvedSpan = projects.resolveSpanDevice(migratedProject);
assert.equal(resolvedSpan.startIndex, 0, 'span start should be ordered during migration');
assert.equal(resolvedSpan.endIndex, 1, 'span end should be ordered during migration');
assert.equal(resolvedSpan.sourceIndex, 1, 'span source should follow its slide ID');
assert.equal(resolvedSpan.scale, 1.2);

const roundTrip = projects.serialize(migratedProject, true);
assert.equal(roundTrip.schemaVersion, projects.SCHEMA_VERSION);
assert.equal(roundTrip.project.schemaVersion, projects.SCHEMA_VERSION);
assert.equal(roundTrip.project.name, 'Migrated campaign');
assert.equal(roundTrip.project.assets['background-1'].dataUrl, 'data:image/jpeg;base64,YmFja2dyb3VuZA==');

const legacyConfigProject = projects.normalizeProject(
  { schemaVersion: 2, config: legacyConfig },
  scene.DEFAULT_CONFIG,
);
assert.equal(legacyConfigProject.schemaVersion, projects.SCHEMA_VERSION);
assert.equal(legacyConfigProject.slides.length, 1);
assert.equal(legacyConfigProject.slides[0].config.headline, 'Legacy headline');
assert.equal(projects.composeConfig(legacyConfigProject).device, 'pixel');

const rawConfigProject = projects.normalizeProject(legacyConfig, scene.DEFAULT_CONFIG);
assert.equal(rawConfigProject.schemaVersion, projects.SCHEMA_VERSION);
assert.equal(rawConfigProject.slides.length, 1);
assert.equal(projects.composeConfig(rawConfigProject).headline, 'Legacy headline');

console.log('Cool App Studio project and preset schema compatibility checks passed.');
