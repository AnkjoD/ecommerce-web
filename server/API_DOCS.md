# 📡 API Documentation — Web Bán Hàng Backend

> **Base URL:** `http://localhost:3000`  
> **Format:** JSON (trừ SSE endpoint của chat)  
> **Auth:** Bearer Token — thêm header `Authorization: Bearer <access_token>`

---

## 📌 Quy ước chung

### Response thành công
```json
// Trả trực tiếp data, không wrapper
{
  "id": "uuid",
  "email": "user@example.com"
}
```

### Response lỗi (NestJS default)
```json
{
  "statusCode": 400,
  "message": "Mô tả lỗi",
  "error": "Bad Request"
}
```

### Phân trang (PaginatedResult)
Các endpoint danh sách trả về:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "total_pages": 10
}
```

### Enum values
| Enum | Values |
|---|---|
| **Role** | `admin`, `customer` |
| **OrderStatus** | `pending`, `confirmed`, `processing`, `shipping`, `delivered`, `cancelled`, `payment_failed` |
| **PaymentMethod** | `vnpay`, `momo`, `cod` |
| **PaymentStatus** | `unpaid`, `paid`, `failed`, `refunded` |
| **DiscountType** | `percent`, `fixed` |

---

## 🔐 Auth — `/auth`

### POST `/auth/register`
Đăng ký tài khoản mới. Tự động đăng nhập sau khi tạo tài khoản.

**Auth:** ❌ Public

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn A",          // string, min 2 ký tự — bắt buộc
  "email": "user@example.com",           // email hợp lệ — bắt buộc
  "password": "StrongPass123!",          // min 8 ký tự, phải có HOA + thường + số — bắt buộc
  "phone": "0901234567",                 // regex VN phone — tùy chọn
  "device_info": "Chrome/Windows 11"    // tên thiết bị — tùy chọn
}
```

**Response `201`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "expires_in": 900
}
```

> `expires_in` = 900 giây = 15 phút. Dùng `refresh_token` để lấy token mới khi hết hạn.

**Lỗi:** `409` Email đã tồn tại

---

### POST `/auth/login`
Đăng nhập bằng email + password.

**Auth:** ❌ Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "device_info": "Chrome/Windows 11"  // tùy chọn
}
```

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "a3f8...",
  "expires_in": 900
}
```

**Lỗi:** `401` Email hoặc mật khẩu không đúng / tài khoản bị khóa

---

### POST `/auth/refresh`
Lấy access_token mới bằng refresh_token (Refresh Token Rotation).

**Auth:** ❌ Public

**Request Body:**
```json
{
  "refresh_token": "a3f8b2c1..."
}
```

**Response `200`:** Giống login — trả TokenPair mới, refresh_token cũ bị thu hồi

**Lỗi:** `401` Refresh token không hợp lệ / đã hết hạn / đã thu hồi

> ⚠️ **Bảo mật:** Nếu dùng refresh_token đã bị thu hồi → hệ thống tự động thu hồi TẤT CẢ token của account (phát hiện token reuse attack).

---

### POST `/auth/logout`
Đăng xuất — thu hồi tất cả refresh token của user.

**Auth:** ✅ Bearer Token

**Request:** Không cần body

**Response `200`:** `null` (hoặc empty)

---

### GET `/auth/me`
Lấy thông tin profile của user đang đăng nhập.

**Auth:** ✅ Bearer Token

**Response `200`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "Nguyễn Văn A",
  "phone": "0901234567",
  "role": "customer",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Lỗi:** `404` User không tồn tại

---

### PATCH `/auth/change-password`
Đổi mật khẩu khi đã biết mật khẩu cũ.

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "old_password": "StrongPass123!",
  "new_password": "NewPassword456!"
}
```

**Response `200`:** `null`

**Lỗi:** `400` Mật khẩu cũ không chính xác, `404` User không tồn tại

---

### POST `/auth/forgot-password`
Gửi email chứa link đặt lại mật khẩu.

**Auth:** ❌ Public

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response `200`:** `null`

