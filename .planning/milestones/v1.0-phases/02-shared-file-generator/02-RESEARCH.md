# Phase 2: Shared File Generator - Research

**Researched:** 2026-02-27
**Domain:** ts-proto code generation internals — ts-poet ConditionalOutput, Utils factory, extra-file generation pattern
**Confidence:** HIGH

## Summary

Phase 2 requires implementing a `generateSharedHelpers(options)` function that produces the `proto-shared.ts` file content containing all movable helpers. All the mechanisms needed already exist in the codebase and in ts-poet 6.12.0 — this is a function-composition problem, not a new-technology problem.

The core pattern is: `makeUtils({ ...options, exportCommonSymbols: true })` produces all `ConditionalOutput` instances for every helper. We then select the subset that does NOT reference user-generated types (21 of 28 helpers), pass them to `generateConditionalsUtils()` from ts-poet in the correct order (globalThis polyfill first if enabled), and get back a `Code` value ready for `toString()`. The result is wired into `plugin.ts` using the exact same pattern as the existing `typeRegistry.ts` extra-file generation.

The only non-trivial design decisions are: (1) how to force `export` on the 5 helpers that use `${maybeExport}` (solved by overriding `exportCommonSymbols: true`), and (2) which helpers are excluded (7 user-type-referencing ones). The `generateConditionalsUtils` function from ts-poet handles transitive dependencies automatically — if a helper references `globalThis` (which is an empty ConditionalOutput when `globalThisPolyfill=false`), the empty declaration generates nothing, which is correct behavior.

