# Cool App Studio Roadmap

Last updated: 2026-08-14

This file is the ordered product and release queue for maintainers and the
nightly product loop. It describes the intended outcome, the boundaries that
must remain true, and the evidence required before work is called complete.

## Product contract

Cool App Studio is a local-first tool for turning app screenshots into polished,
store-ready image sets. It serves two connected users:

- A designer or developer who wants to open an editor and export a complete
  screenshot set without creating an account or uploading private captures.
- A developer or release pipeline that wants repeatable renders from a saved
  preset or project.

The core promises are:

1. Screenshots, presets, projects, fonts, and backgrounds remain on the user's
   machine unless the user deliberately enables an external integration.
2. The editor and CLI use the same rendering model and produce truthful output.
3. Project files remain portable and migrate forward without silent data loss.
4. Store targets are based on current first-party requirements and identify when
   they were last verified.
5. The shortest path from install to a useful export stays obvious and fast.

## How to use this roadmap

- Work phases in order, but skip an item that is blocked by a named human,
  legal, credential, signing, store, payment, or external-service gate.
- Complete exactly one smallest coherent product slice at a time.
- Mark a checkbox complete only after the implementation and relevant tests or
  observed evidence exist in the checkout.
- Keep source completion, a local commit, a pushed commit, hosted CI, a package
  publication, a signed binary, a store listing, and public acceptance as
  separate statuses.
- Preserve unrelated work. Never discard or overwrite an existing dirty change
  merely to advance the queue.
- Human-gated decisions remain unchecked even when preparatory work is complete.

## Current baseline

Implemented in the current checkout, though not yet published as an open-source
release:

- [x] Loopback-only editor and renderer with no required account or cloud service.
- [x] App Store iPhone 6.9-inch and iPad 13-inch targets, plus Google Play,
  landscape, and custom canvas targets.
- [x] iPhone-style and Pixel-style parametric device presentations.
- [x] Local screenshots, background images, custom fonts, and asset-free presets.
- [x] Portable `.cool-app-studio` projects with schema normalization and migration,
  plus imports from the former `.screenshot-forge` and `.mockup-studio` formats.
- [x] Multi-slide sets with shared styling and slide-level composition controls.
- [x] Continuous devices across adjacent panels with exact export crops.
- [x] Individual PNG and deterministic ordered ZIP export.
- [x] Headless CLI rendering from local files and presets.
- [x] Model, migration, archive, spanning-crop, and real-browser smoke checks.

## R0 — Open-source readiness

Goal: make the source safe, understandable, and reproducible before the
repository becomes public.

- [x] Reconcile the current multi-slide/project work into a reviewed, coherent
  commit without absorbing unrelated changes.
