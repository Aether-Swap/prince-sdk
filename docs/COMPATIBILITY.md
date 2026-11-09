# Contract Compatibility

This document records the exact target contract source, cryptographic verification hash, and list of supported functions and events for `@aether-swap/prince-sdk`.

## Target Contract

- **Contract Name**: Very-Prince `PayoutRegistry`
- **Target Repository**: [https://github.com/Sahara-Pay/Very-Prince](https://github.com/Sahara-Pay/Very-Prince)
- **Source File**: `packages/contracts/src/lib.rs`
- **Verification Hash (SHA-256)**: `10ba78ae0bb964320aab6ba291450240e123418a82ef4a2d3025683275f6cfa0`
- **Network**: Stellar Testnet Only

> **Note**: As this SDK is developed against a local verified copy of `packages/contracts/src/lib.rs`, the source was verified via SHA-256 checksum rather than an isolated Git commit pointer.

---

## Contract Constants

| Constant | Value | Description |
| --- | --- | --- |
| `MAX_AMOUNT_LIMIT` | `10_000_000_000_000_000_000` ($10^{19}$) | Maximum allowed token amount for funding and payouts (1 trillion tokens in 7-decimal stroops). |
| `PERSISTENT_BUMP_AMOUNT` | `518_400` ledgers (~30 days) | TTL extension bump for active ledger entries. |
| `PERSISTENT_LIFETIME_THRESHOLD` | `120_960` ledgers (~7 days) | Threshold remaining before TTL bump triggers. |

---

## Supported Contract Functions

### In-Scope Read Methods

| Contract Function | SDK Method | Description |
| --- | --- | --- |
| `get_org(id: Symbol) -> Organization` | `client.getOrg(id)` | Look up organization details by Symbol identifier. |
| `get_org_budget(id: Symbol) -> i128` | `client.getOrgBudget(id)` | Query total unallocated budget for an organization. |
| `get_maintainer(address: Address) -> Maintainer` | `client.getMaintainer(address)` | Fetch registered maintainer record and affiliated organization. |
| `get_maintainers(org_id: Symbol) -> Vec<Address>` | `client.getMaintainers(orgId)` | List all maintainers enrolled in an organization. |
| `get_claimable_balance(maintainer: Address) -> i128` | `client.getClaimableBalance(maintainer)` | Fetch current claimable (locked + unlocked) balance. |
| `get_token() -> Address` | `client.getToken()` | Retrieve configured SAC token address. |
| `get_token_metadata() -> TokenMetadata` | `client.getTokenMetadata()` | Fetch cached SAC token name, symbol, and decimals. |
| `get_protocol_state() -> ProtocolState` | `client.getProtocolState()` | Return current state (`Active` or `Paused`). |
| `get_nonce(caller: Address) -> u64` | `client.getNonce(caller)` | Query next replay-protection nonce for a caller. |
| `token_balance(id: Address) -> i128` | `client.getTokenBalance(id)` | Query SAC balance directly via contract helper. |

### In-Scope Write Methods (Prepared Transactions)

| Contract Function | SDK Method | Description |
| --- | --- | --- |
| `register_org(id, name, admin)` | `client.registerOrg({ id, name, admin })` | Register a new organization and assign initial administrator. |
| `update_org_metadata(id, admin, metadata_cid)` | `client.updateOrgMetadata({ id, admin, metadataCid })` | Update IPFS CID for organization metadata. |
| `fund_org(org_id, from, amount)` | `client.fundOrg({ orgId, from, amount })` | Fund an organization's budget using tokens from donor address. |
| `fund_org_with_nonce(org_id, from, amount, expected_nonce)` | `client.fundOrgWithNonce({ orgId, from, amount, expectedNonce })` | Nonce-gated funding for replay protection. |
| `add_admin(org_id, admin, new_admin)` | `client.addAdmin({ orgId, admin, newAdmin })` | Add a new administrator to an organization. |
| `remove_admin(org_id, admin, admin_to_remove)` | `client.removeAdmin({ orgId, admin, adminToRemove })` | Remove an existing administrator from an organization. |
| `add_maintainer(org_id, maintainer)` | `client.addMaintainer({ orgId, admin, maintainer })` | Enroll a maintainer under an organization. |
| `allocate_payout(org_id, admin, maintainer, amount, unlock_timestamp)` | `client.allocatePayout({ orgId, admin, maintainer, amount, unlockTimestamp })` | Allocate a single-tranche payout to a maintainer. |
| `allocate_payout_vesting(org_id, admin, maintainer, amount, tranches)` | `client.allocatePayoutVesting({ orgId, admin, maintainer, amount, tranches })` | Allocate a multi-tranche vesting payout. |
| `batch_allocate(admin, org_id, payouts)` | `client.batchAllocate({ admin, orgId, payouts })` | Allocate payouts to up to 100 maintainers simultaneously. |
| `claim_payout(maintainer)` | `client.claimPayout({ maintainer })` | Claim all currently vested payout funds for maintainer. |
| `claim_payout_with_nonce(maintainer, expected_nonce)` | `client.claimPayoutWithNonce({ maintainer, expectedNonce })` | Nonce-protected claim operation. |

---

## Contract Events Covered

| Event Topic | Event Data Shape | SDK Decoder |
| --- | --- | --- |
| `("VeryPrince", "org_registered")` | `(id: Symbol, admin: Address)` | `OrgRegisteredEvent` |
| `("VeryPrince", "OrgMetadataUpdated")` | `(id: Symbol, metadata_cid: String)` | `OrgMetadataUpdatedEvent` |
| `("VeryPrince", "OrgFunded")` | `(org_id: Symbol, from: Address, amount: i128)` | `OrgFundedEvent` |
| `("VeryPrince", "AdminAdded")` | `(org_id: Symbol, new_admin: Address)` | `AdminAddedEvent` |
| `("VeryPrince", "AdminRemoved")` | `(org_id: Symbol, admin_to_remove: Address)` | `AdminRemovedEvent` |
| `("VeryPrince", "MaintainerAdded")` | `(org_id: Symbol, maintainer: Address)` | `MaintainerAddedEvent` |
| `("VeryPrince", "PayoutAllocated")` | `(org_id: Symbol, maintainer: Address, amount: i128)` | `PayoutAllocatedEvent` |
| `("payout", "batch_alc")` | `(org_id: Symbol, admin: Address, total: i128)` | `BatchAllocatedEvent` |
| `("VeryPrince", "PayoutClaimed")` | `(maintainer: Address, amount: i128)` | `PayoutClaimedEvent` |

---

## Out-of-Scope Features

The following contract capabilities are intentionally out of scope for this client library:
- Quadratic Funding modules (`qf_deposit_matching_pool`, `qf_contribute`, `qf_distribute`, `qf_preview_distribution`)
- Proof-of-Humanity management (`verify_humanity`, `revoke_humanity`, `has_humanity`)
- Fractional Asset / Vault share functions (`vault_deposit`, `vault_withdraw`)
- Flash Loans and Flash Mint modules
- BLS Aggregate Signatures and DAO voting
- Contract upgradeability and pause administration (`upgrade`, `pause_protocol`, `unpause_protocol`, `propose_admin`, `accept_admin`)
- Linked list and zero-copy lower-level storage routines
