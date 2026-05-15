import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fundEscrow } from "@/lib/trustlesswork";

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

    const existingFundTx = await prisma.transaction.findFirst({
      where: { escrowId, type: "FUND" },
      orderBy: { createdAt: "desc" },
    });

    if (existingFundTx?.xdr) {
      return NextResponse.json({
        success: true,
        unsignedTransaction: existingFundTx.xdr,
      });
    }

    const response = await fundEscrow({
      contractId: escrow.contractId,
      amount: Number(escrow.amount),
      signer: farmer.walletAddress,
    });

    const unsignedTransaction = response.unsignedTransaction;
    if (!unsignedTransaction) {
      return NextResponse.json(
        { error: "Trustless Work did not return an unsigned transaction." },
        { status: 502 }
      );
    }

    await prisma.transaction.create({
      data: {
        escrowId,
        xdr: unsignedTransaction,
        type: "FUND",
        signed: false,
      },
    });

    await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "AWAITING_FUND_SIGNATURE" },
    });

    return NextResponse.json({
      success: true,
      unsignedTransaction,
    });
  } catch (error) {
    console.error("[ESCROW_FUND]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
