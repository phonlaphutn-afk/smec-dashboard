const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzuTX5dfMwkhnkVUElKYX1FD6DhymJQB4qWT3aQZkpAkn1dmYjMpezYvqg_Zw1YmMT8cg/exec'

export async function fetchSheet(action) {
  try {
    const url = `${SCRIPT_URL}?action=${action}`
    const res = await fetch(url)
    const json = await res.json()
    if (json.status === 'success') return json.data || []
    return []
  } catch {
    return []
  }
}

export async function postSheet(payload) {
  // ส่งครั้งเดียวด้วย no-cors เสมอ — Apps Script ไม่รองรับ CORS จาก browser
  // ใช้ no-cors ตรงๆ ไม่ต้อง fallback (หลีกเลี่ยงส่ง 2 ครั้ง)
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
    // no-cors ไม่มี response body — ถือว่า success เสมอ
    return { status: 'success' }
  } catch (e) {
    console.error('postSheet error:', e)
    return { status: 'error', message: 'Network error: ' + e.message }
  }
}

export function statusBadge(status) {
  const map = {
    'ส่งงานแล้ว': 'badge-green',
    'ปิดงาน': 'badge-green',
    'เสร็จแล้ว': 'badge-green',
    'กำลังดำเนินการ': 'badge-blue',
    'รอดำเนินการ': 'badge-yellow',
    'งานเสร็จรอส่ง': 'badge-orange',
    'รออะไหล่': 'badge-orange',
    'ยกเลิก': 'badge-gray',
    'สร้าง': 'badge-blue',
  }
  return map[status] || 'badge-gray'
}

export function formatCurrency(val) {
  if (!val) return '–'
  const num = parseFloat(String(val).replace(/[฿,]/g, ''))
  if (isNaN(num) || num === 0) return '–'
  return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatDate(val) {
  if (!val) return '–'
  return String(val).split('T')[0].replace(/-/g, '/')
}
