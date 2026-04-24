# ⚙️ Homura Shop - Backend API

The core logic engine for Homura Shop, built with NestJS for reliability and scalability.

## 🔑 Responsibilities
- **Business Logic**: Orchestrating product, order, and user workflows.
- **Data Persistence**: Managed via Prisma ORM with PostgreSQL.
- **Security**: Robust authentication using JWT and Passport strategies.
- **Integration**: Connectivity with VNPay, Cloudinary, and Logistics providers.

## 🛠️ Tech Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Security**: JWT (Access/Refresh tokens)

## 🏃 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📂 Structure
- `src/auth`: Strategy-based authentication.
- `src/products`: Inventory and variant logic.
- `src/stats`: Business intelligence and reporting.
- `src/payments`: Integrated payment gateway logic.
