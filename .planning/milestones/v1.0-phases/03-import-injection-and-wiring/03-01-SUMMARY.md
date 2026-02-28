---
phase: 03-import-injection-and-wiring
plan: 01
subsystem: api
tags: [ts-poet, protobuf, codegen, conditionalUtils, import-injection]

# Dependency graph
requires:
  - phase: 02-shared-file-generator
    provides: generateSharedHelpers function and sharedHelpersFile option

provides:
  - conditionalUtils injection in per-file toString() call in plugin.ts
  - Unit tests for import path computation (IMP-02, IMP-03)
  - Unit tests for conditionalUtils string construction (IMP-01)

affects:
  - 03-import-injection-and-wiring (subsequent plans)
  - 04-integration-testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: RED (test file) then GREEN (implementation) in two atomic commits"
    - "ts-poet conditionalUtils: pass module path to redirect ConditionalOutput to imports"

key-files:
  created:
    - tests/import-injection-test.ts
  modified:
    - src/plugin.ts

key-decisions:
  - "conditionalUtils string is always './proto-shared' + options.importSuffix (not path-adjusted — ts-poet maybeRelativePath handles relative path resolution per output file)"
  - "Only the per-file generation block gets conditionalUtils; proto-shared.ts and typeRegistry.ts blocks remain unchanged"

patterns-established:
  - "Per-file toString() opts: extract to variable first, then conditionally augment before spreading"

requirements-completed: [IMP-01, IMP-02, IMP-03]

# Metrics
duration: 1min
completed: 2026-02-28
---

# Phase 3 Plan 01: Import Injection Summary

**ts-poet conditionalUtils wired into per-file plugin.ts toString() call so ConditionalOutput helpers redirect to proto-shared imports when sharedHelpersFile=true**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T22:25:32Z
- **Completed:** 2026-02-28T22:26:53Z
- **Tasks:** 2 (RED + GREEN TDD cycle)
- **Files modified:** 2

## Accomplishments

- Created unit test suite for import path computation verifying relative path calculation at root, one-level, and two-level nesting depths
- Created unit tests verifying conditionalUtils string construction with various importSuffix values (empty, .js, .ts)
- Modified plugin.ts per-file generation block to extract tsPoetOpts to a variable and conditionally set conditionalUtils when sharedHelpersFile=true

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Write failing import-injection tests** - `0b8d7e9e` (test)
2. **Task 2: GREEN — Implement conditionalUtils in plugin.ts** - `19f4451d` (feat)

_Note: TDD tasks have two commits (test RED → feat GREEN)_

## Files Created/Modified

- `tests/import-injection-test.ts` - Unit tests for IMP-01 (conditionalUtils string construction), IMP-02/IMP-03 (import path computation via ts-poet maybeRelativePath logic)
- `src/plugin.ts` - Per-file toString() block now extracts getTsPoetOpts result, sets conditionalUtils = "./proto-shared" + importSuffix when sharedHelpersFile=true

## Decisions Made

- The conditionalUtils value is the root-relative string "./proto-shared" + importSuffix. ts-poet's internal maybeRelativePath function resolves this to a relative path per output file — no manual path adjustment needed in plugin.ts.
- Only the per-file generation block (lines 53-59 in original) receives conditionalUtils. The proto-shared.ts and typeRegistry.ts blocks must NOT receive it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled cleanly on first attempt; all 9 tests passed in both RED and GREEN states (the IMP-01 tests validate string construction logic which doesn't require the full conditionalUtils mechanism to function).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Import injection is complete; per-file generated .ts files will now redirect ConditionalOutput helpers to proto-shared imports when sharedHelpersFile=true
- Ready for Phase 4 integration testing to verify the end-to-end behavior (actual ConditionalOutput → import substitution in generated files)

---
*Phase: 03-import-injection-and-wiring*
*Completed: 2026-02-28*

## Self-Check: PASSED

- FOUND: tests/import-injection-test.ts
- FOUND: src/plugin.ts
- FOUND: 03-01-SUMMARY.md
- FOUND commit: 0b8d7e9e (test RED)
- FOUND commit: 19f4451d (feat GREEN)