> ⚠️ **Luôn trả `200`** dù email không tồn tại — để tránh lộ thông tin user.  
> Token reset hết hạn sau **1 giờ**.

---

### POST `/auth/reset-password`
Đặt lại mật khẩu bằng token từ email.

**Auth:** ❌ Public

**Request Body:**
```json
{
  "token": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5...",  // 64 ký tự hex từ email
  "new_password": "NewPassword456!"
}
```

**Response `200`:** `null`

**Lỗi:** `400` Token không hợp lệ hoặc đã hết hạn

---

## 🛍️ Products — `/api/products`

> **Kiến trúc sản phẩm (quan trọng):**
> - **Metadata** (tên, mô tả, ảnh, brand, category) → lưu **MongoDB** (chưa implement)
> - **Variants** (SKU, giá, màu, size, tồn kho) → lưu **PostgreSQL** qua Prisma
>
> Hiện tại API trả về `ProductVariant` từ PostgreSQL. Sau khi tích hợp MongoDB sẽ có full product info.

### GET `/api/products`
Lấy danh sách variant (có filter + phân trang).

**Auth:** ❌ Public

**Query Params (tất cả optional):**
```
q         (string)           — tìm theo SKU
category  (string)           — tên danh mục (chưa hoạt động, cần MongoDB)
brand     (string)           — thương hiệu (chưa hoạt động, cần MongoDB)
min_price (number)           — giá tối thiểu
max_price (number)           — giá tối đa
sort      ('price'|'created_at') — mặc định: created_at
order     ('asc'|'desc')         — mặc định: desc
page      (number, default 1)
limit     (number, default 20, max 100)
```

**Response `200`:** PaginatedResult<ProductVariant>
```json
{
  "data": [
    {
      "id": "uuid",
      "product_id": "mongo-object-id-or-slug",
      "sku": "SHIRT-RED-M",
      "color": "Đỏ",
      "size": "M",
      "price": "299000",
      "stock_quantity": 100,
      "reserved_quantity": 5,
      "image_url": "https://...",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

---

### GET `/api/products/:id`
Lấy chi tiết một ProductVariant theo UUID.

**Auth:** ❌ Public

**Params:** `id` — UUID của variant

**Response `200`:** ProductVariant object (xem ví dụ trên)

**Lỗi:** `404` Sản phẩm không tồn tại

---

### GET `/api/products/by-product/:productId`
Lấy **tất cả variant** của một sản phẩm theo MongoDB `product_id`.

**Auth:** ❌ Public

**Params:** `productId` — MongoDB ObjectId (hoặc slug tạm thời)

**Response `200`:** ProductVariant[] (tất cả màu/size của sản phẩm)

> Dùng cho trang chi tiết sản phẩm: frontend lấy `productId` từ MongoDB,  
> gọi API này để render bộ chọn màu/size và giá tương ứng.

---

### POST `/api/products`
[ADMIN] Tạo sản phẩm mới cùng với variants.

**Auth:** ✅ Bearer + Role: `admin`

**Request Body:**
```json
{
  "name": "iPhone 15 Pro Max",
  "slug": "iphone-15-pro-max",
  "category_path": ["Điện tử", "Điện thoại", "Apple"],
  "brand": "Apple",
  "description": {
    "short": "iPhone cao cấp nhất 2024",
    "full": "Mô tả đầy đủ...",
    "html": "<p>Mô tả HTML...</p>"
  },
  "attributes": { "ram": "8GB", "storage": "256GB" },
  "tags": ["flagship", "ios"],
  "media": {
    "images": ["https://cdn.../img1.jpg"],
    "thumbnail": "https://cdn.../thumb.jpg",
    "video_url": "https://youtube.com/..."
  },
  "seo": {
    "title": "Mua iPhone 15 Pro Max giá tốt",
    "meta_desc": "iPhone 15 Pro Max chính hãng...",
    "keywords": ["iphone", "apple"]
  },
  "variants": [
    { "sku": "IP15PM-BLK-256", "color": "Đen", "price": 33990000, "stock_quantity": 50 },
    { "sku": "IP15PM-WHT-256", "color": "Trắng", "price": 33990000, "stock_quantity": 30, "image_url": "https://..." }
  ]
}
```

**Response `201`:** ProductVariant[] (các variant vừa tạo)

**Lỗi:** `409` SKU đã tồn tại

---

### PATCH `/api/products/:id`
[ADMIN] Cập nhật một ProductVariant.

**Auth:** ✅ Bearer + Role: `admin`

**Params:** `id` — UUID của variant

**Request Body:** (chỉ cần truyền field muốn thay đổi, trong `variants[0]`)
```json
{
  "variants": [
    { "price": 31990000, "stock_quantity": 20 }
  ],
  "status": "archived"
}
```

**Response `200`:** ProductVariant đã cập nhật

**Lỗi:** `404` Không tồn tại, `409` SKU mới bị trùng

---

### DELETE `/api/products/:id`
[ADMIN] Xóa một ProductVariant.

**Auth:** ✅ Bearer + Role: `admin`

**Params:** `id` — UUID của variant

**Response `204`:** Không có body

**Lỗi:** `404` Không tồn tại, `400/500` nếu variant đang có trong OrderItem

---

## 🛒 Cart — `/api/cart`

> ⚠️ Các endpoint này hiện dùng decorator `@CurrentUser('id')` — đang có bug (phải là `@GetCurrentUserId()`). Xem TODO trong carts.controller.ts.

### GET `/api/cart`
Lấy giỏ hàng hiện tại.

**Auth:** ✅ Bearer Token

**Response `200`:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "items": [
    {
      "id": "uuid",
      "variant_id": "uuid",
      "quantity": 2,
      "variant": {
        "id": "uuid",
        "sku": "SHIRT-RED-M",
        "price": "299000",
        "color": "Đỏ",
        "size": "M",
        "stock_quantity": 100
      }
    }
  ]
}
```

