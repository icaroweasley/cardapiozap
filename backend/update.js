const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.merchant.updateMany({
    where: { name: { contains: 'Rafaela' } },
    data: { accountType: 'BROADCAST_ONLY' }
  });
  console.log(result);
}
main().finally(() => prisma.$disconnect());
