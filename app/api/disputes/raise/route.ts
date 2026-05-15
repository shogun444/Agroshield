import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "FARMER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { caseId, reason } = await request.json();
    if (!caseId || !reason) {
      return NextResponse.json({ error: "caseId and reason are required" }, { status: 400 });
    }

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: { escrow: true, dispute: true },
    });

    if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (caseData.farmerId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (caseData.dispute) return NextResponse.json({ error: "Dispute already raised" }, { status: 400 });

    // Create dispute record + freeze escrow + update case status
    const dispute = await prisma.dispute.create({
      data: { caseId, reason, status: "OPEN" },
    });

    if (caseData.escrow) {
      await prisma.escrow.update({
        where: { id: caseData.escrow.id },
        data: { status: "DISPUTED" },
      });
    }

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "DISPUTED" },
    });

    return NextResponse.json({ success: true, disputeId: dispute.id });
  } catch (error) {
    console.error("[DISPUTE_RAISE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
