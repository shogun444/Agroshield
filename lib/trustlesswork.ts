import { resolveTrustlessWorkNetworkConfig } from "./stellar-network";

const TW_API_KEY =
  process.env.TRUSTLESS_WORK_API_KEY ?? process.env.tw_api_key ?? "";

function getTwHeaders() {
  if (!TW_API_KEY) {
    throw new Error("Missing Trustless Work API key");
  }

  return {
    "x-api-key": TW_API_KEY,
    "Content-Type": "application/json",
  };
}

function getBaseUrl() {
  const { baseUrl, networkMode } = resolveTrustlessWorkNetworkConfig();

  if (!baseUrl) {
    throw new Error(
      `Missing Trustless Work base URL for ${networkMode}. Set TRUSTLESS_WORK_BASE_URL_${networkMode.toUpperCase()} or TRUSTLESS_WORK_BASE_URL.`
    );
  }

  return baseUrl;
}

async function safePost(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: getTwHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ??
        (data as { error?: string; message?: string }).message ??
        `Trustless Work request failed (${response.status})`
    );
  }

  return data;
}

async function safeGet(url: string) {
  const response = await fetch(url, { headers: getTwHeaders() });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { error?: string; message?: string }).error ??
        (data as { error?: string; message?: string }).message ??
        `Trustless Work request failed (${response.status})`
    );
  }

  return data;
}

export async function deployEscrow(payload: {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  amount: number;
  platformFee: number;
  roles: {
    approver: string;
    serviceProvider: string;
    platformAddress: string;
    releaseSigner: string;
    disputeResolver: string;
    receiver: string;
  };
  trustline: {
    address: string;
    symbol: string;
  };
  milestones: Array<{
    description: string;
  }>;
}) {
  return safePost(`${getBaseUrl()}/deployer/single-release`, payload);
}

export async function fundEscrow(payload: {
  contractId: string;
  amount: number;
  signer: string;
}) {
  return safePost(`${getBaseUrl()}/escrow/single-release/fund-escrow`, payload);
}

export async function sendTransaction(signedXdr: string) {
  return safePost(`${getBaseUrl()}/helper/send-transaction`, { signedXdr });
}

export async function changeMilestoneStatus(payload: {
  contractId: string;
  milestoneIndex: string;
  newStatus: string;
  serviceProvider: string;
}) {
  return safePost(
    `${getBaseUrl()}/escrow/single-release/change-milestone-status`,
    payload
  );
}

export async function approveMilestone(payload: {
  contractId: string;
  milestoneIndex: string;
  approver: string;
}) {
  return safePost(
    `${getBaseUrl()}/escrow/single-release/approve-milestone`,
    payload
  );
}

export async function releaseFunds(payload: {
  contractId: string;
  releaseSigner: string;
}) {
  return safePost(`${getBaseUrl()}/escrow/single-release/release-funds`, payload);
}

export async function disputeEscrow(payload: {
  contractId: string;
  disputeStartedBy: string;
}) {
  return safePost(`${getBaseUrl()}/escrow/single-release/dispute-escrow`, payload);
}

export async function resolveDispute(payload: {
  contractId: string;
  disputeResolver: string;
  approverFunds: string;
  releasedAmount: string;
}) {
  return safePost(`${getBaseUrl()}/escrow/single-release/resolve-dispute`, payload);
}

export async function getEscrow(contractId: string) {
  return safeGet(
    `${getBaseUrl()}/escrow/single-release/get-escrow?contractId=${contractId}`
  );
}

