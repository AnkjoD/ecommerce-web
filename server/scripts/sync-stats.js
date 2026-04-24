"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
async function bootstrap() {
    console.log('🚀 Bắt đầu quá trình đồng bộ dữ liệu sản phẩm...');
    const connectionString = 'postgresql://postgres:password@localhost:5432/web-ban-hang?schema=public';
    const pool = new pg_1.Pool({ connectionString });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
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
    }
    catch (error) {
        console.error('❌ Lỗi trong quá trình đồng bộ:', error);
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
        process.exit(0);
    }
}
bootstrap();
//# sourceMappingURL=sync-stats.js.map