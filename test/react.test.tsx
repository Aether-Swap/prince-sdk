import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { PayoutRegistryClient } from "../src/client.js";
import { useClaimableBalance, usePayoutRegistry } from "../src/react/index.js";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const RPC_URL = "https://soroban-testnet.stellar.org";

describe("React entrypoint hooks", () => {
  it("usePayoutRegistry creates and caches client", () => {
    const { result, rerender } = renderHook(() =>
      usePayoutRegistry({ contractId: CONTRACT_ID, rpcUrl: RPC_URL }),
    );

    const client1 = result.current.client;
    expect(client1).toBeInstanceOf(PayoutRegistryClient);

    rerender();
    expect(result.current.client).toBe(client1);
  });

  it("useClaimableBalance fetches and updates balance state", async () => {
    const client = new PayoutRegistryClient({
      contractId: CONTRACT_ID,
      rpcUrl: RPC_URL,
    });
    vi.spyOn(client, "getClaimableBalance").mockResolvedValueOnce(5000000n);

    const { result } = renderHook(() =>
      useClaimableBalance(client, "GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4"),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.balance).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.balance).toBe(5000000n);
    expect(result.current.error).toBeNull();
  });
});
