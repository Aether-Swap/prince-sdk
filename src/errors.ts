/**
 * Typed error hierarchy and mapping for Very-Prince PayoutRegistry contract errors and SDK operations.
 *
 * All 46 PrinceError contract error codes are mapped 1:1 with informative error messages.
 */

/**
 * Base class for all SDK-specific errors.
 */
export class PrinceSdkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PrinceSdkError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Base class for errors originating from contract execution or simulation.
 */
export class ContractError extends PrinceSdkError {
  readonly code: number;

  constructor(code: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContractError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error raised when an unknown or unmapped contract error code is returned.
 */
export class UnknownContractError extends ContractError {
  constructor(code: number, options?: { cause?: unknown }) {
    super(code, `Unknown contract error code: ${code}`, options);
    this.name = "UnknownContractError";
  }
}

// -----------------------------------------------------------------------------
// PrinceError Contract Error Classes (Codes 1 - 46)
// -----------------------------------------------------------------------------

export class AlreadyInitializedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(1, "The contract has already been initialized and cannot be re-configured.", options);
    this.name = "AlreadyInitializedError";
  }
}

export class EmptyAdminListError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(2, "The provided list of administrators for initialization is empty.", options);
    this.name = "EmptyAdminListError";
  }
}

export class InvalidThresholdError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(3, "The native protocol admin config must contain exactly one admin with threshold 1.", options);
    this.name = "InvalidThresholdError";
  }
}

export class ContractNotInitializedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(4, "Attempted to call a function that requires the contract to be initialized.", options);
    this.name = "ContractNotInitializedError";
  }
}

export class ProtocolPausedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(5, "The protocol is currently paused by the global administrators.", options);
    this.name = "ProtocolPausedError";
  }
}

export class InsufficientMultisigAuthError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(6, "Legacy multisig signer payloads are no longer accepted.", options);
    this.name = "InsufficientMultisigAuthError";
  }
}

export class OrgAlreadyRegisteredError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(7, "An organization with this ID already exists.", options);
    this.name = "OrgAlreadyRegisteredError";
  }
}

export class OrgNotFoundError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(8, "The requested organization could not be found in storage.", options);
    this.name = "OrgNotFoundError";
  }
}

export class NotAuthorizedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(9, "The caller does not have the necessary permissions for this operation.", options);
    this.name = "NotAuthorizedError";
  }
}

export class InvalidAmountError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(10, "The amount provided must be a positive value.", options);
    this.name = "InvalidAmountError";
  }
}

export class BudgetOverflowError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(11, "The organization total budget would exceed the maximum representable value.", options);
    this.name = "BudgetOverflowError";
  }
}

export class InsufficientBudgetError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(12, "The organization does not have enough remaining budget to cover the payout.", options);
    this.name = "InsufficientBudgetError";
  }
}

export class MaxAdminLimitReachedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(13, "An organization cannot have more than 10 administrators.", options);
    this.name = "MaxAdminLimitReachedError";
  }
}

export class AdminAlreadyExistsError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(14, "The address is already registered as an administrator for this organization.", options);
    this.name = "AdminAlreadyExistsError";
  }
}

export class CannotRemoveLastAdminError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(15, "Cannot remove the last administrator; an organization must have at least one.", options);
    this.name = "CannotRemoveLastAdminError";
  }
}

export class NotAnAdminError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(16, "The address is not currently an administrator of the specified organization.", options);
    this.name = "NotAnAdminError";
  }
}

export class MaintainerAlreadyRegisteredError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(17, "This maintainer is already associated with an organization.", options);
    this.name = "MaintainerAlreadyRegisteredError";
  }
}

export class MaintainerNotRegisteredError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(18, "This maintainer is not registered in the system.", options);
    this.name = "MaintainerNotRegisteredError";
  }
}

export class MaintainerOrgMismatchError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(19, "The maintainer is registered but belongs to a different organization.", options);
    this.name = "MaintainerOrgMismatchError";
  }
}

export class PayoutOverflowError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(20, "The maintainer total claimable balance would exceed the maximum representable value.", options);
    this.name = "PayoutOverflowError";
  }
}

export class BatchSizeExceededError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(21, "A batch payout operation cannot exceed 100 entries.", options);
    this.name = "BatchSizeExceededError";
  }
}

export class EmptyBatchError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(22, "The provided list of payouts for a batch operation is empty.", options);
    this.name = "EmptyBatchError";
  }
}

export class NoClaimableBalanceError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(23, "The maintainer has no funds available to claim.", options);
    this.name = "NoClaimableBalanceError";
  }
}

export class PayoutLockedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(24, "The payout is currently within its mandatory lock or vesting period.", options);
    this.name = "PayoutLockedError";
  }
}

export class NoPendingAdminError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(25, "There is no pending administrator proposal to accept.", options);
    this.name = "NoPendingAdminError";
  }
}

