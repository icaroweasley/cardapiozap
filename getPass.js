const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.merchant.findUnique({where: {slug: 'rafaela-capote'}}).then(m => {
  if (m) console.log("PASSWORD IS:", m.password);
  else console.log("Not found");
}).finally(()=>prisma.$disconnect());
