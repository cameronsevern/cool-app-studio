# Privacy and Local-First Boundaries

Cool App Studio is designed so product screenshots and brand assets do not need to
leave the user's machine.

## What stays local

- Screenshots, background images, and font files are read into browser memory.
- Preview and export requests are sent only to the renderer bound to
  `127.0.0.1` on the same machine.
- Render jobs are removed from server memory when their render completes.
- Browser storage retains project metadata for autosave, not selected asset bytes
  by default. The optional **Keep local asset bytes for crash recovery** control
  stores a recovery copy of referenced screenshots, backgrounds, and fonts in
  local IndexedDB on this machine only.
- A saved `.cool-app-studio` file deliberately contains the local assets used by
  that project so it can be reopened later.

A portable project may therefore contain confidential screenshots, logos, and
fonts. Treat it as sensitive source material and share it only with people who
should receive those assets.

## Network behavior

The core product does not require an account, telemetry service, hosted
renderer, or cloud storage. The local server listens only on `127.0.0.1` and
rejects unexpected hosts and browser origins. Sensitive render API requests
also require a per-process capability token delivered only to local product
pages; it is not sent to external services.

Package installation, browser installation, update checks, source hosting, and
future integrations may contact their respective providers. Those operations
are separate from rendering and must not include project or screenshot contents
unless the user has deliberately selected an integration that requires them.

## Future integrations

An external integration must be:

1. Off by default.
2. Explicitly initiated and configured by the user.
3. Clear about which files or metadata leave the machine and why.
4. Independent from the local editor and CLI whenever practical.
5. Removable without making existing local projects unusable.

## Clearing local data

Closing the editor clears in-memory asset data. If local recovery is enabled,
use **Clear local recovery bytes** in the Project panel to remove the retained
asset copy while keeping the lightweight project autosave. Project metadata and
any remaining recovery database can also be removed through the browser's
site-data controls for `127.0.0.1`. Saved presets, projects, images, ZIP
archives, and PNGs are ordinary local files and must be deleted by the user
through the operating system.

## Reporting a concern

Please use the private process in [SECURITY.md](SECURITY.md) for a vulnerability
or privacy issue. Do not attach private screenshots, projects, fonts, or tokens
to a public issue.
