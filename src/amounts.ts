/**
 * Bigint-based precision token amount helpers for the Very-Prince SDK.
 *
 * All operations are purely integer/string based; floating-point arithmetic is strictly prohibited.
 */

import { DEFAULT_TOKEN_DECIMALS, MAX_AMOUNT_LIMIT } from "./types.js";
import { AmountConversionError, AmountExceedsLimitError, InvalidAmountError } from "./errors.js";

/**
 * Validates decimal precision count.
 */
function assertValidDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new AmountConversionError(
      `Invalid decimals value: ${decimals}. Must be integer between 0 and 18.`,
    );
  }
}

/**
 * Converts a decimal string representation into the token's smallest unit (stroops) as a bigint.
 *
 * @param amount - Decimal string representing token amount (e.g. "100.5", "0.0000001")
 * @param decimals - Token decimal places (defaults to 7 for SAC tokens)
 * @returns Token amount in smallest base units (bigint)
 * @throws {InvalidAmountError} If amount is negative or non-positive where prohibited
 * @throws {AmountConversionError} If amount string is malformed or exceeds decimals precision
 * @throws {AmountExceedsLimitError} If amount exceeds MAX_AMOUNT_LIMIT
 */
export function toSmallestUnit(amount: string, decimals = DEFAULT_TOKEN_DECIMALS): bigint {
  assertValidDecimals(decimals);

  if (typeof amount !== "string") {
    throw new AmountConversionError(`Amount must be a string, got ${typeof amount}`);
  }

  const trimmed = amount.trim();
  if (trimmed === "") {
    throw new AmountConversionError("Amount cannot be empty.");
  }

  // Reject negative signs
  if (trimmed.startsWith("-")) {
    throw new InvalidAmountError({ cause: new Error("Negative amounts are prohibited.") });
  }

  // Reject scientific notation or non-decimal characters
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new AmountConversionError(`Invalid numeric string format: "${amount}"`);
  }

  const parts = trimmed.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";

  if (fracPart.length > decimals) {
    throw new AmountConversionError(
      `Fractional component "${fracPart}" exceeds maximum allowed decimal places of ${decimals}.`,
    );
  }

  // Pad fractional component to exact number of decimals
  const paddedFrac = fracPart.padEnd(decimals, "0");
  const fullIntStr = intPart + paddedFrac;

  // Remove leading zeros while preserving at least "0"
  const normalized = fullIntStr.replace(/^0+(?=\d)/, "");
  const result = BigInt(normalized === "" ? "0" : normalized);

  if (result > MAX_AMOUNT_LIMIT) {
    throw new AmountExceedsLimitError({
      cause: new Error(`Amount ${result} exceeds maximum limit of ${MAX_AMOUNT_LIMIT}.`),
    });
  }

  return result;
}

/**
 * Converts a smallest-unit integer amount (stroops) to a human-readable decimal string.
 *
 * @param stroops - Amount in smallest base units (bigint or numeric integer string)
 * @param decimals - Token decimal places (defaults to 7)
 * @returns Human-readable decimal string without scientific notation or unnecessary trailing zeros
 * @throws {InvalidAmountError} If amount is negative
 * @throws {AmountConversionError} If string input is malformed
 */
export function fromSmallestUnit(
  stroops: bigint | string,
  decimals = DEFAULT_TOKEN_DECIMALS,
): string {
  assertValidDecimals(decimals);

  let raw: bigint;
  if (typeof stroops === "bigint") {
    raw = stroops;
  } else if (typeof stroops === "string") {
    const trimmed = stroops.trim();
    if (!/^\d+$/.test(trimmed)) {
      if (trimmed.startsWith("-")) {
        throw new InvalidAmountError({ cause: new Error("Negative amounts are prohibited.") });
      }
      throw new AmountConversionError(`Invalid integer string for stroops: "${stroops}"`);
    }
    raw = BigInt(trimmed);
  } else {
    throw new AmountConversionError(`Invalid stroops type: ${typeof stroops}`);
  }

  if (raw < 0n) {
    throw new InvalidAmountError({ cause: new Error("Negative amounts are prohibited.") });
  }

  if (raw > MAX_AMOUNT_LIMIT) {
    throw new AmountExceedsLimitError({
      cause: new Error(`Amount ${raw} exceeds maximum limit of ${MAX_AMOUNT_LIMIT}.`),
    });
  }

  if (decimals === 0) {
    return raw.toString();
  }

  const str = raw.toString();
  if (str.length <= decimals) {
    const padded = str.padStart(decimals, "0");
    const trimmedFrac = padded.replace(/0+$/, "");
    return trimmedFrac === "" ? "0" : `0.${trimmedFrac}`;
  }

  const intPart = str.slice(0, str.length - decimals);
  const fracPart = str.slice(str.length - decimals);
  const trimmedFrac = fracPart.replace(/0+$/, "");

  return trimmedFrac === "" ? intPart : `${intPart}.${trimmedFrac}`;
}
