import axios from 'axios';

/**
 * SCRIPT STRESS TEST - KIỂM TRA TRANH CHẤP KHO HÀNG (RACE CONDITION)
 *
 * Mục tiêu: Giả lập 10 yêu cầu đặt hàng gửi đi CÙNG MỘT LÚC.
 * Kết quả mong đợi:
 *   - Chỉ có tối đa số đơn hàng thành công bằng với tồn kho thực tế.
 *   - Các đơn còn lại phải nhận lỗi 400 (Hết hàng).
 *   - Tồn kho reserved_quantity phải tăng chính xác.
 */

const API_URL = 'http://localhost:3000/api'; // Thay đổi port nếu cần
const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Coppy token từ Swagger/Browser
const VARIANT_ID = 'YOUR_VARIANT_ID_HERE'; // ID của sản phẩm chỉ còn 1-2 món trong kho

async function stressTest() {
  console.log('🚀 Bắt đầu Stress Test: Gửi 10 đơn hàng đồng thời...');

  const requests = Array.from({ length: 10 }).map((_, i) => {
    return axios
      .post(
        `${API_URL}/orders`,
        {
          address_id: '"TPCHM"', // ID địa chỉ của bạn
          payment_method: 'cod',
        },
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        },
      )
      .then((res) => ({ status: 'SUCCESS', data: res.data }))
      .catch((err) => ({
        status: 'FAILED',
        message: err.response?.data?.message || err.message,
      }));
  });

  const results = await Promise.all(requests);

  const success = results.filter((r) => r.status === 'SUCCESS').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n--- KẾT QUẢ ---');
  console.log(`✅ Thành công: ${success}`);
  console.log(`❌ Thất bại: ${failed}`);

  if (success > 1) {
    console.log('⚠️ CẢNH BÁO: Có dấu hiệu Race Condition (Bán quá số lượng)!');
  } else {
    console.log(
      '🎉 TUYỆT VỜI: Hệ thống đã chặn thành công việc bán quá số lượng.',
    );
  }
}

stressTest();
