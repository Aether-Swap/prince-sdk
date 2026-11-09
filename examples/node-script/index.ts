import {
  PayoutRegistryClient,
  fromSmallestUnit,
  STELLAR_TESTNET_PASSPHRASE,
} from "@aether-swap/prince-sdk";

// Contract address on Stellar testnet
const CONTRACT_ID = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const RPC_URL = "https://soroban-testnet.stellar.org";
const MAINTAINER_ADDRESS = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVWAC";

async function main() {
  console.log("Connecting to Very-Prince PayoutRegistry on Stellar Testnet...");

  const client = new PayoutRegistryClient({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });

  // Step 1: Read protocol token address and state
  console.log("Querying protocol info...");
  const token = await client.getToken();
  console.log(`Configured SAC Token Address: ${token}`);

  // Step 2: Read maintainer claimable balance
  console.log(`Fetching claimable balance for ${MAINTAINER_ADDRESS}...`);
  const balanceStroops = await client.getClaimableBalance(MAINTAINER_ADDRESS);
  console.log(`Claimable Balance (raw stroops): ${balanceStroops.toString()}`);
  console.log(`Claimable Balance (formatted): ${fromSmallestUnit(balanceStroops)} tokens`);

  // Step 3: Prepare and inspect claim transaction (simulation only, not submitted)
  console.log("Simulating and preparing claim transaction...");
  const preparedClaim = await client.claimPayout({ maintainer: MAINTAINER_ADDRESS });

  console.log("Prepared Transaction Details:");
  console.log(`- Minimum Resource Fee: ${preparedClaim.simulation.fee} stroops`);
  console.log(`- Required Authorizations: ${preparedClaim.simulation.auth.length}`);
  console.log(`- Envelope XDR: ${preparedClaim.xdr().slice(0, 60)}...`);
  console.log("Transaction successfully prepared and inspected without signing or sending.");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
