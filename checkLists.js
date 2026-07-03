const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.savedList.findMany().then(lists => {
  console.log(`Total lists: ${lists.length}`);
  if(lists.length > 0) {
    console.log(lists[0].contacts.substring(0, 150));
  }
}).finally(()=>prisma.$disconnect());
