import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lists = await prisma.savedList.findMany({
    include: { merchant: true }
  });
  
  for (const list of lists) {
    if (list.merchant.name.toLowerCase().includes('rafaela') && list.name.includes('Restantes')) {
      const contacts = JSON.parse(list.contacts);
      
      for (const c of contacts) {
        console.log(`${c.name || 'Sem nome'} - ${c.number}`);
      }
      return;
    }
  }
  console.log("List not found");
}

main().catch(console.error).finally(() => prisma.$disconnect());
