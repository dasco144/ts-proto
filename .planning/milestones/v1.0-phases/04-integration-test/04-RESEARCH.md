# Phase 4: Integration Test - Research

**Researched:** 2026-02-28
**Domain:** ts-proto integration test infrastructure (protoc + Jest + committed snapshots)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Proto fixture scope**
- Comprehensive — covers all option-gated helpers (not minimal)
- New file purpose-built for this test (not reused from another integration test)
- Must exercise all four key helper groups: timestamps (`google.protobuf.Timestamp`), byte fields (`bytes`), map fields, and repeated + nested messages
- Messages only — no service definitions

**Test depth**
- Snapshot-only: committed generated files are the expected output — no runtime `-test.ts` assertions
- Committed snapshots include BOTH `proto-shared.ts` AND all generated `.ts` message files
- Committed output files live directly in the integration directory (standard ts-proto in-place pattern); `yarn proto2ts` regenerates them; test passes if no diff

**Option variants**
- Baseline only: one integration directory, one `parameters.txt` with `sharedHelpersFile=true`
- Claude's discretion on any companion options to add alongside `sharedHelpersFile=true`
- No negative test (default/off behavior already validated by Phase 3 COMPAT-01, COMPAT-02)

**Nesting validation**
- Include a nested proto at two levels deep (`subdir/nested/minimal.proto`) to exercise relative import path `../../proto-shared`
- Nested proto is minimal — one simple message, purpose is to prove the import path computes correctly at depth-2
- Root-level protos carry the comprehensive helper-coverage exercise

### Claude's Discretion
- Exact companion options in `parameters.txt` (if any beyond `sharedHelpersFile=true`)
- Proto package name, message names, field names
- Whether to use one root `.proto` or multiple root-level protos
- Exact subdirectory name(s) for nesting

### Deferred Ideas (OUT OF SCOPE)
- Runtime behavioral test (`-test.ts` with encode/decode/fromPartial assertions) — could be a follow-up
- Additional option-combination variants (`globalThisPolyfill=true`, `importSuffix=.js`) — future phases or backlog items
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEST-01 | New integration test case exists with `sharedHelpersFile=true` that validates `proto-shared.ts` is generated with correct content | The committed `proto-shared.ts` snapshot IS the validation artifact — if it exists in the committed output and contains expected exports (DeepPartial, MessageFns, toTimestamp, bytesFromBase64 etc.), TEST-01 is satisfied |
| TEST-02 | Integration test validates that generated `.ts` files import from `proto-shared.ts` instead of inlining helpers | The committed `helpers.ts` and `subdir/nested/minimal.ts` snapshots must NOT contain inline helper declarations — they must contain `import { ... } from "./proto-shared"` and `import { ... } from "../../proto-shared"` respectively |
| TEST-03 | Integration test committed snapshot artifacts are up to date | Running `yarn proto2ts integration/shared-helpers` produces zero git diff — the committed files exactly match regenerated output |
</phase_requirements>

## Summary

Phase 4 creates `integration/shared-helpers/` — a new entry in the existing ts-proto integration test suite. The test infrastructure is already fully in place: `update-code.sh` drives protoc generation per-directory, Jest picks up `**/*-test.ts` files, and the "snapshot" pattern is the committed generated `.ts` files themselves.

The core work is: (1) write the proto fixture and minimal jest test file, (2) run `yarn proto2ts` to generate the output, (3) commit everything. The validation then flows from two independent checks: `yarn proto2ts` + zero git diff (files are current snapshots), and `yarn jest` passes (the generated code compiles and imports resolve correctly through proto-shared.ts).

The depth-2 nesting case (`subdir/nested/minimal.proto` generating `subdir/nested/minimal.ts` with `../../proto-shared` import) is the primary regression target for IMP-02. It is explicitly identified in the unit test `import-injection-test.ts` as needing end-to-end validation in Phase 4.

