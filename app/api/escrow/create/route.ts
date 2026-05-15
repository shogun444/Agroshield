import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deployEscrow } from "@/lib/trustlesswork";
import { resolveTrustlessWorkNetworkConfig } from "@/lib/stellar-network";

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

    const foundCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

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
    const trustlessWorkNetwork = resolveTrustlessWorkNetworkConfig();

    if (!trustlessWorkNetwork.trustlineAddress) {
      return NextResponse.json(
        {
          error: `Missing Trustless Work trustline address for ${trustlessWorkNetwork.networkMode}. Set TRUSTLESS_WORK_TRUSTLINE_ADDRESS_${trustlessWorkNetwork.networkMode.toUpperCase()} or TRUSTLESS_WORK_TRUSTLINE_ADDRESS.`,
        },
        { status: 500 }
      );
    }

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
      if (!existingDeploy?.xdr) {
        return NextResponse.json(
          { error: "Existing escrow deployment is missing the unsigned transaction." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        unsignedTransaction: existingDeploy.xdr,
        escrowId: existingEscrow.id,
      });
    }

    const deployResponse = await deployEscrow({
      signer: farmer.walletAddress,
      engagementId: caseId,
      title: `AgroShield: ${diseaseName}`,
      description: `Crop treatment escrow for ${diseaseName}`,
      amount: Number(bid.amount),
      platformFee: 1,
      roles: {
        approver: farmer.walletAddress,
        serviceProvider: vendor.walletAddress,
        platformAddress:
          process.env.PLATFORM_WALLET_ADDRESS ?? farmer.walletAddress,
        releaseSigner: farmer.walletAddress,
        disputeResolver:
          process.env.PLATFORM_WALLET_ADDRESS ?? farmer.walletAddress,
        receiver: vendor.walletAddress,
      },
      trustline: {
        address: trustlessWorkNetwork.trustlineAddress,
        symbol: process.env.TRUSTLESS_WORK_TRUSTLINE_SYMBOL ?? "USDC",
      },
      milestones: [
        {
          description: "Treatment delivered and confirmed",
        },
      ],
    });

    const unsignedTransaction = deployResponse.unsignedTransaction;
    if (!unsignedTransaction) {
      return NextResponse.json(
        { error: "Trustless Work did not return an unsigned transaction." },
        { status: 502 }
      );
    }

    const escrow = await prisma.escrow.create({
      data: {
        caseId,
        contractId: null,
        status: "AWAITING_SIGNATURE",
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

    return NextResponse.json({
      success: true,
      unsignedTransaction,
      escrowId: escrow.id,
    });
  } catch (error) {
    console.error("[ESCROW_CREATE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
