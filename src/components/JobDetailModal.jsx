import React, { useState, useEffect } from 'react'
import { X, FileText, Printer, Edit2, ChevronDown, ExternalLink, Calendar, Building2, User, Hash, Package, Truck } from 'lucide-react'
import { statusBadge, formatCurrency, formatDate } from '../api'
import { printWorkRequest } from './WorkRequestPrint'

// ── Status dropdown options ─────────────────────────────────────────────────
const STATUS_OPTIONS = ['งานใหม่','รอดำเนินการ','กำลังดำเนินการ','งานเสร็จรอส่ง','ส่งงานแล้ว','ปิดงาน','ยกเลิก','รออะไหล่']

const STATUS_COLORS = {
  'ส่งงานแล้ว':    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#4ade80' },
  'ปิดงาน':        { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#4ade80' },
  'เสร็จแล้ว':     { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#4ade80' },
  'กำลังดำเนินการ':{ bg: 'rgba(56,139,253,0.15)', border: 'rgba(56,139,253,0.4)', text: '#60a5fa' },
  'รอดำเนินการ':   { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.4)', text: '#fbbf24' },
  'งานใหม่':       { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.4)', text: '#fbbf24' },
  'งานเสร็จรอส่ง': { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fb923c' },
  'รออะไหล่':      { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fb923c' },
  'ยกเลิก':        { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', text: '#94a3b8' },
}

// ── PDF / Image Thumbnail + Lightbox ────────────────────────────────────────
function DocThumb({ url, label, index }) {
  const [lightbox, setLightbox] = useState(false)
  const [page, setPage] = useState(1)

  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.startsWith('data:image')
  const isDrive = url.includes('drive.google.com')

  const embedUrl = isDrive
    ? url.replace('/view', '/preview').replace('/edit', '/preview')
    : url

  // Thumbnail content
  const ThumbContent = ({ height = 140 }) => (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height, background:'#071624', border:'1px solid #1e3a5f' }}>
      {isImage ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <iframe
          src={`${embedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          title={label}
          className="w-full pointer-events-none"
          style={{ border:'none', height: height * 3, transform:`scale(0.33)`, transformOrigin:'top left', width:'300%' }}
          loading="lazy"
        />
      )}
      {/* Overlay gradient + label */}
      <div className="absolute inset-0 flex flex-col justify-end"
        style={{ background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}>
        <div className="px-2 pb-2 flex items-center justify-between">
          <span className="text-white text-xs font-medium truncate">{label}</span>
          <span className="text-white/60" style={{fontSize:9}}>หน้า {page}</span>
        </div>
      </div>
      {/* Expand icon */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 rounded" style={{background:'rgba(0,0,0,0.6)'}}>
          <ExternalLink size={10} className="text-white"/>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Thumbnail card */}
      <div className="flex flex-col gap-1.5 group cursor-pointer" onClick={() => setLightbox(true)}>
        <ThumbContent height={140}/>
        <button
          onClick={e => { e.stopPropagation(); setLightbox(true) }}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors"
          style={{ background:'rgba(56,139,253,0.08)', border:'1px solid rgba(56,139,253,0.2)', color:'#60a5fa' }}>
          <ExternalLink size={10}/> เปิด{label}
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center py-6 px-4"
          style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)' }}
          onClick={() => setLightbox(false)}>
          <div className="w-full max-w-3xl flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{label}</span>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink size={11}/> เปิดในแท็บใหม่
                </a>
              </div>
              <button onClick={() => setLightbox(false)}
                className="p-1.5 rounded-lg text-steel-400 hover:text-white transition-colors"
                style={{background:'rgba(255,255,255,0.1)'}}>
                <X size={16}/>
              </button>
            </div>

            {/* Preview area */}
            <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #1e3a5f', background:'#fff', height:'75vh' }}>
              {isImage ? (
                <img src={url} alt={label} className="w-full h-full object-contain" style={{background:'#f1f5f9'}}/>
              ) : (
                <iframe
                  src={`${embedUrl}#page=${page}`}
                  title={label}
                  className="w-full h-full"
                  style={{ border:'none' }}
                />
              )}
            </div>

            {/* Page controls */}
            {!isImage && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setPage(p => Math.max(1,p-1))}
                  disabled={page===1}
                  className="px-4 py-1.5 rounded-lg text-sm text-white disabled:opacity-30 transition-colors"
                  style={{background:'rgba(255,255,255,0.1)'}}>‹ ก่อนหน้า</button>
                <span className="text-white text-sm font-mono">หน้า {page}</span>
                <button onClick={() => setPage(p => p+1)}
                  className="px-4 py-1.5 rounded-lg text-sm text-white transition-colors"
                  style={{background:'rgba(255,255,255,0.1)'}}>ถัดไป ›</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-item row (read-only in detail view) ─────────────────────────────────
function SubItemRow({ item, index }) {
  const SUB_STATUS_COLORS = {
    'เสร็จแล้ว':      { bg:'rgba(34,197,94,0.12)',   text:'#4ade80',  border:'rgba(34,197,94,0.3)' },
    'กำลังดำเนินการ': { bg:'rgba(56,139,253,0.12)',  text:'#60a5fa',  border:'rgba(56,139,253,0.3)' },
    'ยกเลิก':         { bg:'rgba(148,163,184,0.12)', text:'#94a3b8',  border:'rgba(148,163,184,0.25)' },
    'รอดำเนินการ':    { bg:'rgba(250,204,21,0.12)',  text:'#fbbf24',  border:'rgba(250,204,21,0.3)' },
  }
  const sc = SUB_STATUS_COLORS[item.status] || SUB_STATUS_COLORS['รอดำเนินการ']
  return (
    <tr>
      <td className="text-steel-500 text-center font-mono text-xs">{index+1}</td>
      <td className="text-steel-200 text-xs py-2.5">{item.name}</td>
      <td className="text-center">
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-steel-300">{item.qty} {item.unit}</div>
          <div className="text-xs" style={{ color:'#4ade80' }}>ส่งแล้ว {item.sent}</div>
        </div>
      </td>
      <td className="text-right font-mono text-xs text-steel-400">{item.price || '–'}</td>
      <td className="text-center">
        <span className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>
          {item.status}
        </span>
      </td>
    </tr>
  )
}

// ── Main Detail Modal ────────────────────────────────────────────────────────
export default function JobDetailModal({ job, open, onClose, onEdit, onDelete, onRefresh, doList = [] }) {
  const [status, setStatus] = useState('')
  const [showStatusDrop, setShowStatusDrop] = useState(false)

  useEffect(() => {
    if (job) setStatus(job['สถานะ'] || 'งานใหม่')
  }, [job])

  if (!open || !job) return null

  // หา DO ที่เชื่อมกับ job นี้ (จาก jobNo หรือ doRef ใน job)
  const jobDoList = doList.filter(d =>
    d.jobNo === job['เลขที่'] ||
    (job['อ้างใบส่งของ DO'] || '').split(',').map(s=>s.trim()).includes(d.doNo)
  )
  // สรุปการส่งจาก DO
  const totalSentFromDO = jobDoList.reduce((sum, d) =>
    sum + (d.items || []).reduce((s, it) => s + (parseInt(it.thisRound) || 0), 0), 0
  )
  const totalQty = parseInt(job['จำนวน'] || '0')

  // Parse documents (comma-separated URLs)
  const parseUrls = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : []
  const docUrls = parseUrls(job['เอกสาร'])
  const doUrls  = parseUrls(job['เอกสารแนบใบส่งของชั่วคราว'])

  // Parse sub-items
  const parseSubItems = (str) => {
    if (!str) return []
    return str.split('\n').map(line => {
      line = line.trim()
      if (!line.startsWith('-')) return null
      const match = line.match(/^- (.*?)\s+\((.*?)\/(.*?)\s+(.*?)\)\s+\[(.*?)\](?:\s+\{(?:C:.*?,)?P:(.*?)\})?/)
      if (!match) return { name: line.replace(/^- /,''), qty:'–', sent:'–', unit:'', status:'รอดำเนินการ', price:'' }
      return {
        name: match[1].trim(), qty: match[2], sent: match[3],
        unit: match[4].trim(), status: match[5].trim(),
        price: match[6] ? '฿'+parseFloat(match[6]).toLocaleString('th-TH') : ''
      }
    }).filter(Boolean)
  }
  const subItems = parseSubItems(job['รายการย่อย'])

  // Calc totals
  const grandTotal = parseFloat(String(job['ยอดขายรวม']||'0').replace(/[฿,]/g,'')) || 0
  const vat = grandTotal - grandTotal/1.07
  const subTotal = grandTotal - vat

  const sc = STATUS_COLORS[status] || STATUS_COLORS['งานใหม่']

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>ใบแจ้งงาน ${job['เลขที่']||''}</title>
    <style>
      body{font-family:'Sarabun',sans-serif;font-size:11px;color:#111;margin:20px}
      h2{font-size:14px;margin:0 0 2px} .sub{color:#555;font-size:10px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
      .field .label{font-size:9px;color:#777;text-transform:uppercase;letter-spacing:.04em}
      .field .val{font-size:11px;font-weight:500;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px}
      th{background:#1a3a5c;color:#fff;padding:4px 6px;text-align:left}
      td{padding:3px 6px;border-bottom:1px solid #e5e7eb}
      .total-box{text-align:right;margin-top:10px;font-size:12px;font-weight:bold}
      @media print{@page{size:A4;margin:15mm}}
    </style></head><body>
    <h2>ใบแจ้งงาน — ${job['เลขที่']||''}</h2>
    <div class="sub">SMEC Engineering & Construction · พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</div>
    <div class="grid2">
      <div class="field"><div class="label">บริษัท</div><div class="val">${job['บริษัท']||'–'}</div></div>
      <div class="field"><div class="label">ประเภทงาน</div><div class="val">${job['ประเภท']||'–'}</div></div>
      <div class="field"><div class="label">ผู้แจ้ง</div><div class="val">${job['ผู้แจ้ง']||'–'}</div></div>
      <div class="field"><div class="label">ผู้รับผิดชอบ</div><div class="val">${job['ผู้รับผิดชอบ']||'–'}</div></div>
      <div class="field"><div class="label">เลขที่ PO</div><div class="val">${job['PO']||'–'}</div></div>
      <div class="field"><div class="label">สถานะ</div><div class="val">${job['สถานะ']||'–'}</div></div>
    </div>
    <div class="field"><div class="label">รายละเอียดงาน</div><div class="val">${job['รายละเอียด']||'–'}</div></div>
    ${subItems.length > 0 ? `
    <table><thead><tr><th>#</th><th>รายการ</th><th>จำนวน</th><th>ส่งแล้ว</th><th>ราคา/หน่วย</th><th>สถานะ</th></tr></thead>
    <tbody>${subItems.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.qty} ${s.unit}</td><td>${s.sent}</td><td>${s.price||'–'}</td><td>${s.status}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="total-box">ยอดรวมสุทธิ (GRAND TOTAL): ฿${grandTotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
    <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`
    const w = window.open('','_blank','width=800,height=600')
    w.document.write(html); w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Drawer panel */}
      <div className="h-full w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ background:'#0a1929', borderLeft:'1px solid #1e3a5f' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-steel-800 shrink-0">
          <div>
            <div className="text-steel-500 text-xs font-mono mb-0.5">{job['เลขที่']}</div>
            <h2 className="text-white font-bold text-base">รายละเอียดงาน</h2>
          </div>
          <button onClick={onClose} className="text-steel-500 hover:text-white p-1 mt-0.5">
            <X size={18}/>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Status + date row */}
          <div className="flex items-center justify-between">
            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDrop(d => !d)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: sc.bg, border:`1px solid ${sc.border}`, color: sc.text }}>
                {status}
                <ChevronDown size={13}/>
              </button>
              {showStatusDrop && (
                <div className="absolute top-full left-0 mt-1 z-10 rounded-lg overflow-hidden shadow-xl"
                  style={{ background:'#0d2137', border:'1px solid #1e3a5f', minWidth:170 }}>
                  {STATUS_OPTIONS.map(s => {
                    const c = STATUS_COLORS[s] || STATUS_COLORS['งานใหม่']
                    return (
                      <button key={s} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                        onClick={() => { setStatus(s); setShowStatusDrop(false) }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.text }}/>
                        <span style={{ color: c.text }}>{s}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-steel-500">
              <Calendar size={12}/>
              สร้างเมื่อ: <span className="text-steel-300">{formatDate(job['วันที่'])}</span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              [<Building2 size={12}/>, 'บริษัท', job['บริษัท']],
              [<Package size={12}/>, 'ประเภทงาน', job['ประเภท']],
              [<User size={12}/>, 'ผู้แจ้ง', job['ผู้แจ้ง']],
              [<User size={12}/>, 'ผู้รับผิดชอบ', job['ผู้รับผิดชอบ']],
              [<Hash size={12}/>, 'เลขที่ PO', job['PO']],
              [<Package size={12}/>, 'จำนวนยอดเดิม', job['จำนวน']],
            ].map(([icon, label, val], i) => (
              <div key={i} className="rounded-lg p-3" style={{ background:'#071624', border:'1px solid #0f2744' }}>
                <div className="flex items-center gap-1.5 text-steel-600 text-xs mb-1">{icon}{label}</div>
                <div className="text-steel-200 text-sm font-medium">{val || <span className="text-steel-600">–</span>}</div>
              </div>
            ))}
          </div>

          {/* ── DO Delivery Summary ── */}
          {(jobDoList.length > 0 || job['อ้างใบส่งของ DO']) && (
            <div className="rounded-lg overflow-hidden" style={{ border:'1px solid #1e4d2e' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background:'rgba(34,197,94,0.08)' }}>
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color:'#4ade80' }}>
                  <Truck size={12}/> ใบส่งของ (Delivery Notes)
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-steel-500">ส่งรวม:</span>
                  <span className="font-mono font-bold text-green-400">{totalSentFromDO}</span>
                  {totalQty > 0 && <>
                    <span className="text-steel-600">/</span>
                    <span className="font-mono text-steel-400">{totalQty}</span>
                    <span className={`font-semibold ${totalSentFromDO >= totalQty ? 'text-green-400' : 'text-red-400'}`}>
                      {totalSentFromDO >= totalQty ? '✓ ครบแล้ว' : `ค้าง ${totalQty - totalSentFromDO}`}
                    </span>
                  </>}
                </div>
              </div>
              {jobDoList.length > 0 && (
                <div className="divide-y divide-steel-800/30">
                  {jobDoList.map((d, i) => {
                    const roundTotal = (d.items||[]).reduce((s,it)=>s+(parseInt(it.thisRound)||0),0)
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs" style={{ background:'rgba(0,0,0,0.15)' }}>
                        <span className="font-mono text-accent-400 shrink-0">{d.doNo}</span>
                        <span className="text-steel-400">{d.date}</span>
                        <span className="flex-1 text-steel-500 truncate">{d.customer}</span>
                        <span className="font-mono text-green-400 shrink-0">ส่ง {roundTotal} ชิ้น</span>
                        {d.items?.length > 0 && (
                          <div className="hidden lg:flex gap-1 flex-wrap">
                            {d.items.slice(0,2).map((it,j) => (
                              <span key={j} className="px-1.5 py-0.5 rounded text-xs text-steel-400" style={{ background:'#071624', border:'1px solid #0f2744' }}>
                                {it.name?.slice(0,20)} ×{it.thisRound}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {jobDoList.length === 0 && job['อ้างใบส่งของ DO'] && (
                <div className="px-3 py-2 text-xs text-steel-500">
                  อ้างอิง: {job['อ้างใบส่งของ DO']}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg p-3" style={{ background:'#071624', border:'1px solid #0f2744' }}>
            <div className="text-steel-600 text-xs mb-1.5 flex items-center gap-1.5">
              <FileText size={12}/> รายละเอียดงาน
            </div>
            <div className="text-steel-200 text-sm leading-relaxed">{job['รายละเอียด'] || '–'}</div>
            {job['ชื่อโครงการ'] && (
              <div className="mt-2 pt-2 border-t border-steel-800 text-xs text-blue-400">
                โครงการ: {job['ชื่อโครงการ']} {job['เลขที่โครงการ'] && `(${job['เลขที่โครงการ']})`}
              </div>
            )}
          </div>

          {/* Document attachments */}
          {docUrls.length > 0 && (
            <div>
              <div className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText size={12}/> เอกสารแนบ (ใบแจ้งงาน) · {docUrls.length} ไฟล์
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(docUrls.length, 3)}, 1fr)` }}>
                {docUrls.map((url, i) => (
                  <DocThumb key={i} url={url} label={`เอกสาร ${i+1}`} index={i}/>
                ))}
              </div>
            </div>
          )}

          {/* Sub-items table */}
          {subItems.length > 0 && (
            <div>
              <div className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                ≡ รายการย่อย (Sub-Items)
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid #1e3a5f' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background:'#071624' }}>
                      <th className="text-steel-500 font-medium px-3 py-2 text-center w-8">#</th>
                      <th className="text-steel-500 font-medium px-3 py-2 text-left">รายการ</th>
                      <th className="text-steel-500 font-medium px-3 py-2 text-center">จำนวน</th>
                      <th className="text-steel-500 font-medium px-3 py-2 text-right">ราคา/หน่วย</th>
                      <th className="text-steel-500 font-medium px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subItems.map((it, i) => <SubItemRow key={i} item={it} index={i}/>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales Summary */}
          <div className="rounded-lg p-4 space-y-3" style={{ background:'#071624', border:'1px solid #1e3a5f' }}>
            <div className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-1">สรุปยอดขาย (Sales Summary)</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg p-3 text-center" style={{ background:'#0a1929' }}>
                <div className="text-steel-500 text-xs mb-1">รวมเงิน (SUB TOTAL)</div>
                <div className="font-bold text-steel-200 font-mono">฿{subTotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background:'#0a1929' }}>
                <div className="text-steel-500 text-xs mb-1">ภาษีมูลค่าเพิ่ม (NET)</div>
                <div className="font-bold text-steel-200 font-mono">฿{vat.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background:'rgba(56,139,253,0.1)', border:'1px solid rgba(56,139,253,0.25)' }}>
                <div className="text-blue-400 text-xs mb-1 font-semibold">ยอดรวมสุทธิ (GRAND TOTAL)</div>
                <div className="font-bold text-white text-base font-mono">฿{grandTotal.toLocaleString('th-TH',{minimumFractionDigits:2})}</div>
              </div>
            </div>
            {/* Qty/DO row */}
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-steel-800">
              {[
                ['ยอดเดิม (จำนวนชิ้น)', job['จำนวน']],
                ['ส่งแล้ว (จำนวนชิ้น)', job['จำนวนส่งแล้ว']],
                ['ค้างส่ง', job['จำนวนค้างส่ง']],
                ['อ้างในใบส่งของ (DO)', job['อ้างใบส่งของ DO']],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-steel-600 text-xs">{label}</div>
                  <div className={`font-mono text-sm font-medium mt-0.5 ${
                    label==='ค้างส่ง' && parseInt(val||0)>0 ? 'text-red-400' : 'text-steel-300'
                  }`}>{val || '–'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Notes */}
          {doUrls.length > 0 && (
            <div>
              <div className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Truck size={12}/> ไฟล์เอกสารใบส่งของชั่วคราว (DELIVERY NOTES) · {doUrls.length} ไฟล์
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(doUrls.length, 3)}, 1fr)` }}>
                {doUrls.map((url, i) => (
                  <DocThumb key={i} url={url} label={`ใบส่งของ ${i+1}`} index={i}/>
                ))}
              </div>
            </div>
          )}

          {/* Remark */}
          {job['หมายเหตุ'] && (
            <div className="rounded-lg p-3" style={{ background:'rgba(250,204,21,0.06)', border:'1px solid rgba(250,204,21,0.2)' }}>
              <div className="text-yellow-500 text-xs mb-1">หมายเหตุ</div>
              <div className="text-steel-300 text-sm">{job['หมายเหตุ']}</div>
            </div>
          )}
        </div>

        {/* Footer action buttons */}
        <div className="border-t border-steel-800 px-5 py-3 flex items-center gap-2 shrink-0 flex-wrap" style={{ background:'#071624' }}>
          <button onClick={() => onEdit && onEdit(job)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background:'linear-gradient(135deg,#1d6fd8,#1a56b0)' }}>
            <Edit2 size={12}/> แก้ไขข้อมูลปัจจุบัน
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            📅 จัดการแผนงาน
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
            📦 สร้างใบส่งของ
          </button>
          <button onClick={() => printWorkRequest(job)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-steel-300 hover:text-white transition-colors"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid #1e3a5f' }}>
            <Printer size={12}/> พิมพ์ใบแจ้งงาน
          </button>
          <button onClick={() => onDelete && onDelete(job)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 transition-colors ml-auto"
            style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)' }}>
            🗑 ลบ
          </button>
        </div>
      </div>
    </div>
  )
}