export class NotPendingAdminError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(26, "The caller is not the address currently proposed as a new administrator.", options);
    this.name = "NotPendingAdminError";
  }
}

export class AmountExceedsLimitError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(27, "The amount provided exceeds the maximum allowed limit.", options);
    this.name = "AmountExceedsLimitError";
  }
}

export class ReentrancyError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(28, "Re-entrancy detected in contract execution.", options);
    this.name = "ReentrancyError";
  }
}

export class HumanityVerificationRequiredError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(29, "A contributor must hold an active proof-of-humanity verification.", options);
    this.name = "HumanityVerificationRequiredError";
  }
}

export class QuadraticOverflowError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(30, "Integer math overflowed while evaluating quadratic funding formula.", options);
    this.name = "QuadraticOverflowError";
  }
}

export class EmptyMatchingPoolError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(31, "The quadratic matching pool is empty.", options);
    this.name = "EmptyMatchingPoolError";
  }
}

export class EmptyQuadraticRoundError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(32, "The quadratic round has no positive project weight.", options);
    this.name = "EmptyQuadraticRoundError";
  }
}

export class DuplicateProjectError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(33, "A project list cannot contain the same project more than once.", options);
    this.name = "DuplicateProjectError";
  }
}

export class InvalidNonceError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(34, "The provided nonce does not match the expected next nonce for this caller.", options);
    this.name = "InvalidNonceError";
  }
}

export class InvalidBlsSignatureError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(35, "The BLS signature provided for the DAO approval is mathematically invalid.", options);
    this.name = "InvalidBlsSignatureError";
  }
}

export class InvalidPoPError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(36, "The BLS Proof-of-Possession provided during key registration is invalid.", options);
    this.name = "InvalidPoPError";
  }
}

export class TokenMetadataUnavailableError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(37, "Token metadata (name/symbol/decimals) could not be fetched during initialization.", options);
    this.name = "TokenMetadataUnavailableError";
  }
}

export class FlashMintSupplyMismatchError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(38, "Flash mint execution resulted in a non-zero supply delta.", options);
    this.name = "FlashMintSupplyMismatchError";
  }
}

export class InvalidListInsertionPointError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(39, "The provided insertion point for the sorted list is invalid.", options);
    this.name = "InvalidListInsertionPointError";
  }
}

export class ListNodeNotFoundError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(40, "The requested node was not found in the linked list.", options);
    this.name = "ListNodeNotFoundError";
  }
}

export class ListTraversalLimitExceededError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(41, "The linked list traversal depth limit was reached.", options);
    this.name = "ListTraversalLimitExceededError";
  }
}

export class RoundingOverflowError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(42, "Fixed-point vault conversion overflowed integer arithmetic.", options);
    this.name = "RoundingOverflowError";
  }
}

export class ZeroSharesMintedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(43, "A vault deposit rounded down to zero shares and was rejected.", options);
    this.name = "ZeroSharesMintedError";
  }
}

export class InsufficientShareBalanceError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(44, "Caller attempted to burn more vault shares than their recorded balance.", options);
    this.name = "InsufficientShareBalanceError";
  }
}

export class FlashLoanRepaymentFailedError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(45, "The flash loan callback failed to return the borrowed amount plus fee.", options);
    this.name = "FlashLoanRepaymentFailedError";
  }
}

export class FlashLoanInsufficientLiquidityError extends ContractError {
  constructor(options?: { cause?: unknown }) {
    super(46, "The requested flash loan amount exceeds the contract available liquidity.", options);
    this.name = "FlashLoanInsufficientLiquidityError";
  }
}

/**
 * Mapping from numeric contract error code to corresponding error class.
 */
export const CONTRACT_ERROR_MAP: Record<number, new (opts?: { cause?: unknown }) => ContractError> = {
  1: AlreadyInitializedError,
  2: EmptyAdminListError,
  3: InvalidThresholdError,
  4: ContractNotInitializedError,
  5: ProtocolPausedError,
  6: InsufficientMultisigAuthError,
  7: OrgAlreadyRegisteredError,
  8: OrgNotFoundError,
  9: NotAuthorizedError,
  10: InvalidAmountError,
  11: BudgetOverflowError,
  12: InsufficientBudgetError,
  13: MaxAdminLimitReachedError,
  14: AdminAlreadyExistsError,
  15: CannotRemoveLastAdminError,
  16: NotAnAdminError,
  17: MaintainerAlreadyRegisteredError,
  18: MaintainerNotRegisteredError,
  19: MaintainerOrgMismatchError,
  20: PayoutOverflowError,
  21: BatchSizeExceededError,
  22: EmptyBatchError,
  23: NoClaimableBalanceError,
  24: PayoutLockedError,
  25: NoPendingAdminError,
  26: NotPendingAdminError,
  27: AmountExceedsLimitError,
  28: ReentrancyError,
  29: HumanityVerificationRequiredError,
  30: QuadraticOverflowError,
  31: EmptyMatchingPoolError,
  32: EmptyQuadraticRoundError,
  33: DuplicateProjectError,
  34: InvalidNonceError,
  35: InvalidBlsSignatureError,
  36: InvalidPoPError,
  37: TokenMetadataUnavailableError,
  38: FlashMintSupplyMismatchError,
  39: InvalidListInsertionPointError,
  40: ListNodeNotFoundError,
  41: ListTraversalLimitExceededError,
  42: RoundingOverflowError,
  43: ZeroSharesMintedError,
  44: InsufficientShareBalanceError,
  45: FlashLoanRepaymentFailedError,
  46: FlashLoanInsufficientLiquidityError,
};