**Primary recommendation:** Create `src/generate-shared-helpers.ts` with a `generateSharedHelpers(options)` function. Use `makeUtils` from `main.ts` with `exportCommonSymbols` forced to `true`, filter the 7 excluded helpers, order `globalThisPolyfill` first, call `generateConditionalsUtils()`, and add the file to `plugin.ts` output under `if (options.sharedHelpersFile)`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | When `sharedHelpersFile=true`, a `proto-shared.ts` file is included in the generator output at the output root | Add a `if (options.sharedHelpersFile)` block in `plugin.ts` following the `outputTypeRegistry` pattern; call `generateSharedHelpers`, `toString()`, `files.push()` |
| GEN-02 | `proto-shared.ts` contains all safe-to-share helpers appropriate for the current options | Select 21 movable ConditionalOutput instances from `makeUtils()` result; `generateConditionalsUtils()` handles option-gated helpers naturally (unused helpers emit nothing) |
| GEN-03 | All declarations in `proto-shared.ts` are exported regardless of `exportCommonSymbols` option | Force `exportCommonSymbols: true` when calling `makeUtils()` inside `generateSharedHelpers()` — this makes `maybeExport = "export"` in all 5 affected helpers |
| GEN-04 | When `globalThisPolyfill=true`, the `gt` IIFE appears first in `proto-shared.ts` | Put `globalThisPolyfill` first in the array passed to `generateConditionalsUtils()` when the option is enabled |
| GEN-05 | Helpers referencing user-generated types are absent from `proto-shared.ts` | Exclude `StructWrapperFns`, `AnyValueWrapperFns`, `ListValueWrapperFns`, `FieldMaskWrapperFns`, `fromProtoObjectId`, `fromJsonObjectId`, `toProtoObjectId` from the helpers array |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-poet | 6.12.0 | Code generation primitives — `ConditionalOutput`, `generateConditionalsUtils`, `Code`, `joinCode` | Already the code generation library for all of ts-proto; confirmed in package.json |
| TypeScript | ~5.8.3 | Implementation language | Project language; strict mode confirmed in tsconfig.json |
| Jest + ts-jest | jest ^29.6.1, ts-jest ^29.3.4 | Unit test framework | Already configured; tests in `tests/` run without build step |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `generateConditionalsUtils` | ts-poet 6.12.0 | Accepts array of `ConditionalOutput` objects, emits their declarations plus transitive deps | Use to build `proto-shared.ts` body — handles deps (e.g. `longToNumber` needing `globalThis`) automatically |
| `conditionalUtils` option on `Code.toString()` | ts-poet 6.12.0 | When set to a file path, replaces all `ConditionalOutput` usages with imports from that file | Used in Phase 3 (per-file import injection) — NOT needed in Phase 2 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateConditionalsUtils(helpers)` | Manually joining `helper.ifUsed` for each | Manual approach breaks on transitive deps; `generateConditionalsUtils` handles the case where `Exact` depends on `Builtin` correctly |
| `makeUtils({ ...options, exportCommonSymbols: true })` | Writing separate declaration strings | Re-implementing the helper code would create a maintenance burden; using the existing `make*` functions is the only safe approach |

**Installation:** No new packages required.

## Architecture Patterns

### How Extra Files Are Generated (confirmed by reading `src/plugin.ts` and `src/generate-type-registry.ts`)

ts-proto generates extra output files by accumulating them in the `files` array in `plugin.ts`. The pattern:

```typescript
// src/plugin.ts — existing pattern for typeRegistry.ts
if (options.outputTypeRegistry) {
  const utils = makeUtils(options);
  const ctx: BaseContext = { options, typeMap, utils };
  const path = "typeRegistry.ts";
  const code = generateTypeRegistry(ctx);
  const content = code.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion), path });
  files.push({ name: path, content });
}
```

Phase 2 adds an analogous block:

```typescript
if (options.sharedHelpersFile) {
  const path = "proto-shared.ts";
  const sharedCode = generateSharedHelpers(options);
  const content = sharedCode.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion), path });
  files.push({ name: path, content });
}
```

Note: `generateSharedHelpers` does NOT need a `ctx` parameter — it only needs `options`, not `typeMap` or per-file context.

### How the Utils Factory Works (confirmed by reading `src/main.ts` lines 495-513)

```typescript
// src/main.ts — makeUtils creates ALL conditional helpers
export function makeUtils(options: Options): Utils {
  const bytes = makeByteUtils(options);
  const longs = makeLongUtils(options, bytes);
  const deepPartial = makeDeepPartial(options, longs);
  const extension = makeExtensionClass(options);
  return {
    ...bytes,        // globalThis, bytesFromBase64, base64FromBytes
    ...deepPartial,  // Builtin, DeepPartial, Exact
    ...makeObjectIdMethods(),      // fromProtoObjectId, fromJsonObjectId, toProtoObjectId (EXCLUDED)
    ...makeTimestampMethods(options, longs, bytes), // toTimestamp, fromTimestamp, fromJsonTimestamp
    ...longs,        // numberToLong, longToNumber (+ Long import)
    ...makeComparisonUtils(),      // isObject, isSet
    ...makeNiceGrpcServerStreamingMethodResult(options), // NiceGrpcServerStreamingMethodResult
    ...makeGrpcWebErrorClass(bytes),  // GrpcWebError
    ...extension,    // Extension
    ...makeAssertionUtils(bytes),     // fail
    ...makeMessageFns(options, deepPartial, extension), // MessageFns, ExtensionFns, ExtensionHolder, + 4 EXCLUDED wrappers
  };
}
```

### Helper Classification (HIGH confidence — verified by code reading)

**28 total `conditionalOutput()` calls in `src/main.ts`. The `globalThis` variable at line 588 is not a new helper — it is either the same object as `globalThisPolyfill` (when `globalThisPolyfill=true`) or a new empty placeholder (when `globalThisPolyfill=false`).**

**Movable (21 ConditionalOutput objects, emitted in `proto-shared.ts`):**
| Helper Name | Make Function | Notes |
|-------------|---------------|-------|
| `gt` (globalThisPolyfill) | `makeByteUtils` | FIRST when `globalThisPolyfill=true`; absent when `false` |
| `bytesFromBase64` | `makeByteUtils` | Option-gated on `env` |
| `base64FromBytes` | `makeByteUtils` | Option-gated on `env` |
| `Builtin` | `makeDeepPartial` | Always present |
| `Exact` | `makeDeepPartial` | Contains inline `KeysOfUnion<T>` type |
| `DeepPartial` | `makeDeepPartial` | Option-gated via `maybeLong`, `oneofCase` |
| `numberToLong` | `makeLongUtils` | Only when `forceLong=LONG` |
| `longToNumber` | `makeLongUtils` | Only when longs used |
| `toTimestamp` | `makeTimestampMethods` | Only when timestamps used |
| `fromTimestamp` | `makeTimestampMethods` | Only when timestamps used |
| `fromJsonTimestamp` | `makeTimestampMethods` | Only when timestamps used |
| `isObject` | `makeComparisonUtils` | Always present |
| `isSet` | `makeComparisonUtils` | Always present |
| `MessageFns` | `makeMessageFns` | Uses `maybeExport` |
| `ExtensionFns` | `makeMessageFns` | Uses `maybeExport` |
| `ExtensionHolder` | `makeMessageFns` | Uses `maybeExport` |
| `NiceGrpcServerStreamingMethodResult` | `makeNiceGrpcServerStreamingMethodResult` | Only for nice-grpc |
| `GrpcWebError` | `makeGrpcWebErrorClass` | Only for grpc-web |
| `Extension` | `makeExtensionClass` | Only for extensions |
| `fail` | `makeAssertionUtils` | Always present |

**Excluded (7 — reference user-generated types):**
| Helper Name | Reason Excluded |
|-------------|-----------------|
| `StructWrapperFns` | References `wrapTypeName(options, "Struct")` — user-generated Struct interface |
| `AnyValueWrapperFns` | References `wrapTypeName(options, "Value")` — user-generated Value interface |
| `ListValueWrapperFns` | References `wrapTypeName(options, "ListValue")` — user-generated ListValue interface |
| `FieldMaskWrapperFns` | References `wrapTypeName(options, "FieldMask")` — user-generated FieldMask interface |
| `fromProtoObjectId` | References user-generated `ObjectId` type |
| `fromJsonObjectId` | References user-generated `ObjectId` type |
| `toProtoObjectId` | References user-generated `ObjectId` type |

### The `export` Problem and Solution (HIGH confidence)

Five helpers have `${maybeExport}` in their declaration code, computed as `options.exportCommonSymbols ? "export" : ""`:
- `DeepPartial`, `Exact` (in `makeDeepPartial`)
- `MessageFns`, `ExtensionFns`, `ExtensionHolder` (in `makeMessageFns`)

**Solution:** Call `makeUtils({ ...options, exportCommonSymbols: true })` inside `generateSharedHelpers`. This forces `maybeExport = "export"` for all helpers, guaranteeing the shared file always exports everything regardless of the user's `exportCommonSymbols` setting.

This does NOT affect the per-file generation in `generateFile()` — that code calls `makeUtils(options)` (without override) as before.

### The `globalThisPolyfill` Ordering Pattern

```typescript
// Correct ordering approach in generateSharedHelpers:
function getMovableHelpers(utils: Utils, options: Options): ConditionalOutput[] {
  const helpers: ConditionalOutput[] = [];

  // GEN-04: globalThisPolyfill MUST be first if enabled
  if (options.globalThisPolyfill) {
    helpers.push(utils.globalThis); // This IS the globalThisPolyfill when enabled
  }

  // Remaining movable helpers in any order
  helpers.push(
    utils.bytesFromBase64,
    utils.base64FromBytes,
    utils.Builtin,
    utils.Exact,
    utils.DeepPartial,
    utils.numberToLong,
    utils.longToNumber,
    utils.toTimestamp,
    utils.fromTimestamp,
    utils.fromJsonTimestamp,
    utils.isObject,
    utils.isSet,
    utils.MessageFns,
    utils.ExtensionFns,
    utils.ExtensionHolder,
    utils.NiceGrpcServerStreamingMethodResult,
    utils.GrpcWebError,
    utils.Extension,
    utils.fail,
  );

  return helpers;
}
```

`generateConditionalsUtils(helpers)` then emits only those that are actually referenced (used) — unused helpers generate empty strings. This satisfies GEN-02: option-gated helpers that are absent in the current options are silently skipped.

### Anti-Patterns to Avoid

- **Emitting helpers unconditionally:** `generateConditionalsUtils` already handles option-gating — helpers that are never used in the file produce nothing. Do NOT attempt to pre-filter based on options (e.g., don't skip `numberToLong` when `forceLong !== LONG`). The `ConditionalOutput.ifUsed` mechanism already handles this.

  Actually: in the standalone `proto-shared.ts` context, there IS no "usage" that triggers conditionalOutputs — ALL helpers should be emitted regardless of whether a specific proto file uses them. The shared file is a library of all helpers; each individual file imports only what it needs. This means we must emit all helpers directly, not relying on the `ifUsed` mechanism.

- **Using `ifUsed` chain instead of `generateConditionalsUtils`:** `helper.ifUsed` only emits the helper if it was referenced somewhere in the code tree above it. Since `proto-shared.ts` has no "usage sites" — it IS the declaration site — we must pass helpers directly to `generateConditionalsUtils()` which unconditionally emits all passed helpers' `declarationSiteCode`.

- **Passing the original `options` to `makeUtils` inside `generateSharedHelpers`:** Without `exportCommonSymbols: true` override, helpers like `DeepPartial` would be declared without `export` when the user has `exportCommonSymbols=false`, breaking imports from other files.

- **Adding the file to `files` when `sharedHelpersFile=false`:** The block must be gated on `options.sharedHelpersFile` — only generate when the option is true.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emitting all helper declarations | Writing helper code as raw strings | `generateConditionalsUtils(helpers)` from ts-poet | Transitive dependencies (e.g. `Exact` needing `Builtin`) are handled automatically |
| Tracking which helpers are used | Custom dependency graph | `generateConditionalsUtils` handles this — it collects nested `ConditionalOutput` references from each declaration's code | The implementation is already in ts-poet |
| Export keyword on declarations | Manual string manipulation | `makeUtils({ ...options, exportCommonSymbols: true })` | Computed when the helper is created; forcing the option at creation time is the only correct approach |
| File header comment | Custom prefix string | `getTsPoetOpts(options, tsProtoVersion, protocVersion)` — already used for typeRegistry.ts and all other files | Provides the "Code generated by protoc-gen-ts_proto" header automatically |

**Key insight:** `generateConditionalsUtils` was built specifically for generating a "utils file" from a list of `ConditionalOutput` instances. The ts-poet 6.12.0 source confirms this is its documented use case. The companion `conditionalUtils` option on `toString()` is Phase 3's tool (for replacing inline declarations with imports). Phase 2 uses only `generateConditionalsUtils`.

## Common Pitfalls

### Pitfall 1: Confusing "used" vs "all" in ConditionalOutput semantics
**What goes wrong:** If you wrap helper declarations in `code\`${helper.ifUsed}\`` inside the shared file, only helpers that were referenced somewhere in the code tree will emit. In the shared file, there ARE no usage sites — only declarations — so everything would be suppressed.
**Why it happens:** `ifUsed` is designed for per-proto files where the helper is referenced by generated message code. The shared file has no such references.
**How to avoid:** Pass helpers directly to `generateConditionalsUtils(helpers)` rather than using `helper.ifUsed`. This unconditionally emits each helper's `declarationSiteCode`.
**Warning signs:** Generated `proto-shared.ts` is empty or nearly empty despite helpers being specified.

