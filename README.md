# Mockup Studio

Mockup Studio is a local, parametric device renderer for polished product and
store imagery. Drop in a screenshot, position an iPhone or Pixel-style device,
set the copy and art direction, then export a deterministic PNG without sending
the screenshot to a third-party service.

![Mockup Studio editor](docs/editor.png)

<details>
<summary>Example exported composition</summary>

![Example device composition](docs/example-output.png)

</details>

## Quick start

Requirements: Node.js 20 or newer and Chrome, Edge, Brave, or Chromium.

```sh
npm install
npm start
```

The editor opens at `http://127.0.0.1:4312`. It is bound to the local machine
only. If no supported system browser is found, install Playwright's Chromium:

```sh
npx playwright install chromium
```

## Interactive workflow

1. Choose a PNG, JPEG, WebP, or SVG screenshot.
2. Select an App Store, Google Play, or custom canvas.
3. Select the device, camera, shell material, and background.
4. Adjust the copy, font, colors, alignment, type scale, and position.
5. Use **Save preset** to retain the composition without embedding local image
   or font data.
6. Choose **Export PNG** for the full-resolution result.

The canvas menu includes current mobile store targets:

- App Store iPhone 6.9-inch: 1320 × 2868
- App Store iPad 13-inch: 2064 × 2752
- Google Play phone: 1080 × 1920
- Google Play feature graphic: 1024 × 500

Portrait-capable targets can be switched to landscape. **Fit composition to
canvas** provides a useful starting layout after a major aspect-ratio change,
without changing the copy or palette. Store requirements were last verified on
2026-07-14 against the official
[Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
and [Google Play](https://support.google.com/googleplay/android-developer/answer/9866151)
documentation.

## Local backgrounds and fonts

Backgrounds can use a built-in treatment, solid color, gradient, transparent
canvas, or local image. Local images support cover/contain fitting, focal
position, zoom, blur, and a readability overlay. Typography includes offline
font stacks plus local WOFF2, WOFF, TTF, and OTF files.

Selected background and font files stay in memory and are sent only to the
renderer bound to `127.0.0.1`. Presets retain styling and filename hints, not
the asset bytes; the editor asks you to reselect those local files when needed.

The editor remembers the last composition in local browser storage. Preset JSON
files can be loaded into a later session or used by the CLI.

## Deterministic CLI renders

```sh
node src/cli.mjs render \
  --input examples/sample-pixel.svg \
  --output output/editorial.png \
  --config examples/editorial-preset.json
```

Flags override values from the preset:

```sh
node src/cli.mjs render \
  --input path/to/screenshot.png \
  --output output/hero.png \
  --device pixel \
  --preset floating \
  --shell gold \
  --background aurora \
  --width 1200 \
  --height 2400 \
  --kicker "ROOM-AWARE AUDIO" \
  --headline "Quiet, shaped live." \
  --subhead "Continuous masking on your device."
```

Store targets and local assets are also available from the CLI:

```sh
node src/cli.mjs render \
  --input path/to/screenshot.png \
  --output output/play-feature.png \
  --canvas google-feature \
  --backgroundImage path/to/background.jpg \
  --fontFile path/to/brand-font.woff2 \
  --headline "A clearer daily rhythm."
```

Run `node src/cli.mjs help` for the complete option list. Output dimensions can
range from 320 to 4096 pixels per side. `--transparent` creates a reusable
device-only layer, and `--noDevice` creates a text-led composition.

## Browser and privacy behavior

- The HTTP server listens only on `127.0.0.1`.
- Screenshot, background, and font data is read into memory for preview and
  rendering; it is not written by the server or uploaded.
- Export jobs are removed from memory when the render finishes.
- `CHROME_PATH` can point to a specific Chromium-family browser.

## Verification

```sh
npm test
```

The verification suite checks preset migration and performs real browser
renders at every store target, validating each PNG's signature and dimensions.

## Repository layout

- `src/cli.mjs` — local server and deterministic render CLI
- `src/studio/` — interactive editor and scene renderer
- `examples/` — generic screenshots and a reusable preset
- `test/` — end-to-end render smoke test

This repository is currently private and does not declare an open-source
license.
