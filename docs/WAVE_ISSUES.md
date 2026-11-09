# Wave Backlog: Contribution Issues

This backlog contains 14 scoped tasks designed for open-source contributors during a 7-day development sprint, categorized across Trivial (5), Medium (6), and High (3) complexity tiers.

---

### Add currency formatting helper to amounts module
**Complexity:** Trivial
**Description:** Frontend applications often require displaying token amounts with their token ticker symbol and locale-aware thousand separators. Adding a `formatTokenAmount(stroops, symbol, decimals)` helper in `src/amounts.ts` eliminates repetitive display logic across UI consumers. This provides clean, consistent balance representations while retaining zero-float math principles.
**Requirements and context:**
- Must format whole and fractional components without using floating-point conversions.
- Must support optional symbol affixing (e.g. `"1,250.50 USDC"`).
- Must handle zero balances and boundary values gracefully.
**Suggested execution:**
- Touch: `src/amounts.ts` and `src/index.ts`
- Branch name suggestion: `feature/format-token-amount`
**Acceptance criteria / test plan:**
- `formatTokenAmount(12505000000n, "USDC", 7)` outputs `"1,250.5 USDC"`.
- Unit tests added to `test/amounts.test.ts` verifying formatting across small and large values.

---

### Export customizable default polling options in tx module
**Complexity:** Trivial
**Description:** The transaction submission flow uses fixed default timeouts and backoff delays in `src/tx.ts`. Exposing a `DEFAULT_SEND_OPTIONS` constant and allowing global or client-level overrides enables consumers on congested networks or mock environments to tune polling intervals easily. This improves testing ergonomics and flexibility for diverse RPC providers.
**Requirements and context:**
- Must not break existing default behavior when options are omitted.
- Must export `DEFAULT_SEND_OPTIONS` with `timeoutMs: 45000`, `initialBackoffMs: 1000`, `maxBackoffMs: 5000`, and `backoffMultiplier: 1.5`.
**Suggested execution:**
- Touch: `src/tx.ts` and `src/index.ts`
- Branch name suggestion: `feature/export-polling-defaults`
**Acceptance criteria / test plan:**
- `DEFAULT_SEND_OPTIONS` is exported from root index and used when `options` parameter is omitted in `PreparedTx.send`.
- Test added in `test/client.test.ts` verifying custom options override default parameters.

---

### Add JSON serialization helper for domain model records
**Complexity:** Trivial
**Description:** State records such as `Organization`, `MaintainerPayout`, and `VestingTranche` contain `bigint` fields that throw a `TypeError` when passed to standard `JSON.stringify`. Providing a `serializeDomainObject` helper allows developers to safely serialize state snapshots for logging, storage, or API responses.
**Requirements and context:**
- Must recursively convert `bigint` values to string representations.
- Must preserve array structures and handle `null` or `undefined` properties cleanly.
**Suggested execution:**
- Touch: `src/types.ts`, `src/index.ts`, and create `src/utils.ts`
- Branch name suggestion: `feature/json-serializer`
**Acceptance criteria / test plan:**
- Serializing a `MaintainerPayout` with `bigint` fields outputs valid JSON without throwing.
- Unit test added in `test/client.test.ts` or new `test/utils.test.ts`.

---

### Add explorer transaction URL builder utility
**Complexity:** Trivial
**Description:** Once a transaction is confirmed, users frequently need a direct URL to inspect the transaction on Stellar testnet block explorers such as StellarExpert. Adding a `getExplorerTxUrl(hash, network)` helper provides a standardized link generation utility for applications.
**Requirements and context:**
- Must support testnet explorer targets (e.g. `https://stellar.expert/explorer/testnet/tx/<hash>`).
- Must validate that the provided hash is a valid 64-character hexadecimal string.
**Suggested execution:**
- Touch: create `src/explorer.ts` and export from `src/index.ts`
- Branch name suggestion: `feature/explorer-url-helper`
**Acceptance criteria / test plan:**
- Calling `getExplorerTxUrl("abc...123", "testnet")` returns the correct URL.
- Throws an error if given an invalid transaction hash.
- Unit tests added in `test/explorer.test.ts`.

---

