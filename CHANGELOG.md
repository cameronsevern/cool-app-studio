# Changelog

Notable changes to Cool App Studio will be documented here. The project follows
Semantic Versioning after its first public release.

## [Unreleased]

### Added

- Canonical product and distribution roadmap.
- Open-source contribution, conduct, security, and privacy documentation.
- Cross-platform CI and dependency-update configuration.
- Loopback host/origin validation and browser security headers.
- Same-environment visual-repeat fixtures for representative scenes,
  transparent output, and spanning-set crops.
- A local `cool-app-studio doctor` diagnostic for runtime and renderer recovery.
- Optional crash-safe local recovery with explicit retention and clear controls
  for screenshot, background, and font bytes.
- Recovery-boundary checks for malformed snapshots, oversized projects, missing
  assets, unsupported fonts, and interrupted exports.
- A documented project/preset schema and release-gated compatibility checks for
  legacy config and project inputs.

### Changed

- Renamed the product, npm package, and CLI to Cool App Studio and
  `cool-app-studio`; existing `.screenshot-forge` and `.mockup-studio` project
  bundles and browser autosaves continue to migrate forward.
- Prepared the unpublished npm package as a `0.1.0` public alpha targeting
  supported Node.js LTS releases.
- Restricted npm package contents to runtime source and examples.
- Allow slower clean machines up to 60 seconds to finish browser renders before
  reporting a timeout.
- Made the argument-free `npx cool-app-studio` path open the local editor,
  with a headless `--no-open` option and actionable browser recovery guidance.
- Prefer the pinned Playwright-managed Chromium for renders and write renderer
  selection metadata beside each CLI PNG, including explicit system-browser
  fallback and override states.
- Stabilize pinned 3D crops by using software compositing, waiting for mounted
  local images, and priming the continuous render surface before panel clips.
- Keep asset-free metadata autosave as the default while storing opt-in recovery
  snapshots atomically in local IndexedDB.

### Product work in progress

- Multi-slide screenshot sets, portable project bundles, ordered ZIP export,
  undo/redo, and continuous devices across adjacent panels.

[Unreleased]: https://github.com/cameronsevern/mockup-studio/compare/main...HEAD
