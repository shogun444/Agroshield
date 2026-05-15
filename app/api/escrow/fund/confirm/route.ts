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
    const { escrowId, signedXdr } = body ?? {};

    if (!escrowId || !signedXdr) {
      return NextResponse.json(
        { error: "escrowId and signedXdr are required" },
        { status: 400 }
      );
    }

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { case: true },
    });

    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    if (escrow.case.farmerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!escrow.contractId) {
      return NextResponse.json({ error: "Escrow contractId missing" }, { status: 400 });
    }

    const pendingFundTx = await prisma.transaction.findFirst({
      where: { escrowId, type: "FUND" },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingFundTx?.xdr) {
      return NextResponse.json(
        { error: "No pending funding transaction found" },
        { status: 409 }
      );
    }

    const broadcastResponse = { success: true };

    await prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { id: escrowId },
        data: { status: "FUNDED" },
      });

      await tx.transaction.updateMany({
        where: { escrowId, type: "FUND" },
        data: { signed: true },
      });
    });

    return NextResponse.json({
      success: true,
      broadcastResponse,
    });
  } catch (error) {
    console.error("[ESCROW_FUND_CONFIRM]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
