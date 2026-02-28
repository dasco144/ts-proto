# ts-proto: Shared Helpers File

## What This Is

An opt-in feature for ts-proto that consolidates common generated types and utility functions into a single shared file (`proto-shared.ts`) instead of inlining them in every generated `.ts` file. When enabled via the `sharedHelpersFile` option, ts-proto generates one shared file at the output root and each proto-generated file imports from it rather than redeclaring the same types.

## Core Value

Eliminate duplication of common types and helpers across generated files — a large protobuf project should declare `DeepPartial`, `MessageFns`, `isSet`, etc. exactly once.

## Requirements

### Validated

- ✓ ts-proto generates TypeScript from `.proto` files via protoc plugin protocol — existing
- ✓ Generation is controlled via `--ts_proto_opt` option flags (`src/options.ts`) — existing
- ✓ Each generated file currently inlines all common types/helpers — existing
- ✓ Integration tests validate generated output via snapshot comparison — existing
- ✓ New option `sharedHelpersFile` (boolean, default false) added to `src/options.ts` — v1.0
- ✓ When `sharedHelpersFile=true`, ts-proto generates `proto-shared.ts` at the root of `--ts_out` — v1.0
- ✓ `proto-shared.ts` contains all movable helpers: `DeepPartial`, `Exact`, `isSet`, `isObject`, `longToNumber`, `bytesFromBase64`, `base64FromBytes`, `MessageFns`, timestamp helpers, extension types, and more (16 total) — v1.0
- ✓ Each generated file imports from `proto-shared.ts` using a computed relative path instead of inlining those declarations — v1.0
- ✓ Feature is fully backwards-compatible — existing behavior unchanged when flag is off (130 integration suites, 102 snapshots verified) — v1.0

### Active

*(No active requirements — next milestone not yet defined)*

### Out of Scope

- Configurable shared file path — output root with relative imports is sufficient for v1
- Per-type granularity (moving only some types to shared) — all-or-nothing is simpler
- Automatic migration tooling for existing codebases — not needed (generator always starts fresh)
- Custom filename/path (e.g., `--ts_proto_opt=sharedHelpersFile=my-shared.ts`) — deferred to v2
- Granular helper selection (e.g., move only `MessageFns`) — deferred to v2
- ESM-aware output (`export type` distinction) — deferred to v2

## Context

ts-proto is a protoc plugin: it receives a `CodeGeneratorRequest` via stdin and writes a `CodeGeneratorResponse` to stdout. Each run generates all files from scratch — there is no patching of existing output.

**Shipped v1.0 (2026-02-28):** The `sharedHelpersFile` option is implemented and tested. Key files added/modified:
- `src/options.ts` — `sharedHelpersFile: boolean` field + `defaultOptions()` entry
- `src/generate-shared-helpers.ts` — new 65-line module implementing `generateSharedHelpers(options)`
- `src/plugin.ts` — shared file emission + per-file `conditionalUtils` injection (~15 lines changed)
- `tests/generate-shared-helpers-test.ts` — 88-line unit test suite (14 assertions)
- `tests/import-injection-test.ts` — 63-line unit test suite (9 assertions)
- `integration/shared-helpers/` — full integration test with committed snapshots

**Architecture note:** `proto-shared.ts` imports `Timestamp` from `./google/protobuf/timestamp` (co-generated). This is expected — wellknown types are always generated alongside.

**Test coverage:** 131 test suites, 503 tests, 102 snapshots — all passing.

## Constraints

- **Compatibility**: Must not change generated output when `sharedHelpersFile` is false — zero regression risk for existing users
- **Stack**: TypeScript + ts-poet for AST-based generation; `src/options.ts` owns all option definitions
- **Testing**: New integration test required; existing integration tests must continue passing unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Opt-in flag, not always-on | Backwards compatibility — existing users must not be affected | ✓ Good — zero regressions confirmed |
| File named `proto-shared.ts` | Descriptive, unlikely to collide with user-defined proto names | ✓ Good — no collision in integration test |
| Output root placement, relative imports | Simplest model — one file, all consumers know where it is | ✓ Good — `./proto-shared`, `../../proto-shared` work cleanly |
| All helpers move together | No partial modes to reason about; all-or-nothing is simpler | ✓ Good — 16 helpers; 7 correctly excluded (user-generated type refs) |
| Use ts-poet `conditionalUtils` for import injection | ts-poet's built-in mechanism handles ConditionalOutput→import substitution + relative path resolution automatically | ✓ Good — eliminated need to rewrite `makeUtils()` branching |
| `generateSharedHelpers()` takes only `Options`, not `ctx` | `plugin.ts` doesn't create a `ctx` for the shared block; options are sufficient | ✓ Good — clean API, no unnecessary coupling |
| `exportCommonSymbols: true` forced inside `generateSharedHelpers()` | Shared file must always export everything regardless of user's `exportCommonSymbols` setting | ✓ Good — but requires threading through `makeXxx` helper functions |
| Builtin type not exported (inherits `makeDeepPartial` behavior) | `makeDeepPartial` hardcodes declaration without `maybeExport`; not worth changing | ✓ Accepted — `type Builtin` remains unexported, documented in VERIFICATION |

---
*Last updated: 2026-02-28 after v1.0 milestone*
