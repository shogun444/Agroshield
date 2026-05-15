import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { escrowId, bidId, signedXdr } = body ?? {};

    if (!escrowId || !bidId || !signedXdr) {
      return NextResponse.json(
        { error: "escrowId, bidId and signedXdr are required" },
        { status: 400 }
      );
    }

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { case: true, transactions: true },
    });

    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    if (escrow.case.farmerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid || bid.caseId !== escrow.caseId) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const broadcastResponse = { contractId: "DEMO_CONTRACT_ID_" + escrowId };
    const contractId =
      (broadcastResponse as { contractId?: string }).contractId ??
      (broadcastResponse as { result?: { contractId?: string } }).result
        ?.contractId ??
      (broadcastResponse as { data?: { contractId?: string } }).data?.contractId;

    if (!contractId) {
      return NextResponse.json(
        { error: "Trustless Work did not return a contractId" },
        { status: 502 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.escrow.update({
        where: { id: escrowId },
        data: { contractId, status: "AWAITING_FUNDING" },
      });

      await tx.bid.updateMany({
        where: { caseId: escrow.caseId, id: { not: bidId } },
        data: { selected: false },
      });

      await tx.bid.update({
        where: { id: bidId },
        data: { selected: true },
      });

      await tx.case.update({
        where: { id: escrow.caseId },
        data: { status: "IN_PROGRESS" },
      });

      await tx.transaction.updateMany({
        where: { escrowId, type: "DEPLOY" },
        data: { signed: true },
      });
    });

    return NextResponse.json({
      success: true,
      contractId,
    });
  } catch (error) {
    console.error("[ESCROW_CONFIRM]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
