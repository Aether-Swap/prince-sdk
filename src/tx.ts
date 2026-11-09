/**
 * Prepared transaction abstraction and lifecycle management for Prince SDK.
 *
 * Implements prepare -> simulate -> sign -> send with exponential backoff polling.
 */

import {
  rpc,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Signer } from "./signers.js";
import {
  extractContractErrorCode,
  getContractError,
  PrinceSdkError,
  RpcError,
  TimeoutError,
} from "./errors.js";

/**
 * Detailed simulation metadata and cost estimates.
 */
export interface SimulationDetails<T = any> {
  /** Recommended minimum transaction fee in stroops */
  fee: string;
  /** Authorization credentials required for invocation */
  auth: any[];
  /** Decoded return value of simulation, if available */
  returnValue?: T;
  /** Raw simulation response from Soroban RPC */
  rawResponse: rpc.Api.SimulateTransactionResponse;
}

/**
 * Options for sending transactions and polling status.
 */
export interface SendOptions {
  /** Maximum time in milliseconds to poll for ledger inclusion (default: 45000ms) */
  timeoutMs?: number;
  /** Initial backoff delay in milliseconds (default: 1000ms) */
  initialBackoffMs?: number;
  /** Maximum backoff delay in milliseconds (default: 5000ms) */
  maxBackoffMs?: number;
  /** Backoff multiplier factor (default: 1.5) */
  backoffMultiplier?: number;
}

/**
 * Result returned upon successful ledger inclusion of a transaction.
 */
export interface SendResult<T = any> {
  /** Hex transaction hash */
  hash: string;
  /** Ledger sequence number where transaction closed */
  ledger: number;
  /** Decoded return value from invocation */
  returnValue?: T;
  /** Raw getTransaction response */
  rawResponse: rpc.Api.GetTransactionResponse;
}

/**
 * A built, simulated, and fee-estimated transaction ready for signing and submission.
 */
export class PreparedTx<T = any> {
  readonly transaction: Transaction;
  readonly simulation: SimulationDetails<T>;
  readonly networkPassphrase: string;
  private readonly rpcServer: rpc.Server;

  constructor(params: {
    transaction: Transaction;
    simulation: SimulationDetails<T>;
    networkPassphrase: string;
    rpcServer: rpc.Server;
  }) {
    this.transaction = params.transaction;
    this.simulation = params.simulation;
    this.networkPassphrase = params.networkPassphrase;
    this.rpcServer = params.rpcServer;
  }

  /**
   * Returns transaction envelope XDR string.
   */
  xdr(): string {
    return this.transaction.toXDR();
  }

  /**
   * Signs the prepared transaction with the provided Signer.
   *
   * @param signer - Signer instance (KeypairSigner, FreighterSigner, etc.)
   * @returns A new PreparedTx instance containing the signed transaction
   */
  async sign(signer: Signer): Promise<PreparedTx<T>> {
    const signedXdr = await signer.signTransaction(this.xdr(), {
      networkPassphrase: this.networkPassphrase,
    });

    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase) as Transaction;

    return new PreparedTx<T>({
      transaction: signedTx,
      simulation: this.simulation,
      networkPassphrase: this.networkPassphrase,
      rpcServer: this.rpcServer,
    });
  }

  /**
   * Submits the transaction to the network and polls until confirmed or timed out.
   *
   * @param options - Polling and timeout options
   * @returns Confirmed SendResult
   */
  async send(options?: SendOptions): Promise<SendResult<T>> {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const initialBackoffMs = options?.initialBackoffMs ?? 1_000;
    const maxBackoffMs = options?.maxBackoffMs ?? 5_000;
    const backoffMultiplier = options?.backoffMultiplier ?? 1.5;

    let sendResponse: rpc.Api.SendTransactionResponse;
    try {
      sendResponse = await this.rpcServer.sendTransaction(this.transaction);
    } catch (cause) {
      throw new RpcError("Failed to submit transaction to Soroban RPC node.", { cause });
    }

    if (sendResponse.status === "ERROR") {
      const errDetail = (sendResponse as any).errorResultXdr ?? sendResponse;
      const code = extractContractErrorCode(errDetail);
      if (code !== null) {
        throw getContractError(code, { cause: sendResponse });
      }
      throw new RpcError(`Transaction submission rejected: ${JSON.stringify(sendResponse)}`, {
        cause: sendResponse,
      });
    }

    const txHash = sendResponse.hash;
    const startTime = Date.now();
    let delay = initialBackoffMs;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      let txStatus: rpc.Api.GetTransactionResponse;
      try {
        txStatus = await this.rpcServer.getTransaction(txHash);
      } catch (cause) {
        throw new RpcError(`Error querying transaction status for ${txHash}.`, { cause });
      }

      if (txStatus.status === "SUCCESS") {
        let returnValue: T | undefined = this.simulation.returnValue;

        if ((txStatus as any).returnValue) {
          try {
            returnValue = scValToNative((txStatus as any).returnValue) as T;
          } catch {
            // Keep simulated return value if decoding fails
          }
        } else if (txStatus.resultMetaXdr) {
          try {
            const meta: xdr.TransactionMeta =
              typeof (txStatus.resultMetaXdr as any) === "string"
                ? xdr.TransactionMeta.fromXDR(txStatus.resultMetaXdr as unknown as string, "base64")
                : (txStatus.resultMetaXdr as xdr.TransactionMeta);
            const v3 = meta.v3 ? meta.v3() : undefined;
            const retValScVal = v3?.sorobanMeta()?.returnValue();
            if (retValScVal) {
              returnValue = scValToNative(retValScVal) as T;
            }
          } catch {
            // Keep simulated return value if resultMeta parsing is unavailable
          }
        }

        return {
          hash: txHash,
          ledger: (txStatus as any).ledger ?? txStatus.latestLedger,
          returnValue,
          rawResponse: txStatus,
        };
      }

      if (txStatus.status === "FAILED") {
        const errorDetail = (txStatus as any).resultXdr ?? (txStatus as any).resultMetaXdr ?? txStatus;
        const code = extractContractErrorCode(errorDetail);
        if (code !== null) {
          throw getContractError(code, { cause: txStatus });
        }
        throw new PrinceSdkError(`Transaction execution failed on ledger: ${txHash}`, {
          cause: txStatus,
        });
      }

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxBackoffMs);
    }

    throw new TimeoutError(`Transaction confirmation timed out after ${timeoutMs}ms for ${txHash}`, {
      hash: txHash,
    });
  }

  /**
   * Helper that signs and sends the transaction in one step.
   *
   * @param signer - Signer instance
   * @param options - Polling options
   */
  async signAndSend(signer: Signer, options?: SendOptions): Promise<SendResult<T>> {
    const signed = await this.sign(signer);
    return signed.send(options);
  }
}
