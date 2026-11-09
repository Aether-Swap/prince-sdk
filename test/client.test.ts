import { describe, expect, it, vi } from "vitest";
import {
  Account,
  Keypair,
  nativeToScVal,
  SorobanDataBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { PayoutRegistryClient } from "../src/client.js";
import { KeypairSigner } from "../src/signers.js";
import {
  OrgAlreadyRegisteredError,
  TimeoutError,
} from "../src/errors.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const RPC_URL = "https://soroban-testnet.stellar.org";

describe("PayoutRegistryClient", () => {
  it("initializes with contract ID and RPC endpoint", () => {
    const client = new PayoutRegistryClient({
      contractId: CONTRACT_ID,
      rpcUrl: RPC_URL,
    });
    expect(client.contractId).toBe(CONTRACT_ID);
    expect(client.rpcUrl).toBe(RPC_URL);
  });

  describe("Read operations with mocked RPC", () => {
    it("fetches and decodes getOrg correctly", async () => {
      const client = new PayoutRegistryClient({
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
      });

      const mockOrgVal = xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("id"),
          val: xdr.ScVal.scvSymbol("aether_dao"),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("name"),
          val: xdr.ScVal.scvString("Aether DAO"),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("admins"),
          val: xdr.ScVal.scvVec([
            xdr.ScVal.scvAddress(
              xdr.ScAddress.scAddressTypeAccount(
                Keypair.random().xdrPublicKey(),
              ),
            ),
          ]),
        }),
      ]);

      vi.spyOn(client.rpcServer, "simulateTransaction").mockResolvedValueOnce({
        id: "sim-1",
        latestLedger: 12345,
        minResourceFee: "100",
        transactionData: new SorobanDataBuilder().build(),
        result: {
          retval: mockOrgVal,
        },
      } as any);

      const org = await client.getOrg("aether_dao");
      expect(org.id).toBe("aether_dao");
      expect(org.name).toBe("Aether DAO");
      expect(org.admins).toHaveLength(1);
    });

    it("fetches getOrgBudget correctly", async () => {
      const client = new PayoutRegistryClient({
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
      });

      vi.spyOn(client.rpcServer, "simulateTransaction").mockResolvedValueOnce({
        id: "sim-2",
        latestLedger: 12345,
        minResourceFee: "100",
        transactionData: new SorobanDataBuilder().build(),
        result: {
          retval: nativeToScVal(50_000_000n, { type: "i128" }),
        },
      } as any);

      const budget = await client.getOrgBudget("aether_dao");
      expect(budget).toBe(50_000_000n);
    });

    it("fetches getClaimableBalance correctly", async () => {
      const client = new PayoutRegistryClient({
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
      });
      const maintainer = Keypair.random().publicKey();

      vi.spyOn(client.rpcServer, "simulateTransaction").mockResolvedValueOnce({
        id: "sim-3",
        latestLedger: 12345,
        minResourceFee: "100",
        transactionData: new SorobanDataBuilder().build(),
        result: {
          retval: nativeToScVal(15_000_000n, { type: "i128" }),
        },
      } as any);

      const balance = await client.getClaimableBalance(maintainer);
      expect(balance).toBe(15_000_000n);
    });
  });

  describe("Prepared transaction flow and simulation failure guarantee", () => {
    it("aborts before any signing when simulation fails with contract error", async () => {
      const client = new PayoutRegistryClient({
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
      });

      const signer = KeypairSigner.fromKeypair(
        Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)),
      );
      const signSpy = vi.spyOn(signer, "signTransaction");

      // Mock account response
      vi.spyOn(client.rpcServer, "getAccount").mockResolvedValueOnce(
        new Account(await signer.publicKey(), "1"),
      );

      // Mock simulation returning contract error code 7 (OrgAlreadyRegistered)
      vi.spyOn(client.rpcServer, "simulateTransaction").mockResolvedValueOnce({
        id: "sim-fail",
        error: "HostError: Error(Contract, #7)",
        events: [],
      } as any);

      await expect(
        client.registerOrg({
          id: "existing_dao",
          name: "Existing DAO",
          admin: await signer.publicKey(),
        }),
      ).rejects.toThrow(OrgAlreadyRegisteredError);

      // Strict assertion: NOT signed!
      expect(signSpy).not.toHaveBeenCalled();
    });

    it("handles send timeouts gracefully with backoff", async () => {
      const client = new PayoutRegistryClient({
        contractId: CONTRACT_ID,
        rpcUrl: RPC_URL,
      });
      const signer = KeypairSigner.fromKeypair(
        Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)),
      );

      vi.spyOn(client.rpcServer, "getAccount").mockResolvedValue(
        new Account(await signer.publicKey(), "1"),
      );

      vi.spyOn(client.rpcServer, "simulateTransaction").mockResolvedValueOnce({
        id: "sim-timeout",
        latestLedger: 100,
        minResourceFee: "100",
        transactionData: new SorobanDataBuilder().build(),
        results: [
          {
            auth: [],
            xdr: xdr.ScVal.scvVoid().toXDR("base64"),
          },
        ],
      } as any);

      vi.spyOn(client.rpcServer, "sendTransaction").mockResolvedValueOnce({
        status: "PENDING",
        hash: "timeout-hash-123",
      } as any);

      vi.spyOn(client.rpcServer, "getTransaction").mockResolvedValue({
        status: "NOT_FOUND",
        latestLedger: 101,
      } as any);

      const prepared = await client.claimPayout({ maintainer: await signer.publicKey() });
      const signed = await prepared.sign(signer);

      await expect(
        signed.send({ timeoutMs: 100, initialBackoffMs: 20 }),
      ).rejects.toThrow(TimeoutError);
    });
  });

  describe("Optional testnet live read integration test", () => {
    const liveRpc = process.env.PRINCE_TESTNET_RPC;
    const liveContractId = process.env.PRINCE_TEST_CONTRACT_ID;

    it.skipIf(!liveRpc || !liveContractId)(
      "fetches real protocol metadata from testnet when env vars are provided",
      async () => {
        // Written reason for skip: Live network tests are gated by PRINCE_TESTNET_RPC and PRINCE_TEST_CONTRACT_ID.
        // CI must never require active testnet credentials or network availability.
        const liveClient = new PayoutRegistryClient({
          contractId: liveContractId!,
          rpcUrl: liveRpc!,
        });
        const state = await liveClient.getProtocolState();
        expect(["Active", "Paused"]).toContain(state);
      },
    );
  });
});