---

### POST `/api/cart/items`
Thêm sản phẩm vào giỏ.

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "variant_id": "uuid-của-variant",
  "quantity": 2
}
```

**Response `201`:** Cart đã cập nhật

**Lỗi:** `400` Hàng không đủ tồn kho

---

### PATCH `/api/cart/items/:variantId`
Cập nhật số lượng item trong giỏ.

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "quantity": 3  // số lượng mới (= 0 để xóa)
}
```

**Response `200`:** Cart đã cập nhật

---

### DELETE `/api/cart/items/:variantId`
Xóa một item khỏi giỏ hàng.

**Auth:** ✅ Bearer Token

**Response `204`:** Không có body

---

## 📦 Orders — `/api/orders`

### POST `/api/orders`
Tạo đơn hàng từ toàn bộ giỏ hàng hiện tại.

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "address_id": "uuid-của-địa-chỉ-giao-hàng",
  "payment_method": "vnpay",              // "vnpay" | "momo" | "cod"
  "coupon_code": "SUMMER2024"             // tùy chọn
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "order_code": "ORD-LQKMZ4P-AB3F",
  "status": "pending",
  "payment_status": "unpaid",
  "payment_method": "vnpay",
  "subtotal": "598000",
  "discount_amount": "59800",
  "shipping_fee": "0",
  "total": "538200",
  "address_id": "uuid",
  "user_id": "uuid",
  "created_at": "2024-01-15T10:30:00.000Z",
  "items": [
    {
      "id": "uuid",
      "variant_id": "uuid",
      "product_name": "SHIRT-RED-M",
      "variant_info": "Đỏ / M",
      "unit_price": "299000",
      "quantity": 2,
      "subtotal": "598000"
    }
  ]
}
```

**Lỗi:**
- `400` Giỏ hàng trống
- `400` Sản phẩm X chỉ còn N sản phẩm trong kho
- `400` Mã giảm giá không hợp lệ / hết hạn / hết lượt

> **Luồng thanh toán online:**  
> 1. `POST /api/orders` → nhận `order.id`  
> 2. `POST /api/payments/vnpay/create/{order.id}` → nhận `paymentUrl`  
> 3. Redirect user đến `paymentUrl`  
> 4. VNPay callback về `GET /api/payments/vnpay/callback`

---

### GET `/api/orders?page=1&limit=10`
Lấy danh sách đơn hàng của user đang đăng nhập.

**Auth:** ✅ Bearer Token

**Query Params:**
```
page  (number, default 1)
limit (number, default 10)
```

**Response `200`:** PaginatedResult<Order>

---

### GET `/api/orders/:id`
Lấy chi tiết một đơn hàng.

**Auth:** ✅ Bearer Token (chỉ xem được đơn của mình)

**Response `200`:**
```json
{
  "id": "uuid",
  "order_code": "ORD-LQKMZ4P-AB3F",
  "status": "confirmed",
  "payment_status": "paid",
  "items": [...],
  "payment": {
    "id": "uuid",
    "provider": "vnpay",
    "status": "paid",
    "paid_at": "2024-01-15T10:35:00.000Z"
  },
  "address": {
    "id": "uuid",
    "full_name": "Nguyễn Văn A",
    "phone": "0901234567",
    "address": "123 Đường ABC"
  }
}
```

**Lỗi:** `403` Không có quyền, `404` Không tìm thấy

---

### POST `/api/orders/:id/cancel`
User tự hủy đơn hàng của mình.

**Auth:** ✅ Bearer Token

**Response `204`:** Không có body

**Lỗi:** `400` Không thể hủy đơn ở trạng thái "shipping" / "delivered"

> Chỉ hủy được khi status là `pending` hoặc `confirmed`.  
> Nếu đã thanh toán → tự động hoàn tiền (refund).

---

### GET `/api/orders/admin/all?page=1&limit=20`
[ADMIN] Lấy tất cả đơn hàng trong hệ thống.

**Auth:** ✅ Bearer + Role: `admin`

**Response `200`:** PaginatedResult với thêm `user: { id, full_name, email }`

---

### PATCH `/api/orders/admin/:id/status`
[ADMIN] Cập nhật trạng thái đơn hàng.

**Auth:** ✅ Bearer + Role: `admin`

**Request Body:**
```json
{
  "status": "shipping"  // OrderStatus enum
}
```

**Response `200`:** Order đã cập nhật

**Luồng trạng thái:**
```
pending → confirmed → processing → shipping → delivered
                                             ↘ cancelled
