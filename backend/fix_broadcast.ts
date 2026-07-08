import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.broadcastSession.findMany({
    include: { merchant: true }
  });
  
  for (const session of sessions) {
    console.log(`Session found for merchant: ${session.merchant.name} (ID: ${session.merchantId})`);
    
    let contacts = JSON.parse(session.contacts);
    let errorCount = 0;
    let pendingCount = 0;
    let sentCount = 0;

    for (let c of contacts) {
      if (c.status === 'error') {
        c.status = 'pending';
        delete c.error;
        errorCount++;
      } else if (c.status === 'pending') {
        pendingCount++;
      } else if (c.status === 'sent') {
        sentCount++;
      }
    }

    console.log(`Stats before fix: Sent=${sentCount}, Pending=${pendingCount}, Error=${errorCount}`);
    
    // Auto-fix if errors exist
    if (errorCount > 0) {
      let firstPending = contacts.findIndex((c: any) => c.status === 'pending');
      if (firstPending === -1) firstPending = 0;
      
      await prisma.broadcastSession.update({
        where: { id: session.id },
        data: {
          contacts: JSON.stringify(contacts),
          currentIndex: firstPending,
          status: 'paused' // leave it paused for safety
        }
      });
      console.log(`Fixed! Set ${errorCount} error contacts to pending. CurrentIndex is now ${firstPending}.`);
    } else {
      console.log('No error contacts to fix.');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
