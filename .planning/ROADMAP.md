# Roadmap: ts-proto sharedHelpersFile

## Overview

This milestone adds the `sharedHelpersFile` option to ts-proto, extracting the common helper types and functions that are currently duplicated into every generated file into a single `proto-shared.ts` output file. The work proceeds in four phases: registering the new option, building the shared file generator, wiring up per-file import injection alongside the plugin output change, and validating everything with an integration test.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Option Registration** - Add `sharedHelpersFile` boolean option to `src/options.ts`
- [x] **Phase 2: Shared File Generator** - Implement `generateSharedHelpers()` that produces `proto-shared.ts` content (completed 2026-02-27)
- [x] **Phase 3: Import Injection and Wiring** - Switch per-file generation to use `imp()` references and wire generator into `plugin.ts` (completed 2026-02-27)
- [ ] **Phase 4: Integration Test** - Add `integration/shared-helpers/` test directory with committed expected output

## Phase Details

### Phase 1: Option Registration
**Goal**: The `sharedHelpersFile` option is recognized and parsed by ts-proto so all subsequent code can gate on it
**Depends on**: Nothing (first phase)
**Requirements**: OPT-01, OPT-02
**Success Criteria** (what must be TRUE):
  1. Running `protoc` with `--ts_proto_opt=sharedHelpersFile=true` does not produce an unknown-option error
  2. Running `protoc` without the option (or with `sharedHelpersFile=false`) produces output identical to the current baseline
  3. The option field exists in the `Options` type with a `false` default accessible to all generation code
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Add sharedHelpersFile to Options type, defaultOptions(), and update inline snapshot

### Phase 2: Shared File Generator
**Goal**: A `generateSharedHelpers(options)` function exists that returns correct `proto-shared.ts` content — all 23 movable helpers, properly exported, in correct order
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05
**Success Criteria** (what must be TRUE):
  1. Calling `generateSharedHelpers(options)` returns a file object containing all helpers whose option gates are satisfied for the given options
  2. All declarations in the returned file use `export` regardless of the `exportCommonSymbols` option value
  3. When `globalThisPolyfill=true`, the `gt` IIFE appears first in the file before any helpers that reference it
  4. Helpers that reference user-generated types (MongoDB ObjectId helpers, Struct/Value/ListValue/FieldMask wrappers) are absent from the returned file
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Implement generateSharedHelpers via TDD (RED→GREEN cycle for GEN-02–GEN-05)
- [ ] 02-02-PLAN.md — Wire generateSharedHelpers into plugin.ts output pipeline (GEN-01)

### Phase 3: Import Injection and Wiring
**Goal**: End-to-end working feature — running `protoc` with `sharedHelpersFile=true` produces `proto-shared.ts` alongside all generated files, and each generated file imports from it instead of inlining helpers
**Depends on**: Phase 2
**Requirements**: IMP-01, IMP-02, IMP-03, COMPAT-01, COMPAT-02
**Success Criteria** (what must be TRUE):
  1. Each generated `.ts` file imports movable helpers from `proto-shared` instead of declaring them inline
  2. Import paths are relative and correct regardless of nesting depth (e.g., `./proto-shared` for root files, `../../proto-shared` for doubly-nested files)
  3. The `importSuffix` option is respected in the import path (e.g., `proto-shared.js` when `importSuffix=.js`)
  4. Running `protoc` without `sharedHelpersFile=true` produces output byte-for-byte identical to the current baseline — no regressions
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — TDD: write import-injection tests (RED) then add conditionalUtils to plugin.ts (GREEN) — IMP-01, IMP-02, IMP-03
- [ ] 03-02-PLAN.md — Run full test suite to verify COMPAT-01, COMPAT-02 (zero regressions)

### Phase 4: Integration Test
**Goal**: The complete feature is validated end-to-end by a committed integration test that will catch any future regression
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. An `integration/shared-helpers/` directory exists with a parameter file enabling `sharedHelpersFile=true` and committed expected output files
  2. Running `yarn proto2ts` regenerates the expected output files with no diff
  3. Running `jest` passes all tests, including the new shared-helpers test case
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Option Registration | 1/1 | Complete | 2026-02-27 |
| 2. Shared File Generator | 2/2 | Complete   | 2026-02-27 |
| 3. Import Injection and Wiring | 2/2 | Complete   | 2026-02-27 |
| 4. Integration Test | 0/? | Not started | - |
