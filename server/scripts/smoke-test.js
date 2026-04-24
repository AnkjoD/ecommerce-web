"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
dotenv.config();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const TEST_CUSTOMER = {
    full_name: 'Smoke Test Customer',
    email: 'smoke.customer@test.com',
    password: 'Password123!',
    phone: '0912345678',
};
const SYSTEM_ADMIN = {
    email: 'admin@admin.com',
    password: 'Admin@123',
};
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function saveResponse(filename, data) {
    const dir = path.join(process.cwd(), 'docs', 'api-responses');
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${filename}.json`), JSON.stringify(data, null, 2));
}
async function discover(label, endpoint, token) {
    console.log(`\n🔍 Exploring: ${label} [${endpoint}]`);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        console.log(`   ❌ Discovery failed (Status: ${res.status})`);
        return;
    }
    const data = await res.json();
    saveResponse(label.toLowerCase().replace(/\s+/g, '-'), data);
    const sample = Array.isArray(data) ? data[0] : (data.data && Array.isArray(data.data) ? data.data[0] : data);
    if (sample) {
        console.log(`   ✅ Discovery Success. Sample Keys: [${Object.keys(sample).join(', ')}]`);
        console.log(`   📝 Example saved to docs/api-responses/`);
    }
    else {
        console.log(`   ✅ Discovery Success. (Empty response)`);
    }
}
async function runTest() {
    console.log('🚀 Starting Backend Fortress Discovery & Smoke Test...\n');
    try {
        if (prisma.user) {
            await prisma.user.deleteMany({ where: { email: TEST_CUSTOMER.email } });
        }
        console.log('--- 1. Testing Customer Registration ---');
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_CUSTOMER),
        });
        if (regRes.status === 201) {
            console.log('✅ Customer registered successfully.');
        }
        else {
            console.log('❌ Customer registration failed:', await regRes.text());
        }
        console.log('\n--- 2. Testing Customer Login ---');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_CUSTOMER.email,
                password: TEST_CUSTOMER.password,
            }),
        });
        const loginData = await loginRes.json();
        const customerAccessToken = loginData.access_token;
        if (customerAccessToken) {
            console.log('✅ Customer login successful.');
        }
        else {
            console.log('❌ Customer login failed:', loginData);
        }
        console.log('\n--- 3. API Structure Discovery (Public & Customer) ---');
        await discover('Categories Tree', '/api/categories/tree');
        await discover('Products List', '/api/products');
        if (customerAccessToken) {
            await discover('My Profile', '/api/users/me', customerAccessToken);
        }
        console.log('\n--- 4. Testing Secret Admin Login ---');
        const adminSuccessRes = await fetch(`${BASE_URL}/auth/admin-login-9472`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: SYSTEM_ADMIN.email,
                password: SYSTEM_ADMIN.password,
            }),
        });
        const adminSuccessData = await adminSuccessRes.json();
        const adminAccessToken = adminSuccessData.access_token;
        if (adminAccessToken) {
            console.log('✅ Admin login successful via secret path.');
            console.log('\n--- 5. API Structure Discovery (Admin) ---');
            await discover('Admin Orders List', '/api/admin/orders', adminAccessToken);
            await discover('Admin Users List', '/api/admin/users', adminAccessToken);
        }
        console.log('\n--- 6. Testing Audit Logging ---');
        if (adminAccessToken && prisma.auditLog) {
            await fetch(`${BASE_URL}/api/admin/orders/test-id/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminAccessToken}`
                },
                body: JSON.stringify({ status: 'confirmed' }),
            });
            await sleep(500);
            const latestLog = await prisma.auditLog.findFirst({
                orderBy: { created_at: 'desc' },
            });
            if (latestLog) {
                console.log('✅ Audit Log verified! recorded action:', latestLog.action);
            }
        }
        else {
            console.log('⏭️ Skipping Audit Log verification (Prisma not yet updated or admin not logged in).');
        }
        console.log('\n🌟 DISCOVERY & SMOKE TEST COMPLETED! 🌟');
    }
    catch (error) {
        console.error('\n💥 Unexpected script error:', error);
    }
    finally {
        try {
            await prisma.user.deleteMany({ where: { email: TEST_CUSTOMER.email } });
        }
        catch (e) { }
        await prisma.$disconnect();
        process.exit(0);
    }
}
runTest();
//# sourceMappingURL=smoke-test.js.map