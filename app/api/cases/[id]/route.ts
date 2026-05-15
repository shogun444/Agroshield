import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDiagnosis(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const found = await prisma.case.findUnique({
      where: { id },
      include: {
        bids: {
          include: {
            vendor: { select: { id: true, email: true, walletAddress: true } },
          },
        },
        escrow: true,
        dispute: true,
        farmer: { select: { id: true, email: true, walletAddress: true } },
      },
    });

    if (!found) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const formatted = {
      ...found,
      diagnosis: parseDiagnosis(found.diagnosis),
      assignedVendorId: found.bids.find((bid: any) => bid.selected)?.vendorId ?? null,
    };

    return NextResponse.json({ success: true, case: formatted });
  } catch (error) {
    console.error("[CASE_DETAIL]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