### Pitfall 2: Forgetting the `Long` import is NOT a ConditionalOutput
**What goes wrong:** `makeLongUtils` returns `{ numberToLong, longToNumber, Long }` where `Long` is an `imp("Long=long")` import, not a `ConditionalOutput`. Including `Long` in the helpers array passed to `generateConditionalsUtils` would cause a type error or incorrect behavior.
**Why it happens:** The `Utils` type contains non-`ConditionalOutput` members (the `Long` import). Blindly spreading all `Utils` members into the helpers array would be wrong.
**How to avoid:** Filter by `instanceof ConditionalOutput` OR explicitly list only the known `ConditionalOutput` members by name. The explicit list approach (shown in Architecture Patterns above) is safer.
**Warning signs:** TypeScript error "Argument of type 'Import' is not assignable to parameter of type 'ConditionalOutput[]'".

### Pitfall 3: The `globalThis` placeholder at line 588
**What goes wrong:** When `globalThisPolyfill=false`, `utils.globalThis` is a new empty `conditionalOutput("globalThis", code\`\`)`. If you include it in the shared helpers array, it emits nothing (empty declaration). More importantly, `utils.globalThis` and `utils.globalThis` (the polyfill version) are different objects when the option is false — you cannot use `utils.globalThis` to mean "the gt IIFE".
**Why it happens:** The variable `globalThis` at line 588 is an alias: either `globalThisPolyfill` (the IIFE) or a new empty placeholder. In `makeByteUtils`, only the polyfill object is returned as `globalThis` when the option is true.
**How to avoid:** For Phase 2, when checking GEN-04, check `options.globalThisPolyfill` to decide if the polyfill should be first. The `utils.globalThis` value IS the IIFE object when `globalThisPolyfill=true`, so including it first when the option is true is correct. Do not include it at all when `globalThisPolyfill=false`.
**Warning signs:** `proto-shared.ts` has an empty `const gt: any = (() => {})()` or missing gt declaration.

