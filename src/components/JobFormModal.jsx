import React, { useState, useEffect, useRef, useMemo } from 'react'
import { X, Plus, Trash2, Upload, FileText, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { postSheet, formatDate } from '../api'

// ------------------------------------------------------------------ PDF AI Extract
async function extractFromPDF(base64Data, mimeType) {
  const systemPrompt = `คุณคือระบบอ่านเอกสาร PR/PO/ใบแจ้งงาน ของบริษัท SMEC Engineering
สกัดข้อมูลจากเอกสารแล้วตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น ห้ามมี markdown backticks

ตอบในรูปแบบ JSON นี้:
{
  "company": "ชื่อบริษัทลูกค้า เช่น BFLPC หรือ BFL หรือ BFLFP หรือชื่อเต็ม",
  "description": "รายละเอียดงานหลัก",
  "po": "เลขที่ PO ถ้ามี",
  "qty": "จำนวน",
  "price": "ราคาต่อหน่วย ตัวเลขเท่านั้น ไม่มีสัญลักษณ์",
  "requester": "ชื่อผู้แจ้ง/ผู้ขอ",
  "remark": "หมายเหตุหรือข้อมูลเพิ่มเติม",
  "type": "ประเภทงาน: สร้าง หรือ ซ่อม หรือ ปรับปรุงแก้ไข หรือ โครงการ หรือ อื่นๆ",
  "projectName": "ชื่อโครงการ ถ้ามี",
  "subItems": [
    { "name": "ชื่อรายการ", "qty": "จำนวน", "unit": "หน่วย", "price": "ราคา" }
  ],
  "date": "วันที่ในรูปแบบ YYYY-MM-DD ถ้าระบุในเอกสาร",
  "confidence": "high หรือ medium หรือ low"
}

ถ้าข้อมูลใดไม่มีในเอกสาร ให้ใส่ "" (string ว่าง) หรือ [] สำหรับ array`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [{
          type: 'document',
          source: { type: 'base64', media_type: mimeType, data: base64Data }
        }, {
          type: 'text',
          text: 'สกัดข้อมูลจากเอกสารนี้และตอบเป็น JSON ตามรูปแบบที่กำหนด'
        }]
      }]
    })
  })
  const data = await response.json()
  const text = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

// ------------------------------------------------------------------ constants
const COMPANIES = ['BFLPC', 'BFL', 'BFLFP', 'Other']
const COMPANY_SUFFIX = { BFLPC: 'PC', BFL: 'FL', BFLFP: 'FP', Other: 'ER' }
const JOB_TYPES = ['สร้าง', 'ซ่อม', 'ปรับปรุงแก้ไข', 'งาน DIE', 'โครงการ', 'อื่นๆ']
const STATUS_OPTIONS = ['งานใหม่', 'รอดำเนินการ', 'กำลังดำเนินการ', 'งานเสร็จรอส่ง', 'ส่งงานแล้ว', 'ปิดงาน', 'ยกเลิก', 'รออะไหล่']
const RESPONSIBLE = ['ผลกิจ', 'สุวเอก', 'ผลกิจ / CNC', 'SMEC', 'อื่นๆ']
const VAT_TYPES = ['ครั้งเดียว', 'รายเดือน']

