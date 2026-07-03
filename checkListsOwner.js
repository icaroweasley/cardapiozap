const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.savedList.findMany({ include: { merchant: true } }).then(lists => {
  lists.forEach(l => console.log(`List: ${l.name} - Merchant: ${l.merchant.slug}`));
}).finally(()=>prisma.$disconnect());
