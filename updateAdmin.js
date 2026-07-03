const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.merchant.update({
      where: { slug: 'karu' },
      data: { isAdmin: true }
    });
    console.log("Made 'karu' admin.");

    await prisma.merchant.delete({
      where: { slug: 'admin' }
    });
    console.log("Deleted 'admin' account.");
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
