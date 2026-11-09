# Contributing to prince-sdk

Thank you for your interest in contributing to `@aether-swap/prince-sdk`!

This repository is an independent, community-built TypeScript client for the Very-Prince `PayoutRegistry` Soroban smart contract on Stellar testnet.

## Code of Conduct

All contributors are expected to uphold the [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior through GitHub Private Vulnerability Reporting or contact the maintainers at [https://github.com/Aether-Swap/prince-sdk](https://github.com/Aether-Swap/prince-sdk).

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Clone and Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/Aether-Swap/prince-sdk.git
cd prince-sdk
npm ci
```

### Scripts

- `npm run build`: Compile dual ESM/CJS bundles and generate TypeScript declaration files using `tsup`.
- `npm run typecheck`: Run TypeScript compiler check without emitting output.
- `npm test`: Run unit, property, and type-level test suites with `vitest`.
- `npm run test:coverage`: Run tests and output coverage report.
- `npm run lint`: Lint source and test code with ESLint.
- `npm run format:check`: Verify formatting rules with Prettier.
- `npm run format`: Auto-format source and test files.
- `npm run docs`: Generate TypeDoc API reference in `docs/api`.

## Development Guidelines

1. **Safety and Precision**: Floating-point numbers are prohibited on token and financial calculations. All balances and payouts use `bigint`.
2. **Contract Alignment**: Function signatures, struct shapes, event names, and error codes must strictly mirror `PayoutRegistry` (`packages/contracts/src/lib.rs`). Do not invent error codes or parameters.
3. **Property Testing**: Pure algorithms such as decimal conversion, vesting schedules, and event parsers must include property-based tests powered by `fast-check`.
4. **Signer Decoupling**: Signers must remain decoupled from the core client. Private keys must never be stored, logged, or serialized.
5. **Simulate First**: Write transactions must simulate before requesting signatures. If simulation fails, the process aborts before any signing is attempted.

## Pull Request Process

1. Open a branch named `feature/<feature-name>` or `fix/<fix-name>`.
2. Verify all quality checks pass locally:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run build
   npm test
   ```
3. Submit a pull request against the `main` branch of `https://github.com/Aether-Swap/prince-sdk`.
4. Ensure CI runs and passes all matrix jobs (Node 20 and Node 22).
