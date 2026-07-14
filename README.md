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
2. Select the device, camera, shell material, and background.
3. Adjust the copy, type scale, position, and output dimensions.
4. Use **Save preset** to retain the composition without embedding the source
   screenshot.
5. Choose **Export PNG** for the full-resolution result.

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

Run `node src/cli.mjs help` for the complete option list. Output dimensions can
range from 320 to 4096 pixels per side. `--transparent` creates a reusable
device-only layer, and `--noDevice` creates a text-led composition.

## Browser and privacy behavior

- The HTTP server listens only on `127.0.0.1`.
- Screenshot data is read into memory for preview and rendering; it is not
  written by the server or uploaded.
- Export jobs are removed from memory when the render finishes.
- `CHROME_PATH` can point to a specific Chromium-family browser.

## Verification

```sh
npm test
```

The smoke test performs a real browser render and validates the resulting PNG's
signature and dimensions.

## Repository layout

- `src/cli.mjs` — local server and deterministic render CLI
- `src/studio/` — interactive editor and scene renderer
- `examples/` — generic screenshots and a reusable preset
- `test/` — end-to-end render smoke test

This repository is currently private and does not declare an open-source
license.
