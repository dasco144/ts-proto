# Project Research Summary

**Project:** ts-proto — sharedHelpersFile option
**Domain:** TypeScript code generator / protobuf tooling
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

This milestone adds a `sharedHelpersFile` boolean option to ts-proto that, when enabled, extracts shared TypeScript helper types and functions (currently duplicated into every generated `.ts` file) into a single `proto-shared.ts` output file. The feature directly mirrors the existing `outputTypeRegistry` pattern: a new option flag triggers generation of an extra file alongside the per-proto files, and per-file imports are resolved automatically by ts-poet via `imp("SomeName@./proto-shared")`. No new dependencies are required — everything is built on tools already in use (ts-poet, the existing `Options` infrastructure, the existing `makeUtils()` assembly point).

The recommended approach is a minimal, well-bounded change: add the option, create a `generateSharedHelpers(options)` function that calls existing `makeUtils()` infrastructure directly to produce option-correct content, switch `makeUtils()` to return `imp()` references instead of `conditionalOutput()` objects when the option is set, wire it up in `plugin.ts`, and add an integration test. The most important implementation constraint is that the shared file must always emit all helpers whose option gates are satisfied for the run — not gated by per-file reference counting — because `conditionalOutput` semantics are per-file, not per-run.

The key risks are all implementation-level: helper bodies that vary by option (never hardcode), helpers that cannot move because they reference user-generated types (keep those inline), the `exportCommonSymbols` interaction (shared file must always export), emission ordering of the `globalThisPolyfill` IIFE, and the integration test workflow (expected files are committed artifacts updated by `yarn proto2ts`, not Jest snapshots). All risks are well-understood and have clear prevention strategies identified.

## Key Findings

### Recommended Stack

This is a change to an existing TypeScript codebase with no new dependencies required. The relevant tooling is already in use and well-understood.

**Core technologies:**
- **TypeScript 5.8.3:** Implementation language — existing project language, no change
- **ts-poet 6.12.0:** Code AST, import management, and file output — already used; `imp()` and `impFile()` handle relative path computation and import deduplication automatically
- **ts-proto-descriptors 2.1.0:** Protobuf descriptor types — already used for `CodeGeneratorRequest`/`Response`

The option registration pattern is fully established: add field to `Options` type in `src/options.ts`, add default in `defaultOptions()`, and `parseParamValue()` automatically handles boolean string conversion. No additional parsing code needed.

### Expected Features

Research identified 27 distinct conditional output helpers. Of these, 23 are safe to move to the shared file (pure helpers with no user-generated type references). Four cannot be moved and must remain inline.

**Must have (table stakes — helpers safe for shared file):**
- Core types: `Builtin`, `KeysOfUnion`, `DeepPartial`, `Exact`
- Core functions: `isSet`, `isObject`, `fail`
- Long utilities: `longToNumber`, `numberToLong`
- Byte utilities: `bytesFromBase64`, `base64FromBytes`, `gt` polyfill
- Timestamp utilities: `toTimestamp`, `fromTimestamp`, `fromJsonTimestamp`
- Interfaces: `MessageFns`, `Extension`, `ExtensionFns`, `ExtensionHolder`, `ServerStreamingMethodResult`, `GrpcWebError`

**Cannot move (defer, keep inline):**
- MongoDB ObjectId helpers (`fromProtoObjectId`, `fromJsonObjectId`, `toProtoObjectId`) — reference generated `ObjectId` message type
- Struct wrapper interfaces (`StructWrapperFns`, `AnyValueWrapperFns`, `ListValueWrapperFns`, `FieldMaskWrapperFns`) — reference generated message types

**Key constraint:** Helper bodies are option-dependent (e.g., `DeepPartial` body varies with `forceLong`/`oneof`, `MessageFns` members vary with `outputEncodeMethods`). The shared file must be generated dynamically by calling `makeUtils(options)` — never hardcoded. Since options are project-level constants, one shared file per run is the correct model.

**`exportCommonSymbols` override required:** Helpers in the shared file must always use `export` regardless of the `exportCommonSymbols` option value, since other files import from it.

### Architecture Approach

