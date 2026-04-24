import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.order.findMany({
      select: { status: true, payment_status: true }
    });
    
    const statuses = [...new Set(orders.map(o => o.status))];
    const paymentStatuses = [...new Set(orders.map(o => o.payment_status))];
    
    console.log('--- DB INSPECTION RESULTS ---');
    console.log('Unique Order Statuses:', statuses);
    console.log('Unique Payment Statuses:', paymentStatuses);
    
    const statusCounts = orders.reduce((acc: any, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Status Distribution:', statusCounts);
    
    // Check for exact equality with suspected strings
    const hasPendingMixed = statuses.some(s => s.toLowerCase() === 'pending' && s !== 'pending');
    console.log('Mixed case pending found:', hasPendingMixed);
    
  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
