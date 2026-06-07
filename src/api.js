const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzuTX5dfMwkhnkVUElKYX1FD6DhymJQB4qWT3aQZkpAkn1dmYjMpezYvqg_Zw1YmMT8cg/exec'

export async function fetchSheet(action) {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=${action}`)
    const json = await res.json()
    if (json.status === 'success') return json.data || []
    return []
  } catch {
    return []
  }
}

// ส่งข้อมูลผ่าน GET โดย encode payload เป็น base64
// วิธีนี้ไม่มี CORS preflight ทำให้ Apps Script รับได้ปกติ
export async function postSheet(payload) {
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    const url = `${SCRIPT_URL}?method=post&payload=${encodeURIComponent(encoded)}`
    const res = await fetch(url)
    const json = await res.json()
    return json
  } catch (e) {
    console.error('postSheet error:', e)
    return { status: 'error', message: e.message }
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
