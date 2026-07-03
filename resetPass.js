const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPass() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    const updated = await prisma.merchant.update({
      where: { slug: 'rafaela-capote' },
      data: { password: hash }
    });
    console.log("SUCCESS: Password updated for", updated.slug);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
resetPass();
