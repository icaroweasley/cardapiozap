import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.broadcastSession.findMany({
    include: { merchant: true }
  });
  
  for (const session of sessions) {
    if (session.merchant.name.toLowerCase().includes('rafaela')) {
      console.log(`Found session for ${session.merchant.name}`);
      
      await prisma.broadcastSession.update({
        where: { id: session.id },
        data: {
          minDelay: 30,
          maxDelay: 150
        }
      });
      
      console.log(`Successfully updated delays for ${session.merchant.name}: minDelay=30, maxDelay=150`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
