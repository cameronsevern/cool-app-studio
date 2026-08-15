# Project and preset schema

Cool App Studio keeps project and preset data local. This document describes the
JSON shapes that the editor and CLI currently accept, the fields that are safe
to rely on, and the forward migrations covered by the release test suite.

## Version policy

- Portable project bundles use project schema **4**.
- Preset files written by the editor use preset schema **2**.
- Preset schema **1**, raw configuration objects, and the legacy project storage
  keys listed below remain readable.
- Loading is forward-only in memory: the reader normalizes an older shape to the
  current model and fills safe defaults. It does not rewrite a file until the
  user saves it again.
- Unknown envelope metadata such as `savedAt` and `localOnly` is ignored by the
  model. The `schemaVersion` on both the project envelope and its `project`
  object is written as `4` by the current serializer.

The compatibility contract is exercised by
`npm run test:schema-compatibility`, which is part of `npm test`.

## Portable project bundles

The editor saves a JSON document with the `.cool-app-studio` extension:

```json
{
  "schemaVersion": 4,
  "savedAt": "2026-08-15T00:00:00.000Z",
  "localOnly": true,
  "project": {
    "schemaVersion": 4,
    "name": "Launch set",
    "shared": {},
    "slides": [],
    "selectedSlideId": "slide-id",
    "backgroundAssetId": null,
    "fontAssetId": null,
    "spanDevice": {},
    "assets": {}
  }
}
```

`savedAt` and `localOnly` are descriptive envelope metadata. The current model
is the `project` object, whose fields are:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Current normalized project version, `4`. |
| `name` | Human-readable screenshot-set name. |
| `shared` | Canvas, device shell, background, typography, and other values shared by every slide. |
| `slides` | Ordered slide records. Each has `id`, `name`, `config`, and an optional `screenshotAssetId`. |
| `selectedSlideId` | The slide selected when the project was saved; invalid IDs fall back to the first slide. |
| `backgroundAssetId` | Optional ID of the shared background image asset. |
| `fontAssetId` | Optional ID of the shared custom-font asset. |
| `spanDevice` | Optional continuous-device composition across adjacent slides. |
| `assets` | Referenced local assets keyed by ID. Unreferenced assets are omitted when serialized. |

### Shared and slide-level configuration

The editor separates values that should propagate across a set from values that
belong to one slide. `shared` may contain:

```text
width, height, canvasPreset, orientation, device, shell,
background, backgroundColorA, backgroundColorB, backgroundAngle,
backgroundImageFit, backgroundImageX, backgroundImageY,
backgroundImageZoom, backgroundImageBlur, backgroundOverlay,
backgroundOverlayOpacity, accent, fontFamily, customFontName, textAlign,
autoTextColors, headlineSize, headlineWeight, headlineLineHeight,
headlineTracking, headlineColor, subheadSize, subheadWeight,
subheadLineHeight, subheadColor, kickerSize, kickerWeight, kickerTracking,
kickerColor, kickerUppercase
```

Each slide's `config` contains the slide-level composition and copy values:

```text
preset, rotateX, rotateY, rotateZ, x, y, scale, showDevice,
copyWidth, copyTop, copyLeft, kicker, headline, subhead
```

The renderer applies built-in defaults to missing values. A canvas preset may be
inferred from matching dimensions, invalid font-family names fall back to the
system stack, and invalid span settings are clamped to safe limits. The
normalizer always returns the current schema version.

### Assets

An asset record has this shape:

```json
{
  "id": "image-abc123",
  "name": "captured-screen.png",
  "type": "image",
  "isSample": false,
  "dataUrl": "data:image/png;base64,..."
}
```

`type` is `image` or `font`. Metadata-only autosave omits `dataUrl`; a portable
project and an explicitly enabled local recovery copy include the data for
referenced assets so the project can be reopened. Project bundles can therefore
contain confidential screenshots, backgrounds, and fonts and should be shared as
sensitive local source material.

### Continuous-device settings

When enabled, `spanDevice` identifies an inclusive ordered range using
`startSlideId`, `endSlideId`, and `sourceSlideId`, plus numeric `x`, `y`, `scale`,
`rotateX`, `rotateY`, and `rotateZ` values. The editor keeps the range ordered,
limits it to five slides, requires at least two slides, and clamps numeric
values during normalization.

## Preset files

Presets are lightweight, asset-free JSON files. The current editor format is:

```json
{
  "schemaVersion": 2,
  "requirementsVerified": "2026-07-14",
  "config": {
    "device": "pixel",
    "preset": "hero-right",
    "headline": "Design, in perspective."
  },
  "assetHints": {
    "screenshot": null,
    "background": "studio.jpg",
    "font": "brand.woff2"
  }
}
```

`assetHints` contains filenames only; it never embeds screenshot, background, or
font bytes. The following inputs are intentionally accepted for migration and
CLI convenience:

- schema-2 envelopes with `config` and optional `assetHints`;
- schema-1 envelopes with `config`;
- a raw configuration object without an envelope.

The editor and CLI select the `config` member when it is present, then apply the
same scene defaults and validation used by the renderer. A preset never becomes
a project until it is applied to the current set.

## Migration inputs

The editor checks these local autosave keys in order:

| Input | Migration result |
| --- | --- |
| `cool-app-studio.project.v4` | Canonical project autosave; normalized to v4. |
| `app-screenshot-forge.project.v4` | Former product name; normalized to v4. |
| `mockup-studio.project.v4` | Former product name; normalized to v4. |
| `mockup-studio.project.v3` | Older project-shaped autosave; normalized to v4. |
| `mockup-studio.config.v2` | Legacy config autosave; wrapped as one v4 slide. |
| `mockup-studio.config.v1` | Earliest config autosave; wrapped as one v4 slide. |

Project-shaped inputs with a `slides` array are normalized as projects. Inputs
without `slides` use `input.config` when available, otherwise the input itself,
and become a one-slide project. Known copy, canvas, device, style, and referenced
asset fields are retained; missing values receive current defaults. On the next
normal project persistence, the editor writes the canonical Cool App Studio key
and removes the legacy keys.

## Compatibility and privacy boundaries

Migration is local parsing and normalization only. It does not upload files,
contact a hosted renderer, or enable an account. Saved projects deliberately
carry the local asset bytes they reference; presets and metadata-only autosaves
do not. Malformed, oversized, or missing-asset inputs must remain recoverable,
as covered by the recovery test suite.
