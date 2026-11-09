/**
 * Signer abstractions and implementations for Prince SDK.
 *
 * Keys never touch the core client or internal logs.
 */

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import {
  FreighterNotInstalledError,
  NetworkMismatchError,
  UserRejectedError,
} from "./errors.js";

/**
 * Standard Signer interface.
 */
export interface Signer {
  /**
   * Returns the Stellar public key (G...) of the signer account.
   */
  publicKey(): Promise<string>;

  /**
   * Signs a transaction envelope XDR string.
   *
   * @param xdr - Transaction envelope XDR
   * @param opts - Options containing target network passphrase
   * @returns Signed transaction envelope XDR
   */
  signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string>;
}

/**
 * Node and test signer implementation using an in-memory Stellar Keypair.
 * Secrets are supplied at runtime and are never logged, printed, or exported.
 */
export class KeypairSigner implements Signer {
  #keypair: Keypair;

  private constructor(keypair: Keypair) {
    this.#keypair = keypair;
  }

  /**
   * Creates a KeypairSigner from a secret seed string (S...).
   *
   * @param secret - Stellar secret key seed
   */
  static fromSecret(secret: string): KeypairSigner {
    const keypair = Keypair.fromSecret(secret);
    return new KeypairSigner(keypair);
  }

  /**
   * Creates a KeypairSigner from an existing Keypair instance.
   */
  static fromKeypair(keypair: Keypair): KeypairSigner {
    return new KeypairSigner(keypair);
  }

  async publicKey(): Promise<string> {
    return this.#keypair.publicKey();
  }

  async signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string> {
    const tx = TransactionBuilder.fromXDR(xdr, opts.networkPassphrase);
    tx.sign(this.#keypair);
    return tx.toXDR();
  }
}

/**
 * Browser signer implementation using the Freighter browser wallet extension.
 * Lazily loads `@stellar/freighter-api` to keep Node and server-side environments lightweight.
 */
export class FreighterSigner implements Signer {
  #freighterApi: any;
  #injectedApi?: any;

  constructor(options?: { freighterApi?: any }) {
    this.#injectedApi = options?.freighterApi;
  }

  private async getFreighterApi(): Promise<any> {
    if (this.#injectedApi) {
      return this.#injectedApi;
    }
    if (this.#freighterApi) {
      return this.#freighterApi;
    }

    try {
      // Dynamic lazy import
      const module = await import("@stellar/freighter-api");
      this.#freighterApi = module.default ?? module;
      return this.#freighterApi;
    } catch (cause) {
      throw new FreighterNotInstalledError(
        "Could not load @stellar/freighter-api. Ensure the library and browser extension are available.",
        { cause },
      );
    }
  }

  async publicKey(): Promise<string> {
    const api = await this.getFreighterApi();

    let connected = false;
    try {
      const connResult = await api.isConnected();
      connected = typeof connResult === "object" ? Boolean(connResult.isConnected) : Boolean(connResult);
    } catch (cause) {
      throw new FreighterNotInstalledError("Freighter extension is not installed or unreachable.", {
        cause,
      });
    }

    if (!connected) {
      throw new FreighterNotInstalledError("Freighter wallet is not connected.");
    }

    try {
      const accessResult = api.requestAccess ? await api.requestAccess() : await api.getAddress();
      if (accessResult && typeof accessResult === "object") {
        if (accessResult.error) {
          const errStr = String(accessResult.error);
          if (/reject|denied|declined|cancel/i.test(errStr)) {
            throw new UserRejectedError("User rejected access request in Freighter.", {
              cause: accessResult.error,
            });
          }
          throw new Error(errStr);
        }
        if (accessResult.address) {
          return accessResult.address;
        }
      }
      if (typeof accessResult === "string" && accessResult) {
        return accessResult;
      }
    } catch (err: any) {
      if (err instanceof UserRejectedError) throw err;
      const msg = err?.message ?? String(err);
      if (/reject|denied|declined|cancel/i.test(msg)) {
        throw new UserRejectedError("User rejected access request in Freighter.", { cause: err });
      }
      throw err;
    }

    throw new FreighterNotInstalledError("Could not retrieve public key from Freighter.");
  }

  async signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string> {
    const api = await this.getFreighterApi();

    // Verify network if getNetworkDetails or getNetwork is available
    if (api.getNetworkDetails || api.getNetwork) {
      try {
        const netInfo = api.getNetworkDetails ? await api.getNetworkDetails() : await api.getNetwork();
        const activePassphrase = netInfo?.networkPassphrase ?? netInfo?.passphrase;
        if (activePassphrase && activePassphrase !== opts.networkPassphrase) {
          throw new NetworkMismatchError(opts.networkPassphrase, activePassphrase);
        }
      } catch (err) {
        if (err instanceof NetworkMismatchError) throw err;
        // Proceed if getNetwork details check fails due to mock or unsupported method
      }
    }

    let signResult: any;
    try {
      signResult = await api.signTransaction(xdr, {
        networkPassphrase: opts.networkPassphrase,
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (/reject|denied|declined|cancel/i.test(msg)) {
        throw new UserRejectedError("User rejected transaction signing in Freighter.", {
          cause: err,
        });
      }
      throw err;
    }

    if (!signResult) {
      throw new UserRejectedError("Transaction was not signed.");
    }

    if (typeof signResult === "object") {
      if (signResult.error) {
        const errStr = String(signResult.error);
        if (/reject|denied|declined|cancel/i.test(errStr)) {
          throw new UserRejectedError("User rejected transaction signing in Freighter.", {
            cause: signResult.error,
          });
        }
        throw new Error(errStr);
      }
      if (typeof signResult.signedTxXdr === "string") {
        return signResult.signedTxXdr;
      }
    }

    if (typeof signResult === "string") {
      return signResult;
    }

    throw new Error("Unexpected signing response from Freighter.");
  }
}
