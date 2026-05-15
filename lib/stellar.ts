import { Horizon, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const SERVER_URL = "https://horizon-testnet.stellar.org";

/**
 * Directly submit a signed transaction to Stellar Horizon Testnet.
 * Bypasses all middle layers for maximum reliability.
 */
export async function submitToHorizon(signedXdr: string) {
  const server = new Horizon.Server(SERVER_URL);
  
  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    console.log("[STELLAR] Submitting transaction to Horizon...");
    const result = await server.submitTransaction(tx);
    console.log("[STELLAR] Success!", result);
    return result;
  } catch (error: any) {
    console.error("[STELLAR] Submission failed!");
    if (error.response?.data) {
      console.error("HORIZON ERROR:", JSON.stringify(error.response.data, null, 2));
      throw new Error(JSON.stringify(error.response.data.extras?.result_codes || error.response.data));
    }
    throw error;
  }
}