**Primary recommendation:** Create the directory, write the proto and test files, run `yarn proto2ts integration/shared-helpers`, inspect the generated files to confirm correctness, then commit all artifacts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| protoc | 3.19.1 (docker) | Compiles `.proto` → `.ts` via ts-proto plugin | The project's standard code generation tool; invoked via `yarn proto2ts` |
| Jest + ts-jest | (existing) | Runs integration `-test.ts` files | Already configured; `testMatch: ['<rootDir>/integration/**/*-test.ts']` |
| Docker Compose | (existing) | Runs protoc in isolation | `yarn proto2ts` calls `docker compose run --rm protoc update-code.sh` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@bufbuild/protobuf/wire` | (existing) | Runtime encoding/decoding in generated files | Always present in generated output |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `yarn proto2ts` (docker) | Running protoc directly | Docker ensures consistent protoc version; always prefer `yarn proto2ts` |

**Installation:**
```bash
# No new packages needed — everything is already installed
```

## Architecture Patterns

### Integration Test Directory Structure
```
integration/shared-helpers/
├── parameters.txt              # sharedHelpersFile=true (+ companion opts at discretion)
├── helpers.proto               # Root-level comprehensive fixture
├── helpers.ts                  # GENERATED + COMMITTED snapshot (root, ./proto-shared import)
├── proto-shared.ts             # GENERATED + COMMITTED snapshot (the key TEST-01 artifact)
├── google/
│   └── protobuf/
│       └── timestamp.ts        # GENERATED + COMMITTED snapshot (../../proto-shared import? no—only 2 levels: ../..? wait: google/protobuf = depth 2 -> ../../proto-shared)
├── subdir/
│   └── nested/
│       └── minimal.proto       # Minimal proto, purpose: depth-2 path validation
│       └── minimal.ts          # GENERATED + COMMITTED (../../proto-shared import)
└── shared-helpers-test.ts      # Jest test: minimal assertions (imports compile)
```

**Note on import path depths (confirmed via `maybeRelativePath` in ts-poet source):**
- `helpers.ts` (root) → `./proto-shared`
- `google/protobuf/timestamp.ts` (depth 2) → `../../proto-shared`
- `subdir/nested/minimal.ts` (depth 2) → `../../proto-shared`

### Pattern 1: `parameters.txt` Format
**What:** A comma-separated string of `key=value` options read by `update-code.sh` and passed to `--ts_proto_opt`
**When to use:** Always for integration tests that need non-default options
**Example:**
```
# integration/shared-helpers/parameters.txt
sharedHelpersFile=true
```
The script reads this file and prepends `annotateFilesWithVersion=false,` automatically.

### Pattern 2: Minimal Jest Test (Snapshot-Only Style)
**What:** A `-test.ts` that imports generated code and makes trivial assertions. Required for jest to include the directory; the real validation is the committed snapshot + no-diff from `yarn proto2ts`.
**When to use:** When the test goal is to validate generated code structure via snapshots, not runtime behavior.
**Example:**
```typescript
// integration/shared-helpers/shared-helpers-test.ts
import { Helpers } from "./helpers";

describe("shared-helpers", () => {
  it("compiles and imports resolve from proto-shared", () => {
    expect(Helpers).not.toBeUndefined();
  });
});
```
This verifies the import chain `helpers.ts → proto-shared.ts` compiles.

### Pattern 3: Comprehensive Root-Level Proto Fixture
**What:** A single `.proto` file that exercises all four helper groups.
**When to use:** When goal is to ensure all movable helpers appear in `proto-shared.ts`.
**Example structure:**
```protobuf
syntax = "proto3";
import "google/protobuf/timestamp.proto";
package sharedhelpers;

// Exercises: bytes (bytesFromBase64/base64FromBytes)
//            Timestamp (toTimestamp/fromTimestamp/fromJsonTimestamp) — active with default useDate=date
//            map (isSet)
//            repeated + nested messages (DeepPartial, Exact, MessageFns, isSet)
message Helpers {
  bytes data = 1;
  google.protobuf.Timestamp created_at = 2;
  map<string, google.protobuf.Timestamp> timestamp_map = 3;
  repeated Item items = 4;
  Item nested = 5;
}