### Pitfall 4: `makeUtils` is called with original options in `generateFile`
**What goes wrong:** If you modify `makeUtils` to always force `exportCommonSymbols: true`, it would break the per-file generation where the user's setting is intentionally respected.
**Why it happens:** The option override must only apply inside `generateSharedHelpers`, not globally.
**How to avoid:** In `generateSharedHelpers(options)`, call `makeUtils({ ...options, exportCommonSymbols: true })` locally. Do NOT change the `makeUtils(options)` call in `plugin.ts` that serves `generateFile`.
**Warning signs:** Integration tests that use `exportCommonSymbols=false` start emitting `export` on previously-unexported DeepPartial types.

### Pitfall 5: `proto-shared.ts` filename conflict with user protos
**What goes wrong:** If the user has a `proto-shared.proto` file, the generated `proto-shared.ts` would conflict with the generated file from that proto.
**Why it happens:** The filename is fixed as `proto-shared.ts`. This is a known constraint, documented in REQUIREMENTS.md Out of Scope.
**How to avoid:** Not a Phase 2 concern — no mitigation needed in this phase. The filename is specified in requirements.

## Code Examples

### Pattern 1: generateSharedHelpers function structure

```typescript
// src/generate-shared-helpers.ts
import { generateConditionalsUtils, ConditionalOutput } from "ts-poet";
import { makeUtils } from "./main";
import { Options } from "./options";
import { Code } from "ts-poet";

export function generateSharedHelpers(options: Options): Code {
  // Force exportCommonSymbols=true to ensure all declarations use `export`
  // This satisfies GEN-03 regardless of the user's exportCommonSymbols setting
  const utils = makeUtils({ ...options, exportCommonSymbols: true });

  const helpers: ConditionalOutput[] = [];

  // GEN-04: globalThisPolyfill (gt IIFE) MUST be first
  if (options.globalThisPolyfill) {
    helpers.push(utils.globalThis as ConditionalOutput);
  }

  // All movable helpers — GEN-02, GEN-05: excluded list below
  helpers.push(
    utils.bytesFromBase64,
    utils.base64FromBytes,
    utils.Builtin,
    utils.Exact,
    utils.DeepPartial,
    utils.numberToLong,
    utils.longToNumber,
    utils.toTimestamp,
    utils.fromTimestamp,
    utils.fromJsonTimestamp,
    utils.isObject,
    utils.isSet,
    utils.MessageFns,
    utils.ExtensionFns,
    utils.ExtensionHolder,
    utils.NiceGrpcServerStreamingMethodResult,
    utils.GrpcWebError,
    utils.Extension,
    utils.fail,
    // GEN-05: EXCLUDED — reference user-generated types:
    // utils.StructWrapperFns, utils.AnyValueWrapperFns,
    // utils.ListValueWrapperFns, utils.FieldMaskWrapperFns,
    // utils.fromProtoObjectId, utils.fromJsonObjectId, utils.toProtoObjectId
  );

  return generateConditionalsUtils(helpers);
}
```

