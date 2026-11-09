# Dependency Rationale & Security Audit

This document details all runtime, peer, and development dependencies for `@aether-swap/prince-sdk`, explaining why each exists, and documents security audit findings.

## Zero Direct Runtime Dependencies

The package has **0 direct runtime dependencies** in `dependencies`. All core capabilities are implemented using native JavaScript/TypeScript primitives (`bigint`, `Map`, `Array`, `fetch`) and standardized peer dependencies.

---

## Peer Dependencies

### 1. `@stellar/stellar-sdk` (Required Peer Dependency)

- **Version Range**: `^13.0.0 || ^14.0.0 || ^15.0.0 || ^16.0.0 || ^17.0.0`
- **Purpose**: Official Stellar Development Foundation SDK providing:
  - Soroban RPC interaction (`rpc.Server`, `simulateTransaction`, `sendTransaction`, `getTransaction`).
  - XDR types and serialization (`scValToNative`, `nativeToScVal`, `xdr.ScVal`, `xdr.TransactionEnvelope`).
  - Transaction builder and keypair utilities (`TransactionBuilder`, `Account`, `Keypair`, `Address`, `Contract`).
- **Rationale**: Keeping `@stellar/stellar-sdk` as a peer dependency avoids bundling multiple duplicate instances of `@stellar/stellar-base` or conflicting XDR schema versions into host applications.

### 2. `@stellar/freighter-api` (Optional Peer Dependency)

- **Version Range**: `^2.0.0 || ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0`
- **Purpose**: Browser extension wallet connectivity for `FreighterSigner`.
- **Rationale**: Marked as optional so server-side Node.js applications or CLI scripts importing `@aether-swap/prince-sdk` do not need to install browser wallet packages.

### 3. `react` (Optional Peer Dependency)

- **Version Range**: `^18.0.0 || ^19.0.0`
- **Purpose**: Powers the optional `@aether-swap/prince-sdk/react` hooks module.
- **Rationale**: Marked as optional so non-React projects can use the core SDK without installing React.

---

## Development Dependencies

| Package | Purpose |
| --- | --- |
| `typescript` | Static type checker and compilation tooling. |
| `tsup` | High-performance dual ESM/CJS bundler and declaration generator based on esbuild. |
| `vitest` | Unit, property, and type-level test runner. |
| `fast-check` | Property-based testing framework for generative invariant testing. |
| `typedoc` | Automated API reference documentation generator. |
| `eslint` & `typescript-eslint` | Code quality and linting engine. |
| `prettier` | Code style formatter. |
| `@testing-library/react` & `happy-dom` | Headless DOM and component testing environment for React hooks. |

---

## Security Audit Review (`npm audit`)

A review of `npm audit` was conducted during project initialization:
- All warnings from `npm audit` pertain strictly to development tooling dependencies (e.g. transitive build tools like `cross-spawn`, `micromatch`, or legacy parser bundles within dev dependencies).
- Zero vulnerabilities affect production bundles, as runtime dependencies are empty.
- Development dependencies will be updated in lockstep as upstream toolchains publish patches.
