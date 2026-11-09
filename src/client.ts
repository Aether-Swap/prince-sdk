/**
 * High-level typed client for the Very-Prince PayoutRegistry contract on Stellar testnet.
 */

import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import {
  AddAdminParams,
  AddMaintainerParams,
  AllocatePayoutParams,
  AllocatePayoutVestingParams,
  BatchAllocateParams,
  ClaimPayoutParams,
  ClaimPayoutWithNonceParams,
  ClientOptions,
  FundOrgParams,
  FundOrgWithNonceParams,
  Maintainer,
  Organization,
  ProtocolState,
  RegisterOrgParams,
  RemoveAdminParams,
  STELLAR_TESTNET_PASSPHRASE,
  TokenMetadata,
  UpdateOrgMetadataParams,
} from "./types.js";
import {
  extractContractErrorCode,
  getContractError,
  PrinceSdkError,
  RpcError,
  SimulationError,
} from "./errors.js";
import { PreparedTx, SimulationDetails } from "./tx.js";
import { validateSchedule } from "./vesting.js";

// Dummy account for read-only simulations
const READ_ONLY_ACCOUNT = new Account(
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  "0",
);

export class PayoutRegistryClient {
  readonly contractId: string;
  readonly rpcUrl: string;
  readonly networkPassphrase: string;
  readonly rpcServer: rpc.Server;
  readonly contract: Contract;

