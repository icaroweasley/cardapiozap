import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sourceDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\5c85fdc9-f1c0-436c-9e80-8c4494fae318';
  const destDir = 'C:\\Users\\user\\Desktop\\documentos\\antigravity\\cardapio-digital\\frontend\\public';

  const files = fs.readdirSync(sourceDir);
  const drinkFile = files.find(f => f.startsWith('demo_drink'));
  const burgerFile = files.find(f => f.startsWith('demo_burger'));
  const friesFile = files.find(f => f.startsWith('demo_fries'));
  const dessertFile = files.find(f => f.startsWith('demo_dessert'));

  if (drinkFile) fs.copyFileSync(path.join(sourceDir, drinkFile), path.join(destDir, 'demo_drink.png'));
  if (burgerFile) fs.copyFileSync(path.join(sourceDir, burgerFile), path.join(destDir, 'demo_burger.png'));
  if (friesFile) fs.copyFileSync(path.join(sourceDir, friesFile), path.join(destDir, 'demo_fries.png'));
  if (dessertFile) fs.copyFileSync(path.join(sourceDir, dessertFile), path.join(destDir, 'demo_dessert.png'));

  // Update products in db
  const products = await prisma.product.findMany();
  for (const product of products) {
    let newUrl = product.imageUrl;
    const cat = product.category.toUpperCase().trim();
    if (cat === 'BEBIDAS') newUrl = '/demo_drink.png';
    else if (cat === 'LANCHES') newUrl = '/demo_burger.png';
    else if (cat === 'PORÇÕES' || cat.includes('PORÇÕES')) newUrl = '/demo_fries.png';
    else if (cat === 'SOBREMESAS') newUrl = '/demo_dessert.png';

    // also fix category name casing to avoid duplicates
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: newUrl, category: cat }
    });
  }

  console.log('Images and DB updated!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