- [x] Select **Cool App Studio** as the public working name. Cameron approved the
  name interactively on 2026-08-07, using `Cool` as a reusable prefix for tools
  from Cool S Technologies. Exact web, GitHub-repository, and npm-package checks
  found no existing `Cool App Studio` product. The former **App Screenshot
  Forge** working name was retired after a similar-name search found Apple's
  [Forge — Quick Marketing Images](https://apps.apple.com/us/app/forge-quick-marketing-images/id1597630288)
  in the same category and the adjacent
  [SnapForge](https://chromewebstore.google.com/detail/snapforge-screenshot-edit/jddlbdehkgmdcgmmjinaplmfdaogelin)
  editor. Exact availability does not establish trademark clearance; the
  human/legal gate below remains open.
- [ ] Complete formal trademark review, register the chosen domain/package, and
  rename the GitHub repository. **Human/legal/account/external gate.**
- [x] Adopt Apache-2.0 for the source and declare it in the npm package.
- [x] Reset the unpublished package to `0.1.0`, declare supported Node versions,
  add repository metadata, and restrict the published file set.
- [x] Add contribution, security, conduct, changelog, privacy, and support
  expectations.
- [x] Add macOS, Windows, and Linux CI for supported Node LTS lines.
- [x] Add dependency update configuration for npm and GitHub Actions.
- [x] Add strict loopback host/origin checks, JSON content-type enforcement, and
  browser security headers.
- [x] Add a per-process capability token to sensitive local render endpoints and
  verify that ordinary browser use, CLI rendering, and tests still work.
- [x] Perform a full history and secret scan before visibility changes. The
  2026-08-07 [publication audit](docs/PUBLICATION_AUDIT.md) scanned all refs,
  reflogs, the working tree, and 18 unreachable blobs with zero secret findings.
- [ ] Confirm that the existing non-noreply commit author email may be public, or
  explicitly approve a private-history rewrite and force-push to replace it.
  **Human/privacy/history-rewrite gate.**
- [ ] Verify the origin and redistribution rights of every sample, screenshot,
  icon, font, device reference, and documentation image. The complete
  [asset inventory](docs/ASSET_PROVENANCE.md) is ready for maintainer
  confirmation. **Human/legal gate.**
- [x] Refresh the editor screenshot and add a short current workflow recording.
- [x] Prove a clean install and full export on fresh macOS, Windows, and Linux
  environments. GitHub Actions run
  [31211972270](https://github.com/cameronsevern/mockup-studio/actions/runs/31211972270)
  passed all six macOS/Ubuntu/Windows and Node 22/24 jobs at `148b3cc`; a packed
  `0.1.0` tarball also installed and rendered successfully in a blank local
  consumer project.

Exit criteria:

- The working tree has no unexplained changes.
- Every distributed asset has recorded provenance.
- Supported-platform CI is green from the exact revision proposed for release.
- The npm tarball contains only runtime files, examples, README, and license.
- No known publication blocker remains hidden in repository history or settings.

## R1 — Public alpha (`0.1.x`)

Goal: let developers discover, install, understand, and safely evaluate the
project without calling it production-ready.

- [ ] Change the GitHub repository to public only after R0's audit and asset gates
  are complete. **Human/external gate.**
- [ ] Configure main-branch protection, private vulnerability reporting,
  Dependabot alerts, and least-privilege Actions settings.
- [ ] Reserve and publish the chosen npm package from the public repository.
  **Human/account gate.**
- [ ] Configure npm trusted publishing with OIDC and provenance; do not retain a
  long-lived publication token.
- [ ] Tag `v0.1.0` and publish matching GitHub release notes without binaries.
- [x] Make the default `npx` invocation launch the editor and document uninstall
  and browser-install recovery. The implicit-server path is covered by the
  local-server test, supports `--no-open` for headless use, and was verified
  from a packed `0.1.0` tarball before publication.
- [x] Replace stale documentation imagery with the multi-slide workflow and a
  one-minute first-export guide.
- [x] Add focused issue forms for bugs, feature requests, store-target drift, and
  privacy/security questions.
- [ ] Recruit at least five iOS or Android developers for observed first-use
  sessions and record friction without adding telemetry.
- [ ] Establish a weekly issue-triage and dependency-update cadence.

Exit criteria:

- A new user can go from the documented install command to a valid screenshot
  set in under three minutes.
- The public source tag, npm package, README, and test evidence identify the same
  revision and version.
- No user has to upload a screenshot, create an account, or enable telemetry.

## R2 — Trust and repeatability (`0.2.x`)

Goal: make saved work resilient and make “deterministic” a precise, testable
claim rather than a general aspiration.

- [x] Define the supported renderer contract: pinned Chromium version, fonts,
  color profile, operating-system expectations, and permitted variance. The
  initial contract is recorded in [docs/RENDERER_CONTRACT.md](docs/RENDERER_CONTRACT.md)
  and checked against the lockfile, runtime launch settings, and CI matrix.
- [x] Prefer the pinned renderer for reproducible work and make any system-browser
  fallback explicit in output metadata. The CLI prefers the Playwright-managed
  Chromium and writes a `.png.json` sidecar with renderer selection, browser
  versions, reproducibility status, dimensions, and the PNG hash.
- [x] Add repeat-render tests and visual regression fixtures for representative
  devices, built-in font stacks, backgrounds, transparent output, and spanning
  sets. `test/visual-regression.mjs` keeps these fixtures local, compares repeat
  renders byte-for-byte under the reference renderer, and checks fixed visual
  anchors plus PNG dimensions and alpha behavior.
- [x] Add `cool-app-studio doctor` to report Node, browser, renderer, platform,
  supported formats, and actionable remediation. The diagnostic remains local,
  probes the selected browser, and distinguishes pinned, fallback, override,
  and unavailable renderer states.
- [x] Add crash-safe local recovery with clear controls for retaining or clearing
  screenshot bytes on the machine. The editor keeps metadata-only autosave by
  default and offers an explicit local IndexedDB recovery copy for referenced
  screenshots, backgrounds, and fonts, with a visible clear action.
- [x] Add corruption, oversized bundle, missing asset, unsupported font, and
  interrupted export recovery tests. `test/recovery.mjs` verifies malformed
  local recovery falls back to metadata, project files over the local 50 MB
  bound are rejected before parsing, missing assets produce a reselect message,
  unsupported fonts fall back to the system font, and interrupted exports
  restore their controls.
- [ ] Document the project/preset schema and make migration compatibility part of
  release testing.
- [ ] Add export progress, cancellation, retry, and bounded resource cleanup.
- [ ] Add a local export manifest containing filenames, dimensions, target,
  renderer version, project schema, and content hashes.
- [ ] Perform a focused threat-model review of loopback serving, project bundles,
  local fonts, SVG input, browser extensions, and optional future integrations.

Exit criteria:

- Repeated renders under the supported renderer meet the documented equality or
  visual-difference contract.
- A forced restart does not silently lose recoverable project work.
- Malformed local inputs fail calmly without exposing unrelated local data.

## R3 — Product beta (`0.3.x`)

Goal: make complete store campaigns faster and more approachable than assembling
them in a general-purpose design tool.

- [ ] Drag multiple screenshots into a new ordered set in one action.
- [ ] Add an editable first-run project that teaches shared versus slide-level
  controls through the product itself.
- [ ] Add current store validation, safe-area overlays, target drift warnings,
  and one-click canvas repair without changing copy or palette.
- [ ] Add a curated offline starter template library with explicit asset licenses.
- [ ] Add reusable local brand kits for palette, typography, logo, and export
  naming without bundling private screenshots.
- [ ] Add stronger direct manipulation for positioning, zooming, snapping, and
  multi-panel composition while keeping exact numeric controls available.
- [ ] Add before/after and whole-set proof views at actual crop boundaries.
- [ ] Complete keyboard, focus, screen-reader, contrast, reduced-motion, narrow
  window, zoom, and large-text accessibility acceptance.
- [ ] Add user-facing performance budgets for ten-slide projects and maximum-size
  store exports.
- [ ] Add calm, sanitized, actionable empty, loading, missing-asset, and render
  failure states.
- [ ] Document a localization strategy for UI copy and campaign variants before
  adding automatic translation or any network-backed language service.

Exit criteria:

- Pilot users can build, revise, save, reopen, and export a complete campaign
  without maintainer help.
- Keyboard-only and assistive-technology use covers the primary workflow.
- Maximum supported projects remain responsive and cancellable.

## R4 — Signed desktop beta (`0.4.x`)

Goal: give non-Node users a trusted installer and a consistent embedded renderer.

- [ ] Complete an Electron architecture spike that reuses the editor and core
  renderer while replacing exposed local HTTP where practical with narrow IPC.
- [ ] Keep the CLI and desktop renderer behavior aligned through shared fixtures.
- [ ] Add native open/save/recent-project behavior without background upload or
  cloud-account requirements.
- [ ] Build macOS arm64/x64, Windows x64/arm64 where supported, and Linux AppImage
  and `.deb` artifacts on the matching operating systems.
- [ ] Sign and notarize macOS artifacts. **Credential/external gate.**
- [ ] Sign Windows artifacts and verify SmartScreen/install behavior.
  **Credential/external gate.**
- [ ] Publish checksums, an SBOM, and build provenance for each binary.
- [ ] Add clearly disclosed signed update checks with no project or screenshot
  contents in update requests.
- [ ] Verify clean install, update, rollback, uninstall, and project compatibility
  on fresh machines.

Exit criteria:

- A user can download, verify, install, launch, export, update, and uninstall
  without Node, a separate browser, or a security-bypass workaround.
- Desktop and CLI fixtures satisfy the documented renderer contract.

## R5 — Distribution and ecosystem

Goal: improve discovery and automation without compromising the local-first core.

- [ ] Add Homebrew Cask after signed macOS release URLs are stable.
- [ ] Add WinGet after signed Windows release URLs are stable.
- [ ] Evaluate Microsoft Store and Mac App Store only after direct distribution
  works and demand justifies sandbox/review overhead.
- [ ] Publish a static documentation and sample-only demo site; do not turn the
  default product into a hosted screenshot processor.
- [ ] Add an explicitly opt-in CI container or GitHub Action for teams willing to
  send assets to their selected runner. Clearly distinguish this from local use.
- [ ] Define a versioned preset/template extension format before accepting third-
  party packs; do not add arbitrary executable plugins prematurely.
- [ ] Add contribution labels, a small “good first issue” queue, and lightweight
  decision records for renderer, schema, privacy, and distribution changes.
- [ ] Evaluate sustainability through sponsorship, paid support, signed-build
  convenience, or optional packs without degrading the open core.

## R6 — `1.0` acceptance

Goal: make a supportable compatibility promise backed by real use.

- [ ] At least ten real projects have completed save/reopen/export cycles without
  unexplained data loss.
- [ ] Project and preset schema support and migration windows are documented.
- [ ] Node, browser, desktop OS, and store-target support policies are documented.
- [ ] Release, rollback, security response, and store-spec update runbooks exist.
- [ ] Supported-platform CI, signed artifact checks, fresh-install smoke tests,
  accessibility acceptance, and privacy review pass for the release revision.
- [ ] Documentation covers installation, first use, projects, presets, CLI,
  privacy, troubleshooting, contribution, and upgrade behavior.
- [ ] Known limitations are explicit, current, and visible before installation.

## Distribution ladder

1. Public source and npm alpha for developers.
2. Signed GitHub desktop releases as the primary general-user channel.
3. Homebrew Cask and WinGet after signed releases stabilize.
4. App stores only when demand and platform constraints justify them.
5. Hosted or CI processing only as an explicit external integration chosen by
   the user; never as a silent dependency of the local product.

## Privacy-respecting success measures

Do not add product telemetry by default. Use observed sessions, opt-in surveys,
GitHub issue quality, release downloads, npm downloads, and voluntary reports.

- Median observed time from install to first valid export: under three minutes.
- Fresh-machine install success on every supported platform.
- No unresolved data-loss report across the current supported project schema.
- Store validation success for current documented targets.
- Repeat-render results meet the published renderer contract.
- Security and privacy reports receive acknowledgement within the documented
  response window.

## Explicit non-goals for the early roadmap

- Required accounts, cloud storage, collaboration, or telemetry.
- A hosted renderer replacing the local product.
- AI generation or automatic translation that uploads user assets by default.
- A broad executable plugin system before the project/schema contracts stabilize.
- Motion/video editing before the static screenshot workflow reaches beta quality.
- Publishing, store submission, signing purchases, or repository visibility
  changes without Cameron's explicit interactive approval.