/**
 * Creates a typed ContractError instance for a given code.
 */
export function getContractError(code: number, cause?: unknown): ContractError {
  const ErrorClass = CONTRACT_ERROR_MAP[code];
  if (ErrorClass) {
    return new ErrorClass({ cause });
  }
  return new UnknownContractError(code, { cause });
}

// -----------------------------------------------------------------------------
// SDK Operational Errors
// -----------------------------------------------------------------------------

/**
 * Error raised when transaction simulation fails on the RPC node.
 */
export class SimulationError extends PrinceSdkError {
  readonly simulationResponse?: unknown;

  constructor(message: string, options?: { cause?: unknown; simulationResponse?: unknown }) {
    super(message, options);
    this.name = "SimulationError";
    this.simulationResponse = options?.simulationResponse;
  }
}

/**
 * Error raised when communication with the Soroban RPC node fails.
 */
export class RpcError extends PrinceSdkError {
  readonly statusCode?: number;

  constructor(message: string, options?: { cause?: unknown; statusCode?: number }) {
    super(message, options);
    this.name = "RpcError";
    this.statusCode = options?.statusCode;
  }
}

/**
 * Error raised when a wallet user explicitly rejects or cancels signing.
 */
export class UserRejectedError extends PrinceSdkError {
  constructor(message = "Transaction signing was rejected by user.", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UserRejectedError";
  }
}

/**
 * Error raised when wallet or client network passphrase does not match.
 */
export class NetworkMismatchError extends PrinceSdkError {
  readonly expected: string;
  readonly actual?: string;

  constructor(expected: string, actual?: string, options?: { cause?: unknown }) {
    super(
      `Network mismatch: expected "${expected}"${actual ? `, got "${actual}"` : ""}.`,
      options,
    );
    this.name = "NetworkMismatchError";
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Error raised when the Freighter browser extension is not installed or available.
 */
export class FreighterNotInstalledError extends PrinceSdkError {
  constructor(message = "Freighter wallet extension is not installed or not detected in browser.", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FreighterNotInstalledError";
  }
}

/**
 * Error raised when polling for transaction completion exceeds the timeout.
 */
export class TimeoutError extends PrinceSdkError {
  readonly hash?: string;

  constructor(message: string, options?: { cause?: unknown; hash?: string }) {
    super(message, options);
    this.name = "TimeoutError";
    this.hash = options?.hash;
  }
}

/**
 * Error raised when vesting schedule validation fails.
 */
export class VestingValidationError extends PrinceSdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VestingValidationError";
  }
}

/**
 * Error raised when parsing or converting token amounts fails.
 */
export class AmountConversionError extends PrinceSdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AmountConversionError";
  }
}

/**
 * Extracts a numeric contract error code from an error message, string, or object.
 */
export function extractContractErrorCode(err: unknown): number | null {
  if (typeof err === "number") {
    return err;
  }
  if (!err) {
    return null;
  }

  // Check object with code property
  if (typeof err === "object" && "code" in err && typeof (err as any).code === "number") {
    return (err as any).code;
  }

  // Check string representation for Soroban host error patterns
  const msg = typeof err === "string" ? err : (err as any).message ?? String(err);

  // Pattern 1: Error(Contract, #10) or Error(Contract, 10)
  const pattern1 = /Error\(Contract,\s*#?(\d+)\)/i.exec(msg);
  if (pattern1 && pattern1[1]) {
    return parseInt(pattern1[1], 10);
  }

  // Pattern 2: contract error: 10 or ContractError(10) or Error code 10
  const pattern2 = /(?:contract\s*error|contracterror|error\s*code)[\s:=#(]+(\d+)/i.exec(msg);
  if (pattern2 && pattern2[1]) {
    return parseInt(pattern2[1], 10);
  }

  // Pattern 3: ScError code
  const pattern3 = /code\s*[:=]\s*(\d+)/i.exec(msg);
  if (pattern3 && pattern3[1]) {
    const code = parseInt(pattern3[1], 10);
    if (code > 0 && code <= 100) return code;
  }

  return null;
}