// ------------------------------------------------------------------ helpers
function todayThai() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` // yyyy-mm-dd for input[type=date]
}

function displayDate(isoStr) {
  if (!isoStr) return ''
  return isoStr.replace(/-/g, '/')
}

// Generate running number: filter jobs by suffix in same yyyymm, find max seq
function generateJobNo(jobs, company, dateStr) {
  const suffix = COMPANY_SUFFIX[company] || 'ER'
  const d = new Date(dateStr)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const prefix = `SM-${yy}${mm}`

  // Find all existing numbers for this suffix+month
  const pattern = new RegExp(`^SM-${yy}${mm}(\\d{3})-${suffix}$`)
  let maxSeq = 0
  jobs.forEach(j => {
    const no = j['เลขที่'] || ''
    const match = no.match(pattern)
    if (match) {
      const seq = parseInt(match[1])
      if (seq > maxSeq) maxSeq = seq
    }
  })
  const nextSeq = String(maxSeq + 1).padStart(3, '0')
  return `${prefix}${nextSeq}-${suffix}`
}

function generateProjectNo(jobs, dateStr) {
  const d = new Date(dateStr)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const pattern = new RegExp(`^PJ-${yy}${mm}(\\d{3})`)
  let maxSeq = 0
  jobs.forEach(j => {
    const no = j['เลขที่โครงการ'] || ''
    const match = no.match(pattern)
    if (match) {
      const seq = parseInt(match[1])
      if (seq > maxSeq) maxSeq = seq
    }
  })
  const nextSeq = String(maxSeq + 1).padStart(3, '0')
  return `PJ-${yy}${mm}${nextSeq}`
}

// Serialize sub-items to text format used in sheet
// - Name (qty/sent unit) [status] {P:price}
function serializeSubItems(items) {
  return items.map(it => {
    const qty = it.qty || '0'
    const sent = it.sent || '0'
    const unit = it.unit || 'ชิ้น'
    const status = it.status || 'รอดำเนินการ'
    const price = it.price ? ` {P:${it.price}}` : ''
    return `- ${it.name} (${qty}/${sent} ${unit}) [${status}]${price}`
  }).join('\n')
}

// ------------------------------------------------------------------ SubItemRow
function SubItemRow({ item, idx, onChange, onRemove }) {
  const SUB_STATUSES = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จแล้ว', 'ยกเลิก']
  const lineTotal = (parseFloat(item.price || 0) * parseFloat(item.qty || 0))
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#0b1e30', border:'1px solid #1a3050' }}>
      {/* เลข */}
      <div className="text-xs text-steel-600 font-mono w-5 text-center shrink-0">{idx+1}</div>
      {/* ชื่อ — ให้กว้างที่สุด */}
      <input className="flex-1 text-xs" style={{minWidth:0}}
        placeholder="ชื่อรายการ / รายละเอียด..."
        value={item.name} onChange={e => onChange(idx, 'name', e.target.value)} />
      {/* จำนวน */}
      <div className="flex flex-col items-center shrink-0" style={{width:60}}>
        <span className="text-xs text-steel-600 mb-0.5">จำนวน</span>
        <input className="w-full text-xs text-center" type="number" min="0"
          value={item.qty} onChange={e => onChange(idx, 'qty', e.target.value)} />
      </div>
      {/* ส่งแล้ว */}
      <div className="flex flex-col items-center shrink-0" style={{width:52}}>
        <span className="text-xs text-steel-600 mb-0.5">ส่งแล้ว</span>
        <input className="w-full text-xs text-center" type="number" min="0"
          value={item.sent} onChange={e => onChange(idx, 'sent', e.target.value)} />
      </div>
      {/* หน่วย */}
      <div className="flex flex-col items-center shrink-0" style={{width:52}}>
        <span className="text-xs text-steel-600 mb-0.5">หน่วย</span>
        <input className="w-full text-xs text-center"
          value={item.unit} onChange={e => onChange(idx, 'unit', e.target.value)} />
      </div>
      {/* สถานะ */}
      <div className="flex flex-col items-center shrink-0" style={{width:110}}>
        <span className="text-xs text-steel-600 mb-0.5">สถานะ</span>
        <select className="w-full text-xs" value={item.status} onChange={e => onChange(idx, 'status', e.target.value)}>
          {SUB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {/* ราคา/หน่วย */}
      <div className="flex flex-col items-center shrink-0" style={{width:80}}>
        <span className="text-xs text-steel-600 mb-0.5">ราคา/ชิ้น</span>
        <input className="w-full text-xs text-right" type="number" min="0"
          value={item.price} onChange={e => onChange(idx, 'price', e.target.value)} />
      </div>
      {/* รวมต่อบรรทัด */}
      <div className="flex flex-col items-end shrink-0" style={{width:70}}>
        <span className="text-xs text-steel-600 mb-0.5">รวม</span>
        <span className="text-xs font-semibold" style={{color: lineTotal > 0 ? '#4ade80' : '#4a6584'}}>
          {lineTotal > 0 ? '฿'+lineTotal.toLocaleString('th-TH',{minimumFractionDigits:0}) : '–'}
        </span>
      </div>
      {/* ลบ */}
      <button onClick={() => onRemove(idx)} className="text-steel-700 hover:text-red-400 transition-colors shrink-0 p-1">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ main modal
export default function JobFormModal({ open, onClose, jobs = [], onSaved }) {
  const [form, setForm] = useState({})
  const [subItems, setSubItems] = useState([])
  const [files, setFiles] = useState([]) // [{file, preview}]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)
  const fileInputRef = useRef()
  const pdfInputRef = useRef()

  // Reset form when opened
  useEffect(() => {
    if (!open) return
    const today = todayThai()
    setForm({
      date: today,
      company: 'BFLPC',
      type: 'สร้าง',
      jobNo: '',
      projectNo: '',
      projectName: '',
      requester: '',
      responsible: 'ผลกิจ',
      description: '',
      remark: '',
      po: '',
      qty: '',
      price: '',
      sentQty: '',
      outstandingQty: '0',
      doRef: '',
      status: 'งานใหม่',
      statusDate: today,
      otherCompany: '',
      vatType: 'ครั้งเดียว',
      vatPct: '7',
    })
    setSubItems([])
    setFiles([])
    setError('')
    setExtracted(false)
  }, [open])

  // Auto-generate job number when company or date changes
  useEffect(() => {
    if (!form.date || !form.company) return
    const no = generateJobNo(jobs, form.company, form.date)
    setForm(f => ({ ...f, jobNo: no }))
    if (form.type === 'โครงการ') {
      setForm(f => ({ ...f, projectNo: generateProjectNo(jobs, form.date) }))
    }
  }, [form.company, form.date, form.type])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calculations — ถ้ามี subItems ให้ sum จากแต่ละรายการ
  const subTotal = subItems.length > 0
    ? subItems.reduce((sum, it) => sum + (parseFloat(it.price || 0) * parseFloat(it.qty || 1)), 0)
    : parseFloat(form.price || 0) * parseFloat(form.qty || 1) || 0

  const totalQty = subItems.length > 0
    ? subItems.reduce((sum, it) => sum + parseFloat(it.qty || 0), 0)
    : parseFloat(form.qty || 0)

  const vatAmount = (subTotal * parseFloat(form.vatPct || 7)) / 100
  const grandTotal = subTotal + vatAmount

  // Sub items handlers
  const addSubItem = () => setSubItems(s => [...s, { name: '', qty: '1', sent: '0', unit: 'ชิ้น', status: 'รอดำเนินการ', price: '' }])
  const updateSubItem = (idx, key, val) => setSubItems(s => s.map((it, i) => i === idx ? { ...it, [key]: val } : it))
  const removeSubItem = idx => setSubItems(s => s.filter((_, i) => i !== idx))

  // PDF AI extract handler
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setExtracting(true)
    setError('')
    setExtracted(false)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = ev => res(ev.target.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const mimeType = 'application/pdf'  // always pdf
      const result = await extractFromPDF(base64, mimeType)

      // Map company string → dropdown value
      const companyMap = {
        'BFLPC': 'BFLPC', 'BFL': 'BFL', 'BFLFP': 'BFLFP',
        'Bangkok Feed': 'BFLPC', 'BangkokFeed': 'BFLPC',
      }
      const rawCo = result.company || ''
      let mappedCompany = 'Other'
      let otherCompany = ''
      for (const [k, v] of Object.entries(companyMap)) {
        if (rawCo.toUpperCase().includes(k.toUpperCase())) { mappedCompany = v; break }
      }
      if (mappedCompany === 'Other') otherCompany = rawCo

      // Update form with extracted data
      setForm(f => ({
        ...f,
        company: mappedCompany,
        otherCompany,
        description: result.description || f.description,
        po: result.po || f.po,
        qty: result.qty || f.qty,
        price: result.price || f.price,
        requester: result.requester || f.requester,
        remark: result.remark || f.remark,
        type: result.type && ['สร้าง','ซ่อม','ปรับปรุงแก้ไข','งาน DIE','โครงการ','อื่นๆ'].includes(result.type)
          ? result.type : f.type,
        projectName: result.projectName || f.projectName,
        ...(result.date ? { date: result.date } : {}),
      }))

      // Sub-items
      if (result.subItems?.length > 0) {
        setSubItems(result.subItems.map(it => ({
          name: it.name || '',
          qty: it.qty || '1',
          sent: '0',
          unit: it.unit || 'ชิ้น',
          status: 'รอดำเนินการ',
          price: it.price || '',
        })))
      }

      setExtracted(true)
    } catch (err) {
      setError('ไม่สามารถอ่าน PDF ได้: ' + err.message)
    } finally {
      setExtracting(false)
      e.target.value = ''
    }
  }

  // File handlers
  const handleFiles = e => {
    const picked = Array.from(e.target.files).slice(0, 10 - files.length)
    const newFiles = picked.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
    }))
    setFiles(f => [...f, ...newFiles])
  }
  const removeFile = idx => setFiles(f => f.filter((_, i) => i !== idx))

  // ── Lookup existing PO ──────────────────────────────────────────
  const existingPOs = useMemo(() =>
    [...new Set(jobs.map(j => j['PO']).filter(Boolean))].sort()
  , [jobs])

  const loadFromPO = () => {
    if (!form.po) return
    // หางานล่าสุดที่มี PO นี้
    const match = [...jobs].filter(j => j['PO'] === form.po).sort((a,b) => (b['วันที่']||'').localeCompare(a['วันที่']||''))[0]
    if (!match) { setError(`ไม่พบ PO ${form.po} ในระบบ`); return }
    setForm(f => ({
      ...f,
      company: ['BFLPC','BFL','BFLFP'].includes(match['บริษัท']) ? match['บริษัท'] : 'Other',
      otherCompany: !['BFLPC','BFL','BFLFP'].includes(match['บริษัท']) ? match['บริษัท'] : '',
      requester: match['ผู้แจ้ง'] || f.requester,
      responsible: match['ผู้รับผิดชอบ'] || f.responsible,
      type: match['ประเภท'] || f.type,
    }))
    setError('')
  }

  // Submit — ส่งแยก row ต่อ sub-item (ถ้ามี) หรือ 1 row ถ้าไม่มี sub-items
  const handleSave = async () => {
    setError('')
    if (!form.description.trim()) { setError('กรุณากรอกรายละเอียดงาน'); return }
    if (!form.jobNo) { setError('ไม่สามารถสร้างเลขที่ใบงานได้'); return }
    if (form.type === 'โครงการ' && !form.projectName.trim()) { setError('กรุณากรอกชื่อโครงการ'); return }

    setSaving(true)
    try {
      // Upload files
      let fileUrls = []
      for (const f of files) {
        const reader = new FileReader()
        const base64 = await new Promise((res, rej) => {
          reader.onload = e => res(e.target.result.split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(f.file)
        })
        const uploadRes = await postSheet({
          action: 'upload',
          fileName: f.file.name,
          mimeType: f.file.type,
          data: base64,
          folder: 'SMEC_Uploads',
        })
        if (uploadRes.status === 'success' && uploadRes.url) fileUrls.push(uploadRes.url)
      }

      const companyName = form.company === 'Other' ? form.otherCompany : form.company

      // ── โครงสร้างใหม่: 1 row ต่อ sub-item ──
      // ถ้าไม่มี sub-items → บันทึก 1 row (เหมือนเดิม)
      // ถ้ามี sub-items → บันทึก header row 1 แถว + sub-item แต่ละตัว 1 แถว
      // baseRow — key ต้องตรงกับ header ของ Sheet "ใบงาน" ทุกตัว
      const baseRow = {
        วันที่: displayDate(form.date),
        เลขที่: form.jobNo,
        'เลขที่โครงการ': form.type === 'โครงการ' ? form.projectNo : '',
        'ชื่อโครงการ': form.type === 'โครงการ' ? form.projectName : '',
        PO: form.po,
        บริษัท: companyName,
        'ผู้แจ้ง': form.requester,
        ประเภท: form.type,
        รายละเอียด: form.description,
        รายการย่อย: '',
        สถานะ: form.status,
        'วันที่สถานะ': displayDate(form.statusDate),
        'ผู้รับผิดชอบ': form.responsible,
        จำนวน: subItems.length > 0 ? String(Math.round(totalQty)) : (form.qty || ''),
        'จำนวนที่ส่ง': form.sentQty || '0',
        'จำนวนค้างส่ง': form.outstandingQty || '0',
        'เลขที่ใบส่งของ': form.doRef || '',
        เอกสาร: fileUrls.join(','),
        หมายเหตุ: form.remark,
        docNo: form.jobNo,
        'ความถี่สั่งซื้อ': form.vatType || 'ครั้งเดียว',
        VAT: form.vatPct || '7',
        'ยอดขายรวม': `฿${grandTotal.toFixed(2)}`,
        'ขาย/หน่วย': subItems.length > 0 ? '' : (form.price || ''),
      }

      let res
      if (subItems.length === 0) {
        // ไม่มี sub-items → 1 row ปกติ
        res = await postSheet({ action: 'addJob', data: baseRow })
      } else {
        // มี sub-items → ส่ง header + แต่ละ sub-item แยก row
        // header row (ไม่มี sub-item name)
        res = await postSheet({ action: 'addJob', data: { ...baseRow, รายการย่อย: serializeSubItems(subItems), 'ยอดขายรวม': `฿${grandTotal.toFixed(2)}`, 'ขาย/หน่วย': '' } })
      }

      if (res.status === 'success') {
        onSaved && onSaved()
        onClose()
      } else {
        setError(`บันทึกไม่สำเร็จ: ${res.message || 'กรุณาตรวจสอบการเชื่อมต่อ Apps Script'}`)
      }
    } catch (e) {
      console.error('Save error:', e)
      setError('เกิดข้อผิดพลาด: ' + (e.message || 'Network error'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  // Unique project names from existing jobs
  const existingProjects = [...new Set(jobs.map(j => j['ชื่อโครงการ']).filter(Boolean))].sort()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-3xl mx-4 rounded-xl shadow-2xl flex flex-col"
        style={{ background: '#0a1929', border: '1px solid #1e3a5f' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-steel-800">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-accent-400" />
            <h2 className="text-white font-bold text-base">สร้างรายการงานใหม่</h2>
          </div>
          <button onClick={onClose} className="text-steel-500 hover:text-white p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* PDF AI extract zone */}
        <div
          onClick={() => !extracting && pdfInputRef.current?.click()}
          className="mx-6 mt-4 px-4 py-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all"
          style={{
            background: extracted
              ? 'rgba(34,197,94,0.08)'
              : extracting
                ? 'rgba(56,139,253,0.12)'
                : 'rgba(56,139,253,0.06)',
            border: extracted
              ? '1px solid rgba(34,197,94,0.35)'
              : extracting
                ? '1px dashed rgba(56,139,253,0.5)'
                : '1px dashed rgba(56,139,253,0.3)',
          }}>
          <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf"
            className="hidden" onChange={handlePdfUpload} />
          {extracting ? (
            <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
          ) : extracted ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          ) : (
            <Sparkles size={16} className="text-blue-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {extracting ? (
              <div>
                <div className="text-blue-300 text-xs font-medium">AI กำลังอ่าน PDF...</div>
                <div className="text-steel-500 text-xs mt-0.5">กำลังสกัดข้อมูลใบงาน/PO อัตโนมัติ</div>
              </div>
            ) : extracted ? (
              <div>
                <div className="text-green-300 text-xs font-medium">✓ ดึงข้อมูลจาก PDF สำเร็จ — ตรวจสอบและแก้ไขได้ด้านล่าง</div>
                <div className="text-steel-500 text-xs mt-0.5 cursor-pointer underline"
                  onClick={e => { e.stopPropagation(); pdfInputRef.current?.click() }}>อัปโหลด PDF ใหม่</div>
              </div>
            ) : (
              <div>
                <div className="text-blue-300 text-xs font-medium">คลิกเพื่ออัปโหลด PDF ใบ PR/PO/ใบแจ้งงาน — AI จะดึงข้อมูลใส่ form ให้อัตโนมัติ</div>
                <div className="text-steel-600 text-xs mt-0.5">รองรับ PDF มาตรฐาน PO, ใบงาน หรือ PR</div>
              </div>
            )}
          </div>
          {!extracting && !extracted && (
            <div className="shrink-0 px-2.5 py-1 rounded text-xs font-medium text-blue-300"
              style={{ background: 'rgba(56,139,253,0.15)', border: '1px solid rgba(56,139,253,0.3)' }}>
              เลือก PDF
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

          {/* Row 1: Date + Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">วันที่จัดทำ</label>
              <input type="date" className="w-full" value={form.date}
                onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">บริษัท</label>
              <select className="w-full" value={form.company}
                onChange={e => set('company', e.target.value)}>
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.company === 'Other' && (
                <input className="w-full mt-2 text-sm" placeholder="ระบุชื่อบริษัท..."
                  value={form.otherCompany} onChange={e => set('otherCompany', e.target.value)} />
              )}
            </div>
          </div>

          {/* Row 2: Type + Job No */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">ประเภทงาน</label>
              <select className="w-full" value={form.type} onChange={e => set('type', e.target.value)}>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">เลขที่ใบงาน (JOB NO.)</label>
              <input className="w-full font-mono text-accent-400 bg-steel-900/50"
                value={form.jobNo} onChange={e => set('jobNo', e.target.value)}
                style={{ background: 'rgba(13,33,55,0.8)' }} />
            </div>
          </div>

          {/* Project fields (show if type=โครงการ) */}
          {form.type === 'โครงการ' && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg" style={{ background: 'rgba(56,139,253,0.06)', border: '1px solid rgba(56,139,253,0.2)' }}>
              <div>
                <label className="form-label">เลขที่โครงการ</label>
                <input className="w-full font-mono text-blue-300"
                  value={form.projectNo} onChange={e => set('projectNo', e.target.value)} />
              </div>
              <div>
                <label className="form-label">ชื่อโครงการ</label>
                <input className="w-full" list="project-names-list" placeholder="พิมพ์หรือเลือกโครงการ..."
                  value={form.projectName} onChange={e => set('projectName', e.target.value)} />
                <datalist id="project-names-list">
                  {existingProjects.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>
          )}

          {/* Row 3: Requester + Responsible */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">ผู้แจ้ง (REQUESTER)</label>
              <input className="w-full" placeholder="ระบุผู้แจ้ง..."
                value={form.requester} onChange={e => set('requester', e.target.value)} />
            </div>
            <div>
              <label className="form-label">ผู้รับผิดชอบ</label>
              <input className="w-full" list="responsible-list" placeholder="ระบุคน/ผู้รับผิดชอบ..."
                value={form.responsible} onChange={e => set('responsible', e.target.value)} />
              <datalist id="responsible-list">
                {RESPONSIBLE.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">รายละเอียดงาน (ภาพรวม) <span className="text-red-400">*</span></label>
            <textarea className="w-full h-24 resize-y"
              placeholder="ระบุรายละเอียดให้ครบถ้วน..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Sub-items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0 flex items-center gap-1.5">
                <span style={{ fontSize: 11 }}>≡</span> รายการย่อย (SUB-ITEMS)
              </label>
              <button onClick={addSubItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white"
                style={{ background: 'rgba(56,139,253,0.2)', border: '1px solid rgba(56,139,253,0.4)' }}>
                <Plus size={12} /> เพิ่มรายการ
              </button>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
              {subItems.length === 0 ? (
                <div className="text-center py-6 text-steel-600 text-xs">ไม่มีรายการย่อย (สามารถเพิ่มได้ทีละรายการ)</div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {/* Header labels — match flex layout ของ SubItemRow */}
                  <div className="flex items-center gap-2 px-3 text-xs font-medium" style={{color:'#4a6584'}}>
                    <div style={{width:20}}>#</div>
                    <div className="flex-1">ชื่อรายการ / รายละเอียด</div>
                    <div style={{width:60}} className="text-center">จำนวน</div>
                    <div style={{width:52}} className="text-center">ส่งแล้ว</div>
                    <div style={{width:52}} className="text-center">หน่วย</div>
                    <div style={{width:110}} className="text-center">สถานะ</div>
                    <div style={{width:80}} className="text-right">ราคา/ชิ้น</div>
                    <div style={{width:70}} className="text-right">รวม</div>
                    <div style={{width:24}}/>
                  </div>
                  {subItems.map((it, idx) => (
                    <SubItemRow key={idx} item={it} idx={idx}
                      onChange={updateSubItem} onRemove={removeSubItem} />
                  ))}
                  {/* Summary row */}
                  <div className="flex items-center gap-2 px-3 pt-2 mt-1 border-t" style={{borderColor:'#1e3a5f'}}>
                    <div style={{width:20}}/>
                    <div className="flex-1 text-xs font-semibold text-steel-300">รวมทั้งหมด ({subItems.length} รายการ)</div>
                    <div style={{width:60}} className="text-center text-xs font-bold text-blue-300">{totalQty.toLocaleString('th-TH')}</div>
                    <div style={{width:52}}/>
                    <div style={{width:52}}/>
                    <div style={{width:110}}/>
                    <div style={{width:80}}/>
                    <div style={{width:70}} className="text-right text-xs font-bold text-green-400">
                      ฿{subTotal.toLocaleString('th-TH',{minimumFractionDigits:0})}
                    </div>
                    <div style={{width:24}}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="form-label">หมายเหตุ/เหตุผลเพิ่มเติม (ถ้ามี)</label>
            <textarea className="w-full h-16 resize-y"
              placeholder="ระบุหมายเหตุ/เหตุผลเพิ่มเติม (ถ้ามี)..."
              value={form.remark} onChange={e => set('remark', e.target.value)} />
          </div>

          {/* Sales Summary */}
          <div className="rounded-lg p-4 space-y-3" style={{ background: '#071624', border: '1px solid #1e3a5f' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-steel-400 font-semibold uppercase tracking-wider">สรุปยอดขาย (Sales Summary)</span>
              <div className="flex items-center gap-2 ml-auto text-xs text-steel-500">
                <span>ความถี่สั่ง:</span>
                <select className="text-xs py-0.5" value={form.vatType} onChange={e => set('vatType', e.target.value)}>
                  {VAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span>จำนวน (ชิ้น)</span>
                <input className="w-14 text-xs text-center py-0.5" type="number" min="0"
                  value={form.qty} onChange={e => set('qty', e.target.value)} />
                <span>VAT (%)</span>
                <input className="w-12 text-xs text-center py-0.5" type="number" min="0" max="100"
                  value={form.vatPct} onChange={e => set('vatPct', e.target.value)} />
              </div>
            </div>
            {/* จำนวนรวม banner เมื่อมี subItems */}
            {subItems.length > 0 && (
              <div className="rounded-lg px-3 py-2 flex items-center gap-3 text-xs" style={{background:'rgba(56,139,253,0.08)',border:'1px solid rgba(56,139,253,0.2)'}}>
                <span className="text-steel-400">รายการย่อย</span>
                <span className="font-bold text-blue-300">{subItems.length} รายการ</span>
                <span className="text-steel-400 ml-2">จำนวนรวม</span>
                <span className="font-bold text-blue-300">{totalQty.toLocaleString('th-TH')} ชิ้น</span>
                <span className="text-steel-400 ml-2">ยอดรวมก่อน VAT</span>
                <span className="font-bold text-green-300">฿{subTotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background: '#0a1929' }}>
                <div className="text-xs text-steel-500 mb-1">รวมเงิน (SUB TOTAL)</div>
                <div className="text-sm font-bold text-steel-200">฿{subTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                {subItems.length > 0 && <div className="text-xs text-blue-400 mt-0.5">คำนวณจาก {subItems.length} รายการ</div>}
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: '#0a1929' }}>
                <div className="text-xs text-steel-500 mb-1">ภาษีมูลค่าเพิ่ม (VAT {form.vatPct}%)</div>
                <div className="text-sm font-bold text-steel-200">฿{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="text-xs text-steel-500 mb-1">ยอดรวมสุทธิ (GRAND TOTAL)</div>
                <div className="text-base font-bold text-green-400">฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <div>
                <label className="form-label">เลขที่ PO</label>
                <div className="flex gap-2">
                  <input className="flex-1" list="po-list-main" placeholder="PO/2026/05/..."
                    value={form.po} onChange={e => set('po', e.target.value)} />
                  <datalist id="po-list-main">
                    {existingPOs.map(p => <option key={p} value={p}/>)}
                  </datalist>
                  {form.po && (
                    <button onClick={loadFromPO}
                      className="px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap"
                      style={{ background:'rgba(56,139,253,0.15)', border:'1px solid rgba(56,139,253,0.35)', color:'#60a5fa' }}>
                      ดึง PO
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="form-label">จำนวนสินค้า (QTY)</label>
                <input className="w-full" placeholder="ระบุจำนวนเพิ่ม..." type="number" min="0"
                  value={form.qty} onChange={e => set('qty', e.target.value)} />
              </div>
              <div>
                <label className="form-label">ราคา/หน่วย (PRICE)</label>
                <input className="w-full" placeholder="ราคาขาย..." type="number" min="0"
                  value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="form-label" style={{ color: '#4ade80' }}>จำนวนที่ส่งแล้ว</label>
                <input className="w-full" placeholder="ส่งแล้ว..." type="number" min="0"
                  value={form.sentQty} onChange={e => set('sentQty', e.target.value)} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#f87171' }}>จำนวนค้างส่ง</label>
                <input className="w-full" type="number" min="0"
                  value={form.outstandingQty} onChange={e => set('outstandingQty', e.target.value)} />
              </div>
              <div>
                <label className="form-label">อ้างใบส่งของ DO</label>
                <input className="w-full" placeholder="เช่น DO-25-..." value={form.doRef}
                  onChange={e => set('doRef', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Status + Status Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">สถานะปัจจุบัน</label>
              <select className="w-full" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">วันที่ (STATUS DATE)</label>
              <input type="date" className="w-full" value={form.statusDate}
                onChange={e => set('statusDate', e.target.value)} />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">เอกสาร / รูปภาพ (สูงสุด 10 ไฟล์)</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white"
                style={{ background: 'rgba(56,139,253,0.2)', border: '1px solid rgba(56,139,253,0.4)' }}>
                <Upload size={12} /> อัปโหลด
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden" onChange={handleFiles} />
            </div>
            <div className="text-xs text-steel-600 mb-2">รองรับ: รูปภาพ, PDF, Word, Excel | สูงสุด 10 ไฟล์</div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden"
                    style={{ border: '1px solid #1e3a5f', background: '#071624' }}>
                    {f.preview ? (
                      <img src={f.preview} alt={f.name} className="w-20 h-20 object-cover" />
                    ) : (
                      <div className="w-20 h-20 flex flex-col items-center justify-center gap-1">
                        <FileText size={20} className="text-steel-500" />
                        <span className="text-xs text-steel-600 px-1 text-center truncate w-full">{f.name.slice(0, 12)}</span>
                      </div>
                    )}
                    <button onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-red-300">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-steel-800">
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2 rounded-lg text-sm text-steel-300 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: saving ? '#1e3a5f' : 'linear-gradient(135deg, #1d6fd8, #1a56b0)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'กำลังบันทึก...' : '✓ บันทึกข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  )
}
