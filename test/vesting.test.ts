import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  linearSchedule,
  validateAgainstExisting,
  validateSchedule,
  vestedAt,
} from "../src/vesting.js";
import { InvalidAmountError, VestingValidationError } from "../src/errors.js";
import { MAX_AMOUNT_LIMIT, VestingTranche } from "../src/types.js";

describe("Vesting module", () => {
  describe("linearSchedule", () => {
    it("creates a single tranche correctly", () => {
      const schedule = linearSchedule({
        totalAmount: 1000n,
        startTime: 100,
        endTime: 200,
        tranchesCount: 1,
      });
      expect(schedule).toHaveLength(1);
      expect(schedule[0]?.amount).toBe(1000n);
      expect(schedule[0]?.unlockTimestamp).toBe(200n);
    });

    it("distributes amounts with exact remainder handling", () => {
      // 100 stroops across 3 tranches: 34 + 33 + 33 = 100
      const schedule = linearSchedule({
        totalAmount: 100n,
        startTime: 100,
        endTime: 400,
        tranchesCount: 3,
      });
      expect(schedule).toHaveLength(3);
      expect(schedule[0]?.amount).toBe(34n);
      expect(schedule[1]?.amount).toBe(33n);
      expect(schedule[2]?.amount).toBe(33n);

      const sum = schedule.reduce((acc, t) => acc + t.amount, 0n);
      expect(sum).toBe(100n);
    });

    it("rejects non-positive amounts or invalid counts", () => {
      expect(() =>
        linearSchedule({ totalAmount: 0n, startTime: 100, endTime: 200, tranchesCount: 2 }),
      ).toThrow(InvalidAmountError);
      expect(() =>
        linearSchedule({ totalAmount: 100n, startTime: 100, endTime: 200, tranchesCount: 0 }),
      ).toThrow(VestingValidationError);
      expect(() =>
        linearSchedule({ totalAmount: 100n, startTime: 300, endTime: 200, tranchesCount: 2 }),
      ).toThrow(VestingValidationError);
    });
  });

  describe("validateSchedule", () => {
    it("accepts valid monotonic schedule", () => {
      const valid: VestingTranche[] = [
        { unlockTimestamp: 100n, amount: 50n },
        { unlockTimestamp: 100n, amount: 20n }, // equal timestamps allowed by contract
        { unlockTimestamp: 200n, amount: 30n },
      ];
      expect(() => validateSchedule(valid, 100n)).not.toThrow();
    });

    it("rejects non-monotonic unlock timestamps", () => {
      const invalid: VestingTranche[] = [
        { unlockTimestamp: 200n, amount: 50n },
        { unlockTimestamp: 100n, amount: 50n },
      ];
      expect(() => validateSchedule(invalid)).toThrow(VestingValidationError);
    });

    it("rejects zero or negative amounts", () => {
      expect(() =>
        validateSchedule([{ unlockTimestamp: 100n, amount: 0n }]),
      ).toThrow(InvalidAmountError);
      expect(() =>
        validateSchedule([{ unlockTimestamp: 100n, amount: -10n }]),
      ).toThrow(InvalidAmountError);
    });

    it("rejects mismatched expected totals", () => {
      const tranches: VestingTranche[] = [{ unlockTimestamp: 100n, amount: 50n }];
      expect(() => validateSchedule(tranches, 60n)).toThrow(VestingValidationError);
    });
  });

  describe("vestedAt", () => {
    const tranches: VestingTranche[] = [
      { unlockTimestamp: 100n, amount: 100n },
      { unlockTimestamp: 200n, amount: 200n },
      { unlockTimestamp: 300n, amount: 300n },
    ];

    it("returns 0 before the first tranche", () => {
      expect(vestedAt(tranches, 50)).toBe(0n);
      expect(vestedAt(tranches, 99)).toBe(0n);
    });

    it("returns milestone values at exact boundaries", () => {
      expect(vestedAt(tranches, 100)).toBe(100n);
      expect(vestedAt(tranches, 150)).toBe(100n);
      expect(vestedAt(tranches, 200)).toBe(300n);
      expect(vestedAt(tranches, 250)).toBe(300n);
      expect(vestedAt(tranches, 300)).toBe(600n);
      expect(vestedAt(tranches, 1000)).toBe(600n);
    });

    it("handles empty tranches gracefully", () => {
      expect(vestedAt([], 500)).toBe(0n);
    });
  });

  describe("validateAgainstExisting (schedule continuity)", () => {
    const existing: VestingTranche[] = [
      { unlockTimestamp: 100n, amount: 100n },
      { unlockTimestamp: 200n, amount: 200n },
    ];

    it("accepts new tranches starting at or after existing last tranche", () => {
      const validNew: VestingTranche[] = [
        { unlockTimestamp: 200n, amount: 50n },
        { unlockTimestamp: 300n, amount: 50n },
      ];
      expect(() => validateAgainstExisting(validNew, existing)).not.toThrow();
    });

    it("rejects new tranches unlocking earlier than existing last tranche", () => {
      const invalidNew: VestingTranche[] = [
        { unlockTimestamp: 150n, amount: 50n },
        { unlockTimestamp: 300n, amount: 50n },
      ];
      expect(() => validateAgainstExisting(invalidNew, existing)).toThrow(VestingValidationError);
    });

    it("accepts when existing tranches array is empty", () => {
      const newTranches: VestingTranche[] = [{ unlockTimestamp: 50n, amount: 100n }];
      expect(() => validateAgainstExisting(newTranches, [])).not.toThrow();
    });
  });

  describe("Property-based testing (fast-check)", () => {
    it("linearSchedule always sums exactly to totalAmount", () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 1n, max: MAX_AMOUNT_LIMIT }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          (total, count, start, duration) => {
            const schedule = linearSchedule({
              totalAmount: total,
              startTime: start,
              endTime: start + duration,
              tranchesCount: count,
            });
            const sum = schedule.reduce((acc, t) => acc + t.amount, 0n);
            return sum === total;
          },
        ),
      );
    });

    it("linearSchedule produces non-decreasing timestamps", () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 1n, max: 10_000_000n }),
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 0, max: 100_000 }),
          fc.integer({ min: 1, max: 100_000 }),
          (total, count, start, duration) => {
            const schedule = linearSchedule({
              totalAmount: total,
              startTime: start,
              endTime: start + duration,
              tranchesCount: count,
            });
            for (let i = 1; i < schedule.length; i++) {
              if (schedule[i]!.unlockTimestamp < schedule[i - 1]!.unlockTimestamp) {
                return false;
              }
            }
            return true;
          },
        ),
      );
    });

    it("vestedAt is monotonically non-decreasing over time", () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 10n, max: 100_000n }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 100, max: 500 }),
          (total, count, t1, t2) => {
            const schedule = linearSchedule({
              totalAmount: total,
              startTime: 100,
              endTime: 500,
              tranchesCount: count,
            });
            const earlier = Math.min(t1, t2);
            const later = Math.max(t1, t2);
            const v1 = vestedAt(schedule, earlier);
            const v2 = vestedAt(schedule, later);
            return v1 <= v2;
          },
        ),
      );
    });
  });
});
