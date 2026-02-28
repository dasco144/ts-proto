---
phase: 04-integration-test
plan: 01
subsystem: testing
tags: [proto, jest, integration-test, shared-helpers, protobuf, fixtures]

# Dependency graph
requires:
  - phase: 03-import-injection-and-wiring
    provides: sharedHelpersFile option and proto-shared.ts generation — these fixtures are the integration target
provides:
  - integration/shared-helpers/ fixture directory with proto files, parameters.txt, and jest test
  - helpers.proto covering all four movable helper groups (bytes, Timestamp, map, repeated+int64)
  - subdir/nested/minimal.proto at depth-2 for IMP-02 ../../proto-shared import path regression testing
  - shared-helpers-test.ts minimal compile-check jest test importing from ./helpers
affects: [04-02-generate-snapshots, 04-03-run-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: [integration test fixture directory pattern matching existing integration/ tests]

key-files:
  created:
    - integration/shared-helpers/parameters.txt
    - integration/shared-helpers/helpers.proto
    - integration/shared-helpers/subdir/nested/minimal.proto
    - integration/shared-helpers/shared-helpers-test.ts
  modified: []

key-decisions:
  - "One root helpers.proto covers all four helper groups (bytes, Timestamp, map, repeated+int64) — comprehensive over minimal"
  - "subdir/nested/minimal.proto at depth-2 forces ../../proto-shared import path for IMP-02 regression"
  - "shared-helpers-test.ts imports from ./helpers (not ./proto-shared) so jest discovers directory via the generated file"
  - "No runtime behavioral assertions in test file — compile-check only, per CONTEXT.md deferral decision"

patterns-established:
  - "Pattern: integration test jest files import generated types (not proto-shared directly) to validate full import chain"
  - "Pattern: depth-2 nested proto files validate relative import path resolution at greater nesting depth"

requirements-completed: [TEST-01, TEST-02]

# Metrics
duration: 1min
completed: 2026-02-28
---

# Phase 4 Plan 01: Create shared-helpers Integration Fixture Files Summary

**Proto fixture files for shared-helpers integration test: helpers.proto covering bytes/Timestamp/map/repeated+int64, depth-2 minimal.proto for IMP-02 regression, and minimal jest compile-check test**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T06:33:59Z
- **Completed:** 2026-02-28T06:34:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `integration/shared-helpers/parameters.txt` with `sharedHelpersFile=true` to activate the new shared helpers feature
- Created `integration/shared-helpers/helpers.proto` exercising all four movable helper groups: bytes (bytesFromBase64/base64FromBytes), Timestamp (toTimestamp/fromTimestamp/fromJsonTimestamp), map fields (isSet in map iteration), repeated+nested messages with int64 (longToNumber/numberToLong)
- Created `integration/shared-helpers/subdir/nested/minimal.proto` at depth-2 — sole purpose is forcing `../../proto-shared` import path in generated output (IMP-02 regression target)
- Created `integration/shared-helpers/shared-helpers-test.ts` as minimal jest compile-check importing from `./helpers` so the full chain helpers.ts -> proto-shared.ts is validated at compile time

## Task Commits

Each task was committed atomically:

1. **Task 1: Create parameters.txt and helpers.proto** - `686cb74f` (feat)
2. **Task 2: Create depth-2 nested proto and jest test file** - `46ebc129` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `integration/shared-helpers/parameters.txt` - Single option flag enabling shared helpers file generation
- `integration/shared-helpers/helpers.proto` - Comprehensive proto fixture: Helpers message (bytes, Timestamp, map<string,Timestamp>, repeated Item, Item nested_item) + Item message (string, int64)
- `integration/shared-helpers/subdir/nested/minimal.proto` - Trivial single-message proto at depth-2; forces ../../proto-shared relative import path in generated output
- `integration/shared-helpers/shared-helpers-test.ts` - Minimal jest test importing `{ Helpers }` from `./helpers`; one it("compiles") assertion; no runtime behavioral assertions

## Decisions Made

- One root helpers.proto is sufficient to exercise all four helper groups — single file over multiple files
- depth-2 nesting (subdir/nested/) is the minimum needed to trigger IMP-02 regression path
- Jest test imports from `./helpers` (the generated TypeScript file) not directly from `./proto-shared` — this validates the full import chain and matches the pattern in `avoid-import-conflicts-folder-name/ui/simple-test.ts`
- No runtime assertions in test file — deferred per CONTEXT.md decision; compile-check is sufficient for plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four source fixture files are in place for plan 04-02 (generate snapshots)
- `yarn proto2ts` in integration/shared-helpers/ will process helpers.proto and subdir/nested/minimal.proto with sharedHelpersFile=true option
- Generated snapshots (helpers.ts, proto-shared.ts, subdir/nested/minimal.ts) will be committed in plan 04-02
- Plan 04-03 will run the jest test to confirm compile-time validation

---
*Phase: 04-integration-test*
*Completed: 2026-02-28*

## Self-Check: PASSED

All created files verified present. Both task commits verified in git log.
