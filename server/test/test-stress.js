"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const API_URL = 'http://localhost:3000/api';
const TOKEN = 'YOUR_JWT_TOKEN_HERE';
const VARIANT_ID = 'YOUR_VARIANT_ID_HERE';
async function stressTest() {
    console.log('🚀 Bắt đầu Stress Test: Gửi 10 đơn hàng đồng thời...');
    const requests = Array.from({ length: 10 }).map((_, i) => {
        return axios_1.default
            .post(`${API_URL}/orders`, {
            address_id: '"TPCHM"',
            payment_method: 'cod',
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` },
        })
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
    }
    else {
        console.log('🎉 TUYỆT VỜI: Hệ thống đã chặn thành công việc bán quá số lượng.');
    }
}
stressTest();
//# sourceMappingURL=test-stress.js.map