The implementation follows the existing `typeRegistry.ts` extra-file pattern exactly. The `plugin.ts` orchestrator detects the option flag and calls a new `generateSharedHelpers(options)` function, adds the result to the output files array. Per-file generation switches from `conditionalOutput()` objects to `imp("SomeName@./proto-shared")` objects in `makeUtils()` — ts-poet resolves the correct relative path (e.g., `../../proto-shared` for `google/protobuf/timestamp.ts`) automatically at `code.toString({ path: moduleName })` time.

**Major components:**
1. **`src/options.ts`** — declares `sharedHelpersFile: boolean` option with `false` default
2. **`src/main.ts` / new `src/generate-shared-helpers.ts`** — `generateSharedHelpers(options)` function that builds proto-shared.ts content using existing `makeUtils()` infrastructure
3. **`src/main.ts` `makeUtils()`** — branches on `options.sharedHelpersFile` to return `imp()` references vs `conditionalOutput()` objects
4. **`src/plugin.ts`** — wires up the new file to the output array following `typeRegistry.ts` pattern
5. **`integration/shared-helpers/`** — integration test directory with committed expected output files

### Critical Pitfalls

1. **ConditionalOutput is per-file, shared file must be per-run** — `conditionalOutput` emits only when referenced within that file. The shared file generator must emit all helpers whose option gates are satisfied, regardless of per-file reference counts. Call `makeUtils(options)` directly, not inside the per-file generation loop.

2. **Helper bodies are option-dependent — never hardcode** — `Builtin`, `DeepPartial`, `toTimestamp`, `MessageFns` all vary with `forceLong`, `useDate`, `oneof`, `outputEncodeMethods`, etc. Always generate the shared file via existing infrastructure to get option-correct output.

3. **exportCommonSymbols must be overridden for shared file** — `exportCommonSymbols=false` (forced when `outputIndex=true`) omits `export` from helpers. In proto-shared.ts, all helpers must be exported. Override this unconditionally in `generateSharedHelpers()`.

4. **globalThisPolyfill IIFE must be emitted first** — When `globalThisPolyfill=true`, the `gt` IIFE must appear before all other helpers that reference it. Emit it first in `generateSharedHelpers()`.

5. **Integration test workflow uses committed artifacts, not Jest snapshots** — Expected output files live in `integration/shared-helpers/` as committed source. Update by running `yarn proto2ts`, not `jest --updateSnapshot`.

6. **Helpers with user-type references cannot move** — MongoDB ObjectId and Struct wrapper helpers reference user-generated types and must remain inline even when `sharedHelpersFile=true`.

## Implications for Roadmap

Based on research, the implementation is a contained 5-step sequence with clear dependencies. Suggested phase structure:

### Phase 1: Option Registration
**Rationale:** Everything else depends on the option existing. This is zero-risk boilerplate with a fully established pattern.
**Delivers:** `sharedHelpersFile` option recognized and parsed by ts-proto CLI
**Addresses:** Foundational requirement — no output change yet, safe to land first
**Avoids:** No pitfalls at this stage

### Phase 2: generateSharedHelpers() Function
**Rationale:** The shared file generator must exist before `makeUtils()` can reference it, and before plugin.ts can call it. Creating it in isolation allows it to be tested and validated before connecting it to the per-file generation path.
**Delivers:** `proto-shared.ts` content — all option-gated helpers correctly exported in correct order
**Addresses:** All 23 movable helpers from FEATURES.md
**Avoids:** Pitfall 1 (per-file vs per-run semantics), Pitfall 2 (option-dependent bodies), Pitfall 3 (exportCommonSymbols override), Pitfall 4 (globalThisPolyfill ordering)

### Phase 3: makeUtils() Branching
**Rationale:** This is the most impactful change — switching per-file generation from inline `conditionalOutput()` to `imp()` references. Doing it after `generateSharedHelpers()` exists means the feature is complete end-to-end when this step lands.
**Delivers:** Per-file generated code imports from `./proto-shared` instead of inlining helpers
**Uses:** ts-poet `imp()` / `impFile()` for automatic relative path resolution
**Avoids:** Pitfall 3 (manual path computation), Pitfall 4 (Windows path separators — ts-poet handles internally), Pitfall 6 (non-movable helpers remain inline)

