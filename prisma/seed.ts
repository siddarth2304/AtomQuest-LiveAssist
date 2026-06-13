import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "agent@atomquest.dev" },
    update: {
      passwordHash: hashPassword("password123"),
      name: "AtomQuest Agent",
      role: Role.ADMIN
    },
    create: {
      email: "agent@atomquest.dev",
      passwordHash: hashPassword("password123"),
      name: "AtomQuest Agent",
      role: Role.ADMIN
    }
  });

  await prisma.metricCounter.upsert({
    where: { key: "errorCount" },
    update: {},
    create: { key: "errorCount", value: 0 }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
