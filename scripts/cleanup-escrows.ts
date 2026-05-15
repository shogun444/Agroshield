import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

async function main() {
  const escrows = await prisma.escrow.findMany({
    where: { status: "AWAITING_SIGNATURE" },
    select: { id: true, caseId: true, status: true },
  });

  console.log(`Found ${escrows.length} stale escrow(s):`, escrows);

  if (escrows.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const escrowIds = escrows.map((e: { id: string }) => e.id);

  const txDel = await prisma.transaction.deleteMany({
    where: { escrowId: { in: escrowIds } },
  });
  console.log(`Deleted ${txDel.count} transaction record(s).`);

  const escDel = await prisma.escrow.deleteMany({
    where: { id: { in: escrowIds } },
  });
  console.log(`Deleted ${escDel.count} escrow(s).`);

  console.log("Done. You can now retry Accept Bid fresh.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
