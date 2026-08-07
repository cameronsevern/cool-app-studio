# Changelog

Notable changes to App Screenshot Forge will be documented here. The project follows
Semantic Versioning after its first public release.

## [Unreleased]

### Added

- Canonical product and distribution roadmap.
- Open-source contribution, conduct, security, and privacy documentation.
- Cross-platform CI and dependency-update configuration.
- Loopback host/origin validation and browser security headers.

### Changed

- Prepared the unpublished npm package as a `0.1.0` public alpha targeting
  supported Node.js LTS releases.
- Restricted npm package contents to runtime source and examples.
- Allow slower clean machines up to 60 seconds to finish browser renders before
  reporting a timeout.
- Made the argument-free `npx app-screenshot-forge` path open the local editor,
  with a headless `--no-open` option and actionable browser recovery guidance.

### Product work in progress

- Multi-slide screenshot sets, portable project bundles, ordered ZIP export,
  undo/redo, and continuous devices across adjacent panels.

[Unreleased]: https://github.com/cameronsevern/mockup-studio/compare/main...HEAD
