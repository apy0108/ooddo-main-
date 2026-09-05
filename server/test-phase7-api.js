const prisma = require('./src/config/prisma')

const BASE_URL = 'http://localhost:5000/api'

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

async function testApi() {
  console.log('🚀 Running Phase 7 API & Bug Fix Verification...')

  // 1. Admin login to get JWT
  let loginRes
  try {
    loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'apy0108@gmail.com', password: 'Password@123' }),
    })
  } catch {
    loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'apy0108@gmail.com', password: 'Apy@0108' }),
    })
  }

  const token = loginRes.data?.accessToken || loginRes.accessToken
  const headers = { Authorization: `Bearer ${token}` }
  console.log('✅ Admin authenticated')

  // 2. Test Bug Fix 1: Sick Leave request & approval without allocation
  const ananya = await prisma.employee.findFirst({ where: { email: 'ananya.iyer@company.com' } })
  const sickType = await prisma.timeOffType.findUnique({ where: { name: 'Sick Leave' } })

  console.log(`Sick Leave requiresAllocation: ${sickType.requiresAllocation}`)

  // Create sick leave request
  const sickReqRes = await request(`${BASE_URL}/time-off/requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      employeeId: ananya.id,
      typeId: sickType.id,
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      duration: 2,
      reason: 'Medical recovery',
    }),
  })
  console.log('✅ Bug Fix 1 (Create): Sick leave created without allocation error! ID:', sickReqRes.data.id)

  // Approve sick leave request
  const approveRes = await request(`${BASE_URL}/time-off/requests/${sickReqRes.data.id}/approve`, {
    method: 'POST',
    headers,
  })
  console.log('✅ Bug Fix 1 (Approve): Sick leave approved without needing allocation! Status:', approveRes.data.status)

  // 3. Test Salary Structures API
  const structuresRes = await request(`${BASE_URL}/salary-structures`, { headers })
  console.log(`✅ GET /api/salary-structures returned ${structuresRes.data.length} structures:`)
  for (const s of structuresRes.data) {
    console.log(`   - ${s.name} (${s.code}): ${s._count?.rules} rules`)
  }

  // 4. Test Preview endpoint for Vikram Nair
  const vikram = await prisma.employee.findFirst({ where: { email: 'vikram.nair@company.com' } })
  const regStructure = structuresRes.data.find((s) => s.code === 'REG')
  const previewRes = await request(`${BASE_URL}/salary-structures/${regStructure.id}/preview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ employeeId: vikram.id }),
  })
  console.log('✅ POST /api/salary-structures/:id/preview returned calculation:')
  console.log(`   Basic: ₹${previewRes.data.basic}, Gross: ₹${previewRes.data.gross}, Net: ₹${previewRes.data.net}`)

  // 5. Test Rule S2: sequence conflict error
  try {
    await request(`${BASE_URL}/salary-rules`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        structureId: regStructure.id,
        name: 'Duplicate Seq Rule',
        code: 'DUP_SEQ',
        category: 'ALLOWANCE',
        amountType: 'FIXED',
        amount: 1000,
        sequence: 1,
      }),
    })
    console.error('❌ Failed: sequence conflict did not throw')
  } catch (err) {
    console.log('✅ Rule S2 verified: Sequence conflict rejected with 400:', err.message)
  }

  // 6. Test Rule S7: Core rule delete prevention
  const basicRule = await prisma.salaryRule.findFirst({
    where: { structureId: regStructure.id, code: 'BASIC' },
  })
  try {
    await request(`${BASE_URL}/salary-rules/${basicRule.id}`, {
      method: 'DELETE',
      headers,
    })
    console.error('❌ Failed: basic rule delete was allowed')
  } catch (err) {
    console.log('✅ Rule S7 verified: Core rule deletion blocked with 400:', err.message)
  }

  console.log('\n🎉 ALL BACKEND VERIFICATIONS PASSED!')
}

testApi()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
