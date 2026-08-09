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
| Launch mode | Headless Chromium with `--hide-scrollbars` and `--force-color-profile=srgb` |
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

The pinned Playwright-managed browser is the only browser covered by the
reproducibility promise. The current runtime still accepts `CHROME_PATH` and
checks known Chrome, Brave, Edge, and Chromium locations for compatibility.
Those system-browser paths are functional fallbacks, but their output is not
covered by the byte-equality promise until browser selection and output
metadata make that fallback explicit in a later R2 slice.

To run a local reproducibility check against the reference executable, point
`CHROME_PATH` at the path printed by:

```sh
node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath())"
```

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
regardless of whether it looks similar. Repeat-render fixtures and a measured
cross-OS variance threshold are the next R2 work item.

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