```

> Khi chuyển sang `delivered` với COD: `payment_status` tự đổi thành `paid`, tồn kho thật giảm.

---

## 💳 Payments — `/api/payments`

### POST `/api/payments/vnpay/create/:orderId`
Tạo link thanh toán VNPay.

**Auth:** ✅ Bearer Token

**Params:** `orderId` — UUID đơn hàng

**Response `200`:**
```
"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=53820000&..."
```
(string URL, không phải JSON)

**Lỗi:** `400` Đơn hàng không tồn tại

---

### GET `/api/payments/vnpay/callback`
Callback từ VNPay (VNPay tự gọi endpoint này sau thanh toán).

**Auth:** ❌ Public (VNPay gọi trực tiếp)

**Query Params:** Tất cả params VNPay trả về (`vnp_ResponseCode`, `vnp_SecureHash`, ...)

**Response `200`:** Payment record đã cập nhật

> ⚠️ **Frontend KHÔNG gọi endpoint này trực tiếp.** VNPay redirect/callback tự động.  
> Signature sẽ được verify để chống giả mạo.

---

## 📍 Addresses — `/api/addresses`

> ⚠️ Các endpoint này đang dùng `@CurrentUser('id')` decorator không tồn tại. Cần sửa lại thành `@GetCurrentUserId()`.

### GET `/api/addresses`
Lấy danh sách địa chỉ của user.

**Auth:** ✅ Bearer Token

**Response `200`:** Address[]

---

### POST `/api/addresses`
Thêm địa chỉ mới.

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn A",
  "phone": "0901234567",
  "address": "123 Đường ABC, Phường XYZ",
  "city": "Hồ Chí Minh",
  "district": "Quận 1",
  "is_default": false
}
```

