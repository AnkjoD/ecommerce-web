import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Ecommerce API')
    .setDescription(
      `## API Documentation
      
Full-stack ecommerce với AI recommendation và chatbot tư vấn.

### Authentication
Dùng JWT Bearer token. Lấy token từ \`POST /api/auth/login\`, sau đó click **Authorize** và nhập \`Bearer {token}\`.

### Databases
- **PostgreSQL** — users, orders, payments (via Prisma)
- **MongoDB** — products, AI embeddings, chat sessions (via Mongoose)
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Đăng ký, đăng nhập, refresh token')
    .addTag('Users', 'Hồ sơ người dùng, quản lý admin')
    .addTag('Addresses', 'Địa chỉ giao hàng')
    .addTag('Products', 'Sản phẩm và biến thể')
    .addTag('Categories', 'Danh mục sản phẩm')
    .addTag('Carts', 'Giỏ hàng')
    .addTag('Orders', 'Đặt hàng và lịch sử')
    .addTag('Payments', 'Thanh toán VNPay')
    .addTag('Coupons', 'Mã giảm giá')
    .addTag('Reviews', 'Đánh giá sản phẩm')
    .addTag('Search', 'Tìm kiếm thường và semantic AI')
    .addTag('AI - Recommendation', 'Gợi ý sản phẩm')
    .addTag('AI - Chat', 'Chatbot tư vấn')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
