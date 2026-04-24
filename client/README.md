# 🛍️ Homura Shop - Customer Frontend

The main e-commerce storefront for Homura Shop. Designed for speed, responsiveness, and an exceptional user experience, featuring enriched Shopee-style product interactions.

## 🌟 Key Features
- **Responsive Design**: Optimized for Desktop and Mobile (Shopee-like UI).
- **Advanced Filtering**: URL-driven sidebar filters for products.
- **Instant Variant Switching**: Zero-latency switching between product colors/sizes.
- **Checkout Flow**: Integrated payment gateways (VNPay, MoMo).
- **Customer Profiles**: Order history, address management, and wishlists.

## 🛠️ Tech Stack
- **Framework**: React 19 + Vite
- **UI System**: Material UI (MUI) + Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router 7
- **Icons**: Lucide React + MUI Icons

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

## 🏗️ Folder Structure
- `src/pages/ProductDetail`: Advanced product view with variant logic.
- `src/components/ProductBox`: Grid and list view product cards.
- `src/utils/http.ts`: Configured Axios instance with automatic token handling.
- `src/constants`: Application-wide settings and URLs.
