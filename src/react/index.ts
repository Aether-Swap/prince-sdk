/**
 * React hooks entry point for @aether-swap/prince-sdk.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PayoutRegistryClient } from "../client.js";
import { ClientOptions } from "../types.js";
import { Signer } from "../signers.js";
import { SendOptions, SendResult } from "../tx.js";

/**
 * Initializes and memoizes a PayoutRegistryClient instance.
 */
export function usePayoutRegistry(optionsOrClient: ClientOptions | PayoutRegistryClient): {
  client: PayoutRegistryClient;
} {
  const client = useMemo(() => {
    if (optionsOrClient instanceof PayoutRegistryClient) {
      return optionsOrClient;
    }
    return new PayoutRegistryClient(optionsOrClient);
  }, [
    optionsOrClient instanceof PayoutRegistryClient
      ? optionsOrClient
      : `${optionsOrClient.contractId}:${optionsOrClient.rpcUrl}:${optionsOrClient.networkPassphrase}`,
  ]);

  return { client };
}

export interface UseClaimableBalanceResult {
  balance: bigint | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to query and subscribe to a maintainer's claimable payout balance.
 */
export function useClaimableBalance(
  client: PayoutRegistryClient,
  maintainerAddress?: string | null,
): UseClaimableBalanceResult {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!maintainerAddress) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await client.getClaimableBalance(maintainerAddress);
      setBalance(result);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, maintainerAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}

export interface UseClaimPayoutResult {
  claim: (options?: SendOptions) => Promise<SendResult<bigint>>;
  loading: boolean;
  error: Error | null;
  result: SendResult<bigint> | null;
}

/**
 * Hook to execute payout claims via a provided Signer.
 */
export function useClaimPayout(client: PayoutRegistryClient, signer: Signer): UseClaimPayoutResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SendResult<bigint> | null>(null);

  const claim = useCallback(
    async (options?: SendOptions): Promise<SendResult<bigint>> => {
      setLoading(true);
      setError(null);
      try {
        const publicKey = await signer.publicKey();
        const prepared = await client.claimPayout({ maintainer: publicKey });
        const res = await prepared.signAndSend(signer, options);
        setResult(res);
        return res;
      } catch (err: any) {
        const typedError = err instanceof Error ? err : new Error(String(err));
        setError(typedError);
        throw typedError;
      } finally {
        setLoading(false);
      }
    },
    [client, signer],
  );

  return { claim, loading, error, result };
}
