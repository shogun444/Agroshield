import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

async function main() {
  // Delete all non-blockchain escrows (ACTIVE demo ones + AWAITING_SIGNATURE)
  const escrows = await prisma.escrow.findMany({
    where: {
      OR: [
        { status: "AWAITING_SIGNATURE" },
        { contractId: { startsWith: "AGRO-DEMO-" } },
      ],
    },
    select: { id: true, caseId: true, status: true, contractId: true },
  });

  console.log(`Found ${escrows.length} escrow(s) to clean:`, escrows);

  if (escrows.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const ids = escrows.map((e: { id: string }) => e.id);

  const txDel = await prisma.transaction.deleteMany({ where: { escrowId: { in: ids } } });
  console.log(`Deleted ${txDel.count} transaction(s).`);

  const escDel = await prisma.escrow.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${escDel.count} escrow(s).`);

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
