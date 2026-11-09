# Prior Art & Comparison

This document reviews existing solutions in the Stellar and Soroban ecosystem, comparing generic tooling with the domain-specific design of `@aether-swap/prince-sdk`.

## Ecosystem Survey

An audit of public packages and repositories was conducted to identify existing tooling for Stellar smart contracts and the Very-Prince `PayoutRegistry` contract:

1. **`stellar contract bindings typescript` (Stellar CLI)**
   - **Repository**: [https://github.com/stellar/stellar-cli](https://github.com/stellar/stellar-cli)
   - **Description**: The official CLI can inspect a Soroban WASM binary and emit TypeScript stubs that wrap contract methods.
   - **Comparison & Differences**:
     - Generic CLI bindings produce low-level wrappers that assemble invocation operations directly, requiring callers to manually handle RPC simulation responses, assemble resource footprints, and manage signing keys.
     - CLI bindings do not provide high-level error handling: errors are emitted as raw strings (e.g. `Error(Contract, #7)`). `@aether-swap/prince-sdk` translates every contract error code into a structured, named JavaScript error class.
     - Generic bindings lack business logic: they do not provide vesting schedule generators, exact remainder math, continuity validation, or specialized React hooks.

2. **Official `@stellar/stellar-sdk`**
   - **Repository**: [https://github.com/stellar/js-stellar-sdk](https://github.com/stellar/js-stellar-sdk)
   - **Description**: Core JavaScript library for interacting with Horizon, Soroban RPC, and constructing Stellar transactions.
   - **Comparison & Differences**:
     - `@stellar/stellar-sdk` is an underlying foundation rather than an application-specific client.
     - `@aether-swap/prince-sdk` builds upon `@stellar/stellar-sdk` as a peer dependency, providing high-level domain abstractions tailored to organization payouts and vesting workflows.

3. **Very-Prince Repository**
   - **Repository**: [https://github.com/Sahara-Pay/Very-Prince](https://github.com/Sahara-Pay/Very-Prince)
   - **Description**: The third-party repository housing the Rust Soroban contract `packages/contracts/src/lib.rs`.
   - **Status**: No dedicated external TypeScript client SDK was published or maintained for the `PayoutRegistry` contract prior to `@aether-swap/prince-sdk`.

---

## Key Differentiators of `@aether-swap/prince-sdk`

- **Simulation-First Safety**: Write transactions automatically simulate and estimate fees before returning a `PreparedTx`. If a call fails on-chain validation, it fails immediately before requesting user signatures.
- **Key Decoupling**: The core client never handles, logs, or stores private keys. Signing is delegated entirely to caller-provided `Signer` implementations (`KeypairSigner`, `FreighterSigner`).
- **Complete Error Mapping**: All 46 numeric `PrinceError` codes from `packages/contracts/src/lib.rs` are mapped to human-readable error classes with original causes preserved.
- **Domain Vesting Helpers**: Pure-math functions for calculating linear schedules with exact remainder handling, evaluating binary-search milestone releases (`vestedAt`), and validating schedule continuity across sequential allocations.
- **React State Hooks**: Out-of-the-box React hooks (`usePayoutRegistry`, `useClaimableBalance`, `useClaimPayout`) for fast frontend integration.
