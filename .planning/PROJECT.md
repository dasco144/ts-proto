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

### Active

- [ ] New option `sharedHelpersFile` (boolean, default false) added to `src/options.ts`
- [ ] When `sharedHelpersFile=true`, ts-proto generates `proto-shared.ts` at the root of `--ts_out`
- [ ] `proto-shared.ts` contains all common types: `DeepPartial`, `Exact`, `Builtin`, `KeysOfUnion`, `MessageFns`
- [ ] `proto-shared.ts` contains all common utility functions: `isSet`, `isObject`, `longToNumber`, and any other currently-inlined helpers
- [ ] Each generated file imports from `proto-shared.ts` using a computed relative path instead of inlining those declarations
- [ ] Feature is fully backwards-compatible — existing behavior unchanged when flag is off

### Out of Scope

- Configurable shared file path — output root with relative imports is sufficient for v1
- Per-type granularity (moving only some types to shared) — all-or-nothing is simpler
- Automatic migration tooling for existing codebases — not needed (generator always starts fresh)

## Context

ts-proto is a protoc plugin: it receives a `CodeGeneratorRequest` via stdin and writes a `CodeGeneratorResponse` to stdout. Each run generates all files from scratch — there is no patching of existing output. This means "removing" duplicated inline code is simply "don't emit that code block, emit an import instead."

The common types/helpers are emitted by functions in `src/main.ts` and related generation modules. The `sharedHelpersFile` flag needs to:
1. Trigger generation of an additional `proto-shared.ts` file in the response
2. Replace inline emission of those blocks with an import statement in each file

Integration tests use snapshot comparison against files in `integration/*/` directories. Adding a new integration test case (e.g., `integration/shared-helpers/`) with the expected `proto-shared.ts` output is the primary validation path.

## Constraints

- **Compatibility**: Must not change generated output when `sharedHelpersFile` is false — zero regression risk for existing users
- **Stack**: TypeScript + ts-poet for AST-based generation; `src/options.ts` owns all option definitions
- **Testing**: New integration test required; existing integration tests must continue passing unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Opt-in flag, not always-on | Backwards compatibility — existing users must not be affected | — Pending |
| File named `proto-shared.ts` | Descriptive, unlikely to collide with user-defined proto names | — Pending |
| Output root placement, relative imports | Simplest model — one file, all consumers know where it is | — Pending |
| All helpers move together | No partial modes to reason about; all-or-nothing is simpler | — Pending |

---
*Last updated: 2026-02-27 after initialization*
