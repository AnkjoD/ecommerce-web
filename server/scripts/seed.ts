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
      tags: ['chạy bộ', 'running', 'tập gym', 'êm chân', 'nhẹ', 'thoáng khí', 'hàng ngày', 'zoom air', 'nike', 'bền'],
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
      tags: ['chạy bộ', 'ultraboost', 'boost', 'êm ái', 'phục hồi', 'thoải mái', 'adidas', 'đi lại hàng ngày', 'nhẹ', 'ôm chân'],
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
      tags: ['marathon', 'đua', 'thi đấu', 'carbon', 'tốc độ', 'kỷ lục', 'racing', 'chuyên nghiệp', 'zoomx', 'đánh marathon'],
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
      tags: ['samba', 'đường phố', 'hot trend', 'thời trang', 'vintage', 'bóng đá trong nhà', 'adidas', 'phối đồ', 'cổ điển', 'đi chơi'],
      description: {
        short: 'Biểu tượng phong cách đường phố không bao giờ lỗi mốt.',
        long: 'Được thiết kế ban đầu cho bóng đá trong nhà, Adidas Samba OG đã trở thành một biểu tượng thời trang toàn cầu. Với thân giày bằng da mềm, viền chữ T bằng da lộn đặc trưng và đế cao su gum, đôi giày mang lại vẻ đẹp cổ điển, tối giản nhưng cực kỳ tinh tế.',
      },
      specs: { material: 'Full Grain Leather, Suede', tech: 'Gum Rubber Sole', terrain: 'Casual' },
    },
    {
      brand: 'Converse',
      name: 'Chuck Taylor All Star Classic',
      category: 'Giày Sneakers',
      tags: ['converse', 'canvas', 'giày vải', 'classic', 'street style', 'cổ điển'],
      description: {
        short: 'Đôi giày vải kinh điển phù hợp với mọi lứa tuổi và phong cách.',
        long: 'Không cần bàn cãi về độ phổ biến của Chuck Taylor All Star. Đôi giày canvas với đế cao su lưu hóa, mũi giày bọc cao su đặc trưng và logo hình ngôi sao ở mắt cá chân là item "must-have" trong bất kỳ tủ đồ nào. Dễ mang, dễ phối, và mang đậm chất cổ điển.',
      },
      specs: { material: 'Canvas', tech: 'Vulcanized Rubber', terrain: 'Casual' },
    },
    {
      brand: 'Clarks',
      name: 'Tilden Cap Oxford',
      category: 'Giày Tây',
      tags: ['giày tây', 'da thật', 'văn phòng', 'công sở', 'lịch sự', 'trang trọng', 'đi làm', 'Oxford', 'formal', 'giá rẻ'],
      description: {
        short: 'Giày Tây da thật lịch lãm dành cho dân công sở và những dịp trang trọng.',
        long: 'Giày Oxford Tilden Cap từ Clarks mang đến vẻ ngoài sang trọng và chuyên nghiệp. Chất liệu da bò cao cấp kết hợp với miếng lót đệm OrthoLite giúp hút ẩm và tạo sự êm ái khi phải đi lại suốt ngày dài trong văn phòng.',
      },
      specs: { material: 'Genuine Leather', tech: 'OrthoLite Footbed', terrain: 'Office/Formal' },
    },
    {
      brand: 'Christian Louboutin',
      name: 'So Kate 120mm',
      category: 'Giày Cao Gót',
      tags: ['cao gót', 'nữ', 'đế đỏ', 'sang chảnh', 'tặng bạn gái', 'tiệc', 'dự sự kiện', 'luxury', 'quyến rũ', 'gót nhọn'],
      description: {
        short: 'Đôi giày cao gót đế đỏ huyền thoại, tôn lên đường cong quyến rũ của phái đẹp.',
        long: 'Mẫu giày So Kate nổi tiếng với phần gót nhọn cao 120mm và phần mũi nhọn tinh tế, kéo dài đôi chân một cách hoàn hảo. Tất nhiên không thể thiếu phần đế sơn mài màu đỏ làm nên thương hiệu của Christian Louboutin.',
      },
      specs: { material: 'Patent Leather', tech: 'Red Lacquered Sole', terrain: 'Party/Event' },
    },
    {
      brand: 'Crocs',
      name: 'Classic Clog',
      category: 'Sandal',
      tags: ['dép', 'sandal', 'đi biển', 'chống nước', 'thoải mái', 'nhẹ', 'mùa hè', 'nhà bếp', 'nhà tắm', 'đi mưa', 'tiện dụng'],
      description: {
        short: 'Dép sục siêu nhẹ, thoải mái đi mưa đi nắng, cực kỳ tiện dụng.',
        long: 'Đôi dép đã làm thay đổi cả thế giới về sự thoải mái. Làm từ chất liệu nhựa tế bào Croslite độc quyền, siêu nhẹ, không thấm nước và dễ dàng vệ sinh. Các lỗ hổng trên thân giúp thông thoáng và thoát nước hoàn hảo, phù hợp cho đi biển hoặc đi bộ hằng ngày.',
      },
      specs: { material: 'Croslite Foam', tech: 'Water-friendly', terrain: 'Casual/Beach' },
    },
    {
      brand: 'Biti\'s',
      name: 'Hunter X 2024',
      category: 'Giày Thể Thao',
      tags: ['giá rẻ', 'học sinh', 'sinh viên', 'trẻ em', 'đi học', 'thể thao', 'bền', 'Việt Nam', 'tiết kiệm', 'dưới 1 triệu'],
      description: {
        short: 'Phiên bản cải tiến mới nhất của Biti\'s Hunter, đậm chất thời trang và thể thao.',
        long: 'Dành cho các bạn nhỏ năng động, Biti\'s Hunter X phiên bản 2024 mang đến công nghệ đệm LiteFoam 2.0 đàn hồi tốt hơn và đế tiếp đất bám dính. Kiểu dáng thời trang, cực kỳ phù hợp cho các hoạt động thể thao học đường.',
      },
      specs: { material: 'Mesh', tech: 'LiteFoam 2.0', terrain: 'School/Sports' },
    },
    {
      brand: 'Crep Protect',
      name: 'Ultimate Shoe Care Kit',
      category: 'Vệ Sinh Giày',
      tags: ['vệ sinh giày', 'làm sạch', 'bảo quản', 'dung dịch', 'bàn chải', 'sneaker care', 'tẩy vết bẩn', 'phụ kiện giày'],
      description: {
        short: 'Bộ kit vệ sinh giày thần thánh giúp đôi giày của bạn luôn như mới.',
        long: 'Bộ sản phẩm vệ sinh giày cao cấp Crep Protect bao gồm dung dịch làm sạch chuyên sâu Cure 100ml, bàn chải lông heo rừng mềm mại (không làm xước da hay vải), và khăn lau microfiber. Giải pháp hoàn hảo để làm sạch mọi vết bẩn cứng đầu trên sneakers.',
      },
      specs: { material: 'Solution + Brush + Cloth', tech: 'Deep Cleaning', terrain: 'Maintenance' },
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
        tags: template.tags ?? [],
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
