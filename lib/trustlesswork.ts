const TW_BASE_URL = "https://dev.api.trustlesswork.com"; // TESTNET ONLY

// TW testnet USDC Soroban token contract (confirmed testnet address)
const TW_TESTNET_TOKEN = "CAUGJT4GREIY3WHOUUU5RIUDGSPVREF5CDCYJOWMHOVT2GWQT5JEETGJ";

function getApiKey() {
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY;
  if (!apiKey) throw new Error("TRUSTLESS_WORK_API_KEY is missing");
  return apiKey;
}

function getHeaders() {
  return {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  };
}

async function twJson(path: string, init: RequestInit): Promise<any> {
  const url = `${TW_BASE_URL}${path}`;
  console.log(`[TW_REQ] ${url}`);
  if (init.body) console.log(`[TW_BODY] ${init.body}`);

  const response = await fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers ?? {}),
    },
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error(`[TW_ERR] ${response.status}:`, raw);
    throw new Error(raw);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Send a signed transaction to Trustless Work Testnet
 * Proxies through our own API when called from the client
 */
export async function sendSignedTransaction(signedXdr: string) {
  const isClient = typeof window !== "undefined";

  const endpoint = isClient
    ? "/api/trustlesswork/send-transaction"
    : `${TW_BASE_URL}/helper/send-transaction`;

  const headers = isClient
    ? { "Content-Type": "application/json" }
    : getHeaders();

  console.log(`[TW_SEND] Target: ${endpoint}`);
  console.log(`[TW_SEND] XDR: ${signedXdr.slice(0, 20)}...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ signedXdr }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("========== RAW TW ERROR ==========");
    console.error(raw);
    console.error("==================================");
    throw new Error(raw);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Deploy escrow — v2 API schema
 * roles are nested, amount/platformFee are numbers, trustline is an object
 */
export async function deployEscrow(payload: {
  engagementId: string;
  title: string;
  description: string;
  signer: string;      // wallet address of the transaction signer
  roles: {
    approver: string;
    serviceProvider: string;
    releaseSigner: string;
    receiver: string;
    platformAddress: string;
    disputeResolver: string;
  };
  amount: number;
  platformFee: number;
  trustline: {
    address: string;   // Soroban token contract address
    symbol: string;    // e.g. "USDC"
  };
  milestones: Array<{ description: string; amount?: number }>;
}) {
  return twJson("/deployer/single-release", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Fund escrow — v2 API schema
 */
export async function fundEscrow(payload: {
  contractId: string;
  amount: number;
  signer: string;
}) {
  return twJson("/escrow/single-release/fund-escrow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Release funds — v2 API schema
 */
export async function releaseFunds(payload: {
  contractId: string;
  signer: string;  // was releaseSigner in v1
}) {
  return twJson("/escrow/single-release/release-funds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Change milestone status — v2 API schema
 */
export async function changeMilestoneStatus(payload: {
  contractId: string;
  milestoneIndex: string | number;
  newStatus: string;
  serviceProvider: string;
}) {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    const response = await fetch("/api/trustlesswork/change-milestone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to update milestone status");
    }
    return data;
  }

  return twJson("/escrow/single-release/change-milestone-status", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Get escrow status — no signing needed
 */
export async function getEscrowStatus(contractId: string) {
  return twJson(`/escrow/single-release/get-escrow?contractId=${contractId}`, {
    method: "GET",
  });
}

/**
 * Set trustline — MUST be called before escrow creation.
 * Proxies through our server when called client-side (API key protection).
 */
export async function setTrustline(payload: {
  address: string;
}) {
  const isClient = typeof window !== "undefined";

  if (isClient) {
    const response = await fetch("/api/trustlesswork/set-trustline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to set trustline");
    return data;
  }

  return twJson("/helper/set-trustline", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * The TW testnet USDC Soroban token contract address
 */
export const TW_TOKEN_ADDRESS = TW_TESTNET_TOKEN;
export const TW_TOKEN_SYMBOL = "USDC";