### Pattern 2: Wiring into plugin.ts (following outputTypeRegistry pattern)

```typescript
// src/plugin.ts — add after the outputTypeRegistry block
if (options.sharedHelpersFile) {
  const path = "proto-shared.ts";
  const sharedCode = generateSharedHelpers(options);
  const content = sharedCode.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion), path });
  files.push({ name: path, content });
}
```

### Pattern 3: Unit test pattern (following `tests/utils-test.ts` structure)

```typescript
// tests/generate-shared-helpers-test.ts
import { generateSharedHelpers } from "../src/generate-shared-helpers";
import { defaultOptions } from "../src/options";

describe("generateSharedHelpers", () => {
  it("exports DeepPartial regardless of exportCommonSymbols", () => {
    const code = generateSharedHelpers({ ...defaultOptions(), exportCommonSymbols: false });
    const output = code.toString();
    expect(output).toContain("export type DeepPartial");
  });

  it("puts gt IIFE first when globalThisPolyfill=true", () => {
    const code = generateSharedHelpers({ ...defaultOptions(), globalThisPolyfill: true });
    const output = code.toString();
    const gtPos = output.indexOf("const gt");
    const deepPartialPos = output.indexOf("DeepPartial");
    expect(gtPos).toBeLessThan(deepPartialPos);
  });

  it("excludes StructWrapperFns", () => {
    const code = generateSharedHelpers(defaultOptions());
    expect(code.toString()).not.toContain("StructWrapperFns");
  });

  it("excludes ObjectId helpers", () => {
    const code = generateSharedHelpers(defaultOptions());
    const output = code.toString();
    expect(output).not.toContain("fromProtoObjectId");
    expect(output).not.toContain("fromJsonObjectId");
    expect(output).not.toContain("toProtoObjectId");
  });
});
```

