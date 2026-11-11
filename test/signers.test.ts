import { describe, expect, it } from "vitest";
import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { FreighterSigner, KeypairSigner } from "../src/signers.js";
import {
  FreighterNotInstalledError,
  NetworkMismatchError,
  UserRejectedError,
} from "../src/errors.js";

describe("Signers module", () => {
  const testNetwork = Networks.TESTNET;

  function createFixtureTx(sourceKeypair: Keypair): string {
    const account = new Account(sourceKeypair.publicKey(), "100");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: testNetwork,
    })
      .addOperation(
        Operation.payment({
          destination: Keypair.random().publicKey(),
          asset: Asset.native(),
          amount: "10",
        }),
      )
      .setTimeout(30)
      .build();
    return tx.toXDR();
  }

  describe("KeypairSigner", () => {
    it("signs transaction deterministically", async () => {
      // Deterministic test keypair generated at test time
      const seed = Buffer.alloc(32, 1);
      const keypair = Keypair.fromRawEd25519Seed(seed);
      const secret = keypair.secret();
      const signer = KeypairSigner.fromSecret(secret);

      expect(await signer.publicKey()).toBe(keypair.publicKey());

      const rawTx = createFixtureTx(keypair);
      const signed1 = await signer.signTransaction(rawTx, { networkPassphrase: testNetwork });
      const signed2 = await signer.signTransaction(rawTx, { networkPassphrase: testNetwork });

      expect(signed1).toBe(signed2);
      expect(signed1).not.toBe(rawTx);

      const parsedTx = TransactionBuilder.fromXDR(signed1, testNetwork);
      expect(parsedTx.signatures).toHaveLength(1);
    });
  });

  describe("FreighterSigner", () => {
    it("throws FreighterNotInstalledError if extension is missing", async () => {
      const mockApi = {
        isConnected: async () => ({ isConnected: false }),
      };
      const signer = new FreighterSigner({ freighterApi: mockApi });

      await expect(signer.publicKey()).rejects.toThrow(FreighterNotInstalledError);
    });

    it("throws UserRejectedError if user cancels access request", async () => {
      const mockApi = {
        isConnected: async () => ({ isConnected: true }),
        requestAccess: async () => ({ error: "User rejected access request" }),
      };
      const signer = new FreighterSigner({ freighterApi: mockApi });

      await expect(signer.publicKey()).rejects.toThrow(UserRejectedError);
    });

    it("throws NetworkMismatchError if network does not match expected passphrase", async () => {
      const mockApi = {
        isConnected: async () => ({ isConnected: true }),
        getNetworkDetails: async () => ({
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        }),
        signTransaction: async () => "signed-xdr",
      };
      const signer = new FreighterSigner({ freighterApi: mockApi });

      await expect(
        signer.signTransaction("dummy-xdr", { networkPassphrase: testNetwork }),
      ).rejects.toThrow(NetworkMismatchError);
    });

    it("throws UserRejectedError if user rejects transaction signing", async () => {
      const mockApi = {
        isConnected: async () => ({ isConnected: true }),
        getNetworkDetails: async () => ({ networkPassphrase: testNetwork }),
        signTransaction: async () => {
          throw new Error("User declined the transaction");
        },
      };
      const signer = new FreighterSigner({ freighterApi: mockApi });

      await expect(
        signer.signTransaction("dummy-xdr", { networkPassphrase: testNetwork }),
      ).rejects.toThrow(UserRejectedError);
    });

    it("signs successfully with valid Freighter response", async () => {
      const mockApi = {
        isConnected: async () => ({ isConnected: true }),
        getNetworkDetails: async () => ({ networkPassphrase: testNetwork }),
        signTransaction: async () => ({ signedTxXdr: "AAAA_SIGNED_XDR" }),
      };
      const signer = new FreighterSigner({ freighterApi: mockApi });
      const signed = await signer.signTransaction("AAAA_RAW_XDR", {
        networkPassphrase: testNetwork,
      });
      expect(signed).toBe("AAAA_SIGNED_XDR");
    });
  });
});
