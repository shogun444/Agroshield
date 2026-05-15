import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["FARMER", "VENDOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { caseId, reason, contractId } = body ?? {};

    if (!caseId || !reason) {
      return NextResponse.json({ error: "caseId and reason are required" }, { status: 400 });
    }

    const existing = await prisma.dispute.findUnique({ where: { caseId } });
    if (existing) {
      return NextResponse.json({ error: "Dispute already exists" }, { status: 409 });
    }

    const walletAddress = user.walletAddress;
    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
    }

    if (!contractId) {
      return NextResponse.json({ error: "contractId is required" }, { status: 400 });
    }

    const response = { unsignedTransaction: "DEMO_XDR_UNSIGNED" };

    const dispute = await prisma.dispute.create({
      data: {
        caseId,
        reason,
        status: "OPEN",
      },
    });

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "DISPUTED" },
    });

    return NextResponse.json({
      success: true,
      dispute,
      unsignedTransaction: response?.unsignedTransaction,
    });
  } catch (error) {
    console.error("[DISPUTE_CREATE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