message Item {
  string name = 1;
  int64 value = 2;   // exercises longToNumber
}
```

### Pattern 4: Depth-2 Minimal Proto
**What:** A trivial proto in `subdir/nested/` with one simple message. Sole purpose: force `subdir/nested/minimal.ts` to be generated so that `../../proto-shared` import path is committed and validated.
**Example:**
```protobuf
syntax = "proto3";
package sharedhelpers.nested;
message Minimal {
  string id = 1;
}
```

### Anti-Patterns to Avoid
- **Putting google/ .proto files in the test dir:** The google wellknown types (timestamp.proto) are resolved from protoc's system include — no need to copy proto files. Only the generated `.ts` files go in `google/protobuf/`.
- **Adding service definitions to the fixture:** CONTEXT explicitly says messages-only. Service definitions would trigger service-related helpers that are out of scope.
- **Adding a runtime `-test.ts` with encode/decode assertions:** That is deferred. Keep the test minimal.
- **Manually writing proto-shared.ts or helpers.ts:** These files MUST be generated by `yarn proto2ts`, not hand-crafted. The snapshot contract requires byte-for-byte match with what protoc produces.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative import path computation | Custom path logic | `yarn proto2ts` (ts-poet's `maybeRelativePath`) | Already implemented and tested in IMP-02; committing the generated output validates it |
| Helper content assertions | Regex-based file inspection in test | Committed snapshot + no-diff | The snapshot approach is the established ts-proto pattern; file inspection in tests is fragile |
| Proto compilation | Direct `protoc` invocation | `yarn proto2ts integration/shared-helpers` | Consistent docker environment; handles all flags correctly |

**Key insight:** The entire validation architecture (snapshot diff + jest compile check) is built into the existing ts-proto testing infrastructure. Nothing new needs to be built — just a correctly structured directory.

## Common Pitfalls

### Pitfall 1: google/protobuf generated files unexpectedly have inline helpers
**What goes wrong:** `google/protobuf/timestamp.ts` still contains inline `isSet`, `DeepPartial` etc. instead of importing from `../../proto-shared`.
**Why it happens:** The `conditionalUtils` injection only works for files in the main `filesToGenerate` set. If `timestamp.proto` is pulled in as a dependency, it might not be in the primary set.
**How to avoid:** Check the generated `google/protobuf/timestamp.ts` after running `yarn proto2ts`. If inline helpers are present, this is actually fine — the wellknown types may not have `conditionalUtils` applied (depends on the `emitImportedFiles` option). The primary validation is `helpers.ts` and `subdir/nested/minimal.ts`.
**Warning signs:** `proto-shared.ts` exists but `google/protobuf/timestamp.ts` still has inline helpers — this is not a bug, it's the expected behavior if timestamp.proto is processed differently.

### Pitfall 2: `yarn proto2ts` fails for `integration/shared-helpers` specifically
**What goes wrong:** `update-code.sh` errors when run for the new directory.
**Why it happens:** The script is run from within `integration/` and passes to `update-code.sh` the specific test dir. The docker container needs the directory to exist already.
**How to avoid:** Run `yarn proto2ts integration/shared-helpers` (passing the specific subdir). Alternatively run `yarn proto2ts` for all directories (slower).
**Warning signs:** Docker errors or protoc errors about missing proto files.

### Pitfall 3: Committed snapshot doesn't match on re-generation
**What goes wrong:** `yarn proto2ts` produces different output than the committed files.
**Why it happens:** `annotateFilesWithVersion=false` is always prepended by `update-code.sh`, but if the generated code includes version comments, the snapshot would drift. Also: file ordering, whitespace differences.
**How to avoid:** Always generate first, then commit. Never hand-edit generated files.
**Warning signs:** `git diff` shows changes to committed `.ts` files after running `yarn proto2ts`.

### Pitfall 4: Jest can't find the test (no `-test.ts`)
**What goes wrong:** The `shared-helpers` directory is not included in jest runs.
**Why it happens:** jest `testMatch` requires `**/*-test.ts`. Without a test file, the directory is invisible to jest.
**How to avoid:** Always create `shared-helpers-test.ts` with at least one `it()` assertion.
**Warning signs:** `yarn jest` passes but no test from `integration/shared-helpers` appears in output.

### Pitfall 5: `subdir/nested/minimal.proto` import path wrong
**What goes wrong:** The generated `minimal.ts` imports `./proto-shared` instead of `../../proto-shared`.
**Why it happens:** If `conditionalUtils` is not set correctly, or ts-poet's path resolution fails.
**How to avoid:** After generating, inspect `subdir/nested/minimal.ts` and verify the import path is `../../proto-shared`. This is the primary IMP-02 end-to-end regression check.
**Warning signs:** `minimal.ts` has inline helper declarations instead of an import from `../../proto-shared`.

## Code Examples

Verified patterns from codebase inspection:

### `update-code.sh` invocation (source: `/home/dan/projects/ts-proto/integration/update-code.sh`)
```bash
# Run proto2ts for a single integration test directory:
yarn proto2ts integration/shared-helpers

# Or run for all directories (slower):
yarn proto2ts
```
`update-code.sh` automatically:
1. Reads `parameters.txt` if it exists
2. Finds all `*.proto` files in the test directory (including subdirs)
3. Runs protoc with `--ts_proto_opt="annotateFilesWithVersion=false,{parameters}"`
4. Outputs generated files in-place relative to the test directory

### `parameters.txt` format (source: multiple integration tests)
```
# Minimal for this phase:
sharedHelpersFile=true

# Optional companion: none strictly needed.
# Default useDate=date already activates toTimestamp/fromTimestamp/fromJsonTimestamp.
# Can add useDate=true explicitly for clarity (treated as DateOption.DATE).
```

### Minimal jest test pattern (source: `integration/avoid-import-conflicts-folder-name/ui/simple-test.ts`)
```typescript
import { Helpers } from "./helpers";

describe("shared-helpers", () => {
  it("compiles and imports resolve from proto-shared", () => {
    expect(Helpers).not.toBeUndefined();
  });
});
```
This is the "compile check" pattern: if the import resolves and the module is defined, the generated import from `./proto-shared` is working correctly.

### What `proto-shared.ts` will look like (source: `generate-shared-helpers.ts` + Phase 2/3 implementation)
```typescript
// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// source: proto-shared.ts

/* eslint-disable */
export function bytesFromBase64(b64: string): Uint8Array { ... }
export function base64FromBytes(arr: Uint8Array): string { ... }
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = ...
export type Exact<P, I extends P> = ...
export function toTimestamp(date: Date): Timestamp { ... }
export function fromTimestamp(t: Timestamp): Date { ... }
export function fromJsonTimestamp(o: any): Date | string { ... }
export function isObject(value: any): boolean { ... }
export function isSet(value: any): boolean { ... }
export interface MessageFns<T> { ... }
// ... etc.
```

### What `helpers.ts` import will look like (source: plugin.ts IMP-01, IMP-02, IMP-03)
```typescript
// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// source: helpers.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { Timestamp } from "./google/protobuf/timestamp";
// Instead of inline helper declarations:
import { bytesFromBase64, base64FromBytes, DeepPartial, Exact, fromJsonTimestamp,
         fromTimestamp, isSet, longToNumber, MessageFns, toTimestamp } from "./proto-shared";
