import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { fromSmallestUnit, toSmallestUnit } from "../src/amounts.js";
import {
  AmountConversionError,
  AmountExceedsLimitError,
  InvalidAmountError,
} from "../src/errors.js";
import { MAX_AMOUNT_LIMIT } from "../src/types.js";

describe("Amounts module", () => {
  describe("toSmallestUnit", () => {
    it("converts standard whole amounts", () => {
      expect(toSmallestUnit("100")).toBe(1_000_000_000n);
      expect(toSmallestUnit("1")).toBe(10_000_000n);
      expect(toSmallestUnit("0")).toBe(0n);
    });

    it("converts decimal strings accurately", () => {
      expect(toSmallestUnit("0.1")).toBe(1_000_000n);
      expect(toSmallestUnit("0.0000001")).toBe(1n);
      expect(toSmallestUnit("123.456789")).toBe(1_234_567_890n);
    });

    it("supports custom decimals", () => {
      expect(toSmallestUnit("10.5", 2)).toBe(1050n);
      expect(toSmallestUnit("1", 0)).toBe(1n);
      expect(toSmallestUnit("0.123456789", 9)).toBe(123_456_789n);
    });

    it("rejects fractions with excessive precision", () => {
      expect(() => toSmallestUnit("1.00000001", 7)).toThrow(AmountConversionError);
      expect(() => toSmallestUnit("0.123", 2)).toThrow(AmountConversionError);
    });

    it("rejects negative amounts", () => {
      expect(() => toSmallestUnit("-1")).toThrow(InvalidAmountError);
      expect(() => toSmallestUnit("-0.5")).toThrow(InvalidAmountError);
    });

    it("rejects invalid characters, exponents, or empty strings", () => {
      expect(() => toSmallestUnit("")).toThrow(AmountConversionError);
      expect(() => toSmallestUnit("   ")).toThrow(AmountConversionError);
      expect(() => toSmallestUnit("1e5")).toThrow(AmountConversionError);
      expect(() => toSmallestUnit("1.2.3")).toThrow(AmountConversionError);
      expect(() => toSmallestUnit("abc")).toThrow(AmountConversionError);
    });

    it("rejects amounts exceeding MAX_AMOUNT_LIMIT", () => {
      expect(() => toSmallestUnit("1000000000001")).toThrow(AmountExceedsLimitError);
    });
  });

  describe("fromSmallestUnit", () => {
    it("converts whole stroops to decimal string", () => {
      expect(fromSmallestUnit(10_000_000n)).toBe("1");
      expect(fromSmallestUnit(1_000_000_000n)).toBe("100");
      expect(fromSmallestUnit(0n)).toBe("0");
    });

    it("converts fractional stroops to clean decimal strings", () => {
      expect(fromSmallestUnit(1n)).toBe("0.0000001");
      expect(fromSmallestUnit(1_000_000n)).toBe("0.1");
      expect(fromSmallestUnit(1_234_567_890n)).toBe("123.456789");
    });

    it("supports string inputs and custom decimals", () => {
      expect(fromSmallestUnit("1050", 2)).toBe("10.5");
      expect(fromSmallestUnit("100", 0)).toBe("100");
    });

    it("rejects negative stroops", () => {
      expect(() => fromSmallestUnit(-1n)).toThrow(InvalidAmountError);
      expect(() => fromSmallestUnit("-500")).toThrow(InvalidAmountError);
    });

    it("rejects stroops beyond MAX_AMOUNT_LIMIT", () => {
      expect(() => fromSmallestUnit(MAX_AMOUNT_LIMIT + 1n)).toThrow(AmountExceedsLimitError);
    });
  });

  describe("Property-based testing (fast-check roundtrips)", () => {
    it("roundtrips integer amounts through toSmallestUnit and fromSmallestUnit", () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: MAX_AMOUNT_LIMIT }),
          fc.integer({ min: 0, max: 9 }),
          (stroops, decimals) => {
            const formatted = fromSmallestUnit(stroops, decimals);
            const parsed = toSmallestUnit(formatted, decimals);
            return parsed === stroops;
          },
        ),
      );
    });

    it("preserves exact representation of arbitrary valid decimal inputs", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1_000_000 }),
          fc.integer({ min: 1, max: 7 }),
          (intVal, decimals) => {
            const fracVal = Math.floor(Math.random() * Math.pow(10, decimals));
            const fracStr = fracVal.toString().padStart(decimals, "0").replace(/0+$/, "");
            const decimalStr = fracStr.length > 0 ? `${intVal}.${fracStr}` : `${intVal}`;

            const stroops = toSmallestUnit(decimalStr, decimals);
            const backToStr = fromSmallestUnit(stroops, decimals);
            return backToStr === decimalStr;
          },
        ),
      );
    });
  });
});
