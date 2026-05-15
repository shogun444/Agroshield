import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auth check — must be admin role
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { disputeId, resolutionType, farmerPercent, vendorPercent } = body ?? {};

    if (!disputeId || !resolutionType) {
      return NextResponse.json(
        { error: "disputeId and resolutionType are required" },
        { status: 400 }
      );
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        case: {
          include: {
            escrow: true,
            farmer: {
              select: { walletAddress: true },
            },
            bids: {
              where: { selected: true },
              select: {
                vendor: {
                  select: { walletAddress: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (dispute.status !== "OPEN") {
      return NextResponse.json({ error: "Dispute is already resolved" }, { status: 400 });
    }

    const contractId = dispute.case.escrow?.contractId;
    if (!contractId) {
      return NextResponse.json({ error: "No escrow found for this case" }, { status: 400 });
    }

    if (!["REFUND_FARMER", "RELEASE_VENDOR", "SPLIT"].includes(resolutionType)) {
      return NextResponse.json({ error: "Invalid resolutionType" }, { status: 400 });
    }

    if (resolutionType === "SPLIT") {
      if (typeof farmerPercent !== "number" || typeof vendorPercent !== "number") {
        return NextResponse.json(
          { error: "Farmer and vendor percentages are required for SPLIT" },
          { status: 400 }
        );
      }
      if (farmerPercent + vendorPercent !== 100) {
        return NextResponse.json({ error: "Percentages must sum to 100" }, { status: 400 });
      }
    }

    const resolverAddress = process.env.PLATFORM_RESOLVER_ADDRESS;
    if (!resolverAddress) {
      return NextResponse.json({ error: "PLATFORM_RESOLVER_ADDRESS is required" }, { status: 500 });
    }

    const totalAmount = Number(dispute.case.escrow?.amount ?? 0);
    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid escrow amount" }, { status: 400 });
    }

    const farmerAddress = dispute.case.farmer.walletAddress;
    const vendorAddress = dispute.case.bids[0]?.vendor.walletAddress;

    if (!farmerAddress) {
      return NextResponse.json({ error: "Farmer wallet address missing" }, { status: 400 });
    }

    if ((resolutionType === "RELEASE_VENDOR" || resolutionType === "SPLIT") && !vendorAddress) {
      return NextResponse.json({ error: "Vendor wallet address missing" }, { status: 400 });
    }

    const distributions =
      resolutionType === "REFUND_FARMER"
        ? [{ address: farmerAddress, amount: totalAmount }]
        : resolutionType === "RELEASE_VENDOR"
          ? [{ address: vendorAddress!, amount: totalAmount }]
          : [
              { address: farmerAddress, amount: Math.round((totalAmount * farmerPercent) / 100) },
              {
                address: vendorAddress!,
                amount: totalAmount - Math.round((totalAmount * farmerPercent) / 100),
              },
            ];

    // Mock Trustless Work API call
    const twData = { unsignedTransaction: "DEMO_XDR_UNSIGNED" };

    // Update DB after successful TW call
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolvedBy: resolverAddress,
      },
    });

    await prisma.case.update({
      where: { id: dispute.caseId },
      data: { status: "RESOLVED" },
    });

    return NextResponse.json({ unsignedTransaction: twData.unsignedTransaction });
  } catch (error) {
    console.error("[DISPUTE_RESOLVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
