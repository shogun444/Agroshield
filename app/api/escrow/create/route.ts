import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deployEscrow, TW_TOKEN_ADDRESS, TW_TOKEN_SYMBOL } from "@/lib/trustlesswork";

// Fake XDR — a valid-looking placeholder so Freighter doesn't crash.
// This is intentionally a no-op for demo purposes when TW testnet is unreliable.
const DEMO_XDR =
  "AAAAAgAAAABByf5V4lIFWJ5O3LjFLb5q5U5N5U5N5U5N5U5N5U5N5QAAAD" +
  "IAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function parseDiagnosis(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "FARMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { caseId, bidId } = body ?? {};

    if (!caseId || !bidId) {
      return NextResponse.json({ error: "caseId and bidId are required" }, { status: 400 });
    }

    const foundCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!foundCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (foundCase.farmerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { vendor: true },
    });

    if (!bid || bid.caseId !== caseId) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const farmer = await prisma.user.findUnique({ where: { id: user.id } });
    const vendor = bid.vendor;

    if (!farmer?.walletAddress || !vendor?.walletAddress) {
      return NextResponse.json(
        { error: "Both farmer and vendor need Stellar wallet addresses" },
        { status: 400 }
      );
    }

    const diagnosis = parseDiagnosis(foundCase.diagnosis);
    const diseaseName = diagnosis?.disease ?? "Crop Treatment";

    // Return cached deploy XDR if one already exists
    const existingEscrow = await prisma.escrow.findUnique({
      where: { caseId },
      include: {
        transactions: {
          where: { type: "DEPLOY" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (existingEscrow) {
      const existingDeploy = existingEscrow.transactions[0];
      return NextResponse.json({
        success: true,
        unsignedTransaction: existingDeploy?.xdr ?? DEMO_XDR,
        escrowId: existingEscrow.id,
        mocked: !existingDeploy?.xdr,
      });
    }

    const platformAddress = process.env.PLATFORM_WALLET_ADDRESS ?? farmer.walletAddress;
    const resolverAddress = process.env.PLATFORM_RESOLVER_ADDRESS ?? platformAddress;

    // Attempt TW deployment — fall back to demo mode if testnet is unreliable
    let unsignedTransaction: string | null = null;
    let isMocked = false;

    try {
      const deployResponse = await deployEscrow({
        engagementId: caseId,
        title: `AgroShield: ${diseaseName}`,
        description: `Crop treatment escrow for ${diseaseName}`,
        signer: farmer.walletAddress,
        roles: {
          approver: farmer.walletAddress,
          serviceProvider: vendor.walletAddress,
          releaseSigner: farmer.walletAddress,
          receiver: vendor.walletAddress,
          platformAddress,
          disputeResolver: resolverAddress,
        },
        amount: Number(bid.amount),
        platformFee: 1,
        trustline: {
          address: TW_TOKEN_ADDRESS,
          symbol: TW_TOKEN_SYMBOL,
        },
        milestones: [
          {
            description: "Treatment delivered and confirmed",
            amount: Number(bid.amount),
          },
        ],
      });

      unsignedTransaction = deployResponse?.unsignedTransaction ?? null;
      console.log("[ESCROW_CREATE] TW deploy succeeded, got XDR.");
    } catch (twErr) {
      // TW testnet is unreliable — fall back to demo mode for hackathon
      console.warn("[ESCROW_CREATE] TW deploy failed, using demo fallback:", twErr instanceof Error ? twErr.message : twErr);
      unsignedTransaction = DEMO_XDR;
      isMocked = true;
    }

    if (!unsignedTransaction) {
      unsignedTransaction = DEMO_XDR;
      isMocked = true;
    }

    // Store demo/mock contractId immediately so rest of flow has a contractId
    const mockContractId = isMocked ? `AGRO-DEMO-${caseId.slice(-8)}-${Date.now()}` : null;

    const escrow = await prisma.escrow.create({
      data: {
        caseId,
        contractId: mockContractId,
        status: isMocked ? "ACTIVE" : "AWAITING_SIGNATURE",
        amount: bid.amount,
      },
    });

    await prisma.transaction.create({
      data: {
        escrowId: escrow.id,
        xdr: unsignedTransaction,
        type: "DEPLOY",
        signed: false,
      },
    });

    // Mark bid as selected
    await prisma.bid.update({
      where: { id: bidId },
      data: { selected: true },
    });

    return NextResponse.json({
      success: true,
      unsignedTransaction,
      escrowId: escrow.id,
      contractId: mockContractId,
      mocked: isMocked,
    });
  } catch (error) {
    console.error("[ESCROW_CREATE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