**Response `201`:** Address mới tạo

---

### PATCH `/api/addresses/:id`
Cập nhật địa chỉ.

**Auth:** ✅ Bearer Token

**Request Body:** Partial<CreateAddressDto>

**Response `200`:** Address đã cập nhật

---

### PATCH `/api/addresses/:id/default`
Đặt địa chỉ làm mặc định.

**Auth:** ✅ Bearer Token

**Response `200`:** Address đã cập nhật

---

### DELETE `/api/addresses/:id`
Xóa địa chỉ.

**Auth:** ✅ Bearer Token

**Response `204`:** Không có body

---

## 💬 Chat AI — `/api/chat`

> ⚠️ **CHƯA HOẠT ĐỘNG** — Cần cấu hình `OPENAI_API_KEY` + MongoDB để bật tính năng AI.  
> Hiện tại trả về stub message thông báo chưa sẵn sàng.

### POST `/api/chat/sessions`
Tạo phiên chat mới.

**Auth:** ❌ Public (khách vãng lai cũng chat được)

**Response `201`:**
```json
{
  "id": "session-1234567890-abc123",
  "user_id": null,
  "messages": [],
  "context": {},
  "intent_history": [],
  "resolved": false,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

---

### POST `/api/chat/sessions/:id/messages`
Gửi tin nhắn và nhận phản hồi AI (Server-Sent Events).

**Auth:** ❌ Public

**Params:** `id` — session ID

**Request Body:**
```json
{
  "message": "Cho tôi xem áo thun nam dưới 500k"
}
```

**Response:** SSE stream (`Content-Type: text/event-stream`)
```
data: {"delta": "Tôi "}

data: {"delta": "có "}

data: {"delta": "thể "}

data: {"done": true}
```

**Cách đọc SSE ở frontend:**
```javascript
const eventSource = new EventSource('/api/chat/sessions/:id/messages');
// Hoặc dùng fetch với ReadableStream cho POST request
```

---

### GET `/api/chat/sessions/:id/history`
Lấy lịch sử chat của một session.

**Auth:** ✅ Bearer Token

**Response `200`:**
```json
{
  "messages": [
    { "role": "user", "content": "Cho tôi xem áo thun", "timestamp": "..." },
    { "role": "assistant", "content": "Tôi gợi ý...", "timestamp": "..." }
  ],
  "context": {
    "last_message_at": "2024-01-15T10:31:00.000Z",
    "last_products": ["mongo-id-1", "mongo-id-2"]
  },
  "resolved": false
}
```

---

## 🔑 Hướng dẫn Auth cho Frontend

### Lưu token
```javascript
// Sau login/register:
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);
```

### Gửi request có auth
```javascript
fetch('/api/orders', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json',
  }
});
```

### Tự động refresh khi hết hạn (401)
```javascript
async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    }
  });

  if (response.status === 401) {
    // Token hết hạn → refresh
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: localStorage.getItem('refresh_token') }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      // Retry request gốc
      return fetchWithAuth(url, options);
    } else {
      // Refresh cũng hết hạn → logout
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  return response;
}
```

---

## 📋 Trạng thái triển khai

| Module | Controller | Service | Status |
|---|---|---|---|
| Auth | ✅ Đầy đủ | ✅ Đầy đủ | 🟢 Ready |
| Products | ✅ Đầy đủ | ✅ Đầy đủ | 🟢 Ready (Variant CRUD hoàn chỉnh) |
| Cart | ⚠️ Bug decorator | ✅ Đầy đủ | 🟡 Partial |
| Orders | ✅ Đầy đủ | ✅ Đầy đủ | 🟢 Ready |
| Payments | ✅ VNPay | ✅ VNPay | 🟢 Ready |
| Addresses | ⚠️ Bug decorator | ✅ Đầy đủ | 🟡 Partial |
| Chat AI | ✅ Cấu trúc có | ⚠️ AI disabled | 🔴 AI chưa sẵn sàng |
