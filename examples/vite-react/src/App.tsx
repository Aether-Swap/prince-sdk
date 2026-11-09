import React, { useState } from "react";
import {
  FreighterSigner,
  PayoutRegistryClient,
  fromSmallestUnit,
  STELLAR_TESTNET_PASSPHRASE,
} from "@aether-swap/prince-sdk";
import { useClaimableBalance, usePayoutRegistry } from "@aether-swap/prince-sdk/react";

const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const RPC_URL = "https://soroban-testnet.stellar.org";

export function App() {
  const [userAddress, setUserAddress] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const { client } = usePayoutRegistry({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });

  const { balance, loading, refetch } = useClaimableBalance(client, userAddress);

  const connectWallet = async () => {
    try {
      setStatusMessage("Connecting to Freighter...");
      const signer = new FreighterSigner();
      const pubKey = await signer.publicKey();
      setUserAddress(pubKey);
      setStatusMessage(`Connected: ${pubKey}`);
    } catch (err: any) {
      setStatusMessage(`Connection failed: ${err.message}`);
    }
  };

  const handleClaim = async () => {
    if (!userAddress) return;
    setIsClaiming(true);
    setStatusMessage("Preparing claim transaction via simulation...");
    try {
      const signer = new FreighterSigner();
      const prepared = await client.claimPayout({ maintainer: userAddress });

      setStatusMessage("Simulation succeeded! Requesting signature in Freighter...");
      const result = await prepared.signAndSend(signer);

      setStatusMessage(`Claim confirmed! Tx hash: ${result.hash} (Ledger ${result.ledger})`);
      await refetch();
    } catch (err: any) {
      setStatusMessage(`Claim failed: ${err.message}`);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 640, margin: "0 auto" }}>
      <h1>Very-Prince Payout Portal</h1>
      <p>Independent testnet client using Freighter browser wallet.</p>

      {!userAddress ? (
        <button onClick={connectWallet} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Connect Freighter
        </button>
      ) : (
        <div>
          <p>
            <strong>Account:</strong> {userAddress}
          </p>
          <p>
            <strong>Claimable Balance:</strong>{" "}
            {loading ? "Loading..." : balance !== null ? `${fromSmallestUnit(balance)} tokens` : "0"}
          </p>
          <button
            onClick={handleClaim}
            disabled={isClaiming || loading || balance === 0n || balance === null}
            style={{ padding: "8px 16px", cursor: "pointer" }}
          >
            {isClaiming ? "Processing..." : "Claim Payout"}
          </button>
        </div>
      )}

      {statusMessage && (
        <div style={{ marginTop: 16, padding: 12, background: "#f0f0f0", borderRadius: 4 }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}
