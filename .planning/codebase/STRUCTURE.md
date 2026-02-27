# Directory Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
ts-proto/
├── src/                    # Core plugin source code
│   ├── main.ts             # Core code generation logic (3054 lines, primary entry)
│   ├── plugin.ts           # protoc plugin entry point (stdin/stdout protocol)
│   ├── options.ts          # Plugin option parsing and type definitions
│   ├── types.ts            # TypeScript type name resolution
│   ├── context.ts          # Context/config passing interfaces
│   ├── schema.ts           # File descriptor schema generation
│   ├── enums.ts            # Enum code generation
│   ├── encode.ts           # Encode/decode logic
│   ├── utils.ts            # Shared utilities (imports, file handling)
│   ├── visit.ts            # Proto descriptor tree traversal
│   ├── case.ts             # Case conversion utilities
│   ├── sourceInfo.ts       # Source information / comments
│   ├── generate-services.ts          # Generic service generation
│   ├── generate-grpc-js.ts           # @grpc/grpc-js service generation
│   ├── generate-grpc-web.ts          # gRPC-Web service generation
│   ├── generate-nestjs.ts            # NestJS service generation
│   ├── generate-nice-grpc.ts         # nice-grpc service generation
│   ├── generate-async-iterable.ts    # Async iterable stream generation
│   ├── generate-generic-service-definition.ts  # Generic service definition
│   ├── generate-struct-wrappers.ts   # Well-known type wrapper generation
│   ├── generate-type-registry.ts     # Type registry generation
│   └── index.ts            # Public API re-exports
│
├── tests/                  # Unit tests
│   ├── case-test.ts        # Case conversion tests
│   ├── context-test.ts     # Context utility tests
│   ├── enums-test.ts       # Enum generation tests
│   ├── options-test.ts     # Option parsing tests
│   ├── types-test.ts       # Type resolution tests
│   └── utils-test.ts       # Utility function tests
│
├── integration/            # Integration tests (~163 test scenarios)
│   ├── simple/             # Basic protobuf → TypeScript tests
│   ├── simple-esmodule-interop/  # ESModule interop (ignored in jest)
│   ├── async-iterable-services/  # Streaming service tests
│   ├── batching/           # DataLoader batching tests
│   ├── nestjs/             # NestJS-specific tests
│   ├── grpc-js/            # @grpc/grpc-js tests
│   ├── nice-grpc/          # nice-grpc tests
│   ├── const-enum/         # Const enum tests
│   ├── bytes-as-base64/    # Bytes handling tests
│   └── [150+ more scenarios]  # Each tests a specific option combination
│
├── protos/                 # Internal proto definitions
│   └── index.ts            # TypeScript types for protobuf descriptors
│
├── build/                  # Compiled output (gitignored in most cases)
│   └── *.d.ts, *.js        # Compiled declarations and JavaScript
│
├── .github/                # CI/CD workflows
├── .yarn/                  # Yarn Berry installation
├── .planning/              # GSD planning artifacts (this directory)
│
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config (CommonJS, ES2020, strict)
├── jest.config.js          # Jest configuration
├── protoc.Dockerfile       # Docker image for protoc
├── docker-compose.yml      # Docker Compose for integration tests
├── protoc-gen-ts_proto     # Shell script: protoc plugin entry point
├── README.markdown         # Main documentation
├── NESTJS.markdown         # NestJS-specific documentation
└── CHANGELOG.md            # Semantic release generated changelog
```

## Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `src/` | All plugin source code — the code generator itself |
| `tests/` | Unit tests for individual src modules |
| `integration/` | End-to-end tests — compile proto → generate TS → assert output |
| `protos/` | Local protobuf descriptor definitions used by the plugin |
| `build/` | Compiled output (tsc → CommonJS for distribution) |
| `.github/` | CI workflows (test, release) |

## Key File Locations

**Entry Points:**
- `protoc-gen-ts_proto` — Shell script called by protoc, delegates to `build/src/plugin.js`
- `src/plugin.ts` — Reads stdin (CodeGeneratorRequest), writes stdout (CodeGeneratorResponse)

**Core Logic:**
- `src/main.ts` — `generateFile()` and `makeUtils()` — the heart of code generation
- `src/options.ts` — `optionsFromParameter()` — parses `--ts_proto_opt=key=value` flags
- `src/types.ts` — `createTypeMap()`, `basicTypeName()` — proto type → TS type mapping

**Service Generation:**
- `src/generate-services.ts` — `generateService()`, `generateRpcType()`
- `src/generate-grpc-js.ts` — `generateGrpcJsService()`
- `src/generate-nestjs.ts` — `generateNestjsServiceClient/Controller()`
- `src/generate-grpc-web.ts` — `generateGrpcClientImpl()`

**Utilities:**
- `src/utils.ts` — `impFile()`, `maybePrefixPackage()`, `generateIndexFiles()`
- `src/case.ts` — `snakeToCamel()`, `camelToSnake()`, `capitalize()`
- `src/visit.ts` — `visit()`, `visitServices()` — traverse proto descriptor tree

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` (e.g., `generate-grpc-js.ts`)
- Test files: `{module}-test.ts` (e.g., `options-test.ts`)
- Integration tests: `{scenario-name}-test.ts` inside integration subdirectory

**Functions:**
- Code generators: `generate{FeatureName}()` (e.g., `generateGrpcJsService`)
- Utilities: camelCase verbs (e.g., `snakeToCamel`, `basicTypeName`, `impFile`)
- Type predicates: `is{Type}()` (e.g., `isWrapperType`, `isProto3Syntax`)

**Types/Interfaces:**
- Interfaces: PascalCase (e.g., `Context`, `BaseContext`, `Options`, `TypeMap`)
- Enums: PascalCase with string values (e.g., `LongOption`, `DateOption`)
- Option keys: camelCase in code, kebab-case in `--ts_proto_opt` CLI usage

## Where to Add New Code

| Scenario | Where to add |
|----------|-------------|
| New plugin option | `src/options.ts` — add to `Options` interface + `optionsFromParameter()` |
| New message field type handling | `src/types.ts` — `basicTypeName()`, `toReaderCall()` |
| New service framework support | New `src/generate-{framework}.ts` file, wire up in `src/main.ts` |
| New well-known type wrapper | `src/generate-struct-wrappers.ts` |
| New enum behavior | `src/enums.ts` |
| Type registry changes | `src/generate-type-registry.ts` |
| Utility functions | `src/utils.ts` (file-level) or `src/case.ts` (string case) |
| Integration test for new option | New directory under `integration/` with proto + test file |
| Unit test for module | `tests/{module}-test.ts` |

---

*Structure analysis: 2026-02-27*
