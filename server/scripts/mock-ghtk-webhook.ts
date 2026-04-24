import axios from 'axios';

/**
 * Script để giả lập GHTK gửi Webhook về Server
 * Cách sử dụng: npx tsx scripts/mock-ghtk-webhook.ts <ORDER_ID> <STATUS_ID>
 * status_id: 5 (Delivered), -1 (Cancelled), 3 (Picked)
 */

const ORDER_ID = process.argv[2];
const STATUS_ID = process.argv[3] || '5';
const SERVER_URL = 'http://localhost:4000/api/ghtk/webhook';

if (!ORDER_ID) {
  console.error('❌ Vui lòng cung cấp Order ID (UUID trong database)');
  process.exit(1);
}

const mockData = {
  partner_id: ORDER_ID,
  label_id: 'GHTK.MOCK.123456',
  status_id: Number(STATUS_ID),
  action_time: new Date().toISOString(),
  reason_code: '',
  reason: 'Giao hàng thành công (Giả lập)',
  weight: 0.5,
  fee: 30000,
  pick_money: 0,
  return_part_package: 0
};

async function sendWebhook() {
  console.log(`🚀 Đang gửi Mock Webhook cho đơn ${ORDER_ID} với trạng thái ${STATUS_ID}...`);
  try {
    const response = await axios.post(SERVER_URL, mockData);
    console.log('✅ Kết quả từ Server:', response.data);
  } catch (error: any) {
    console.error('❌ Lỗi khi gửi Webhook:', error.response?.data || error.message);
  }
}

sendWebhook();
