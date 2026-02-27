# Requirements: ts-proto sharedHelpersFile

**Defined:** 2026-02-27
**Core Value:** Eliminate duplication of common types and helpers across generated files — declare once, import everywhere

## v1 Requirements

### Option

- [x] **OPT-01**: `sharedHelpersFile` boolean option exists in `src/options.ts` with default `false`
- [x] **OPT-02**: Option can be passed via `--ts_proto_opt=sharedHelpersFile=true` and is correctly parsed

### Shared File Generation

- [ ] **GEN-01**: When `sharedHelpersFile=true`, a `proto-shared.ts` file is included in the generator output at the output root
- [ ] **GEN-02**: `proto-shared.ts` contains all safe-to-share helpers appropriate for the current options (DeepPartial, Exact, Builtin, KeysOfUnion, MessageFns, isSet, isObject, longToNumber, numberToLong, bytesFromBase64, base64FromBytes, timestamp helpers, extension types, etc.)
- [ ] **GEN-03**: All declarations in `proto-shared.ts` are exported (regardless of `exportCommonSymbols` option)
- [ ] **GEN-04**: When `globalThisPolyfill=true`, the `gt` polyfill IIFE is emitted first in `proto-shared.ts`
- [ ] **GEN-05**: Helpers that reference user-generated types (MongoDB ObjectId helpers, Struct/Value/ListValue/FieldMask wrapper interfaces) are NOT included in `proto-shared.ts` and continue to be inlined in individual files

### Per-File Import Injection

- [ ] **IMP-01**: When `sharedHelpersFile=true`, each generated `.ts` file imports movable helpers from `proto-shared.ts` instead of declaring them inline
- [ ] **IMP-02**: Import paths are correctly computed as relative paths (e.g., `./proto-shared`, `../proto-shared`, `../../proto-shared`) based on the generated file's output location
- [ ] **IMP-03**: `importSuffix` option is respected in the import path (e.g., `proto-shared.js` when `importSuffix=.js`)

### Backwards Compatibility

- [ ] **COMPAT-01**: When `sharedHelpersFile=false` (default), generated output is identical to current behavior — no regressions
- [ ] **COMPAT-02**: All existing integration tests pass unchanged

### Testing

- [ ] **TEST-01**: New integration test case exists with `sharedHelpersFile=true` that validates `proto-shared.ts` is generated with correct content
- [ ] **TEST-02**: Integration test validates that generated `.ts` files import from `proto-shared.ts` instead of inlining helpers
- [ ] **TEST-03**: Integration test committed snapshot artifacts are up to date

## v2 Requirements

### Extended Scope
- **V2-01**: `sharedHelpersFile` accepts a custom filename/path (instead of always `proto-shared.ts`)
- **V2-02**: Granular control — option to move only specific helpers (e.g., only `MessageFns`)
- **V2-03**: ESM-aware output (`export type` vs `export` distinction for all helpers)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic migration tooling | Generator always starts fresh; no migration needed |
| Per-directory shared files | One file per run is simpler and sufficient |
| Removing helpers from non-sharedHelpersFile mode | Backward compatibility — existing users must not be affected |
| MongoDB ObjectId helpers in shared file | Reference user-generated `ObjectId` type; cannot be decoupled |
| Struct/Value/ListValue/FieldMask wrapper interfaces in shared file | Reference user-generated message types; cannot be decoupled |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPT-01 | Phase 1 | Complete (2026-02-27) |
| OPT-02 | Phase 1 | Complete (2026-02-27) |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-05 | Phase 2 | Pending |
| IMP-01 | Phase 3 | Pending |
| IMP-02 | Phase 3 | Pending |
| IMP-03 | Phase 3 | Pending |
| COMPAT-01 | Phase 3 | Pending |
| COMPAT-02 | Phase 3 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
