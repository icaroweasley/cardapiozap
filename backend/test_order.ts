import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) return console.log("No merchant");
  
  const product = await prisma.product.findFirst({ where: { merchantId: merchant.id }});
  if (!product) return console.log("No product");

  try {
    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerName: "Test",
        customerPhone: "123456789",
        deliveryType: "DELIVERY",
        address: "Test, 123 - Test",
        paymentMethod: "PIX",
        observation: "",
        totalAmount: product.price,
        items: {
          create: [{
            productId: product.id,
            quantity: 1,
            priceAtPurchase: product.price
          }]
        }
      }
    });
    console.log("Success", order.id);
  } catch(e) {
    console.error("Prisma Error:", e);
  }
}
test();
