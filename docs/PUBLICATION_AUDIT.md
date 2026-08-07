# Publication Audit

Last run: 2026-08-07

Audited baseline revision: `26228973fb9a21789abb1859d331e3e3cbf746fd`

This audit covers source and history risks that should be resolved before the
GitHub repository becomes public. Asset ownership, trademark clearance, hosted
CI, package publication, and public acceptance are tracked separately in
[`ROADMAP.md`](../ROADMAP.md).

## Secret and history scan

- Downloaded the official Gitleaks `8.30.1` Darwin arm64 release to a temporary
  directory and verified the archive against the published SHA-256 checksum:
  `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5`.
- Scanned all refs, full history, and reflogs with Gitleaks. Five commits and
  approximately 292 KB of patches were scanned with zero findings.
- Scanned the clean working tree with Gitleaks. Approximately 266 KB were
  scanned with zero findings.
- Re-scanned the working tree after adding this report and the corresponding
  roadmap update. Approximately 269 KB were scanned with zero findings.
- Used `git fsck --full --no-reflogs --unreachable` to inventory objects outside
  refs and reflogs. It found 18 blobs and 8 trees. Every unreachable blob was
  scanned independently with Gitleaks with zero findings.
- Ran a second high-confidence pattern scan over every reachable commit and
  unreachable blob for common private keys and provider tokens. It found zero
  matches.
- Inspected refs and remotes. The only branch refs are local `main` and
  `origin/main`; there are no tags or notes, and the HTTPS remote contains no
  embedded credential.
- Ran `npm audit` against the locked dependency tree. It reported zero known
  vulnerabilities across three production/optional dependencies.

No secret was found. This is strong publication evidence, not a guarantee that
all sensitive information can be recognized automatically.

## History privacy decision

The five commits use one author/committer email that is not a GitHub noreply
address. The GitHub profile does not currently publish an email. Making the
history public would therefore expose that address through Git data.

Before changing visibility, the maintainer must choose one of these outcomes:

1. Confirm that publishing the existing commit email is acceptable.
2. Rewrite the private five-commit history to a GitHub noreply address, then
   re-run this audit and explicitly approve the required force-push.

No history was rewritten by this audit.

## Reproduction

The principal scanner invocation was:

```sh
gitleaks git --log-opts="--all --full-history --reflog" --redact .
```

The working tree and each unreachable blob were scanned separately using the
same Gitleaks default rules. Scanner release and checksums:
<https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1>.
