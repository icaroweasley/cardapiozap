const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const hash = await bcrypt.hash('admin', 10);
  await prisma.merchant.update({ where: { slug: 'admin-zapbulk' }, data: { password: hash } });
  console.log('Admin password hashed successfully');
  process.exit(0);
}
fix();
