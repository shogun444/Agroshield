export type StellarNetworkMode =
  | "auto"
  | "any"
  | "mainnet"
  | "testnet"
  | "futurenet"
  | "standalone";

export type FreighterNetworkName =
  | "PUBLIC"
  | "TESTNET"
  | "FUTURENET"
  | "STANDALONE";

export function normalizeStellarNetworkMode(
  value: string | undefined,
): StellarNetworkMode {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "mainnet" || normalized === "public") return "mainnet";
  if (normalized === "testnet") return "testnet";
  if (normalized === "futurenet") return "futurenet";
  if (normalized === "standalone") return "standalone";
  if (normalized === "any") return "any";
  return "auto";
}

export function getConfiguredStellarNetworkMode() {
  return normalizeStellarNetworkMode(process.env.NEXT_PUBLIC_STELLAR_NETWORK);
}

export function getConfiguredStellarNetworkLabel() {
  const mode = getConfiguredStellarNetworkMode();
  if (mode === "auto" || mode === "any") return "any Stellar network";
  if (mode === "mainnet") return "mainnet";
  if (mode === "testnet") return "testnet";
  if (mode === "futurenet") return "futurenet";
  return "standalone";
}

export function formatFreighterNetworkName(network: string) {
  if (network === "PUBLIC") return "mainnet";
  if (network === "TESTNET") return "testnet";
  if (network === "FUTURENET") return "futurenet";
  if (network === "STANDALONE") return "standalone";
  return network.toLowerCase();
}

export function matchesStellarNetworkMode(
  network: FreighterNetworkName | string,
  mode: StellarNetworkMode,
) {
  if (mode === "auto" || mode === "any") return true;
  if (mode === "mainnet") return network === "PUBLIC";
  if (mode === "testnet") return network === "TESTNET";
  if (mode === "futurenet") return network === "FUTURENET";
  return network === "STANDALONE";
}

export function getStellarNetworkMismatchMessage(network: string) {
  const mode = getConfiguredStellarNetworkMode();
  if (mode === "auto" || mode === "any") return null;
  if (matchesStellarNetworkMode(network, mode)) return null;

  return `Freighter is on ${formatFreighterNetworkName(network)}, but this app is configured for ${getConfiguredStellarNetworkLabel()}. Switch Freighter networks and try again.`;
}

function getEnvForMode(mode: "mainnet" | "testnet") {
  return mode === "mainnet"
    ? {
        baseUrl: process.env.TRUSTLESS_WORK_BASE_URL_MAINNET,
        trustlineAddress: process.env.TRUSTLESS_WORK_TRUSTLINE_ADDRESS_MAINNET,
      }
    : {
        baseUrl: process.env.TRUSTLESS_WORK_BASE_URL_TESTNET,
        trustlineAddress: process.env.TRUSTLESS_WORK_TRUSTLINE_ADDRESS_TESTNET,
      };
}

export function resolveTrustlessWorkNetworkConfig() {
  const mode = getConfiguredStellarNetworkMode();
  const effectiveMode =
    mode === "mainnet"
      ? "mainnet"
      : mode === "testnet"
        ? "testnet"
        : "testnet";
  const networkConfig = getEnvForMode(effectiveMode);

  return {
    networkMode: effectiveMode,
    baseUrl:
      networkConfig.baseUrl ??
      process.env.TRUSTLESS_WORK_BASE_URL ??
      (effectiveMode === "mainnet"
        ? undefined
        : "https://dev.api.trustlesswork.com"),
    trustlineAddress:
      networkConfig.trustlineAddress ??
      process.env.TRUSTLESS_WORK_TRUSTLINE_ADDRESS ??
      (effectiveMode === "testnet"
        ? "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
        : undefined),
  };
}

