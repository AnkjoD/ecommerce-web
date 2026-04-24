import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Script đồng bộ dữ liệu thống kê (giá, lượt bán, lượt xem) 
 * Sử dụng Prisma Adapter PG tương tự như trong PrismaService của NestJS
 */
async function bootstrap() {
  console.log('🚀 Bắt đầu quá trình đồng bộ dữ liệu sản phẩm...');
  
  const connectionString = 'postgresql://postgres:password@localhost:5432/web-ban-hang?schema=public';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const products = await prisma.product.findMany({
        select: { id: true }
    });

    console.log(`📦 Tìm thấy ${products.length} sản phẩm cần đồng bộ.`);

    for (const p of products) {
        const variants = await prisma.productVariant.findMany({
            where: { product_id: p.id, is_active: true }
        });

        if (variants.length > 0) {
            const prices = variants.map(v => Number(v.price));
            const soldCount = variants.reduce((acc, v) => acc + (v.sold_count || 0), 0);
            const viewCount = variants.reduce((acc, v) => acc + (v.view_count || 0), 0);

            await prisma.product.update({
                where: { id: p.id },
                data: {
                    min_price: Math.min(...prices),
                    max_price: Math.max(...prices),
                    sold_count: soldCount,
                    view_count: viewCount
                }
            });
        }
    }
    
    console.log('✅ Đồng bộ thành công toàn bộ sản phẩm.');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình đồng bộ:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  }
}

bootstrap();
