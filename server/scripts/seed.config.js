"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const SIZE = process.env.SEED_SIZE ?? 'medium';
exports.CONFIG = {
    small: {
        USERS: 20,
        CATEGORIES_ROOT: 4,
        PRODUCTS_PER_CATEGORY: 5,
        VARIANTS_PER_PRODUCT: { min: 1, max: 3 },
        ORDERS_PER_USER: { min: 0, max: 3 },
        REVIEWS_PER_PRODUCT: { min: 0, max: 5 },
        COUPONS: 5,
    },
    medium: {
        USERS: 100,
        CATEGORIES_ROOT: 6,
        PRODUCTS_PER_CATEGORY: 20,
        VARIANTS_PER_PRODUCT: { min: 1, max: 4 },
        ORDERS_PER_USER: { min: 0, max: 8 },
        REVIEWS_PER_PRODUCT: { min: 0, max: 20 },
        COUPONS: 15,
    },
    large: {
        USERS: 500,
        CATEGORIES_ROOT: 6,
        PRODUCTS_PER_CATEGORY: 80,
        VARIANTS_PER_PRODUCT: { min: 1, max: 5 },
        ORDERS_PER_USER: { min: 0, max: 15 },
        REVIEWS_PER_PRODUCT: { min: 0, max: 50 },
        COUPONS: 30,
    },
}[SIZE] ?? {
    USERS: 100,
    CATEGORIES_ROOT: 6,
    PRODUCTS_PER_CATEGORY: 20,
    VARIANTS_PER_PRODUCT: { min: 1, max: 4 },
    ORDERS_PER_USER: { min: 0, max: 8 },
    REVIEWS_PER_PRODUCT: { min: 0, max: 20 },
    COUPONS: 15,
};
//# sourceMappingURL=seed.config.js.map