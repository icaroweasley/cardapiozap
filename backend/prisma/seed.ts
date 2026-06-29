import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const merchant = await prisma.merchant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Lanchonete Demo',
      slug: 'demo',
      phone: '5511999999999',
      password: hashedPassword,
      products: {
        create: [
          {
            name: 'X-Burger Brutal',
            description: 'Pão brioche, blend 180g, queijo prato e maionese da casa.',
            price: 2500, // R$ 25,00
            category: 'Lanches',
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
            available: true,
          },
          {
            name: 'Batata Frita Rústica',
            description: 'Porção individual de batatas rústicas com páprica.',
            price: 1500, // R$ 15,00
            category: 'Porções',
            imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80',
            available: true,
          },
          {
            name: 'Coca-Cola Lata',
            description: 'Refrigerante lata 350ml',
            price: 600, // R$ 6,00
            category: 'Bebidas',
            available: true,
          }
        ]
      }
    }
  });

  console.log('Seed completed! Merchant: demo / Password: 123456');

  await prisma.merchant.upsert({
    where: { slug: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      slug: 'admin',
      phone: '5511000000000',
      password: hashedPassword,
      isAdmin: true,
      planStatus: 'active',
    }
  });
  console.log('Admin seeded! Merchant: admin / Password: 123456');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
