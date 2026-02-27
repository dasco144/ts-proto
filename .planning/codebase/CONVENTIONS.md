# Coding Conventions

**Analysis Date:** 2026-02-27

## Code Style

**Formatter:** Prettier 3.5.3
- Print width: 120 characters (`.prettierrc`)
- Trailing commas: `all`
- Single quotes: false (double quotes)

**TypeScript:**
- Strict mode enabled via `@tsconfig/strictest`
- Target: ES2020
- Module: CommonJS
- `noUncheckedIndexedAccess`: enabled
- Explicit return types: mixed (not consistently enforced)

## Naming Patterns

**Files:**
- Source: `kebab-case.ts` (`generate-grpc-js.ts`, `source-info.ts`)
- Tests: `{module}-test.ts` (`options-test.ts`, `types-test.ts`)
- Integration dirs: `kebab-case/` matching option or feature name

**Functions:**
- Code generators: `generate{Target}()` — `generateGrpcJsService`, `generateNestjsServiceClient`
- Accessors/predicates: `is{Condition}()` — `isWrapperType`, `isProto3Syntax`
- Utilities: verb + noun camelCase — `snakeToCamel`, `basicTypeName`, `impFile`

**Types/Interfaces:**
- Interfaces: PascalCase — `Context`, `BaseContext`, `Options`, `TypeMap`
- Enums: PascalCase — `LongOption`, `DateOption`, `EnvOption`, `OneofOption`
- Enum values: SCREAMING_SNAKE_CASE — `LongOption.BIGINT`, `DateOption.STRING_NANO`

**Variables:**
- Local: camelCase
- Destructured params from proto descriptors: match descriptor field names (e.g., `field.name`, `msg.typeName`)

## Import Organization

```typescript
// 1. External libraries (ts-poet, ts-proto-descriptors)
import { code, Code, imp } from "ts-poet";
import { DescriptorProto, FieldDescriptorProto } from "ts-proto-descriptors";

// 2. Internal modules (relative imports)
import { Context } from "./context";
import { Options } from "./options";
import { snakeToCamel } from "./case";
```

- No barrel imports from `./index` within `src/` — direct module imports
- `imp()` from ts-poet for external type references in generated code
- `impFile()` utility for importing from generated files

## Error Handling

**Throw pattern:**
```typescript
throw new Error(`Unhandled type: ${field.type}`);
throw new Error(`Unknown option: ${key}`);
```

- Uses `throw new Error(message)` (not custom error classes)
- Error messages include the problematic value for debugging
- No try-catch within generation code — errors propagate to plugin entry

**Assertion pattern:**
```typescript
// Assert non-null via type narrowing
if (!ctx.options.outputServices) { ... }
// Array/map access: handled by noUncheckedIndexedAccess (checks before use)
```

## Function Design

**Context threading:** Functions take `ctx: Context` or `(ctx: Context, ...)` as first parameter
```typescript
export function generateFile(ctx: Context, fileDesc: FileDescriptorProto, ...): Code[] { ... }
export function generateEnum(ctx: Context, enumDesc: EnumDescriptorProto, ...): Code { ... }
```

**Code generation pattern** (ts-poet):
```typescript
// Use code`` template literals for TypeScript AST generation
export function generateFoo(ctx: Context, msg: DescriptorProto): Code {
  return code`
    export interface ${def(messageName)} {
      ${fields}
    }
  `;
}
```

**Return types:**
- Single generation: returns `Code`
- Multiple items: returns `Code[]`
- Conditional output: `conditionalOutput()` for code that only appears when used

## Commenting Style

- JSDoc comments: used on exported functions/types in `options.ts`
- Inline comments: explain non-obvious proto3/proto2 differences
- Section comments: `// === Section Name ===` style in large files
- Generated code comments: proto source comments forwarded via `sourceInfo`

## Module Structure Pattern

```typescript
// 1. Imports
// 2. Module-level constants/caches
const extensionCache: { ... } = {};

// 3. Exported types (if any)
export interface Foo { ... }

// 4. Exported functions (main logic)
export function generateFoo(ctx: Context, ...): Code { ... }

// 5. Private helper functions
function helperFoo(...): string { ... }
```

## Generated Code Patterns

**Import declarations in generated code:**
```typescript
// Use imp() for external types
const Long = imp("Long@long");
const Reader = imp("Reader@protobufjs/minimal");

// Use impFile() for cross-file references
const OtherMessage = impFile(options, "OtherMessage@./other");
```

**Conditional code inclusion:**
```typescript
// conditionalOutput() — only included if referenced
const Long = conditionalOutput("Long", imp("Long@long"));
```

## Testing Conventions

- Tests use `toMatchInlineSnapshot()` extensively for generated code verification
- Test files mirror source modules (`options-test.ts` tests `options.ts`)
- Integration tests use full proto compile → generate → validate cycle
- See `TESTING.md` for full testing patterns

---

*Conventions analysis: 2026-02-27*
