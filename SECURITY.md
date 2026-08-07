# Security Policy

## Supported versions

Until the first public release, security fixes are made on `main`. After public
releases begin, the latest minor release will receive security fixes unless a
release note states a longer support window.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository when it is
available:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Describe the affected version, impact, and a minimal reproduction.

If private vulnerability reporting is not yet enabled, open a public issue that
asks the maintainer for a private contact channel. Do not include exploit details
or private assets in that issue.

Please do not attach real product screenshots, portable projects, proprietary
fonts, credentials, or other sensitive files. A synthetic reproduction is
preferred.

The maintainer will aim to acknowledge a complete report within seven days,
coordinate a fix and disclosure window, and credit the reporter unless they ask
to remain anonymous.

## Relevant boundaries

Security work should preserve these product guarantees:

- The renderer binds only to `127.0.0.1`.
- Project and asset contents are not uploaded by the core product.
- External integrations are explicit and optional.
- Malformed images, fonts, presets, and projects fail without exposing unrelated
  local data.
- Release artifacts identify their exact source revision and verification state.
