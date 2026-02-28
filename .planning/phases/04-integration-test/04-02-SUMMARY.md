---
phase: 04-integration-test
plan: 02
subsystem: testing
tags: [proto, jest, integration-test, shared-helpers, protobuf, snapshots, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: fixture files (helpers.proto, minimal.proto, parameters.txt, shared-helpers-test.ts)
provides:
  - integration/shared-helpers/proto-shared.ts — shared helpers file with all exports (TEST-01 artifact)
  - integration/shared-helpers/helpers.ts — root generated file importing from ./proto-shared (TEST-02)
  - integration/shared-helpers/subdir/nested/minimal.ts — depth-2 import from ../../proto-shared (IMP-02)
  - integration/shared-helpers/google/protobuf/timestamp.ts — generated wellknown type wrapper
  - Passing jest suite: 131 suites, 15 new assertions
  - Zero git diff after re-running generation (TEST-03)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "update-code.sh can be run directly (without Docker) when protoc is available on PATH"
    - "proto-shared.ts function exports require exportCommonSymbols=true threaded through all helper-creation functions"
    - "GrpcWebError/NiceGrpcServerStreamingMethodResult conditionally excluded from proto-shared.ts when outputClientImpl != grpc-web"

key-files:
  created:
    - integration/shared-helpers/proto-shared.ts
    - integration/shared-helpers/helpers.ts
    - integration/shared-helpers/subdir/nested/minimal.ts
    - integration/shared-helpers/google/protobuf/timestamp.ts
  modified:
    - src/main.ts
    - src/generate-shared-helpers.ts

key-decisions:
  - "Run update-code.sh directly instead of yarn proto2ts (Docker unavailable in WSL2 — script works directly with system protoc)"
  - "Function helpers (isSet, bytesFromBase64, etc.) need export keyword in proto-shared.ts — fixed by threading exportCommonSymbols into makeLongUtils, makeByteUtils, makeTimestampMethods, makeComparisonUtils, makeAssertionUtils"
  - "globalThis ConditionalOutput with empty declaration causes spurious import in proto-shared.ts — replaced with code`globalThis` plain Code snippet when globalThisPolyfill=false"
  - "GrpcWebError only included in proto-shared.ts when outputClientImpl=grpc-web (grpc namespace dependency)"

patterns-established:
  - "Pattern: proto-shared.ts generation requires exportCommonSymbols=true to propagate export to ALL helper functions, not just types/interfaces"
  - "Pattern: conditionalOutput with empty declaration causes ts-poet to generate import in conditionalUtils mode — use plain Code snippet instead"
  - "Pattern: GrpcWebError and other option-gated helpers must be conditionally included in generateSharedHelpers based on the relevant option"

requirements-completed: [TEST-01, TEST-02, TEST-03]

# Metrics
duration: 8min
completed: 2026-02-28
---

# Phase 4 Plan 02: Generate and Commit shared-helpers Snapshots Summary

**Generated and committed proto-shared.ts with all exported helpers, fixing three bugs discovered during generation: missing export keywords on function helpers, spurious globalThis import, and unconditional GrpcWebError inclusion**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-28T06:37:15Z
- **Completed:** 2026-02-28T06:45:14Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Generated `integration/shared-helpers/proto-shared.ts` with all helpers exported (bytesFromBase64, isSet, toTimestamp, DeepPartial, MessageFns, etc.) — TEST-01 satisfied
- Generated `integration/shared-helpers/helpers.ts` importing from `./proto-shared` with no inline helper declarations — TEST-02 (root) satisfied
- Generated `integration/shared-helpers/subdir/nested/minimal.ts` importing from `../../proto-shared` — TEST-02 + IMP-02 end-to-end validation satisfied
- Fixed three implementation bugs in `src/main.ts` and `src/generate-shared-helpers.ts` uncovered during generation
- All 131 jest suites pass (130 existing + 1 new shared-helpers suite), zero regressions
- Re-running generation produces zero git diff — TEST-03 satisfied

## Task Commits

1. **Task 1 + Task 2 (combined): Generate snapshots and fix bugs** - `e48601ec` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `integration/shared-helpers/proto-shared.ts` - Shared helpers file: all 19 movable helpers exported (bytesFromBase64, base64FromBytes, DeepPartial, Exact, isSet, isObject, toTimestamp, fromTimestamp, fromJsonTimestamp, numberToLong, longToNumber, MessageFns, ExtensionFns, ExtensionHolder, Extension, fail)
- `integration/shared-helpers/helpers.ts` - Generated root file for helpers.proto; imports all needed helpers from `./proto-shared`
- `integration/shared-helpers/subdir/nested/minimal.ts` - Generated depth-2 nested file; imports from `../../proto-shared`
- `integration/shared-helpers/google/protobuf/timestamp.ts` - Generated wellknown type wrapper
- `src/main.ts` - Three bug fixes: (1) added maybeExport to function helper declarations in makeByteUtils/makeLongUtils/makeTimestampMethods/makeComparisonUtils/makeAssertionUtils; (2) replaced empty conditionalOutput for globalThis with code`globalThis` plain snippet; (3) passed options to makeComparisonUtils and makeAssertionUtils
- `src/generate-shared-helpers.ts` - Fixed to conditionally include GrpcWebError/NiceGrpcServerStreamingMethodResult only when outputClientImpl="grpc-web"

## Decisions Made

- Used `update-code.sh` directly (without Docker) since `protoc` was available on PATH in WSL2 — equivalent output, same script, same flags
- Function exports in `proto-shared.ts` require threading `exportCommonSymbols` through all helper-creating functions, not just `makeDeepPartial`/`makeMessageFns`
- `globalThis` built-in should not use `conditionalOutput` when polyfill is disabled, since ts-poet always generates an import for any ConditionalOutput encountered in `conditionalUtils` mode — even those with empty declarations
- `GrpcWebError` conditionally included based on `outputClientImpl === "grpc-web"` to avoid `grpc` namespace TypeScript errors when the grpc-web library isn't in scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Function helpers missing export keyword in proto-shared.ts**
- **Found during:** Task 1 (Run generation and verify)
- **Issue:** `bytesFromBase64`, `base64FromBytes`, `isSet`, `isObject`, `toTimestamp`, `fromTimestamp`, `fromJsonTimestamp`, `numberToLong`, `longToNumber`, `fail` were generated without `export` keyword. The `exportCommonSymbols=true` override in `generateSharedHelpers` only affected `makeDeepPartial` and `makeMessageFns` (types/interfaces) via `maybeExport`, but not the function helpers in `makeByteUtils`, `makeLongUtils`, `makeTimestampMethods`, `makeComparisonUtils`, or `makeAssertionUtils`.
- **Fix:** Added `maybeExport` constant to `makeLongUtils`, `makeByteUtils`, `makeTimestampMethods`, `makeComparisonUtils`, and `makeAssertionUtils`. Added `options` parameter to `makeComparisonUtils` and `makeAssertionUtils`. Applied `${maybeExport}function` prefix to all function declarations in those helpers.
- **Files modified:** `src/main.ts`
- **Verification:** `proto-shared.ts` regenerated with all functions exported; `yarn jest --testPathPattern="shared-helpers"` passes
- **Committed in:** `e48601ec` (Task 1 commit)

**2. [Rule 1 - Bug] globalThis erroneously imported from proto-shared.ts**
- **Found during:** Task 1 (Run generation and verify)
- **Issue:** Generated `helpers.ts` contained `import { globalThis } from "./proto-shared"` but `proto-shared.ts` does not export `globalThis` (it's a JS built-in). Caused by `conditionalOutput("globalThis", code``)` — even with an empty declaration, ts-poet adds the name to the import list in `conditionalUtils` mode.
- **Fix:** Replaced `conditionalOutput("globalThis", code``)` with `code`globalThis`` — a plain Code snippet that emits the string "globalThis" inline without registering as a ConditionalOutput to be imported.
- **Files modified:** `src/main.ts`
- **Verification:** Regenerated `helpers.ts` no longer imports `globalThis`; generated code uses built-in `globalThis` directly
- **Committed in:** `e48601ec` (Task 1 commit)

**3. [Rule 1 - Bug] GrpcWebError unconditionally included in proto-shared.ts**
- **Found during:** Task 1 (Run generation and verify)
- **Issue:** `proto-shared.ts` included `export class GrpcWebError extends globalThis.Error { constructor(message: string, public code: grpc.Code, public metadata: grpc.Metadata) }`. The `grpc` namespace is only available when the `@improbable-eng/grpc-web` library is imported, which only happens when `outputClientImpl="grpc-web"`. With default options, TypeScript errors: `Cannot find namespace 'grpc'`.
- **Fix:** In `generateSharedHelpers`, moved `GrpcWebError` and `NiceGrpcServerStreamingMethodResult` inside a conditional block: `if (options.outputClientImpl === "grpc-web")`.
- **Files modified:** `src/generate-shared-helpers.ts`
- **Verification:** `proto-shared.ts` regenerated without `GrpcWebError`; `yarn jest` all 131 suites pass
- **Committed in:** `e48601ec` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs in implementation)
**Impact on plan:** All three bugs were in the implementation from prior phases and blocked successful generation. Fixing them was required to complete this plan. No scope creep — fixes are minimal and targeted.

## Issues Encountered

- `yarn proto2ts` requires Docker which was unavailable in this WSL2 environment. Resolved by running `update-code.sh` directly with the system `protoc` binary — identical behavior since Docker was just wrapping the same script.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 4 requirements satisfied: TEST-01, TEST-02, TEST-03
- All generated snapshot files committed; re-running generation produces zero diff
- Full jest suite passes (131 suites, 503 tests)
- Phase 4 and the overall milestone (v1.0) are complete

---
*Phase: 04-integration-test*
*Completed: 2026-02-28*

## Self-Check: PASSED

All created files verified present. Task commit e48601ec verified in git log. SUMMARY.md written. STATE.md and ROADMAP.md updated.
