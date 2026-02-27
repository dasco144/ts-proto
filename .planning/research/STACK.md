# Technology Stack Research: ts-proto sharedHelpersFile

**Project:** ts-proto — sharedHelpersFile option
**Date:** 2026-02-27
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Recommended Stack

This is a subsequent milestone in an existing TypeScript codebase. **No new dependencies required.**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.8.3 | Implementation language | Existing project language |
| ts-poet | 6.12.0 (installed) | Code AST + import management + file output | Already used; handles import deduplication and relative path computation automatically |
| ts-proto-descriptors | 2.1.0 | Protobuf descriptor types | Already used for CodeGeneratorRequest/Response |

---

## How to Add a New Boolean Option

### Step 1 — Add to `Options` type in `src/options.ts`
```ts
sharedHelpersFile: boolean;
```

### Step 2 — Add default in `defaultOptions()`
```ts
sharedHelpersFile: false,
```

`parseParamValue()` already converts `"true"`/`"false"` strings to booleans for all boolean fields automatically. No additional parsing needed.

Integration test `parameters.txt` would contain:
```
sharedHelpersFile=true
```

---

## How ts-poet Handles File Output

Each output file: call `code.toString({ ...opts, path })` on a `Code` object, push `{ name: path, content }` into the files array.

**Existing extra-file pattern from `typeRegistry.ts` (`src/plugin.ts` lines 60–68) — exact model to follow:**

```ts
if (options.outputTypeRegistry) {
  const path = "typeRegistry.ts";
  const code = generateTypeRegistry(ctx);
  const content = code.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion), path });
  files.push({ name: path, content });
}
```

**Implementation for proto-shared.ts (add after outputIndex block):**

```ts
if (options.sharedHelpersFile) {
  const path = "proto-shared.ts";
  const code = generateSharedHelpersFile(ctx);
  const content = code.toString({ ...getTsPoetOpts(options, tsProtoVersion, protocVersion), path });
  files.push({ name: path, content });
}
```

---

## How ts-poet Handles Import Statements

`imp()` generates imports automatically. At `toString({ path })` time, ts-poet:
1. Collects all `imp()` symbols in the code tree
2. Computes relative paths via `maybeRelativePath()` (`ts-poet/build/Import.js`)
3. Emits deduplicated `import { ... } from "..."` statements at the top

**Use `impFile()` to respect `importSuffix` option:**
```ts
impFile(options, "DeepPartial@./proto-shared")
// importSuffix="":    import { DeepPartial } from "./proto-shared"
// importSuffix=".js": import { DeepPartial } from "./proto-shared.js"
```

A file at `company/foo.ts` automatically gets `import { DeepPartial } from "../proto-shared"` — ts-poet resolves the relative path based on the output path parameter.

---

## The ConditionalOutput Pattern (Critical)

`conditionalOutput(name, declarationCode)` returns a `ConditionalOutput` object:
- **Usage site:** Object used as placeholder in `code\`\`` — emits just the symbol name
- **Declaration site:** `.ifUsed` — emits declaration only if symbol appeared in output tree

Declaration loop at end of each file (`src/main.ts` lines 451–459):
```ts
chunks.push(
  ...Object.values(utils).map((v) => {
    if (v instanceof ConditionalOutput) {
      return code`${v.ifUsed}`;
    } else {
      return code``;  // ← imp() objects fall here: no inline declaration, ts-poet tracks import
    }
  }),
);
```

**When `sharedHelpersFile=true`:** Replace `conditionalOutput(...)` with `imp()` objects for moved helpers. `imp()` objects are `Import` instances (not `ConditionalOutput`), so the loop emits empty `code\`\`` — no inline declarations. The loop requires **no changes**.

---

## makeUtils() — The Central Assembly Point

`src/main.ts` lines 495–513:
```ts
export function makeUtils(options: Options): Utils {
  const bytes = makeByteUtils(options);
  const longs = makeLongUtils(options, bytes);
  const deepPartial = makeDeepPartial(options, longs);
  const extension = makeExtensionClass(options);
  return {
    ...bytes,
    ...deepPartial,
    ...makeObjectIdMethods(),
    ...makeTimestampMethods(options, longs, bytes),
    ...longs,
    ...makeComparisonUtils(),
    ...makeNiceGrpcServerStreamingMethodResult(options),
    ...makeGrpcWebErrorClass(bytes),
    ...extension,
    ...makeAssertionUtils(bytes),
    ...makeMessageFns(options, deepPartial, extension),
  };
}
```

**Branching point:** Each `make*()` function returns `conditionalOutput` objects (inline mode) or `imp()` objects (shared file mode) based on `options.sharedHelpersFile`. Called once in `plugin.ts`; result threads through `ctx`.

---

## Specific Functions Emitting Shared Helpers

| Function | Location | Helpers Emitted |
|----------|----------|-----------------|
| `makeComparisonUtils()` | lines 1100–1118 | `isObject`, `isSet` |
| `makeDeepPartial()` | lines 669–735 | `Builtin`, `KeysOfUnion`, `Exact`, `DeepPartial` |
| `makeMessageFns()` | lines 737–896 | `MessageFns`, `ExtensionFns`, `ExtensionHolder` (also Wrapper interfaces — NOT safe to move) |
| `makeLongUtils()` | lines 541–570 | `longToNumber`, `numberToLong` |
| `makeByteUtils()` | lines 572–668 | `bytesFromBase64`, `base64FromBytes`, `gt` polyfill |

---

## Integration Test Structure

```
integration/shared-helpers/
  simple.proto          # Input proto
  parameters.txt        # "sharedHelpersFile=true"
  simple.ts             # Generated file: imports from ./proto-shared, no inline helpers
  proto-shared.ts       # Expected shared helpers output (committed snapshot)
  simple-test.ts        # Jest test: import generated code, validate runtime behavior
```

Tests discovered by `jest.config.js` matching `integration/**/*-test.ts`.
Expected output updated by running `yarn proto2ts` (NOT `jest --updateSnapshot`).

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| New file generation | `typeRegistry.ts` pattern in `plugin.ts` | New function outside plugin.ts | Consistent with existing pattern |
| Import mechanism | `impFile()` with `./proto-shared` | Manual import string | ts-poet handles relative path + importSuffix automatically |
| Option implementation | Boolean in `Options` type + `defaultOptions()` | Separate config | Consistent with 40+ existing options |
| Branching location | Inside each `make*()` function | Post-process Utils object | Self-contained; `make*()` already receives options |

---

*Research date: 2026-02-27*
