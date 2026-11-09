/**
 * Vesting schedule construction, validation, and evaluation helpers for Very-Prince.
 *
 * Implements exact integer arithmetic and mirrors the contract's binary search
 * milestone resolution logic from vesting_search.rs.
 */

import { MAX_AMOUNT_LIMIT, VestingTranche } from "./types.js";
import { InvalidAmountError, PayoutOverflowError, VestingValidationError } from "./errors.js";

/**
 * Options for generating a linear vesting schedule.
 */
export interface LinearScheduleOptions {
  /** Total token amount to be vested across all tranches (stroops) */
  totalAmount: bigint;
  /** Unix epoch timestamp (seconds) when vesting begins */
  startTime: bigint | number;
  /** Unix epoch timestamp (seconds) when all tranches are unlocked */
  endTime: bigint | number;
  /** Number of discrete unlocking milestones (must be >= 1) */
  tranchesCount: number;
}

/**
 * Generates an evenly distributed linear vesting schedule with exact remainder handling.
 *
 * Remainder stroops from division are distributed one by one to the earliest tranches,
 * ensuring that the sum of all tranche amounts strictly equals `totalAmount`.
 *
 * @param options - Schedule parameters
 * @returns Array of VestingTranche structs with non-decreasing unlock timestamps
 */
export function linearSchedule(options: LinearScheduleOptions): VestingTranche[] {
  const { totalAmount, tranchesCount } = options;
  const startTime = BigInt(options.startTime);
  const endTime = BigInt(options.endTime);

  if (totalAmount <= 0n) {
    throw new InvalidAmountError({ cause: new Error("Total vesting amount must be positive.") });
  }

  if (totalAmount > MAX_AMOUNT_LIMIT) {
    throw new InvalidAmountError({
      cause: new Error(`Total vesting amount exceeds limit of ${MAX_AMOUNT_LIMIT}.`),
    });
  }

  if (!Number.isInteger(tranchesCount) || tranchesCount <= 0) {
    throw new VestingValidationError(
      `Tranches count must be a positive integer, got ${tranchesCount}.`,
    );
  }

  if (endTime < startTime) {
    throw new VestingValidationError(
      `End time (${endTime}) cannot be earlier than start time (${startTime}).`,
    );
  }

  const countBig = BigInt(tranchesCount);
  const baseAmount = totalAmount / countBig;
  const remainder = totalAmount % countBig;
  const duration = endTime - startTime;

  const tranches: VestingTranche[] = [];

  for (let i = 0; i < tranchesCount; i++) {
    const trancheIndex = BigInt(i);
    // Evenly interpolate timestamp: each tranche unlocks at startTime + (duration * (i + 1)) / count
    const unlockTimestamp =
      tranchesCount === 1 ? endTime : startTime + (duration * (trancheIndex + 1n)) / countBig;

    // Distribute remainder stroops across the first `remainder` tranches
    const amount = baseAmount + (BigInt(i) < remainder ? 1n : 0n);

    tranches.push({
      unlockTimestamp,
      amount,
    });
  }

  return tranches;
}

/**
 * Validates a vesting schedule against contract rules.
 *
 * Contract requirements:
 * 1. Array cannot be empty (EmptyBatch).
 * 2. Every tranche amount must be strictly positive (amount > 0).
 * 3. Every tranche amount must not exceed MAX_AMOUNT_LIMIT.
 * 4. Unlock timestamps must be monotonically non-decreasing.
 * 5. Sum of tranche amounts must not overflow i128 and must equal `expectedTotal` if provided.
 *
 * @param tranches - Array of VestingTranche to validate
 * @param expectedTotal - Optional expected total amount
 * @throws {VestingValidationError | InvalidAmountError | PayoutOverflowError}
 */
