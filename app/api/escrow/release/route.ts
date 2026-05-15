import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseFunds } from "@/lib/trustlesswork";

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
    const { escrowId } = body ?? {};

    if (!escrowId) {
      return NextResponse.json({ error: "escrowId is required" }, { status: 400 });
    }

    const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const foundCase = await prisma.case.findUnique({ where: { id: escrow.caseId } });
    if (!foundCase || foundCase.farmerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const farmer = await prisma.user.findUnique({ where: { id: user.id } });
    if (!farmer?.walletAddress) {
      return NextResponse.json({ error: "Missing farmer wallet address" }, { status: 400 });
    }

    if (!escrow.contractId) {
      return NextResponse.json({ error: "Escrow contractId missing" }, { status: 400 });
    }

    const response = await releaseFunds({
      contractId: escrow.contractId,
      signer: farmer.walletAddress,
    });

    if (!response.unsignedTransaction) {
      throw new Error("Trustless Work did not return an unsigned transaction.");
    }

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "RELEASE_PENDING" },
    });

    return NextResponse.json({
      success: true,
      unsignedTransaction: response.unsignedTransaction,
    });
  } catch (error) {
    console.error("[ESCROW_RELEASE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