### Add simulation latency diagnostic telemetry hook
**Complexity:** Trivial
**Description:** RPC nodes can vary significantly in latency during Soroban simulation. Adding an optional diagnostic callback to `ClientOptions` (e.g. `onSimulationMetric?: (metric: { method: string, durationMs: number }) => void`) allows frontend monitoring tools to track performance without altering transaction execution.
**Requirements and context:**
- Must be purely opt-in and non-blocking.
- Any error inside the telemetry hook must be swallowed so contract execution is never disrupted.
**Suggested execution:**
- Touch: `src/types.ts` and `src/client.ts`
- Branch name suggestion: `feature/simulation-telemetry`
**Acceptance criteria / test plan:**
- Telemetry hook is called with method name and measured duration upon simulation completion.
- Unit test in `test/client.test.ts` verifying callback execution.

---

### Implement Albedo browser wallet Signer
**Complexity:** Medium
**Description:** Many Stellar users rely on Albedo (`@albedo-link/intent`) as an alternative to Freighter for browser-based, keyless authorization. Implementing an `AlbedoSigner` following the `Signer` interface expands wallet compatibility across both desktop and mobile web environments.
**Requirements and context:**
- Must lazily import `@albedo-link/intent` or accept an injected instance.
- Must map user rejections or closed modals to `UserRejectedError`.
- Must verify network passphrase and throw `NetworkMismatchError` on mismatched networks.
**Suggested execution:**
- Touch: `src/signers.ts`, `package.json` (add peer dependency), and `src/index.ts`
- Branch name suggestion: `feature/albedo-signer`
**Acceptance criteria / test plan:**
- `AlbedoSigner` implements `Signer` interface.
- Unit tests with a mocked Albedo client in `test/signers.test.ts` covering success, rejection, and network mismatch.

---

### Implement batch claim payout helper with aggregated simulation
**Complexity:** Medium
**Description:** Maintainers enrolled across multiple organizations currently have to execute separate claim transactions for each organization. A batch claim preparation helper that iterates over maintainer organizations and pre-simulates all available claims saves user clicks and optimizes gas estimation.
**Requirements and context:**
- Must check each organization's claimable balance and only prepare transactions for organizations with non-zero claimable funds.
- Must return an array of `PreparedTx<bigint>` objects ready for signing.
**Suggested execution:**
- Touch: `src/client.ts`
- Branch name suggestion: `feature/batch-claim-helper`
**Acceptance criteria / test plan:**
- Helper queries multiple orgs, skips zero-balance orgs, and prepares claims for funded ones.
- Unit tests in `test/client.test.ts` with mocked RPC simulations.

---

### Implement useOrgBudget and useOrgDetails React hooks
**Complexity:** Medium
**Description:** Frontend organization dashboards require real-time visibility into an organization's remaining budget and administrator roster. Introducing `useOrgBudget(client, orgId)` and `useOrgDetails(client, orgId)` hooks provides declarative reactive state with built-in loading and polling capabilities.
**Requirements and context:**
- Must support manual `refetch()` and optional automatic polling interval.
- Must clean up polling intervals on unmount.
- Must handle loading and error states idiomatic to React.
**Suggested execution:**
- Touch: `src/react/index.ts`
- Branch name suggestion: `feature/react-org-hooks`
**Acceptance criteria / test plan:**
- Hooks fetch data on mount and update when `orgId` changes.
- Automated tests in `test/react.test.tsx` verifying state transitions and cleanup.

---

### Implement polling event stream generator for payout activities
**Complexity:** Medium
**Description:** Monitoring incoming organization funding and payout claims requires continuous event polling against the Soroban RPC server. Implementing an async generator `subscribeToContractEvents(client, options)` handles ledger cursor progression and yields decoded `PrinceEvent` records automatically.
**Requirements and context:**
- Must manage paging tokens and avoid duplicate event delivery.
- Must gracefully handle transient RPC network hiccups with retry backoff.
- Must support filtering by event type (e.g. only `PayoutClaimed` or `OrgFunded`).
**Suggested execution:**
- Touch: create `src/stream.ts`, touch `src/events.ts`, and export from `src/index.ts`
- Branch name suggestion: `feature/event-stream-generator`
**Acceptance criteria / test plan:**
- Async generator yields decoded events as new ledger entries appear.
- Unit test in `test/events.test.ts` verifying cursor progression and filtering.

---

