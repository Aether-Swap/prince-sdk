import { describe, expect, it } from "vitest";
import {
  CONTRACT_ERROR_MAP,
  ContractError,
  extractContractErrorCode,
  getContractError,
  OrgAlreadyRegisteredError,
  PayoutLockedError,
  UnknownContractError,
} from "../src/errors.js";

describe("Errors module", () => {
  it("maps all 46 PrinceError contract error codes to specific error classes", () => {
    expect(Object.keys(CONTRACT_ERROR_MAP)).toHaveLength(46);

    for (let code = 1; code <= 46; code++) {
      const err = getContractError(code);
      expect(err).toBeInstanceOf(ContractError);
      expect(err.code).toBe(code);
      expect(err.message.length).toBeGreaterThan(10);
      expect(err.name).not.toBe("UnknownContractError");
    }
  });

  it("maps specific known errors accurately", () => {
    const orgErr = getContractError(7);
    expect(orgErr).toBeInstanceOf(OrgAlreadyRegisteredError);
    expect(orgErr.code).toBe(7);

    const lockedErr = getContractError(24);
    expect(lockedErr).toBeInstanceOf(PayoutLockedError);
    expect(lockedErr.code).toBe(24);
  });

  it("degrades gracefully to UnknownContractError for unknown codes", () => {
    const unknown = getContractError(999);
    expect(unknown).toBeInstanceOf(UnknownContractError);
    expect(unknown.code).toBe(999);
    expect(unknown.message).toContain("999");
  });

  it("extracts contract error codes from various message formats", () => {
    expect(extractContractErrorCode("HostError: Error(Contract, #7)")).toBe(7);
    expect(extractContractErrorCode("Error(Contract, 24)")).toBe(24);
    expect(extractContractErrorCode("contract error: 10")).toBe(10);
    expect(extractContractErrorCode("ContractError(12)")).toBe(12);
    expect(extractContractErrorCode({ code: 19 })).toBe(19);
    expect(extractContractErrorCode(15)).toBe(15);
    expect(extractContractErrorCode("Unrelated error message")).toBeNull();
  });
});
