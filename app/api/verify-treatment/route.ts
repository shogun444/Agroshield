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
    const { caseId, contractId, milestoneIndex } = body ?? {};

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const foundCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: { escrow: true },
    });

    if (!foundCase || foundCase.farmerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const farmer = await prisma.user.findUnique({ where: { id: user.id } });
    if (!farmer?.walletAddress) {
      return NextResponse.json({ error: "Missing farmer wallet address" }, { status: 400 });
    }

    const escrowContractId = contractId ?? foundCase.escrow?.contractId;
    if (!escrowContractId) {
      return NextResponse.json({ error: "Escrow contractId missing" }, { status: 400 });
    }

    let response: { unsignedTransaction?: string } = { unsignedTransaction: "DEMO_XDR_UNSIGNED" };

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    if (foundCase.escrow) {
      await prisma.escrow.update({
        where: { id: foundCase.escrow.id },
        data: { status: "RELEASED" },
      });
    }

    return NextResponse.json({
      success: true,
      unsignedTransaction: response.unsignedTransaction ?? "DEMO_XDR_UNSIGNED",
    });
  } catch (error) {
    console.error("[VERIFY_TREATMENT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
