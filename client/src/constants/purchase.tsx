export const purchaseStatus = {
    inCart: 'inCart',    // Dùng nội bộ cho giỏ hàng - không có trên backend
    all: 'all',
    waitForConfirmation: 'pending',
    confirmed: 'confirmed',
    waitForGetting: 'processing',
    inProgress: 'shipping',
    delivered: 'delivered',
    cancelled: 'cancelled',
    paymentFailed: 'payment_failed'
}