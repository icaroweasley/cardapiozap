import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.broadcastSession.findMany({
    include: { merchant: true }
  });
  
  for (const session of sessions) {
    if (session.merchant.name.toLowerCase().includes('rafaela')) {
      console.log(`Found session for ${session.merchant.name}`);
      let contacts = JSON.parse(session.contacts);
      
      let pendingContacts = contacts.filter((c: any) => c.status !== 'sent');
      
      pendingContacts = pendingContacts.map((c: any) => {
         const newC = { ...c, status: 'pending' };
         delete newC.error;
         return newC;
      });

      console.log(`Total original contacts: ${contacts.length}`);
      console.log(`Remaining contacts to send: ${pendingContacts.length}`);
      
      if (pendingContacts.length > 0) {
        const listName = `Restantes (${pendingContacts.length}) - Disparo`;
        const newList = await prisma.savedList.create({
          data: {
            merchantId: session.merchantId,
            name: listName,
            contacts: JSON.stringify(pendingContacts)
          }
        });
        
        console.log(`Successfully created list "${newList.name}" with ${pendingContacts.length} contacts!`);
      } else {
        console.log(`No pending contacts to create a list.`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
