/**
 * TypeScript contract bindings and data types for the Very-Prince PayoutRegistry contract.
 *
 * Target: https://github.com/Sahara-Pay/Very-Prince
 * Source file: packages/contracts/src/lib.rs
 * Source SHA-256: 10ba78ae0bb964320aab6ba291450240e123418a82ef4a2d3025683275f6cfa0
 * Network: Stellar Testnet
 */

/**
 * Maximum allowed amount for funding or payout (1 trillion tokens in stroops, 10^19).
 * Defined in lib.rs as MAX_AMOUNT_LIMIT: i128 = 10_000_000_000_000_000_000.
 */
export const MAX_AMOUNT_LIMIT: bigint = 10_000_000_000_000_000_000n;

/**
 * Default stroop decimal precision for Stellar Asset Contract (SAC) tokens.
 */
export const DEFAULT_TOKEN_DECIMALS: number = 7;

/**
 * Stellar testnet network passphrase constant.
 */
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * State of the PayoutRegistry protocol.
 */
export type ProtocolState = "Active" | "Paused";

/**
 * Registered organization record stored in contract persistent storage.
 */
export interface Organization {
  /** Unique Symbol identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** List of current administrator addresses */
  admins: string[];
  /** Optional IPFS CID for organization metadata / branding */
  metadataCid?: string | null;
}

/**
 * Registered maintainer record.
 */
export interface Maintainer {
  /** Maintainer's Stellar account address (G...) */
  address: string;
  /** Symbol identifier of affiliated organization */
  orgId: string;
}

/**
 * Parameters for a single payout entry in a batch allocation.
 */
export interface PayoutParams {
  /** Maintainer recipient address (G...) */
  maintainer: string;
  /** Amount to allocate in smallest token units (stroops) */
  amount: bigint;
}

/**
 * A single milestone in a vesting schedule.
 */
export interface VestingTranche {
  /** Unix epoch timestamp in seconds when this tranche unlocks */
  unlockTimestamp: bigint;
  /** Amount unlocked in this tranche (stroops) */
  amount: bigint;
}

/**
 * Payout balance and schedule record for an enrolled maintainer.
 */
export interface MaintainerPayout {
  /** Remaining locked/unclaimed balance across all unreleased tranches (stroops) */
  amount: bigint;
  /** Total cumulative amount claimed so far (stroops) */
  claimedAmount: bigint;
  /** Ordered array of vesting tranches */
  tranches: VestingTranche[];
}

/**
 * Cached SEP-41 Stellar Asset Contract token metadata.
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Options for instantiating the PayoutRegistryClient.
 */
export interface ClientOptions {
  /** Contract ID of the deployed PayoutRegistry (C...) */
  contractId: string;
  /** Soroban RPC endpoint URL */
  rpcUrl: string;
  /** Stellar network passphrase (defaults to Stellar Testnet) */
  networkPassphrase?: string;
  /** Optional custom fetch implementation */
  fetch?: typeof fetch;
}

/**
 * Arguments for registering an organization.
 */
export interface RegisterOrgParams {
  /** Unique Symbol identifier (alphanumeric up to 32 chars) */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Initial administrator Stellar address (G...) */
  admin: string;
}

/**
 * Arguments for updating organization metadata CID.
 */
export interface UpdateOrgMetadataParams {
  id: string;
  admin: string;
  metadataCid: string;
}

/**
 * Arguments for funding an organization.
 */
export interface FundOrgParams {
  orgId: string;
  /** Donor address (G...) */
  from: string;
  /** Amount in stroops (bigint) */
  amount: bigint;
}

/**
 * Arguments for nonce-gated funding of an organization.
 */
export interface FundOrgWithNonceParams extends FundOrgParams {
  /** Expected caller nonce for replay protection */
  expectedNonce: bigint;
}

/**
 * Arguments for adding an administrator to an organization.
 */
export interface AddAdminParams {
  orgId: string;
  admin: string;
  newAdmin: string;
}

/**
 * Arguments for removing an administrator from an organization.
 */
export interface RemoveAdminParams {
  orgId: string;
  admin: string;
  adminToRemove: string;
}

/**
 * Arguments for enrolling a maintainer.
 */
export interface AddMaintainerParams {
  orgId: string;
  /** Org administrator authorizing the enrollment */
  admin: string;
  /** Maintainer address to enroll (G...) */
  maintainer: string;
}

/**
 * Arguments for allocating a single-tranche payout.
 */
export interface AllocatePayoutParams {
  orgId: string;
  admin: string;
  maintainer: string;
  amount: bigint;
  /** Unix epoch timestamp (seconds) when payout unlocks */
  unlockTimestamp: bigint;
}

/**
 * Arguments for allocating a multi-tranche vesting payout.
 */
export interface AllocatePayoutVestingParams {
  orgId: string;
  admin: string;
  maintainer: string;
  amount: bigint;
  tranches: VestingTranche[];
}

/**
 * Arguments for batch allocating payouts.
 */
export interface BatchAllocateParams {
  admin: string;
  orgId: string;
  payouts: PayoutParams[];
}

/**
 * Arguments for claiming a payout.
 */
export interface ClaimPayoutParams {
  maintainer: string;
}

/**
 * Arguments for claiming a payout with nonce verification.
 */
export interface ClaimPayoutWithNonceParams extends ClaimPayoutParams {
  expectedNonce: bigint;
}
