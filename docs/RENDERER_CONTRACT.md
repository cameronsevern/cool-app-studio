# Supported Renderer Contract

This document defines when Cool App Studio may call a render reproducible. It
applies to the local editor and CLI because both use the same
`MockupScene` renderer and the same local Playwright server. It is a support
contract, not a promise that arbitrary system browsers or system fonts produce
the same pixels.

## Reference renderer

The reproducibility baseline is the following checked-in environment:

| Concern | Supported baseline |
| --- | --- |
| Node.js | Node 22 or Node 24 |
| Dependency install | `npm ci` from the committed `package-lock.json` |
| Playwright | npm package `1.61.1` |
| Browser | Playwright-managed Chrome for Testing, Chromium revision `1228`, browser version `149.0.7827.55` |
| Browser install | `npx playwright install chromium` after `npm ci` |
| Launch mode | Headless Chromium with `--hide-scrollbars`, `--force-color-profile=srgb`, and `--disable-gpu` |
| Capture | The requested canvas width and height, `deviceScaleFactor: 1`, PNG output |

The exact browser version is derived from Playwright's checked-in browser
manifest and is protected by `npm run test:renderer-contract`. Keep the
Playwright dependency exact rather than widening it with a semver range; a
browser revision change is a renderer change that needs new evidence.

The CI support matrix currently exercises `macos-latest`, `ubuntu-latest`, and
`windows-latest` with Node 22 and Node 24. A graphical browser is required for
the editor; the CLI can render headlessly. The CI labels are an operating
system compatibility matrix, not a claim that each moving hosted image is a
pixel-identical reference machine.

## Browser selection boundary

The runtime prefers the pinned Playwright-managed browser whenever it is
installed. If it is unavailable, the runtime checks known Chrome, Brave, Edge,
and Chromium locations and records `system-fallback` in CLI output metadata.
Setting `CHROME_PATH` intentionally selects a compatibility browser and records
`system-override`; pointing it at the managed executable remains `pinned`.
System-browser output is not covered by the byte-equality promise.

To run a local reproducibility check against the reference executable, point
`CHROME_PATH` at the path printed by:

```sh
node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath())"
```

Each CLI PNG also receives a sibling `<output>.json` sidecar containing the
renderer selection (`pinned`, `system-fallback`, or `system-override`), whether
the output is covered by the reproducibility promise, the Playwright and browser
versions, output dimensions, and the PNG SHA-256. The sidecar contains metadata
only; screenshots and other assets remain local.

## Fonts and input assets

For equality-grade output, use the same local font bytes on every machine and
select **Local font file**. WOFF2, WOFF, TTF, and OTF files are loaded through
the browser's `FontFace` API and remain local. Keep the font file with a
portable project when the project must reopen with identical typography.

The built-in choices are CSS stacks, not bundled fonts:

- `system`: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, SF Pro Display
- `geometric`: Avenir Next, Avenir, Futura, Century Gothic, ui-sans-serif
- `rounded`: Arial Rounded MT Bold, Nunito, ui-rounded, system-ui
- `serif`: Iowan Old Style, Baskerville, Georgia, ui-serif
- `mono`: SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, ui-monospace

These stacks are supported for convenient local previews, but the selected
font can differ by operating system. Built-in stacks therefore do not qualify
for cross-OS pixel equality. SVG screenshots should be rasterized or carry
self-contained font/resources; external SVG resources and machine-installed
fonts are outside this contract.

## Color and output invariants

CSS colors are interpreted in sRGB, and the renderer launches Chromium with
`--force-color-profile=srgb`. Use sRGB source images for predictable results.
Cool App Studio does not promise to preserve or normalize an embedded ICC
profile in an imported image, and the viewer's display profile is outside the
PNG byte contract.

For the same project/configuration, input bytes, local font bytes, operating
system, pinned browser, and renderer revision:

- PNG signature, dimensions, and transparency behavior must be correct.
- Identical renders are expected to be byte-identical, including the SHA-256.
- A transparent canvas may differ from an opaque canvas only by the requested
  alpha behavior; no background is substituted during capture.

Cross-OS renders with the pinned browser and the same explicit local font have
the following deliberately limited initial guarantee: valid PNG output with
the requested dimensions and transparency mode. Pixel values may vary without
a numeric threshold across operating systems; the exact permitted invariants
are the PNG signature, dimensions, and requested transparency mode. Any
system-font or system-browser render is outside the reproducibility contract,
regardless of whether it looks similar. The repeat-render fixtures below are
same-environment guards; a measured cross-OS variance threshold remains future
work.

## Repeat-render fixtures

The checked-in `test/fixtures/visual-regression.json` matrix covers iPhone and
Pixel presentations, several built-in font stacks, gradient/studio/image and
transparent backgrounds, and a three-panel spanning device. The
`test:visual-regression` check renders every scene twice through the local API
and requires byte-identical PNGs under the same pinned browser process. It also
checks fixed background/device anchor pixels, dimensions, non-empty content,
and the requested alpha behavior; the spanning fixture checks both the ordered
ZIP and each cropped panel.

These anchors are same-environment regression guards, not a cross-OS pixel
promise. Built-in font stacks remain subject to the font and operating-system
limits above. If the pinned renderer changes, run the fixture with
`RECORD_VISUAL_FIXTURES=1` to inspect the new anchor values and review the
contract before updating the checked-in expectations.

## Verification

From a clean checkout, install the locked dependencies and browser, then run:

```sh
npm ci
npx playwright install chromium
npm test
```

`npm run test:renderer-contract` checks the documented Playwright/browser
versions against the lockfile and browser manifest, and checks the runtime's
color, viewport, device-scale, and CI settings. It does not upload screenshots
or contact a hosted renderer.