### Pattern 4: generateConditionalsUtils behavior (from ts-poet test suite)

```typescript
// From /node_modules/ts-poet/build/ConditionalOutput.tests.js
const someType = conditionalOutput("SomeType", code`type SomeType = number`);
const someId = conditionalOutput("SomeId", code`type SomeId = string | ${someType}`);
const codeChunk = code`declare const id: ${someId}`;
const utils = codeChunk.collectConditionalOutputs();
const utilsCode = generateConditionalsUtils(utils);
expect(utilsCode.toString()).toBe("type SomeType = number;\ntype SomeId = string | SomeType;\n");
// Transitive dep (someType) is automatically hoisted before someId
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | All helpers are `ConditionalOutput` objects, emitted via `ifUsed` at bottom of each generated file | Established pattern throughout project | Well-understood; Phase 2 reuses the same helper objects for the shared file |
| N/A | `generateConditionalsUtils` in ts-poet 6.12.0 was added specifically for generating utils files | ts-poet 6.12.0 release | Direct solution for Phase 2 — already in the installed version |

**No deprecated patterns in scope for this phase.**

## Open Questions

1. **Should `generateSharedHelpers` take `(options)` or `(ctx: BaseContext)`?**
   - What we know: `generate-type-registry.ts` takes `ctx: BaseContext` (has options + typeMap + utils). `generateSharedHelpers` only needs `options` — it creates its own `utils` internally.
   - Recommendation: Take `options: Options` only. This is simpler and avoids confusion about which `utils` the caller should pass (the shared file needs a `utils` with `exportCommonSymbols: true` override).

2. **What is the exact "23 movable helpers" count from the requirements?**
   - What we know: Code analysis finds 28 `conditionalOutput()` calls: 7 are excluded (user-type-referencing), leaving 21 movable ConditionalOutput objects. The empty globalThis placeholder (line 588 when `globalThisPolyfill=false`) is not emitted.
   - What's unclear: The requirements say "23" — this may count `KeysOfUnion` (embedded inline in `Exact`'s declaration text) as a separate helper, or may count the `Builtin` type that DeepPartial references. The exact number does not affect implementation — the excluded list is what matters.
   - Recommendation: Implement against the excluded list (7 helpers), not a target count. The count can be verified post-implementation.

3. **Should the `globalThis` empty placeholder be included in the helpers array when `globalThisPolyfill=false`?**
   - What we know: When `globalThisPolyfill=false`, `utils.globalThis` is `conditionalOutput("globalThis", code``)`. Its `declarationSiteCode` is empty. Including it would emit nothing extra.
   - Recommendation: Exclude it when `globalThisPolyfill=false` (only include when it IS the IIFE). Cleaner and avoids adding an empty entry to the helpers array. The conditional `if (options.globalThisPolyfill) helpers.push(utils.globalThis)` is correct.

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — this section is included based on the presence of a test framework.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.6.1 + ts-jest 29.3.4 |
| Config file | `jest.config.js` (root) |
| Quick run command | `yarn jest tests/generate-shared-helpers-test.ts` |
| Full suite command | `yarn test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | `proto-shared.ts` appears in plugin output when `sharedHelpersFile=true` | unit (plugin integration) | `yarn jest tests/generate-shared-helpers-test.ts` | No — Wave 0 |
| GEN-02 | Returned code contains all option-appropriate helpers | unit | `yarn jest tests/generate-shared-helpers-test.ts` | No — Wave 0 |
| GEN-03 | All declarations use `export` regardless of `exportCommonSymbols` | unit | `yarn jest tests/generate-shared-helpers-test.ts` | No — Wave 0 |
| GEN-04 | `gt` IIFE appears first when `globalThisPolyfill=true` | unit | `yarn jest tests/generate-shared-helpers-test.ts` | No — Wave 0 |
| GEN-05 | Excluded helpers (ObjectId, Struct/Value/ListValue/FieldMask wrappers) absent | unit | `yarn jest tests/generate-shared-helpers-test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `yarn jest tests/generate-shared-helpers-test.ts`
- **Per wave merge:** `yarn test` (all unit tests, no integration — Phase 4 handles integration)
- **Phase gate:** Unit tests green; integration tests remain untouched

### Wave 0 Gaps
- [ ] `tests/generate-shared-helpers-test.ts` — covers GEN-01 through GEN-05
- [ ] `src/generate-shared-helpers.ts` — the implementation file (not a test file, but required before tests can import)

*(Existing test infrastructure is sufficient; no framework install or config changes needed.)*

## Sources

### Primary (HIGH confidence)
- Direct code reading of `/home/dan/projects/ts-proto/src/main.ts` lines 459-513, 541-1185 — complete understanding of all 28 `conditionalOutput` calls, `makeUtils`, `Utils` type, helper classification
- Direct code reading of `/home/dan/projects/ts-proto/src/plugin.ts` — full understanding of extra-file generation pattern (outputTypeRegistry block lines 60-68, outputIndex block lines 71-76)
- Direct code reading of `/home/dan/projects/ts-proto/src/generate-type-registry.ts` — confirmed extra-file generator pattern (function takes `ctx: BaseContext`, returns `Code`)
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/ConditionalOutput.d.ts` — ConditionalOutput API (`ifUsed`, `declarationSiteCode`, `usageSiteName`, `isType`)
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/index.d.ts` — `generateConditionalsUtils` signature
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/Code.d.ts` — `ToStringOpts` including `conditionalUtils` option
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/index.js` — `generateConditionalsUtils` implementation (lines 68-79)
- Direct reading of `/home/dan/projects/ts-proto/node_modules/ts-poet/build/ConditionalOutput.tests.js` — `generateConditionalsUtils` usage examples and behavior

### Secondary (MEDIUM confidence)
- Direct reading of `/home/dan/projects/ts-proto/src/options.ts` lines 366-395 — `getTsPoetOpts` function confirming file header generation pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by direct code reading; ts-poet 6.12.0 confirmed installed
- Architecture: HIGH — confirmed by direct code reading of all relevant source files; `generateConditionalsUtils` behavior confirmed from implementation source
- Pitfalls: HIGH — pitfalls derived from code analysis, not speculation; each has a concrete code reference

**Research date:** 2026-02-27
**Valid until:** 2026-04-28 (stable codebase; ts-poet is a locked dependency)