  constructor(options: ClientOptions) {
    if (!options.contractId) {
      throw new PrinceSdkError("Contract ID is required.");
    }
    if (!options.rpcUrl) {
      throw new PrinceSdkError("RPC URL is required.");
    }

    this.contractId = options.contractId;
    this.rpcUrl = options.rpcUrl;
    this.networkPassphrase = options.networkPassphrase ?? STELLAR_TESTNET_PASSPHRASE;
    this.rpcServer = new rpc.Server(this.rpcUrl, {
      allowHttp: this.rpcUrl.startsWith("http://"),
    });
    this.contract = new Contract(this.contractId);
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async simulateCall<T = any>(method: string, args: xdr.ScVal[]): Promise<T> {
    const tx = new TransactionBuilder(READ_ONLY_ACCOUNT, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    let sim: rpc.Api.SimulateTransactionResponse;
    try {
      sim = await this.rpcServer.simulateTransaction(tx);
    } catch (cause) {
      throw new RpcError(`RPC call failed during simulation of ${method}.`, { cause });
    }

    if (rpc.Api.isSimulationError(sim)) {
      const code = extractContractErrorCode(sim.error);
      if (code !== null) {
        throw getContractError(code, { cause: sim });
      }
      throw new SimulationError(`Simulation failed for ${method}: ${sim.error}`, {
        simulationResponse: sim,
      });
    }

    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return scValToNative(sim.result.retval) as T;
    }

    throw new SimulationError(`Simulation returned no result for ${method}.`, {
      simulationResponse: sim,
    });
  }

  private async prepareCall<T = any>(
    sourceAddress: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<PreparedTx<T>> {
    let sourceAccount: Account;
    try {
      sourceAccount = await this.rpcServer.getAccount(sourceAddress);
    } catch {
      // In tests or offline mocks, fall back to ephemeral sequence 0 account
      sourceAccount = new Account(sourceAddress, "0");
    }

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    let sim: rpc.Api.SimulateTransactionResponse;
    try {
      sim = await this.rpcServer.simulateTransaction(tx);
    } catch (cause) {
      throw new RpcError(`RPC call failed during simulation of ${method}.`, { cause });
    }

    if (rpc.Api.isSimulationError(sim)) {
      const code = extractContractErrorCode(sim.error);
      if (code !== null) {
        throw getContractError(code, { cause: sim });
      }
      throw new SimulationError(`Simulation failed for ${method}: ${sim.error}`, {
        simulationResponse: sim,
      });
    }

    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new SimulationError(`Simulation returned invalid status for ${method}.`, {
        simulationResponse: sim,
      });
    }

    // Assemble transaction with simulation footprints, auth, and fee estimates
    const assembledTx = rpc.assembleTransaction(tx, sim).build();

    const simulationDetails: SimulationDetails<T> = {
      fee: sim.minResourceFee,
      auth: (sim.result as any)?.auth ?? [],
      returnValue: sim.result ? (scValToNative(sim.result.retval) as T) : undefined,
      rawResponse: sim,
    };

    return new PreparedTx<T>({
      transaction: assembledTx,
      simulation: simulationDetails,
      networkPassphrase: this.networkPassphrase,
      rpcServer: this.rpcServer,
    });
  }

  // ---------------------------------------------------------------------------
  // Read Methods (Simulation Only, Never Signs)
  // ---------------------------------------------------------------------------

  /**
   * Retrieves organization details by unique Symbol identifier.
   */
  async getOrg(id: string): Promise<Organization> {
    const raw = await this.simulateCall<any>("get_org", [xdr.ScVal.scvSymbol(id)]);
    return {
      id: raw.id ?? id,
      name: raw.name ?? "",
      admins: Array.isArray(raw.admins) ? raw.admins.map(String) : [],
      metadataCid: raw.metadata_cid ?? raw.metadataCid ?? null,
    };
  }

  /**
   * Retrieves the current unallocated token budget for an organization (in stroops).
   */
  async getOrgBudget(id: string): Promise<bigint> {
    const raw = await this.simulateCall<any>("get_org_budget", [xdr.ScVal.scvSymbol(id)]);
    return BigInt(raw ?? 0n);
  }

  /**
   * Retrieves maintainer record by address.
   */
  async getMaintainer(address: string): Promise<Maintainer> {
    const raw = await this.simulateCall<any>("get_maintainer", [
      new Address(address).toScVal(),
    ]);
    return {
      address: raw.address ?? address,
      orgId: raw.org_id ?? raw.orgId ?? "",
    };
  }

  /**
   * Lists all maintainer addresses registered under an organization.
   */
  async getMaintainers(orgId: string): Promise<string[]> {
    const raw = await this.simulateCall<any[]>("get_maintainers", [
      xdr.ScVal.scvSymbol(orgId),
    ]);
    return Array.isArray(raw) ? raw.map(String) : [];
  }

  /**
   * Retrieves the current claimable payout balance for a maintainer (in stroops).
   */
  async getClaimableBalance(maintainer: string): Promise<bigint> {
    const raw = await this.simulateCall<any>("get_claimable_balance", [
      new Address(maintainer).toScVal(),
    ]);
    return BigInt(raw ?? 0n);
  }

  /**
   * Retrieves the configured Stellar Asset Contract address.
   */
  async getToken(): Promise<string> {
    const raw = await this.simulateCall<any>("get_token", []);
    return String(raw);
  }

  /**
   * Retrieves cached SEP-41 token metadata (name, symbol, decimals).
   */
  async getTokenMetadata(): Promise<TokenMetadata> {
    const raw = await this.simulateCall<any>("get_token_metadata", []);
    return {
      name: String(raw.name ?? ""),
      symbol: String(raw.symbol ?? ""),
      decimals: Number(raw.decimals ?? 7),
    };
  }

  /**
   * Queries the token balance of an address via SAC balance() wrapper.
   */
  async getTokenBalance(id: string): Promise<bigint> {
    const raw = await this.simulateCall<any>("token_balance", [
      new Address(id).toScVal(),
    ]);
    return BigInt(raw ?? 0n);
  }

  /**
   * Retrieves the current protocol state (Active or Paused).
   */
  async getProtocolState(): Promise<ProtocolState> {
    const raw = await this.simulateCall<any>("get_protocol_state", []);
    return raw === "Paused" || raw?.Paused ? "Paused" : "Active";
  }

  /**
   * Returns the current replay-protection nonce for a caller.
   */
  async getNonce(caller: string): Promise<bigint> {
    const raw = await this.simulateCall<any>("get_nonce", [
      new Address(caller).toScVal(),
    ]);
    return BigInt(raw ?? 0n);
  }

  // ---------------------------------------------------------------------------
  // Write Methods (Return PreparedTx: Built, Simulated, Fee-Estimated)
  // ---------------------------------------------------------------------------

  /**
   * Prepares a transaction to register a new organization.
   */
  async registerOrg(params: RegisterOrgParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.id),
      xdr.ScVal.scvString(params.name),
      new Address(params.admin).toScVal(),
    ];
    return this.prepareCall(params.admin, "register_org", args);
  }

  /**
   * Prepares a transaction to update an organization's IPFS metadata CID.
   */
  async updateOrgMetadata(params: UpdateOrgMetadataParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.id),
      new Address(params.admin).toScVal(),
      xdr.ScVal.scvString(params.metadataCid),
    ];
    return this.prepareCall(params.admin, "update_org_metadata", args);
  }

  /**
   * Prepares a transaction to fund an organization's budget.
   */
  async fundOrg(params: FundOrgParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.from).toScVal(),
      nativeToScVal(params.amount, { type: "i128" }),
    ];
    return this.prepareCall(params.from, "fund_org", args);
  }

  /**
   * Prepares a nonce-protected transaction to fund an organization.
   */
  async fundOrgWithNonce(params: FundOrgWithNonceParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.from).toScVal(),
      nativeToScVal(params.amount, { type: "i128" }),
      nativeToScVal(params.expectedNonce, { type: "u64" }),
    ];
    return this.prepareCall(params.from, "fund_org_with_nonce", args);
  }

  /**
   * Prepares a transaction to add an administrator to an organization.
   */
  async addAdmin(params: AddAdminParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.admin).toScVal(),
      new Address(params.newAdmin).toScVal(),
    ];
    return this.prepareCall(params.admin, "add_admin", args);
  }

  /**
   * Prepares a transaction to remove an administrator from an organization.
   */
  async removeAdmin(params: RemoveAdminParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.admin).toScVal(),
      new Address(params.adminToRemove).toScVal(),
    ];
    return this.prepareCall(params.admin, "remove_admin", args);
  }

  /**
   * Prepares a transaction to enroll a new maintainer under an organization.
   */
  async addMaintainer(params: AddMaintainerParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.maintainer).toScVal(),
    ];
    return this.prepareCall(params.admin, "add_maintainer", args);
  }

  /**
   * Prepares a transaction to allocate a single-tranche payout to a maintainer.
   */
  async allocatePayout(params: AllocatePayoutParams): Promise<PreparedTx<void>> {
    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.admin).toScVal(),
      new Address(params.maintainer).toScVal(),
      nativeToScVal(params.amount, { type: "i128" }),
      nativeToScVal(params.unlockTimestamp, { type: "u64" }),
    ];
    return this.prepareCall(params.admin, "allocate_payout", args);
  }

  /**
   * Prepares a transaction to allocate a multi-tranche vesting payout.
   */
  async allocatePayoutVesting(params: AllocatePayoutVestingParams): Promise<PreparedTx<void>> {
    validateSchedule(params.tranches, params.amount);

    const trancheScVals: xdr.ScVal[] = params.tranches.map((t) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("amount"),
          val: nativeToScVal(t.amount, { type: "i128" }),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("unlock_timestamp"),
          val: nativeToScVal(t.unlockTimestamp, { type: "u64" }),
        }),
      ]),
    );

    const args: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol(params.orgId),
      new Address(params.admin).toScVal(),
      new Address(params.maintainer).toScVal(),
      nativeToScVal(params.amount, { type: "i128" }),
      xdr.ScVal.scvVec(trancheScVals),
    ];

    return this.prepareCall(params.admin, "allocate_payout_vesting", args);
  }

  /**
   * Prepares a transaction to batch-allocate payouts to multiple maintainers.
   */
  async batchAllocate(params: BatchAllocateParams): Promise<PreparedTx<void>> {
    const payoutScVals: xdr.ScVal[] = params.payouts.map((p) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("amount"),
          val: nativeToScVal(p.amount, { type: "i128" }),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("maintainer"),
          val: new Address(p.maintainer).toScVal(),
        }),
      ]),
    );

    const args: xdr.ScVal[] = [
      new Address(params.admin).toScVal(),
      xdr.ScVal.scvSymbol(params.orgId),
      xdr.ScVal.scvVec(payoutScVals),
    ];

    return this.prepareCall(params.admin, "batch_allocate", args);
  }

  /**
   * Prepares a transaction for a maintainer to claim their vested payout.
   */
  async claimPayout(params: ClaimPayoutParams): Promise<PreparedTx<bigint>> {
    const args: xdr.ScVal[] = [new Address(params.maintainer).toScVal()];
    return this.prepareCall(params.maintainer, "claim_payout", args);
  }

  /**
   * Prepares a nonce-protected transaction for a maintainer to claim their vested payout.
   */
  async claimPayoutWithNonce(params: ClaimPayoutWithNonceParams): Promise<PreparedTx<bigint>> {
    const args: xdr.ScVal[] = [
      new Address(params.maintainer).toScVal(),
      nativeToScVal(params.expectedNonce, { type: "u64" }),
    ];
    return this.prepareCall(params.maintainer, "claim_payout_with_nonce", args);
  }
}