### Phase 4: plugin.ts Wiring
**Rationale:** Connects the generator to the output pipeline. Follows the `typeRegistry.ts` pattern exactly — minimal change, high confidence.
**Delivers:** End-to-end working feature: `protoc` with `sharedHelpersFile=true` produces `proto-shared.ts` alongside all generated files
**Implements:** `plugin.ts` output array addition after main `Promise.all`

### Phase 5: Integration Test
**Rationale:** The integration test validates the complete end-to-end behavior and prevents regression. Must come last since it requires the feature to work end-to-end to generate the committed expected output.
**Delivers:** `integration/shared-helpers/` test directory with committed expected output files and Jest test
**Avoids:** Pitfall 5 (correct test workflow — `yarn proto2ts` to regenerate, not jest snapshots)

### Phase Ordering Rationale

- Option registration must precede all other phases (all code paths gate on it)
- `generateSharedHelpers()` before `plugin.ts` wiring (plugin calls the function)
- `makeUtils()` branching before or alongside `generateSharedHelpers()` — they are interdependent and should be developed together in Phase 2/3
- Integration test last — requires working end-to-end output to generate committed artifacts

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (Option Registration):** Fully established pattern, ~5 lines of code
- **Phase 4 (plugin.ts Wiring):** Exact `typeRegistry.ts` pattern, ~5 lines of code
- **Phase 5 (Integration Test):** Established test directory structure, well-documented workflow

Phases that benefit from careful review during implementation:
- **Phase 2 (generateSharedHelpers):** The `conditionalOutput` semantics shift (per-file vs per-run) and the `exportCommonSymbols` override require careful attention. Not complex, but error-prone if the distinction is missed.
- **Phase 3 (makeUtils branching):** Need to enumerate all `makeUtils()` sub-functions and identify which return movable vs non-movable helpers. The FEATURES.md inventory is the reference.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct codebase inspection; existing patterns are fully established |
| Features | HIGH | Complete helper inventory from direct source inspection; movable vs non-movable distinction verified |
| Architecture | HIGH | Data flow verified by reading `plugin.ts`, `main.ts`, and ts-poet source; `maybeRelativePath()` behavior confirmed |
| Pitfalls | HIGH | All pitfalls derived from direct code inspection of option interactions and test infrastructure |

**Overall confidence:** HIGH

### Gaps to Address

- **GrpcWebError in shared file:** FEATURES.md marks this as "Possible (needs grpc-web import)" — it references the `grpc-web` npm package, not a user-generated type. Validate whether `imp()` from `grpc-web` resolves correctly in the shared file context, or whether `GrpcWebError` should remain inline. Low risk; easy to test.

- **Windows path separator in ts-poet:** PITFALLS.md flags that `path.relative()` may emit backslashes on Windows. Verify whether ts-poet's `imp()` normalizes this internally before adding manual normalization. Not testable in CI without a Windows runner.

- **`onlyTypes=true` interaction:** Helpers like `isSet`, `bytesFromBase64`, `MessageFns` encode/decode members should not appear when `onlyTypes=true`. Confirm that calling `makeUtils(options)` with `onlyTypes=true` naturally omits these via the existing option gates, requiring no special-case code in `generateSharedHelpers()`.

## Sources

### Primary (HIGH confidence)
- Direct inspection of `src/options.ts` — option registration pattern, `parseParamValue()` boolean handling
- Direct inspection of `src/plugin.ts` lines 55–69 — file output loop, `typeRegistry.ts` pattern
- Direct inspection of `src/main.ts` lines 451–513 — `makeUtils()`, `conditionalOutput` declaration loop, all `make*()` functions
- Direct inspection of `ts-poet/build/Import.js` — `maybeRelativePath()` behavior, `imp()` resolution
- Direct inspection of `integration/` directory structure — test workflow, expected output file pattern
- Direct inspection of existing `integration/` test directories — parameter file format, `-test.ts` naming

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
