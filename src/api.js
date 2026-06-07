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
  try {
    // Google Apps Script: ต้องใช้ Content-Type: text/plain เพื่อหลีกเลี่ยง CORS preflight
    // redirect: follow เพื่อ follow การ redirect ของ Apps Script
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
    // response อาจเป็น opaque (type === 'opaque') เมื่อ redirect ข้าม origin
    if (res.type === 'opaque' || res.status === 0) {
      // ถือว่า success เพราะ Apps Script ไม่ throw error
      return { status: 'success' }
    }
    const text = await res.text()
    if (!text || text.trim() === '') return { status: 'success' }
    try {
      return JSON.parse(text)
    } catch {
      // ถ้า parse ไม่ได้แต่ response ok ถือว่า success
      if (res.ok) return { status: 'success' }
      return { status: 'error', message: 'ไม่สามารถอ่าน response จาก Apps Script ได้: ' + text.slice(0, 100) }
    }
  } catch (e) {
    console.error('postSheet error:', e)
    // Network error / CORS — ลอง fallback ด้วย no-cors (ไม่ได้ response แต่ request ถึง server)
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })
      return { status: 'success' }  // ไม่มี response แต่ถือว่าส่งถึง
    } catch (e2) {
      return { status: 'error', message: 'Network error: ' + e.message }
    }
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
