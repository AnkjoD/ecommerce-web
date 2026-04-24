import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

dotenv.config();

const MAX_RECORDS = 100;
const CSV_FILE_PATH = path.join(process.cwd(), '..', 'eCommerce-dataset-samples', 'shopee-products.csv');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function slugify(text: string) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function safeJsonParse(data: any, fallback: any = {}) {
  if (!data || data === 'null' || data === 'None' || data === '') return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    try {
      const fixed = data.replace(/""/g, '"');
      return JSON.parse(fixed);
    } catch(e2) {
      return fallback;
    }
  }
}

// 🧮 Thuật toán Tích Descartes để tạo mọi sự kết hợp biến thể
function getCartesianProduct(arrays: any[][]) {
  return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);
}

async function main() {
  console.log(`\n🚀 [SHOPEE VARIANT MASTER] Đang nạp dữ liệu với cơ chế tạo biến thể thông minh...`);
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ Không tìm thấy file: ${CSV_FILE_PATH}`);
    return;
  }

  console.log('🧹 Đang làm sạch dữ liệu cũ...');
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    quote: '"',
    escape: '"',
  });

  for (let i = 0; i < Math.min(records.length, MAX_RECORDS); i++) {
    const record = records[i];
    try {
      const name = record.title || 'Sản phẩm Shopee';
      const finalPrice = parseFloat(record.final_price) || 0;
      const initialPrice = parseFloat(record.initial_price) || null;
      const stock = parseInt(record.stock) || 100;
      const soldCount = parseInt(record.sold) || 0;
      const ratingAvg = parseFloat(record.rating) || 0;
      const ratingCount = parseInt(record.reviews) || 0;
      const viewCount = parseInt(record.favorite) || 0;
      const brand = record.brand || record.seller_name || 'Generic';

      // 1. Cây danh mục
      const categoryPath = safeJsonParse(record.breadcrumb, []);
      let lastCategoryId: string | null = null;
      for (const catName of (Array.isArray(categoryPath) ? categoryPath : ['Sản phẩm mới'])) {
        const catSlug = slugify(catName);
        const category = await prisma.category.upsert({
          where: { slug: catSlug },
          update: {},
          create: { name: catName, slug: catSlug, parent_id: lastCategoryId }
        });
        lastCategoryId = category.id;
      }

      // 3. 🖼️ Xử lý Media (Images & Video)
      const rawImages = safeJsonParse(record.image, []);
      const images = Array.isArray(rawImages) ? rawImages : [record.image].filter(Boolean);
      const media = {
        images: images.map((img: string) => img.replace('_tn', '')),
        thumbnail: images[0]?.replace('_tn', '') || 'https://via.placeholder.com/500'
      };

      const specsRaw = safeJsonParse(record['Product Specifications'], []);
      const attributes: any = { source: 'SHOPEE' };
      if (Array.isArray(specsRaw)) specsRaw.forEach((s: any) => attributes[s.name] = s.value);

      // 🏷️ Tự động tạo Tags
      const tags = [...new Set([brand, ...(Array.isArray(categoryPath) ? categoryPath : [])])].filter(Boolean);

      // 4. 🧬 TẠO BIẾN THỂ (CARTESIAN PRODUCT)
      const variationGroups = safeJsonParse(record.variations, []);
      let variantsData: any[] = [];

      if (Array.isArray(variationGroups) && variationGroups.length > 0) {
        const optionNames = variationGroups.map(g => g.name || 'Option');
        const optionValues = variationGroups.map(g => Array.isArray(g.variations) ? g.variations : ['Default']);
        
        const combinations = getCartesianProduct(optionValues);
        
        combinations.slice(0, 20).forEach((combo, idx) => {
          const comboArray = Array.isArray(combo) ? combo : [combo];
          const optionsObj: any = {};
          comboArray.forEach((val, cIdx) => {
            optionsObj[optionNames[cIdx]] = val;
          });

          variantsData.push({
            sku: `${slugify(name.substring(0, 10))}-${idx}-${i}-${Math.random().toString(36).substring(2,5)}`,
            price: finalPrice,
            price_before_discount: initialPrice,
            stock_quantity: Math.max(1, Math.floor(stock / Math.min(combinations.length, 20))),
            sold_count: Math.floor(soldCount / Math.min(combinations.length, 20)), // Phân bổ lượt bán
            options: optionsObj,
            image_url: media.thumbnail
          });
        });
      }

      // 5. Lưu sản phẩm
      await prisma.product.create({
        data: {
          name,
          slug: `${slugify(name.substring(0, 50))}-${Date.now()}-${i}`,
          description: { html: record['Product Description'] || '', full: record['Product Description'] || '' },
          attributes,
          media,
          brand,
          tags,
          category_id: lastCategoryId,
          status: 'active',
          rating_avg: ratingAvg,
          rating_count: ratingCount,
          sold_count: soldCount,
          view_count: viewCount,
          variants: {
            create: variantsData.length > 0 ? variantsData : [{
              sku: `${slugify(name.substring(0, 15))}-std-${i}`,
              price: finalPrice,
              stock_quantity: stock || 100,
              sold_count: soldCount,
              options: { type: 'Standard' }
            }]
          }
        }
      });

      console.log(`✅ [${i+1}/${MAX_RECORDS}] Đã nạp + tạo biến thể: ${name.substring(0, 35)}...`);
    } catch (error) {
      console.error(`❌ Lỗi tại sản phẩm ${i}:`, error);
    }
  }
  console.log('\n✨ HOÀN TẤT NẠP DỮ LIỆU BIẾN THỂ!');
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
