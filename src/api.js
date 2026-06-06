const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGoP6D3EQ1V8uewMkEFF0u0yfhkXLvfWMjI_OMRsEapJCkwyCoJeDGo8Y5WHr8G5GWrw/exec'

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
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return { status: 'error' }
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
