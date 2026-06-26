const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);
  
  // 1. Carencia (1 day left)
  const dateCarencia = new Date();
  dateCarencia.setDate(dateCarencia.getDate() - 2); 
  
  await prisma.merchant.upsert({
    where: { slug: 'teste-carencia' },
    update: { planExpiresAt: dateCarencia, planStatus: 'active' },
    create: {
      name: 'Lojista Carencia',
      slug: 'teste-carencia',
      phone: '11999999991',
      password,
      planExpiresAt: dateCarencia,
      planStatus: 'active'
    }
  });

  // 2. Bloqueado
  const dateBloqueado = new Date();
  dateBloqueado.setDate(dateBloqueado.getDate() - 5); 
  
  await prisma.merchant.upsert({
    where: { slug: 'teste-bloqueado' },
    update: { planExpiresAt: dateBloqueado, planStatus: 'inactive' },
    create: {
      name: 'Lojista Bloqueado',
      slug: 'teste-bloqueado',
      phone: '11999999992',
      password,
      planExpiresAt: dateBloqueado,
      planStatus: 'inactive'
    }
  });

  console.log('Test users created!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
