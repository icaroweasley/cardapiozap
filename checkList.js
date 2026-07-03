const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.savedList.findFirst({
  where: { merchant: { slug: 'rafaela-capote' } }
}).then(l => {
  console.log(l ? l.contacts.substring(0, 100) : "No lists found for rafaela-capote");
}).finally(()=>prisma.$disconnect());
