const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.merchant.findMany();
  console.log(users.map(u => ({ id: u.id, name: u.name, type: u.accountType })));
}
main().finally(() => prisma.$disconnect());
