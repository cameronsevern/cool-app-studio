# Cool App Studio Nightly Product Loop

Run one bounded nightly product iteration in this saved local checkout.

## Authority

Read these files completely before selecting work:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `PRIVACY.md`
4. `CONTRIBUTING.md`
5. This prompt

Treat `ROADMAP.md` as the ordered product and release queue. Treat the product
contract and local-first boundaries in `AGENTS.md`, `ROADMAP.md`, and
`PRIVACY.md` as non-negotiable. Live git state and executable tests are the
authority for what is actually implemented.

Read the loop memory at
`/Users/cameron/.codex/automations/app-screenshot-forge-nightly-product-loop/memory.md`
when it exists. Memory may help with continuity but never overrides the checkout
or roadmap.

## Saved-checkout safety

1. Work in `/Volumes/Data/repos/mockup-studio` on the saved checkout so validated
   progress carries into the next run. Inspect the current branch, `git status`,
   complete tracked diff, untracked files, recent commits, and local/remote
   divergence before changing anything.
2. Never use `git reset --hard`, `git clean`, force-push, destructive recovery,
   or an unreviewed stash. Never discard or overwrite human work.
3. Treat existing dirty changes as candidate product work, not junk. Understand
   them against the roadmap, finish and validate a coherent in-scope change when
   safe, and commit separately when dirty scopes are logically independent. If a
   dirty area cannot be reconciled safely, preserve it and choose an independent
   slice that does not touch it.
4. Fetching remote state for comparison is allowed. Do not merge, rebase, switch
   branches, or rewrite commits while the tree is dirty. Resolve only conflicts
   that are clearly mechanical and within loop-owned work.

## One bounded slice

5. Select exactly one smallest complete, locally actionable roadmap item after
   dirty-work reconciliation. Prefer the earliest unchecked item whose
   prerequisites are met.
6. Skip naming/trademark clearance, domain or package registration, repository
   visibility, signing, payment, store, credential, publication, and other
   explicitly human/external gates. Continue to the next eligible roadmap item
   without marking the gate complete.
7. Do not invent a major feature to avoid a gate. If no roadmap item is eligible,
   take one narrow usability, accessibility, recovery, documentation, test, or
   privacy-hardening slice grounded in the current product contract.
8. Design from the user's outcome: fast first success, clear shared versus
   slide-level controls, truthful status, calm recovery, keyboard accessibility,
   narrow-window behavior, and no unexplained loss of work.
9. Keep screenshots, projects, presets, fonts, and backgrounds local by default.
   Do not add required accounts, telemetry, hosted rendering, cloud persistence,
   AI upload, or default-on external integrations.

## Implementation and evidence

10. Make the narrow implementation, add or update focused tests, and update
    roadmap checkboxes only for work actually completed.
11. Run the strongest relevant local checks. The normal floor is focused tests,
    `npm test`, `npm run check:package` when package contents may change, and
    `git diff --check`. For user-facing work, exercise the editor in a real
    browser at relevant store dimensions and record what was actually observed.
12. Diagnose in-scope failures and retry safe fixes. Do not weaken tests, hide
    errors, or claim unavailable cross-platform, hosted-CI, signing, package,
    store, or public-release evidence.
13. Create clear local commits on `main` for validated loop work so the next run
    inherits it. Do not push, open or merge a pull request, publish npm packages,
    change repository visibility/settings, register domains, sign binaries,
    deploy, submit to stores, purchase anything, or mutate production/external
    state without Cameron's explicit interactive approval.

## Handoff

14. End with a compact report containing the reconciled dirty scope, selected
    roadmap item, changes, local commit(s), checks and visual evidence, preserved
    work, blockers, and next eligible candidate.
15. Append that report to
    `/Users/cameron/.codex/automations/app-screenshot-forge-nightly-product-loop/memory.md`.
    Keep source completion, local commit, push, hosted CI, package publication,
    signed distribution, store acceptance, and public acceptance distinct.
