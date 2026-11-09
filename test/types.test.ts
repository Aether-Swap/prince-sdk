import { describe, expectTypeOf, it } from "vitest";
import {
  Maintainer,
  MaintainerPayout,
  Organization,
  PayoutParams,
  TokenMetadata,
  VestingTranche,
} from "../src/types.js";
import { PayoutRegistryClient } from "../src/client.js";
import { PreparedTx } from "../src/tx.js";
import { Signer } from "../src/signers.js";

describe("Type-level integrity tests", () => {
  it("enforces public interfaces cannot regress", () => {
    expectTypeOf<Organization>().toHaveProperty("id").toBeString();
    expectTypeOf<Organization>().toHaveProperty("name").toBeString();
    expectTypeOf<Organization>().toHaveProperty("admins").toBeArray();

    expectTypeOf<Maintainer>().toHaveProperty("address").toBeString();
    expectTypeOf<Maintainer>().toHaveProperty("orgId").toBeString();

    expectTypeOf<PayoutParams>().toHaveProperty("maintainer").toBeString();
    expectTypeOf<PayoutParams>().toHaveProperty("amount").toEqualTypeOf<bigint>();

    expectTypeOf<VestingTranche>().toHaveProperty("unlockTimestamp").toEqualTypeOf<bigint>();
    expectTypeOf<VestingTranche>().toHaveProperty("amount").toEqualTypeOf<bigint>();

    expectTypeOf<MaintainerPayout>().toHaveProperty("amount").toEqualTypeOf<bigint>();
    expectTypeOf<MaintainerPayout>().toHaveProperty("claimedAmount").toEqualTypeOf<bigint>();
    expectTypeOf<MaintainerPayout>().toHaveProperty("tranches").toBeArray();

    expectTypeOf<TokenMetadata>().toHaveProperty("decimals").toBeNumber();

    expectTypeOf<Signer>().toHaveProperty("publicKey").toBeFunction();
    expectTypeOf<Signer>().toHaveProperty("signTransaction").toBeFunction();

    expectTypeOf<PreparedTx<void>>().toHaveProperty("xdr").toBeFunction();
    expectTypeOf<PreparedTx<void>>().toHaveProperty("sign").toBeFunction();
    expectTypeOf<PreparedTx<void>>().toHaveProperty("send").toBeFunction();

    expectTypeOf<PayoutRegistryClient>().toHaveProperty("getOrg").toBeFunction();
    expectTypeOf<PayoutRegistryClient>().toHaveProperty("registerOrg").toBeFunction();
    expectTypeOf<PayoutRegistryClient>().toHaveProperty("fundOrg").toBeFunction();
    expectTypeOf<PayoutRegistryClient>().toHaveProperty("claimPayout").toBeFunction();
  });
});
