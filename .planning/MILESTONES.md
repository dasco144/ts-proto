# Milestones

## v1.0 sharedHelpersFile (Shipped: 2026-02-28)

**Phases completed:** 4 phases, 7 plans
**Git range:** `29064f61` → `c3c3aad9`
**Files changed:** 41 files, 5,261 insertions (+79 deletions)
**Timeline:** 2026-02-27 → 2026-02-28 (2 days)

**Delivered:** Added `sharedHelpersFile` option to ts-proto — when enabled, generates a single `proto-shared.ts` containing all movable helpers and each generated file imports from it instead of redeclaring them inline.

**Key accomplishments:**
- Registered `sharedHelpersFile` boolean option in `src/options.ts` with default `false` — fully backwards-compatible, zero regressions
- Implemented `generateSharedHelpers(options)` in new `src/generate-shared-helpers.ts` — collects 16 movable helpers, forces all exports, respects `globalThisPolyfill` ordering
- Wired `generateSharedHelpers()` into `plugin.ts` — emits `proto-shared.ts` as first output file when `sharedHelpersFile=true`
- Implemented per-file import injection via ts-poet's `conditionalUtils` option — replaces inline helper declarations with imports using correct relative paths at all nesting depths (`./proto-shared`, `../../proto-shared`, etc.)
- Added `integration/shared-helpers/` integration test with committed snapshots covering root-level, depth-2, and wellknown-type generation — 131 test suites passing
- Verified zero regressions: all 130 pre-existing integration test suites + 102 snapshots pass unchanged with default `sharedHelpersFile=false`

---

