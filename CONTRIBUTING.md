# Contributing to App Screenshot Forge

Thank you for helping make local, repeatable screenshot production better.

## Before starting

- Read [ROADMAP.md](ROADMAP.md) for product priorities and human-gated work.
- Read [PRIVACY.md](PRIVACY.md) before changing asset handling, persistence,
  networking, diagnostics, integrations, or release automation.
- Search existing issues before proposing a large feature.
- Keep a pull request focused on one coherent outcome.

Naming, licensing, repository visibility, package publication, signing, store
submission, paid services, and default-on external integrations require explicit
maintainer approval.

## Development setup

Requirements: Node.js 22 or 24 and a Chromium-family browser.

```sh
npm ci
npm start
```

If no supported system browser is available:

```sh
npx playwright install chromium
```

## Verification

Run before submitting a change:

```sh
npm test
npm run check:package
git diff --check
```

Add focused checks for new behavior. User-facing changes should also be exercised
in the editor at relevant store dimensions. Record what was observed; do not
claim visual, cross-platform, hosted-CI, signing, store, or publication evidence
that was not actually obtained.

## Product expectations

- Preserve local-first behavior and avoid required accounts or telemetry.
- Keep editor and CLI rendering behavior aligned.
- Migrate saved data forward instead of silently dropping unknown fields.
- Use clear product language and actionable error recovery.
- Consider keyboard use, focus, semantics, contrast, reduced motion, zoom, and
  narrow windows for interface changes.
- Preserve unrelated changes in a dirty checkout.

## Commits and pull requests

Use concise imperative commit subjects. Explain the user outcome, verification,
privacy impact, schema impact, and remaining limitations in the pull request.
Update roadmap checkboxes only when their implementation and evidence are
complete.
