# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.8.3 - Core implementation language for the protoc plugin
- JavaScript - Package scripts and configuration files

**Secondary:**
- Bash - Build and utility scripts (see `protoc-gen-ts_proto`, `publish.sh`, `aliases.sh`)
- Protocol Buffers (proto3) - Input format for code generation (see `protos/` directory)

## Runtime

**Environment:**
- Node.js v22.0.0 (pinned in `.nvmrc`)
- Executes as a protoc plugin (called by `protoc` compiler)

**Package Manager:**
- Yarn 4.4.0 (configured in `.yarnrc.yml`)
- Lockfile: Present (`yarn.lock` in `protos/`)

## Frameworks

**Core:**
- ts-proto (self - the code generator itself)

**Code Generation & AST Manipulation:**
- ts-poet 6.12.0 - TypeScript code generation DSL
- ts-proto-descriptors 2.1.0 - Protocol Buffer descriptor parsing

**gRPC/RPC Frameworks (for generated code):**
- @grpc/grpc-js 1.8.17 - Node.js gRPC implementation
- @grpc/proto-loader 0.7.8 - Protocol buffer loading for gRPC
- @improbable-eng/grpc-web 0.14.1 - gRPC-Web for browser clients
- @improbable-eng/grpc-web-node-http-transport 0.14.1 - HTTP transport for gRPC-Web
- nice-grpc 2.1.4 - Alternative gRPC implementation
- @nestjs/common 9.4.3 - NestJS framework support
- @nestjs/core 9.4.3 - NestJS core module
- @nestjs/microservices 9.4.3 - NestJS microservices utilities

**Protobuf Libraries:**
- @bufbuild/protobuf 2.10.2 - Modern protobuf serialization (used by encoder/decoder in 2.x)
- protobufjs 7.2.4 - Legacy protobuf implementation (available for compatibility)
- protobufjs-cli 1.1.1 - Command-line tools for protobufjs

**Testing:**
- jest 29.6.1 - Test framework
- ts-jest 29.3.4 - TypeScript support for Jest
- jest-ts-webcompat-resolver 1.0.0 - Custom resolver for web-compatible imports
- @types/jest 29.5.3 - Type definitions

**Build/Dev Tools:**
- tsx 4.19.4 - TypeScript executor (used in watch mode)
- typescript 5.8.3 - TypeScript compiler
- prettier 3.5.3 - Code formatter (main version)
- prettier-legacy 2.8.8 - Legacy version for Jest config
- uglify-js 3.17.4 - JavaScript minification
- chokidar 3.5.3 - File system watcher (for watch mode)

**Data Handling:**
- object-hash 3.0.0 - Object hashing utility
- case-anything 2.1.13 - Case conversion utilities (camelCase, snake_case, etc.)
- dataloader 2.2.2 - Batch loading utility (for N+1 prevention in generated code)

**Well-Known Type Support:**
- temporal-polyfill 0.3.0 - Temporal API polyfill (for date handling)
- temporal-spec 0.3.0 - Temporal specification types
- nano-date 4.1.0 - Lightweight date library

**Database Support:**
- mongodb 5.7.0 - MongoDB driver (for ObjectId support in generated types)

**Observability:**
- reflect-metadata 0.1.13 - Metadata reflection API (for NestJS decorators)
- rxjs 7.8.1 - Reactive extensions (used by gRPC implementations)

**Release Management:**
- @semantic-release/changelog 6.0.3 - Generate changelog
- @semantic-release/commit-analyzer 13.0.1 - Analyze commits for versioning
- @semantic-release/exec 7.1.0 - Execute commands during release
- @semantic-release/git 10.0.1 - Git operations for releases
- @semantic-release/github 12.0.2 - GitHub integration for releases
- @semantic-release/npm 13.1.3 - NPM package publishing
- @semantic-release/release-notes-generator 14.1.0 - Generate release notes
- semantic-release 25.0.2 - Automated semantic versioning and publishing
- conventional-changelog-conventionalcommits 8.0.0 - Conventional commits parser

**Type Utilities:**
- @types/node 16.18.38 - Node.js type definitions
- @types/object-hash 3.0.2 - Type definitions for object-hash
- @tsconfig/strictest 2.0.1 - Strictest TypeScript configuration preset

## Configuration

**Environment:**
- Not externally configured - this is a build-time code generator (protoc plugin)
- Plugin accepts options via `--ts_proto_opt` command-line parameters (parsed in `src/options.ts`)
- Options include: snakeToCamel, useDate, useOptionals, forceDate, outputServices, oneof, etc.

**Build:**
- `tsconfig.json` - Main TypeScript configuration targeting ES2020
- Module system: CommonJS (output to `build/src/`)
- Path aliases: Maps `ts-proto-descriptors` to local `protos/index.ts`
- `.prettierrc` - Code formatting (printWidth: 120, trailingComma: all)

**Docker:**
- `protoc.Dockerfile` - Builds protoc compiler image with Node 20 + protoc 3.19.1
- `docker-compose.yml` - Service definition for protoc container
- Used for integration tests via `yarn proto2ts` and `yarn proto2pbjs` scripts

## Platform Requirements

**Development:**
- Node.js 22.0.0 or compatible
- Yarn 4.4.0+ (specified via packageManager field)
- Docker + Docker Compose (for integration tests and proto compilation)
- protoc compiler (provided via Docker container)
- TypeScript knowledge (writing proto files)

**Production:**
- NPM package installation: `npm install ts-proto` or `yarn add ts-proto`
- Requires protoc to be available on system PATH
- Runs as part of build/codegen pipeline
- Generated code has no production dependencies (all deps are devDependencies in this package)
- Generated code compatible with Node.js, browsers, and TypeScript environments

---

*Stack analysis: 2026-02-27*