```

### What `subdir/nested/minimal.ts` import will look like (source: maybeRelativePath in ts-poet)
```typescript
// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// source: subdir/nested/minimal.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { DeepPartial, Exact, isSet, MessageFns } from "../../proto-shared";
//                                                   ^^ depth-2 relative path (IMP-02)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Helpers inlined in every generated file | Helpers centralized in `proto-shared.ts` with relative imports | Phase 2-3 (this project) | Eliminates duplication; this integration test validates the end-state |
| Manual test assertions for generated code content | Committed snapshot + `yarn proto2ts` no-diff | Established ts-proto pattern | Robust against whitespace and ordering changes in generated output |

**Deprecated/outdated:**
- None for this phase — all tooling is current.

## Open Questions

1. **Does `google/protobuf/timestamp.ts` get `conditionalUtils` applied?**
   - What we know: `filesToGenerate` filters based on `protoFilesToGenerate(request)`. The timestamp.proto is a wellknown type not directly listed in the request's files to generate unless `emitImportedFiles=true`.
   - What's unclear: Whether the generated `google/protobuf/timestamp.ts` will have inline helpers or import from `../../proto-shared`.
   - Recommendation: Generate first, inspect the actual output. If it has inline helpers, that's acceptable behavior — the primary TEST-02 target is `helpers.ts` (root) and `subdir/nested/minimal.ts` (depth-2), not the wellknown type wrappers. If it does get `conditionalUtils` applied, even better.

2. **Companion options for `parameters.txt`**
   - What we know: Default `useDate=date` already activates all timestamp helpers. `sharedHelpersFile=true` alone should exercise all four helper groups via the proto fixture. `longToNumber`/`numberToLong` are activated by `int64` fields in the proto.
   - Recommendation: Start with `sharedHelpersFile=true` only. Add `useDate=true` explicitly for clarity if desired (it's a no-op since it matches the default). No other companions needed.

## Sources

### Primary (HIGH confidence)
- Codebase: `/home/dan/projects/ts-proto/integration/update-code.sh` — exact generation mechanism
- Codebase: `/home/dan/projects/ts-proto/jest.config.js` — `testMatch` pattern confirms `**/*-test.ts`
- Codebase: `/home/dan/projects/ts-proto/src/plugin.ts` (lines 53-82) — `conditionalUtils` injection and `proto-shared.ts` emission
- Codebase: `/home/dan/projects/ts-proto/src/generate-shared-helpers.ts` — all 19 movable helpers listed
- Codebase: `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Import.js` (`maybeRelativePath` function) — relative path computation confirmed correct for depth-2
- Codebase: `/home/dan/projects/ts-proto/tests/import-injection-test.ts` — explicitly states "The full end-to-end is verified in the integration test (Phase 4)"
- Codebase: Multiple `integration/*/parameters.txt` files — exact format confirmed

### Secondary (MEDIUM confidence)
- Codebase: `integration/avoid-import-conflicts-folder-name/ui/simple-test.ts` — minimal compile-only jest test pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire toolchain inspected directly in codebase
- Architecture: HIGH — modeled directly on existing integration tests, update-code.sh behavior verified
- Pitfalls: MEDIUM — open question on `google/protobuf/timestamp.ts` behavior; all others HIGH based on code inspection

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable — toolchain does not change frequently)
