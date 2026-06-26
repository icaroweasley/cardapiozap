const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const pgClient = new Client({
  connectionString: "postgresql://postgres.ghyhxjyegqweytjbplmh:C3lvl%40rz1nh0@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
});

async function migrate() {
  await pgClient.connect();
  console.log('Connected to ZapBulk PostgreSQL');

  const { rows: users } = await pgClient.query('SELECT * FROM "User"');
  console.log(`Found ${users.length} users in ZapBulk`);

  for (const user of users) {
    try {
      let slug = user.username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!slug) slug = `user-${user.id.substring(0, 8)}`;
      
      const existing = await prisma.merchant.findUnique({ where: { slug } });
      
      const instances = user.instances ? user.instances.split(',') : [];
      let instanceName = user.lastActiveInstance || (instances.length > 0 ? instances[0] : null);
      if (instanceName) instanceName = instanceName.trim();
      
      const whatsappConfig = instanceName ? JSON.stringify({ instanceName, phoneNumber: "", phoneNumberId: "" }) : null;

      let merchantId;
      if (existing) {
        console.log(`Merchant ${slug} already exists. Skipping user creation.`);
        merchantId = existing.id;
      } else {
        const newMerchant = await prisma.merchant.create({
          data: {
            name: user.username,
            slug,
            phone: '5511999999999', // Placeholder
            password: user.password,
            whatsappProvider: "EVOLUTION",
            whatsappConfig,
            active: user.planStatus === 'active',
            isAdmin: false // We will set someone to admin manually later or you can modify here
          }
        });
        merchantId = newMerchant.id;
        console.log(`Migrated user ${user.username} -> Merchant ${slug}`);
      }

      // Migrate lists for this user
      const { rows: lists } = await pgClient.query('SELECT * FROM "SavedList" WHERE "userId" = $1', [user.id]);
      for (const list of lists) {
        await prisma.savedList.create({
          data: {
            merchantId,
            name: list.name,
            contacts: list.contacts
          }
        });
        console.log(`  -> Migrated list: ${list.name}`);
      }

    } catch (e) {
      console.error(`Error migrating user ${user.username}:`, e);
    }
  }

  // Create an admin user specifically for ZapBulk monitoring
  try {
    const adminExists = await prisma.merchant.findUnique({ where: { slug: 'admin-zapbulk' } });
    if (!adminExists) {
      await prisma.merchant.create({
        data: {
          name: 'Admin ZapBulk',
          slug: 'admin-zapbulk',
          phone: '00000000000',
          password: 'admin', // the user should probably change this later, or they can use it as is for testing
          whatsappProvider: "EVOLUTION",
          active: true,
          isAdmin: true
        }
      });
      console.log('Created Admin user: admin-zapbulk / admin');
    }
  } catch (e) {
    console.error('Error creating admin user:', e);
  }

  await pgClient.end();
  await prisma.$disconnect();
  console.log('Migration complete');
}

migrate();
