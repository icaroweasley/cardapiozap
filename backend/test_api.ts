import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const merchant = await prisma.merchant.findFirst();
  if (!merchant) return console.log("No merchant");
  
  const product = await prisma.product.findFirst({ where: { merchantId: merchant.id }});
  if (!product) return console.log("No product");

  try {
    const res = await axios.post('http://localhost:3001/api/orders', {
      merchantId: merchant.id,
      customerName: "Test",
      customerPhone: "123456789",
      deliveryType: "DELIVERY",
      address: "Test, 123 - Test",
      paymentMethod: "PIX",
      observation: "",
      items: [{
        productId: product.id,
        quantity: 1,
        price: product.price
      }]
    });
    console.log("Success", res.data);
  } catch(e: any) {
    console.error("API Error:", e.response?.data || e.message);
  }
}
test();
