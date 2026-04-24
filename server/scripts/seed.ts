import { PrismaClient, Category } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

// ─── Cấu hình kích thước dữ liệu ──────────────────────────────────────────────
const SIZE = process.env.SEED_SIZE || 'medium';
interface SeedConfig {
  CATEGORIES: number;
  PRODUCTS_PER_CAT: number;
  COUPONS: number;
}
const CONFIG_MAP: Record<string, SeedConfig> = {
  small: { CATEGORIES: 3, PRODUCTS_PER_CAT: 5, COUPONS: 5 },
  medium: { CATEGORIES: 6, PRODUCTS_PER_CAT: 15, COUPONS: 15 },
  large: { CATEGORIES: 8, PRODUCTS_PER_CAT: 50, COUPONS: 30 },
};
const CONFIG = CONFIG_MAP[SIZE] || CONFIG_MAP.medium;

// ─── Khởi tạo Prisma ──────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper tạo Slug
const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${faker.string.alphanumeric(4)}`;

async function clearDatabase() {
  console.log('♻️ Đang dọn dẹp dữ liệu cũ...');
  // Xóa theo thứ tự ngược để tránh lỗi Foreign Key
  await prisma.review.deleteMany().catch(() => {});
  await prisma.orderCoupon.deleteMany().catch(() => {});
  await prisma.orderItem.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.order.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.cartItem.deleteMany().catch(() => {});
  await prisma.cart.deleteMany().catch(() => {});
  await prisma.productVariant.deleteMany().catch(() => {});
  await prisma.product.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await prisma.coupon.deleteMany().catch(() => {});
  await prisma.user.deleteMany({ where: { role: 'admin' } }).catch(() => {});
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

async function seedCategories(): Promise<Category[]> {
  console.log('📂 Đang tạo danh mục hàng hóa...');
  const categories = [
    { name: 'Giày Nam', sub: ['Giày Chạy Bộ', 'Giày Sneakers', 'Giày Tây'] },
    { name: 'Giày Nữ', sub: ['Giày Cao Gót', 'Sandal', 'Sneaker Nữ'] },
    { name: 'Giày Trẻ Em', sub: ['Giày Đi Học', 'Giày Thể Thao'] },
    { name: 'Phụ Kiện', sub: ['Tất & Vớ', 'Dây Giày', 'Vệ Sinh Giày'] },
  ];

  const createdCats: Category[] = [];

  for (const cat of categories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: toSlug(cat.name),
        image_url: faker.image.url(),
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
          image_url: faker.image.url(),
          is_active: true,
        },
      });
      createdCats.push(sub);
    }
  }
  return createdCats;
}

async function seedProducts(categories: Category[]) {
  console.log('👟 Đang tạo sản phẩm RAG-ready (Nike, Adidas)...');

  const productTemplates = [
    {
      brand: 'Nike',
      name: 'Air Zoom Pegasus 40',
      category: 'Giày Chạy Bộ',
      description: {
        short: 'Đôi giày "ngựa chiến" bền bỉ cho mọi cự ly chạy bộ hàng ngày.',
        long: 'Nike Air Zoom Pegasus 40 kế thừa di sản của dòng Pegasus với sự kết hợp giữa công nghệ React Foam siêu nhẹ và 2 đơn vị Zoom Air (mũi và gót). Sự kết hợp này tạo ra cảm giác êm ái nhưng vẫn cực kỳ phản hồi, giúp tiết kiệm năng lượng cho runner. Upper được làm từ lưới kỹ thuật giúp thoáng khí tối đa cho các buổi chạy dài.',
      },
      specs: { material: 'Engineered Mesh', tech: 'React Foam, Zoom Air', terrain: 'Road' },
    },
    {
      brand: 'Adidas',
      name: 'Ultraboost Light',
      category: 'Giày Chạy Bộ',
      description: {
        short: 'Trải nghiệm sự êm ái đỉnh cao với dòng Ultraboost nhẹ nhất từ trước đến nay.',
        long: 'Adidas Ultraboost Light sử dụng công nghệ Light Boost mới, nhẹ hơn 30% so với thế hệ trước nhưng vẫn giữ được độ hoàn trả năng lượng tuyệt vời. Hệ thống Linear Energy Push (LEP) giúp tăng cường độ ổn định, trong khi Primeknit+ ôm sát bàn chân như một đôi tất. Đây là lựa chọn số 1 cho các buổi chạy phục hồi và đi lại hàng ngày.',
      },
      specs: { material: 'Primeknit+', tech: 'Light Boost, Continental Rubber', terrain: 'Road' },
    },
    {
      brand: 'Nike',
      name: 'Alphafly 3 "Proto"',
      category: 'Giày Chạy Bộ',
      description: {
        short: 'Kẻ phá vỡ mọi kỷ lục Marathon với thiết kế khí động học đỉnh cao.',
        long: 'Nike Alphafly 3 là đôi giày siêu hạng dành cho các cuộc đua. Với đệm ZoomX dày tối đa, tấm sợi carbon Flyplate toàn chiều dài và hai túi khí Air Zoom khổng lồ ở mũi chân, nó giúp runner đẩy nhanh tốc độ mà ít tốn sức nhất. Phiên bản "Proto" mang thiết kế tối giản, tập trung hoàn toàn vào hiệu suất.',
      },
      specs: { material: 'Atomknit 3.0', tech: 'ZoomX Foam, Carbon Flyplate', terrain: 'Road Racing' },
    },
    {
        brand: 'Adidas',
        name: 'Samba OG',
        category: 'Giày Sneakers',
        description: {
            short: 'Biểu tượng phong cách đường phố không bao giờ lỗi mốt.',
            long: 'Được thiết kế ban đầu cho bóng đá trong nhà, Adidas Samba OG đã trở thành một biểu tượng thời trang toàn cầu. Với thân giày bằng da mềm, viền chữ T bằng da lộn đặc trưng và đế cao su gum, đôi giày mang lại vẻ đẹp cổ điển, tối giản nhưng cực kỳ tinh tế.',
        },
        specs: { material: 'Full Grain Leather, Suede', tech: 'Gum Rubber Sole', terrain: 'Casual' },
    }
  ];

  for (const template of productTemplates) {
    const cat = categories.find(c => c.name === template.category);
    if (!cat) continue;

    const product = await prisma.product.create({
      data: {
        category_id: cat.id,
        name: template.name,
        slug: toSlug(template.name),
        brand: template.brand,
        status: 'active',
        description: template.description,
        attributes: template.specs,
        media: {
          images: [faker.image.url(), faker.image.url()],
          thumbnail: faker.image.url(),
        },
        category_path: [cat.name],
      },
    });

    const colors = ['Black', 'White', 'Cloud White', 'Solar Red', 'Deep Blue'];
    const sizes = ['38', '39', '40', '41', '42', '43', '44'];
    const numVariants = 3;

    for (let j = 0; j < numVariants; j++) {
      const price = parseFloat(faker.commerce.price({ min: 2000000, max: 6000000 }));
      const hasDiscount = faker.datatype.boolean(0.5);
      const priceBeforeDiscount = hasDiscount ? price * 1.2 : null;

      await prisma.productVariant.create({
        data: {
          product_id: product.id,
          sku: `${template.brand.substring(0, 3).toUpperCase()}-${faker.string.alphanumeric(8).toUpperCase()}`,
          color: faker.helpers.arrayElement(colors),
          size: sizes[j % sizes.length],
          price,
          price_before_discount: priceBeforeDiscount,
          weight: faker.helpers.arrayElement([300, 350, 400, 450]), // Grams for GHTK
          stock_quantity: faker.number.int({ min: 20, max: 50 }),
          is_active: true,
          image_url: faker.image.url(),
        },
      });
    }
  }
}

async function seedCoupons() {
  console.log('🎟️ Đang tạo mã giảm giá...');
  for (let i = 0; i < CONFIG.COUPONS; i++) {
    const isPercent = faker.datatype.boolean();
    await prisma.coupon.create({
      data: {
        code: faker.string.alphanumeric(8).toUpperCase(),
        discount_type: isPercent ? 'percent' : 'fixed',
        discount_value: isPercent
          ? faker.number.int({ min: 5, max: 50 })
          : faker.number.int({ min: 50000, max: 200000 }),
        min_order_value: faker.number.int({ min: 100000, max: 1000000 }),
        usage_limit: faker.number.int({ min: 10, max: 100 }),
        is_active: true,
        expires_at: faker.date.future(),
      },
    });
  }
}

async function seedReviews() {
    console.log('💬 Đang tạo đánh giá sản phẩm (Insightful Reviews for RAG)...');
    
    // Lấy một số user và product để tạo review
    const users = await prisma.user.findMany({ where: { role: 'customer' }, take: 5 });
    const products = await prisma.product.findMany({ take: 5 });
    
    if (users.length === 0) {
        // Tạo thêm user nếu cần
        for (let i = 0; i < 5; i++) {
            const user = await prisma.user.create({
                data: {
                    email: faker.internet.email(),
                    full_name: faker.person.fullName(),
                    password_hash: await bcrypt.hash('User@123', 10),
                    role: 'customer'
                }
            });
            users.push(user);
        }
    }

    const reviewTemplates = [
        "Giày rất nhẹ và êm, cảm nhận được độ nảy khi chạy nhanh. Rất đáng đồng tiền bát gạo.",
        "Màu sắc bên ngoài đẹp hơn trong ảnh. Tuy nhiên form hơi ôm, ai chân bè nên tăng 1 size.",
        "Đã chạy thử 10km, đế bền, độ bám trên đường ướt tốt. Công nghệ bọt mới rất ấn tượng.",
        "Phong cách classic, phối đồ cực dễ. Đế cao su gum cho cảm giác rất bám sàn.",
        "Mũi giày hơi cứng lúc đầu, nhưng sau vài ngày đi thì rất thoải mái. Thoáng khí tuyệt vời."
    ];

    for (const product of products) {
        // Tạo một order giả định để review có verified status
        const user = faker.helpers.arrayElement(users);
        
        let address = await prisma.address.findFirst({
            where: { user_id: user.id, is_default: true }
        });

        if (!address) {
            address = await prisma.address.create({
                data: {
                    user_id: user.id,
                    recipient_name: user.full_name,
                    phone: '0901234567',
                    province: 'TP. Hồ Chí Minh',
                    district: 'Quận 1',
                    ward: 'Phường Bến Nghé',
                    street: '123 Lê Lợi',
                    is_default: true
                }
            });
        }

        const order = await prisma.order.create({
            data: {
                user_id: user.id,
                address_id: address.id,
                order_code: `SEED-ORD-${faker.string.alphanumeric(4).toUpperCase()}`,
                status: 'delivered',
                subtotal: 2000000,
                total: 2030000,
                payment_method: 'cod',
                payment_status: 'paid'
            }
        });

        await prisma.review.create({
            data: {
                user_id: user.id,
                product_id: product.id,
                order_id: order.id,
                rating: faker.helpers.arrayElement([4, 5]),
                comment: faker.helpers.arrayElement(reviewTemplates),
                is_verified: true
            }
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
    await seedReviews();
    console.log('\n🌟 SEEDING HOÀN TẤT VỚI DỮ LIỆU RAG CHẤT LƯỢNG! 🌟');
  } catch (error) {
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
