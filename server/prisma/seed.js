"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const faker_1 = require("@faker-js/faker");
dotenv.config();
const SIZE = process.env.SEED_SIZE || 'medium';
const CONFIG_MAP = {
    small: { CATEGORIES: 3, PRODUCTS_PER_CAT: 5, COUPONS: 5 },
    medium: { CATEGORIES: 6, PRODUCTS_PER_CAT: 15, COUPONS: 15 },
    large: { CATEGORIES: 8, PRODUCTS_PER_CAT: 50, COUPONS: 30 },
};
const CONFIG = CONFIG_MAP[SIZE] || CONFIG_MAP.medium;
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const toSlug = (text) => text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${faker_1.faker.string.alphanumeric(4)}`;
async function clearDatabase() {
    console.log('♻️ Đang dọn dẹp dữ liệu cũ...');
    await prisma.review.deleteMany().catch(() => { });
    await prisma.orderCoupon.deleteMany().catch(() => { });
    await prisma.orderItem.deleteMany().catch(() => { });
    await prisma.payment.deleteMany().catch(() => { });
    await prisma.order.deleteMany().catch(() => { });
    await prisma.auditLog.deleteMany().catch(() => { });
    await prisma.cartItem.deleteMany().catch(() => { });
    await prisma.cart.deleteMany().catch(() => { });
    await prisma.productVariant.deleteMany().catch(() => { });
    await prisma.product.deleteMany().catch(() => { });
    await prisma.category.deleteMany().catch(() => { });
    await prisma.coupon.deleteMany().catch(() => { });
    await prisma.user.deleteMany({ where: { role: 'admin' } }).catch(() => { });
}
async function seedAdmin() {
    console.log('👤 Đang thiết lập tài khoản Admin mới...');
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.create({
        data: {
            email: 'homura@madoka.com',
            full_name: 'Akemi Homura',
            password_hash: hashedPassword,
            role: 'admin',
            is_active: true,
        },
    });
    console.log(`✅ Admin created: ${admin.email}`);
}
async function seedCategories() {
    console.log('📂 Đang tạo danh mục hàng hóa...');
    const categories = [
        { name: 'Giày Nam', sub: ['Giày Chạy Bộ', 'Giày Sneakers', 'Giày Tây'] },
        { name: 'Giày Nữ', sub: ['Giày Cao Gót', 'Sandal', 'Sneaker Nữ'] },
        { name: 'Giày Trẻ Em', sub: ['Giày Đi Học', 'Giày Thể Thao'] },
        { name: 'Phụ Kiện', sub: ['Tất & Vớ', 'Dây Giày', 'Vệ Sinh Giày'] },
    ];
    const createdCats = [];
    for (const cat of categories) {
        const parent = await prisma.category.create({
            data: {
                name: cat.name,
                slug: toSlug(cat.name),
                image_url: faker_1.faker.image.url(),
                is_active: true,
            },
        });
        createdCats.push(parent);
        for (const subName of cat.sub) {
            const sub = await prisma.category.create({
                data: {
                    name: subName,
                    slug: toSlug(subName),
                    parent_id: parent.id,
                    image_url: faker_1.faker.image.url(),
                    is_active: true,
                },
            });
            createdCats.push(sub);
        }
    }
    return createdCats;
}
async function seedProducts(categories) {
    console.log('👟 Đang tạo sản phẩm và biến thể...');
    const subCategories = categories.filter((c) => c.parent_id !== null);
    for (const cat of subCategories) {
        for (let i = 0; i < CONFIG.PRODUCTS_PER_CAT; i++) {
            const productName = `${faker_1.faker.commerce.productAdjective()} ${faker_1.faker.commerce.productName()}`;
            const product = await prisma.product.create({
                data: {
                    category_id: cat.id,
                    name: productName,
                    slug: toSlug(productName),
                    brand: faker_1.faker.helpers.arrayElement([
                        'Nike',
                        'Adidas',
                        'Jordan',
                        'Puma',
                        'Vans',
                        'Converse',
                    ]),
                    status: 'active',
                    description: {
                        short: faker_1.faker.commerce.productDescription(),
                        long: faker_1.faker.lorem.paragraphs(3),
                    },
                    attributes: {
                        material: 'Leather/Mesh',
                        origin: 'Vietnam',
                    },
                    media: {
                        images: [faker_1.faker.image.url(), faker_1.faker.image.url()],
                        thumbnail: faker_1.faker.image.url(),
                    },
                    category_path: [cat.name],
                },
            });
            const colors = ['Black', 'White', 'Red', 'Blue', 'Grey'];
            const sizes = ['38', '39', '40', '41', '42', '43'];
            const numVariants = faker_1.faker.number.int({ min: 2, max: 4 });
            for (let j = 0; j < numVariants; j++) {
                const price = parseFloat(faker_1.faker.commerce.price({ min: 500000, max: 5000000 }));
                const hasDiscount = faker_1.faker.datatype.boolean(0.7);
                const priceBeforeDiscount = hasDiscount
                    ? price +
                        Math.round(price * faker_1.faker.number.float({ min: 0.1, max: 0.3 }))
                    : null;
                await prisma.productVariant.create({
                    data: {
                        product_id: product.id,
                        sku: `${product.brand?.substring(0, 3).toUpperCase()}-${faker_1.faker.string
                            .alphanumeric(6)
                            .toUpperCase()}`,
                        color: faker_1.faker.helpers.arrayElement(colors),
                        size: faker_1.faker.helpers.arrayElement(sizes),
                        price,
                        price_before_discount: priceBeforeDiscount,
                        stock_quantity: faker_1.faker.number.int({ min: 10, max: 100 }),
                        sold_count: faker_1.faker.number.int({ min: 0, max: 500 }),
                        view_count: faker_1.faker.number.int({ min: 100, max: 3000 }),
                        is_active: true,
                        image_url: faker_1.faker.image.url(),
                    },
                });
            }
        }
    }
}
async function seedCoupons() {
    console.log('🎟️ Đang tạo mã giảm giá...');
    for (let i = 0; i < CONFIG.COUPONS; i++) {
        const isPercent = faker_1.faker.datatype.boolean();
        await prisma.coupon.create({
            data: {
                code: faker_1.faker.string.alphanumeric(8).toUpperCase(),
                discount_type: isPercent ? 'percent' : 'fixed',
                discount_value: isPercent
                    ? faker_1.faker.number.int({ min: 5, max: 50 })
                    : faker_1.faker.number.int({ min: 50000, max: 200000 }),
                min_order_value: faker_1.faker.number.int({ min: 100000, max: 1000000 }),
                usage_limit: faker_1.faker.number.int({ min: 10, max: 100 }),
                is_active: true,
                expires_at: faker_1.faker.date.future(),
            },
        });
    }
}
async function main() {
    try {
        await clearDatabase();
        await seedAdmin();
        const createdCategories = await seedCategories();
        await seedProducts(createdCategories);
        await seedCoupons();
        console.log('\n🌟 SEEDING HOÀN TẤT! 🌟');
    }
    catch (error) {
        console.error('❌ Lỗi trong quá trình Seeding:', error);
        throw error;
    }
}
main()
    .catch(() => {
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map