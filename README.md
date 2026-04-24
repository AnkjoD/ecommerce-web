# 🛒 Homura Shop - Modern E-Commerce Platform

A professional full-stack e-commerce solution designed for performance, scalability, and a premium shopping experience.

---

## 🌟 Key Features

### Customer Storefront
- **Responsive Interface**: Seamless experience across Desktop, Tablet, and Mobile.
- **Premium UI/UX**: Shopee-inspired design with smooth transitions and interactive elements.
- **Advanced Navigation**: Powerful filtering and search capabilities.
- **Instant Variant Management**: Switch between product attributes (colors, sizes) with zero latency.
- **Secure Checkout**: Integrated with popular payment gateways.

### Admin Dashboard
- **Comprehensive Management**: Full control over products, orders, and users.
- **Real-time Analytics**: Monitor shop performance and sales metrics.
- **Role-based Access**: Secure administrative area with JWT-protected routes.

---

## 🚀 Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS + Material UI (MUI)
- **State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn UI (Admin)

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: Secure JWT (Access & Refresh Tokens)
- **Storage**: Cloudinary Integration

---

## 🏗️ Project Structure

```text
.
├── admin/          # Admin Dashboard (React + Shadcn UI)
├── client/         # Customer Frontend (React + MUI)
├── server/         # NestJS Backend API
└── docs/           # Technical Documentation
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v20+)
- PostgreSQL
- Cloudinary Account (for image hosting)

### Environment Configuration
1. Create `.env` files in `server/`, `client/`, and `admin/` based on the provided `.env.example` templates.
2. Configure your database and provider credentials.

### Installation
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Install admin dependencies
cd ../admin && npm install
```

### Database Initialization
```bash
cd server
npx prisma generate
npx prisma db push
```

---

## 🛡️ Security & Performance
- **Data Protection**: Sensitive keys managed via environment variables.
- **Auth**: Secure HttpOnly cookies for session management.
- **Optimization**: Server-side query optimization and frontend lazy loading.

---

© 2026 Homura Shop. Developed for the modern web.
