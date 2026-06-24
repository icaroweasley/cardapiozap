import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const merchant = await prisma.merchant.findUnique({ where: { slug: 'demo' } });
  
  if (!merchant) {
    console.log("Merchant 'demo' not found.");
    return;
  }

  const products = [
    // BEBIDAS
    { merchantId: merchant.id, name: 'Guaraná Antarctica Lata', description: 'Refrigerante lata 350ml', price: 600, category: 'BEBIDAS', available: true },
    { merchantId: merchant.id, name: 'Suco de Laranja Natural', description: 'Suco natural da fruta 500ml', price: 1200, category: 'BEBIDAS', available: true },
    { merchantId: merchant.id, name: 'Heineken Long Neck', description: 'Cerveja long neck 330ml bem gelada', price: 1400, category: 'BEBIDAS', available: true },
    { merchantId: merchant.id, name: 'Água Mineral sem Gás', description: 'Garrafa 500ml', price: 400, category: 'BEBIDAS', available: true },

    // LANCHES
    { merchantId: merchant.id, name: 'Duplo Smash Bacon', description: 'Dois blends de 90g, muito queijo cheddar, bacon crocante, maionese defumada no pão brioche.', price: 3200, category: 'LANCHES', available: true, imageUrl: 'https://images.unsplash.com/photo-1594212586048-a2818965f5cc?w=500&auto=format&fit=crop&q=60' },
    { merchantId: merchant.id, name: 'Chicken Crispy', description: 'Sobrecoxa empanada super crocante, alface americana, tomate e maionese verde.', price: 2800, category: 'LANCHES', available: true, imageUrl: 'https://images.unsplash.com/photo-1615865417240-27f9175d7bfa?w=500&auto=format&fit=crop&q=60' },
    { merchantId: merchant.id, name: 'Vegan Future', description: 'Hambúrguer do futuro 115g, queijo vegano, cebola caramelizada e rúcula no pão australiano.', price: 3500, category: 'LANCHES', available: true },
    { merchantId: merchant.id, name: 'Monster Cheddar', description: 'Blend 180g, piscina de cheddar cremoso e farofa de bacon.', price: 3800, category: 'LANCHES', available: true, imageUrl: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=500&auto=format&fit=crop&q=60' },

    // PORÇÕES
    { merchantId: merchant.id, name: 'Onion Rings', description: 'Anéis de cebola empanados e fritos, acompanha molho barbecue.', price: 1800, category: 'PORÇÕES', available: true, imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&auto=format&fit=crop&q=60' },
    { merchantId: merchant.id, name: 'Nuggets Artesanais', description: '10 unidades de frango empanado artesanal, acompanha maionese verde.', price: 2200, category: 'PORÇÕES', available: true },
    { merchantId: merchant.id, name: 'Batata com Cheddar e Bacon', description: 'Porção grande de batata frita coberta com cheddar derretido e cubos de bacon.', price: 3500, category: 'PORÇÕES', available: true, imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&auto=format&fit=crop&q=60' },

    // SOBREMESAS
    { merchantId: merchant.id, name: 'Brownie com Sorvete', description: 'Brownie de chocolate belga aquecido com bola de sorvete de creme.', price: 1800, category: 'SOBREMESAS', available: true },
    { merchantId: merchant.id, name: 'Milkshake de Nutella', description: 'Milkshake cremoso de baunilha com muita Nutella, 400ml.', price: 2200, category: 'SOBREMESAS', available: true, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75f8205?w=500&auto=format&fit=crop&q=60' },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log('Added more products!');
}

seed()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
