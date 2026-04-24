const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function getDatabaseUrl() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL="([^"]+)"/);
    if (match) return match[1];
  }
  return process.env.DATABASE_URL;
}

const dbUrl = getDatabaseUrl();
const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' }
  });

  if (admins.length > 0) {
    console.log('Found admins:', admins.map(a => a.email).join(', '));
  } else {
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'admin' }
      });
      console.log(`Promoted user ${firstUser.email} to admin.`);
    } else {
      console.log('No users found in database.');
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
