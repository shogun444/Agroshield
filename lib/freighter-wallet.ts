"use client";

import { getNetworkDetails, requestAccess, signMessage } from "@stellar/freighter-api";
import {
  getConfiguredStellarNetworkLabel,
  getStellarNetworkMismatchMessage,
  type FreighterNetworkName,
} from "./stellar-network";

export type ConnectWalletResult = {
  address: string;
  network: FreighterNetworkName;
  networkPassphrase: string;
};

export function getExpectedWalletNetworkLabel() {
  return getConfiguredStellarNetworkLabel();
}

export async function connectFreighterWallet() {
  if (typeof window === "undefined") {
    throw new Error("Wallet connections must run in the browser.");
  }

  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error.message ?? "Failed to request wallet access.");
  }

  if (!access.address) {
    throw new Error("Failed to retrieve wallet address from Freighter.");
  }

  const network = await getNetworkDetails();
  if (network.error) {
    throw new Error(network.error.message ?? "Failed to read the Freighter network.");
  }

  const mismatch = getStellarNetworkMismatchMessage(network.network);
  if (mismatch) {
    throw new Error(mismatch);
  }

  const challenge = [
    "AgroShield wallet connection",
    `Origin: ${window.location.origin}`,
    `Address: ${access.address}`,
    `Network: ${network.network}`,
    `Nonce: ${crypto.randomUUID()}`,
    `Issued at: ${new Date().toISOString()}`,
  ].join("\n");

  const signed = await signMessage(challenge, {
    address: access.address,
    networkPassphrase: network.networkPassphrase,
  });

  if (signed.error) {
    throw new Error(signed.error.message ?? "Failed to sign wallet challenge.");
  }

  if (!signed.signedMessage) {
    throw new Error("Freighter did not return a signed wallet challenge.");
  }

  if (signed.signerAddress && signed.signerAddress !== access.address) {
    throw new Error("Freighter signed with a different wallet. Please reconnect with the correct account.");
  }

  return {
    address: access.address,
    network: network.network,
    networkPassphrase: network.networkPassphrase,
  } satisfies ConnectWalletResult;
}
