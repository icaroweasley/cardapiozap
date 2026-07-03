import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.findUnique({
    where: { slug: 'demo' }
  });

  if (!merchant) {
    console.error("Merchant 'demo' não encontrado. Execute o seed normal primeiro.");
    return;
  }

  // Deleta os produtos existentes para não duplicar
  await prisma.product.deleteMany({
    where: { merchantId: merchant.id }
  });

  const products = [
    // --- HAMBÚRGUERES ARTESANAIS ---
    {
      name: 'X-Burger Brutal',
      description: 'Pão brioche selado na manteiga, blend especial 180g, duplo queijo prato derretido e maionese defumada da casa.',
      price: 2500,
      category: 'Burgers Artesanais',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Bacon Master',
      description: 'Pão australiano, blend 180g, queijo cheddar cremoso, cebola caramelizada e fatias generosas de bacon crocante.',
      price: 3200,
      category: 'Burgers Artesanais',
      imageUrl: 'https://images.unsplash.com/photo-1594212202875-54524db50508?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Smash Duplo',
      description: 'Pão de batata, dois blends smash de 90g, duplo american cheese, picles e molho especial.',
      price: 2800,
      category: 'Burgers Artesanais',
      imageUrl: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Chicken Supreme',
      description: 'Pão brioche, sobrecoxa de frango empanada e crocante, alface americana, tomate e maionese de ervas.',
      price: 2600,
      category: 'Burgers Artesanais',
      imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Veggie Burger',
      description: 'Pão integral, hambúrguer de grão de bico e quinoa, queijo prato, mix de folhas e geleia de pimenta.',
      price: 2700,
      category: 'Burgers Artesanais',
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },

    // --- PORÇÕES ---
    {
      name: 'Batata Frita Rústica',
      description: 'Porção grande de batatas rústicas temperadas com páprica doce e alecrim. Acompanha maionese da casa.',
      price: 2200,
      category: 'Porções',
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Batata com Cheddar e Bacon',
      description: 'Porção farta de batata palito coberta com nosso creme de cheddar especial e farofa de bacon bacon.',
      price: 2800,
      category: 'Porções',
      imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Onion Rings',
      description: 'Anéis de cebola empanados e super crocantes. Acompanha molho barbecue.',
      price: 1800,
      category: 'Porções',
      imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Nuggets Artesanais',
      description: '10 unidades de pedaços de peito de frango empanados. Acompanha maionese de alho.',
      price: 2000,
      category: 'Porções',
      imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },

    // --- COMBOS ---
    {
      name: 'Combo Casal',
      description: '2 Smash Duplos + 1 Porção Grande de Batata Frita + 2 Refrigerantes em Lata.',
      price: 6500,
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Combo Família',
      description: '4 X-Burger Brutal + 2 Porções Grandes de Batata Frita + 1 Refrigerante 2 Litros.',
      price: 11000,
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },

    // --- BEBIDAS ---
    {
      name: 'Coca-Cola Original 350ml',
      description: 'Refrigerante em lata bem gelado.',
      price: 600,
      category: 'Bebidas',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Coca-Cola Zero 350ml',
      description: 'Refrigerante em lata bem gelado, sem açúcar.',
      price: 600,
      category: 'Bebidas',
      imageUrl: '',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Guaraná Antarctica 350ml',
      description: 'Refrigerante em lata bem gelado.',
      price: 600,
      category: 'Bebidas',
      imageUrl: '',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Suco de Laranja Natural 500ml',
      description: 'Suco feito na hora com laranjas selecionadas, sem adição de açúcar.',
      price: 1000,
      category: 'Bebidas',
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Água Mineral sem Gás 500ml',
      description: 'Garrafa.',
      price: 400,
      category: 'Bebidas',
      imageUrl: '',
      available: true,
      merchantId: merchant.id
    },

    // --- SOBREMESAS ---
    {
      name: 'Milkshake de Ovomaltine',
      description: 'Sorvete de baunilha batido com bastante Ovomaltine, coberto com chantilly e calda de chocolate. 400ml.',
      price: 1800,
      category: 'Sobremesas',
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75bb811?w=500&q=80',
      available: true,
      merchantId: merchant.id
    },
    {
      name: 'Brownie com Sorvete',
      description: 'Brownie de chocolate meio amargo quentinho acompanhado de uma bola de sorvete de creme.',
      price: 1500,
      category: 'Sobremesas',
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&q=80',
      available: true,
      merchantId: merchant.id
    }
  ];

  for (const prod of products) {
    await prisma.product.create({
      data: prod
    });
  }

  console.log('Criado um cardápio completo de lanchonete para a conta demo!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