export function validateSchedule(tranches: VestingTranche[], expectedTotal?: bigint): void {
  if (!Array.isArray(tranches) || tranches.length === 0) {
    throw new VestingValidationError("Vesting schedule must contain at least one tranche.");
  }

  let lastTs: bigint = 0n;
  let total: bigint = 0n;

  for (let i = 0; i < tranches.length; i++) {
    const t = tranches[i];
    if (!t) {
      throw new VestingValidationError(`Tranche at index ${i} is undefined.`);
    }

    if (t.amount <= 0n) {
      throw new InvalidAmountError({
        cause: new Error(`Tranche at index ${i} has non-positive amount: ${t.amount}.`),
      });
    }

    if (t.amount > MAX_AMOUNT_LIMIT) {
      throw new InvalidAmountError({
        cause: new Error(`Tranche at index ${i} exceeds maximum limit of ${MAX_AMOUNT_LIMIT}.`),
      });
    }

    if (i > 0 && t.unlockTimestamp < lastTs) {
      throw new VestingValidationError(
        `Non-monotonic vesting schedule: tranche ${i} (${t.unlockTimestamp}) unlocks earlier than tranche ${i - 1} (${lastTs}).`,
      );
    }

    total += t.amount;
    if (total > MAX_AMOUNT_LIMIT) {
      throw new PayoutOverflowError({
        cause: new Error(`Cumulative tranche total ${total} exceeds limit of ${MAX_AMOUNT_LIMIT}.`),
      });
    }

    lastTs = t.unlockTimestamp;
  }

  if (expectedTotal !== undefined && total !== expectedTotal) {
    throw new VestingValidationError(
      `Tranche sum (${total}) does not match expected total (${expectedTotal}).`,
    );
  }
}

/**
 * Calculates total vested (unlocked) tokens at a given timestamp using binary search.
 *
 * Mirrors the contract's binary search in `vesting_search::vested_amount_binary`.
 *
 * @param tranches - Sorted array of VestingTranche
 * @param timestamp - Unix epoch timestamp (seconds)
 * @returns Cumulative vested amount up to and including `timestamp`
 */
export function vestedAt(tranches: VestingTranche[], timestamp: bigint | number): bigint {
  if (!Array.isArray(tranches) || tranches.length === 0) {
    return 0n;
  }

  const now = BigInt(timestamp);
  const len = tranches.length;

  const first = tranches[0]!;
  if (first.unlockTimestamp > now) {
    return 0n;
  }

  const last = tranches[len - 1]!;
  if (last.unlockTimestamp <= now) {
    let total = 0n;
    for (let i = 0; i < len; i++) {
      total += tranches[i]!.amount;
    }
    return total;
  }

  // Binary search for the rightmost index whose timestamp <= now
  let lo = 0;
  let hi = len - 1;

  while (lo + 1 < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (tranches[mid]!.unlockTimestamp <= now) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  let vested = 0n;
  for (let i = 0; i <= lo; i++) {
    vested += tranches[i]!.amount;
  }

  return vested;
}

/**
 * Validates schedule continuity when appending new tranches to an existing maintainer schedule.
 *
 * The contract's `allocate_payout_vesting` appends new tranches directly to `MaintainerPayout.tranches`.
 * Because the contract's binary search requires that the entire merged tranche array remain sorted
 * in non-decreasing order of `unlock_timestamp`, this helper ensures that:
 * 1. Both schedules are individually valid.
 * 2. The first tranche of `newTranches` does not unlock earlier than the last tranche of `existingTranches`.
 *
 * @param newTranches - Newly proposed vesting tranches
 * @param existingTranches - Current on-chain vesting tranches for the maintainer
 * @throws {VestingValidationError} If schedule continuity is violated
 */
export function validateAgainstExisting(
  newTranches: VestingTranche[],
  existingTranches: VestingTranche[],
): void {
  validateSchedule(newTranches);

  if (!Array.isArray(existingTranches) || existingTranches.length === 0) {
    return;
  }

  validateSchedule(existingTranches);

  const lastExisting = existingTranches[existingTranches.length - 1]!;
  const firstNew = newTranches[0]!;

  if (firstNew.unlockTimestamp < lastExisting.unlockTimestamp) {
    throw new VestingValidationError(
      `Schedule continuity violation: proposed tranche unlocks at ${firstNew.unlockTimestamp}, which is earlier than existing last tranche at ${lastExisting.unlockTimestamp}.`,
    );
  }
}
