# Architecture Research: ts-proto sharedHelpersFile

**Research Type:** Architecture dimension — path computation and code flow
**Date:** 2026-02-27
**Confidence:** HIGH (verified by direct source inspection)

---

## How File Paths Flow Through the System

1. `fileDesc.name` contains the proto's relative path (e.g., `google/protobuf/timestamp.proto`)
2. In `src/main.ts` (moduleName computation): `moduleName = fileDesc.name.replace(".proto", suffix)` — this becomes the output path (e.g., `google/protobuf/timestamp.ts`)
3. In `src/plugin.ts` line 55: `code.toString({ path: moduleName })` — the `path` parameter tells ts-poet "this code lives at location X"
4. ts-poet's `Import.js` `maybeRelativePath()` automatically computes `path.relative(dirname(outputPath), importPath)` for any `imp()` spec starting with `./`

---

## How to Compute the Relative Import Path

**Don't do it manually.** Use ts-poet's `imp()` mechanism:

```ts
imp("DeepPartial@./proto-shared")
```

ts-poet resolves this automatically based on the output file's path:
- `simple.ts` → `./proto-shared`
- `company/foo.ts` → `../proto-shared`
- `google/protobuf/timestamp.ts` → `../../proto-shared`

This means no manual path computation is needed — just use `imp("SomeName@./proto-shared")` and ts-poet handles the relative path resolution at `code.toString({ path: moduleName })` time.

---

## Where to Inject Import Statements

**No change needed to the emission loop.** The current pattern in `src/main.ts` uses `conditionalOutput()` objects for helpers. When `sharedHelpersFile=true`:

- Replace `conditionalOutput("DeepPartial", ...)` with `imp("DeepPartial@./proto-shared")`
- The existing `instanceof ConditionalOutput` guard emits an empty code block for non-ConditionalOutput values
- ts-poet automatically collects all `imp()` references used in the file and emits the appropriate import statement at the top

The import injection is **automatic via ts-poet** — no explicit `import { ... } from "./proto-shared"` needs to be constructed.

---

## Where to Trigger proto-shared.ts Generation

In `src/plugin.ts`, after the `Promise.all` for message files, following the exact same pattern as `typeRegistry.ts` generation (lines 60-69):

```ts
// After the main Promise.all
if (options.sharedHelpersFile) {
  const code = generateSharedHelpers(options);
  files.push({
    name: "proto-shared.ts",
    content: code.toString({ path: "proto-shared.ts" }),
  });
}
```

The new `generateSharedHelpers(options)` function in `src/main.ts` (or a new `src/generate-shared-helpers.ts`) selects which conditional outputs to include based on current options.

---

## Build Order

Does not matter. ts-proto collects all output files then writes them at once via `CodeGeneratorResponse`. `proto-shared.ts` can be added before or after the message files in the array.

---

## Component Boundaries

```
src/plugin.ts
  → orchestrates generation run
  → detects sharedHelpersFile option
  → calls generateSharedHelpers() and adds to output
  → existing: calls generateFile() per .proto file

src/main.ts (or new src/generate-shared-helpers.ts)
  → new: generateSharedHelpers(options) → Code
  → builds the proto-shared.ts file content
  → includes all option-appropriate helpers

src/main.ts (makeUtils or equivalent)
  → when sharedHelpersFile=true: returns imp() references
  → when sharedHelpersFile=false: returns conditionalOutput() as today
```

---

## Data Flow for Import Resolution

```
Per-file generation:
  fileDesc.name = "company/foo.proto"
  moduleName = "company/foo.ts"

  helpers = makeUtils(ctx)
  // sharedHelpersFile=true → helpers.isSet = imp("isSet@./proto-shared")

  code.toString({ path: "company/foo.ts" })
  // ts-poet sees imp("isSet@./proto-shared") used in the file
  // resolves: path.relative("company", "proto-shared") = "../proto-shared"
  // emits: import { isSet } from "../proto-shared"
```

---

## Suggested Build Order for Implementation

1. Add `sharedHelpersFile` option to `src/options.ts`
2. Create `generateSharedHelpers(options)` function (new file or in main.ts)
3. Modify `makeUtils()` in `src/main.ts` to return `imp()` refs when option is set
4. Wire up in `src/plugin.ts` to add proto-shared.ts to output
5. Add integration test

---

*Research date: 2026-02-27*
