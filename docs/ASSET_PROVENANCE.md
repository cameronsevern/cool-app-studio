# Asset Provenance

Last verified: 2026-08-07

App Screenshot Forge distributes only synthetic examples and documentation media.
It does not bundle third-party screenshots, logos, icon packs, or font files.
Project-authored assets are offered under the repository's Apache-2.0 license.

## Current assets

### `examples/sample-iphone.svg`

- SHA-256: `5a1251041b66025fd8a200478708cfcd4f997c013a7e0e6e59d111b94a902215`
- Origin evidence: introduced by Cameron Severn in the initial commit
  `354cf8d`; the file is an inline synthetic “Luma” dashboard built entirely
  from SVG primitives and text.
- External inputs: none. It has no embedded image, script, remote URL, logo, or
  font file. `Arial, sans-serif` names a user-local system font stack.
- Use: built-in iPhone-shaped sample screenshot for the editor and tests.
- Status: repository evidence is complete; maintainer authorship and
  redistribution confirmation remains required before visibility changes.

### `examples/sample-pixel.svg`

- SHA-256: `cfbbfaa4fc8a4a198e5266f0ef9776ce726f25f136f1d69f97a8c27021a45568`
- Origin evidence: introduced by Cameron Severn in the initial commit
  `354cf8d`; it is a second inline version of the same synthetic “Luma”
  dashboard, built entirely from SVG primitives and text.
- External inputs: none. It has no embedded image, script, remote URL, logo, or
  font file. `Arial, sans-serif` names a user-local system font stack.
- Use: built-in Pixel-shaped sample screenshot for the editor, CLI, and tests.
- Status: repository evidence is complete; maintainer authorship and
  redistribution confirmation remains required before visibility changes.

### `docs/editor.png`

- SHA-256: `c9916cf21cd490cc9d366b9bfacb8a00684b3495470ae5f35a08c1b55f8d39f7`
- Origin: captured on 2026-08-07 from the local editor at 1600×1000 using only
  the built-in synthetic iPhone sample.
- Content: current App Screenshot Forge branding, three-slide set, iPhone
  6.9-inch target, exact all-panels crop view, and local-only status.
- External inputs: none; the editor was served from `127.0.0.1` and no external
  integration was enabled.
- Status: verified project-generated documentation media.

### `docs/example-output.png`

- SHA-256: `9e9b29bdc5e295cef1037186db7e6129c06c0e0142d3e985da23a2ea81d27f37`
- Origin: rendered on 2026-08-07 by the checked-in CLI from
  `examples/sample-pixel.svg` and `examples/editorial-preset.json`.
- Reproduction:

  ```sh
  node src/cli.mjs render \
    --input examples/sample-pixel.svg \
    --output docs/example-output.png \
    --config examples/editorial-preset.json \
    --width 1000 \
    --height 1000 \
    --headline "Reusable product scenes." \
    --subhead "Local, adjustable, export-ready."
  ```

- External inputs: none.
- Status: verified project-generated documentation media.

### `docs/workflow.webm`

- SHA-256: `9cd7bceb5bc18538269e2b2695af1cb29ab8cc23abf6e5559e226efbe8ff71e0`
- Origin: recorded on 2026-08-07 from the local editor using only built-in
  synthetic samples.
- Content: a 14.6-second, 1600×1000 VP8 recording that selects the iPhone
  6.9-inch target, creates a three-slide set, opens the exact all-panels view,
  and completes a local set export.
- External inputs: none; recording and rendering remained on `127.0.0.1`.
- Status: verified project-generated documentation media.

## Historical assets

The initial commit contains older versions of the two documentation PNGs. They
remain visible in Git history even though the current files replace them.

- Historical `docs/editor.png` SHA-256:
  `e7f0b76b4e71677c4c85fdfba9ef2ba40dd591977ced85d516e6a5fdc0e4a544`.
  It shows the original Mockup Studio editor using the synthetic iPhone sample.
- Historical `docs/example-output.png` SHA-256:
  `ed2a5977b065721cee0e07942a15cc0350ac8401c6735e63dcdbb2311827473b`.
  It is a renderer output using the same synthetic dashboard.

Both were introduced by Cameron Severn in `354cf8d`. Maintainer confirmation
that these historical renders may be redistributed is required before the
existing history becomes public.

## Non-file design references

- The iPhone-style and Pixel-style presentations are parametric HTML/CSS shapes,
  not copied device images. They contain no Apple, Google, or manufacturer logo.
- Font choices name system stacks or accept a user-selected local font. No font
  binary is stored or distributed by the repository.
- The square `M` brand mark is HTML text styled by the project, not an imported
  icon or logo asset.