### Add interactive CLI tool to inspect vesting schedules
**Complexity:** Medium
**Description:** Terminal developers and automated scripts need a simple way to inspect a maintainer's vesting progress without writing custom code. Creating an executable script in `bin/prince-cli.ts` allows querying budgets and viewing formatted ASCII vesting charts from the shell.
**Requirements and context:**
- Must accept `--rpc-url`, `--contract-id`, and `--maintainer` arguments.
- Must render unlock timestamps in local date format alongside stroop amounts.
- Must not bundle private keys or perform write operations.
**Suggested execution:**
- Touch: create `bin/prince-cli.ts` and update `package.json` with `bin` field
- Branch name suggestion: `feature/cli-inspect-vesting`
**Acceptance criteria / test plan:**
- Running CLI script with valid arguments queries client and prints formatted schedule table.
- Test script execution in test suite with mock inputs.

---

### Implement automatic TTL bump transaction builder
**Complexity:** Medium
**Description:** Persistent Soroban ledger entries require periodic TTL extensions to prevent archival. Adding a helper `buildBumpOrgTtlTx(orgId, ledgersToExtend)` that constructs and simulates a Soroban `extendFootprintTTL` operation enables org admins to maintain state longevity proactively.
**Requirements and context:**
- Must target persistent storage data keys for the given organization.
- Must simulate resource costs and return a standard `PreparedTx`.
**Suggested execution:**
- Touch: `src/client.ts`
- Branch name suggestion: `feature/ttl-extension-builder`
**Acceptance criteria / test plan:**
- Method constructs valid `extendFootprintTTL` operation with proper contract footprint keys.
- Unit test in `test/client.test.ts` verifying transaction structure and simulation.

---

### Implement multi-signature admin approval coordinator
**Complexity:** High
**Description:** Organizations with multiple administrators require collecting threshold signatures across independent parties before submitting an admin transaction (such as `batch_allocate` or `add_admin`). Implementing a `MultiSigCoordinator` class provides storage, serialization, signature collation, and threshold verification for partially signed transaction envelopes.
**Requirements and context:**
- Must verify that each attached signature corresponds to an authorized admin listed in `Organization.admins`.
- Must merge signatures into the base transaction envelope XDR without invalidating previous signatures.
- Must throw a clear error if submission is attempted prior to reaching the required threshold.
**Suggested execution:**
- Touch: create `src/multisig.ts`, touch `src/tx.ts`, and export from `src/index.ts`
- Branch name suggestion: `feature/multisig-coordinator`
**Acceptance criteria / test plan:**
- Coordinator accepts signatures from distinct admin keypairs and merges them into a single envelope.
- Prevents submission when under-threshold; submits successfully once threshold is met.
- Comprehensive test suite in `test/multisig.test.ts`.

---

### Implement air-gapped QR code transaction serializer and parser
**Complexity:** High
**Description:** Enterprise org administrators often store funding keys in air-gapped hardware or cold-storage devices. Creating an air-gapped flow module (`src/airgap.ts`) that chunks raw transaction XDRs into animated or multi-part QR codes (UR standard or compressed frames) enables secure signing without internet connectivity.
**Requirements and context:**
- Must compress and fragment transaction envelopes exceeding standard single-frame QR limits.
- Must provide parser to reconstruct the complete signed envelope from scanned chunks.
- Must validate envelope checksum and integrity before assembly.
**Suggested execution:**
- Touch: create `src/airgap.ts` and add unit tests in `test/airgap.test.ts`
- Branch name suggestion: `feature/airgap-qr-serializer`
**Acceptance criteria / test plan:**
- Large transaction envelopes (>2KB) chunked into multiple frames and reconstructed identically.
- Property-based tests verifying roundtrip fidelity on arbitrary valid XDR strings.

---

### Implement offline state snapshot cache with local storage persistence
**Complexity:** High
**Description:** High-volume user interfaces suffer from frequent redundant RPC calls when displaying historical org rosters and payout schedules. Building an `OfflineStateCache` module with pluggable storage adapters (in-memory, `localStorage`, `IndexedDB`) provides stale-while-revalidate caching and offline query capability.
**Requirements and context:**
- Must store cached entries with ledger sequence numbers and timestamps.
- Must invalidate cache entries upon detected state mutation (e.g. after successful `fundOrg` or `claimPayout` execution).
- Must handle storage quota limits gracefully.
**Suggested execution:**
- Touch: create `src/cache.ts`, touch `src/client.ts`, and export from `src/index.ts`
- Branch name suggestion: `feature/offline-state-cache`
**Acceptance criteria / test plan:**
- Cached client serves reads from local storage when offline and synchronizes upon re-connection.
- Cache invalidation triggers automatically when a write transaction is confirmed.
- Full test suite in `test/cache.test.ts`.
