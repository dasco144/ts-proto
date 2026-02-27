# Testing

**Analysis Date:** 2026-02-27

## Framework

- **Jest 29.6.1** — Test runner and assertion library
- **ts-jest 29.3.4** — TypeScript transformation
- **jest-ts-webcompat-resolver** — Custom module resolver for web-compatible imports

**Config:** `jest.config.js`
```javascript
{
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  resolver: 'jest-ts-webcompat-resolver',
  testMatch: ['<rootDir>/integration/**/*-test.ts', '<rootDir>/tests/**/*-test.ts'],
  testEnvironment: 'node',
  prettierPath: require.resolve('prettier-legacy')  // used for snapshot formatting
}
```

**Note:** Two directories are excluded from Jest runs:
- `integration/simple-esmodule-interop/`
- `integration/batching-with-context-esModuleInterop/`

## Test Structure

### Unit Tests (`tests/`)
6 unit test files covering individual source modules:
- `tests/case-test.ts` — `src/case.ts` case conversion functions
- `tests/context-test.ts` — `src/context.ts` context utilities
- `tests/enums-test.ts` — `src/enums.ts` enum generation
- `tests/options-test.ts` — `src/options.ts` option parsing
- `tests/types-test.ts` — `src/types.ts` type resolution
- `tests/utils-test.ts` — `src/utils.ts` utilities

### Integration Tests (`integration/`)
~163 integration test directories, each testing a specific option combination or feature:

```
integration/
├── simple/                       # Basic message/service generation
├── simple-json/                  # JSON serialization options
├── async-iterable-services/      # Streaming with async iterables
├── batching/                     # DataLoader batching
├── nestjs/                       # NestJS service generation
├── grpc-js/                      # @grpc/grpc-js service generation
├── grpc-web/                     # gRPC-Web generation
├── nice-grpc/                    # nice-grpc generation
├── const-enum/                   # constEnums option
├── bytes-as-base64/              # bytes field handling
├── avoid-import-conflicts/       # Import deduplication
├── oneof-unions/                 # Oneof as union types
└── [150+ more scenarios]
```

Each integration directory typically contains:
- `*.proto` file — input proto definition
- `*-test.ts` — Jest test asserting generated output
- Generated `.ts` files — expected output (committed to repo)

## Integration Test Pattern

```typescript
// integration/simple/simple-test.ts
import { simple } from "./simple";  // Import generated code

describe("simple", () => {
  it("can encode a message", () => {
    const msg = { name: "test" };
    const encoded = Simple.encode(msg).finish();
    expect(encoded).toMatchInlineSnapshot(`...`);
  });

  it("generates correct TypeScript", () => {
    // Snapshot test of generated code
    expect(outputFile).toMatchSnapshot();
  });
});
```

## Snapshot Testing

Heavy use of `toMatchInlineSnapshot()` in unit tests:
```typescript
// tests/options-test.ts
expect(optionsFromParameter("nestJs=true,outputJsonMethods=true")).toMatchInlineSnapshot(`
  {
    "M": {},
    "addGrpcMetadata": false,
    // ... full options object snapshot
  }
`);
```

Integration tests use both inline and external snapshots for generated file contents.

## Mocking

**jest.fn()** for simple function mocks:
```typescript
const mockFn = jest.fn().mockReturnValue(value);
```

**jest.spyOn()** for module method spying:
```typescript
jest.spyOn(module, 'methodName').mockImplementation(() => result);
```

**jest.clearAllMocks()** in `afterEach` blocks where used.

No heavy use of manual mocks (`__mocks__/`) — the codebase relies on real implementations.

## Test Data / Fixtures

- Proto files serve as fixtures for integration tests (located in each integration dir)
- `protos/` contains proto definitions used for descriptor types
- Generated `.ts` files in integration dirs are committed — they serve as expected output
- `pbjs.js`/`pbjs.d.ts` files in some integration dirs for protobufjs compatibility tests

## Running Tests

```bash
yarn test                  # Run all tests
yarn test:unit             # Run unit tests only (tests/)
yarn test:integration      # Run integration tests only
yarn proto2ts              # Recompile protos → TypeScript (requires Docker)
yarn proto2pbjs            # Generate pbjs compatibility files (requires Docker)
```

## Coverage

No enforced coverage thresholds in current configuration. Coverage can be run with:
```bash
yarn test --coverage
```

Integration tests provide broad coverage of generation scenarios. Unit tests cover option parsing and utility functions in depth.

## Known Gaps

- No property-based testing (no fast-check or similar)
- Browser environment not separately tested (only node testEnvironment)
- Client-streaming paths have no tests (feature not implemented)
- Error handling paths (invalid proto inputs) lightly tested
- Some option combinations tested only via integration (not unit level)

---

*Testing analysis: 2026-02-27*
