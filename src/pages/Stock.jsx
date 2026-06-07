import React, { useState, useMemo, useRef } from 'react'
import {
  Package, Plus, Search, RefreshCw, TrendingDown, TrendingUp,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, Camera,
  Edit2, Trash2, X, Check, Filter, Download, History,
  LayoutGrid, BarChart2, Clock, ArrowDownCircle, ArrowUpCircle,
  Wrench, Archive, Loader2, Image as ImageIcon
} from 'lucide-react'
import { postSheet } from '../api'

// ─────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────
const LOCAL_PARTS_KEY  = 'smec_parts_v1'
const LOCAL_HIST_KEY   = 'smec_history_v1'

const STATUSES = {
  new:        { label:'ใหม่',        color:'#4ade80', bg:'rgba(74,222,128,0.12)',  border:'rgba(74,222,128,0.3)' },
  repaired:   { label:'ซ่อม',        color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.3)' },
  waiting:    { label:'รอประกอบ',    color:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.3)' },
  waitingMC:  { label:'รอ MC',       color:'#fb923c', bg:'rgba(251,146,60,0.12)',  border:'rgba(251,146,60,0.3)' },
  MCnew:      { label:'MC ใหม่',     color:'#a78bfa', bg:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.3)' },
  MCrepaired: { label:'MC ซ่อม',     color:'#818cf8', bg:'rgba(129,140,248,0.12)', border:'rgba(129,140,248,0.3)' },
  mold:       { label:'หล่อ',        color:'#f472b6', bg:'rgba(244,114,182,0.12)', border:'rgba(244,114,182,0.3)' },
}

const TX_TYPES = {
  receive:   { label:'รับเข้า',  color:'#4ade80', icon:'↓' },
  sendout:   { label:'เบิกออก', color:'#f87171', icon:'↑' },
  transfer:  { label:'โอนย้าย', color:'#60a5fa', icon:'⇄' },
  edit:      { label:'แก้ไข',   color:'#fbbf24', icon:'✎' },
  addnew:    { label:'เพิ่มใหม่',color:'#a78bfa', icon:'+' },
}

const CATEGORIES = ['Extruder','Hammer Mill','อื่นๆ']

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
function nowStr() {
  return new Date().toLocaleString('th-TH', {
    year:'2-digit', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit'
  })
}
function totalStock(p) {
  return (p.new||0)+(p.repaired||0)+(p.waiting||0)+(p.waitingMC||0)+(p.MCnew||0)+(p.MCrepaired||0)+(p.mold||0)
}
function usableStock(p) { return (p.new||0)+(p.repaired||0) }

function StatusBadge({ type, count }) {
  if (!count) return null
  const s = STATUSES[type]
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {s.label}: {count}
    </span>
  )
}

// Status button พร้อมแสดงจำนวน (ใช้ใน receive/sendout/transfer)
function StatusBtn({ sKey, sVal, selected, count, onClick, disabled }) {
  return (
    <button onClick={() => !disabled && onClick(sKey)}
      disabled={disabled}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
      style={{
        background: selected ? sVal.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? sVal.border : '#1e3a5f'}`,
        color: selected ? sVal.color : '#64748b',
        opacity: disabled ? 0.4 : 1,
      }}>
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{background: sVal.color}}/>
        {sVal.label}
      </span>
      {count !== undefined && (
        <span className="font-mono text-xs ml-1 shrink-0" style={{color: selected ? sVal.color : '#475569'}}>
          ({count})
        </span>
      )}
    </button>
  )
}

function TxModal({ open, onClose, part, txType, onDone }) {
  const [qty, setQty] = useState('1')
  const [status, setStatus]     = useState('new')
  const [toStatus, setToStatus] = useState('repaired')
  const [remark, setRemark]     = useState('')
  const [imgData, setImgData]   = useState('')
  const imgRef  = useRef()
  const [saving, setSaving] = useState(false)

  // reset on open
  React.useEffect(() => {
    if (open) { setQty('1'); setStatus('new'); setToStatus('repaired'); setRemark(''); setImgData('') }
  }, [open, part?.id])

  if (!open || !part) return null

  const handleImg = (e) => {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setImgData(ev.target.result)
    r.readAsDataURL(f)
  }

  const handleSave = () => {
    setSaving(true)
    onDone({ qty: parseInt(qty)||1, status, toStatus, remark, imgData, txType })
    setSaving(false); onClose()
  }

  const configs = {
    receive:  { title:'รับเข้าอะไหล่',   icon:'📦', btnColor:'linear-gradient(135deg,#16a34a,#15803d)', btnText:'รับเข้าอะไหล่' },
    sendout:  { title:'เบิกออกอะไหล่',   icon:'📤', btnColor:'linear-gradient(135deg,#dc2626,#b91c1c)', btnText:'เบิกออกอะไหล่' },
    transfer: { title:'โอนย้ายสถานะ',     icon:'🔄', btnColor:'linear-gradient(135deg,#1d6fd8,#1a56b0)', btnText:'โอนย้ายสถานะ' },
  }
  const cfg = configs[txType] || configs.receive

  // สำหรับ sendout: disable สถานะที่มี 0 ชิ้น
  const statusDisabled = (k) => txType === 'sendout' && (part[k]||0) === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background:'#0d1f35', border:'1px solid #1e3a5f', maxHeight:'95vh' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background:'#1e3a5f'}}/>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <span>{cfg.icon}</span> {cfg.title}
          </h3>
          <button onClick={onClose} className="text-steel-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18}/>
          </button>
        </div>
        {/* Part name tag */}
        <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0"
          style={{background:'rgba(251,146,60,0.08)',border:'1px solid rgba(251,146,60,0.25)'}}>
          <span style={{fontSize:14}}>🔩</span>
          <span className="text-sm font-semibold" style={{color:'#fb923c'}}>{part.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          {/* ── RECEIVE: เลือก status ── */}
          {txType === 'receive' && (
            <div className="space-y-2">
              <label className="form-label">สถานะ:</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUSES).map(([k,v]) => (
                  <StatusBtn key={k} sKey={k} sVal={v} selected={status===k} onClick={setStatus}/>
                ))}
              </div>
            </div>
          )}

          {/* ── SENDOUT: เลือก status + แสดงจำนวนที่มี ── */}
          {txType === 'sendout' && (
            <div className="space-y-2">
              <label className="form-label">สถานะ:</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUSES).map(([k,v]) => (
                  <StatusBtn key={k} sKey={k} sVal={v} selected={status===k}
                    count={part[k]||0} disabled={statusDisabled(k)} onClick={setStatus}/>
                ))}
              </div>
            </div>
          )}

          {/* ── TRANSFER: จาก + ไปยัง ── */}
          {txType === 'transfer' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="form-label">จาก Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUSES).map(([k,v]) => (
                    <StatusBtn key={k} sKey={k} sVal={v} selected={status===k}
                      count={part[k]||0} disabled={(part[k]||0)===0} onClick={setStatus}/>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="form-label">ไปยัง Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUSES).map(([k,v]) => (
                    <StatusBtn key={k} sKey={k} sVal={v} selected={toStatus===k}
                      disabled={k===status} onClick={setToStatus}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* จำนวน */}
          <div>
            <label className="form-label">จำนวน (ชิ้น)</label>
            <div className="relative">
              <input type="number" min="1"
                max={txType==='sendout'||txType==='transfer' ? (part[status]||999) : undefined}
                className="w-full text-lg font-bold text-center py-3"
                value={qty} onChange={e=>setQty(e.target.value)}/>
            </div>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className="form-label">หมายเหตุ (ไม่บังคับ)</label>
            <input className="w-full" placeholder="เช่น เบิกเปลี่ยนเครื่อง A"
              value={remark} onChange={e=>setRemark(e.target.value)}/>
          </div>

          {/* แนบรูป */}
          <div className="rounded-xl p-3 space-y-2" style={{background:'rgba(255,255,255,0.03)',border:'1px solid #1e3a5f'}}>
            <label className="form-label mb-0 flex items-center gap-1.5">
              <span style={{fontSize:12}}>📸</span> แนบหลักฐานรูปภาพ (ไม่บังคับ)
            </label>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImg}/>
            {imgData ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden">
                <img src={imgData} className="w-full h-full object-cover"/>
                <button onClick={e=>{e.stopPropagation();setImgData('')}}
                  className="absolute top-1.5 right-1.5 bg-red-500 rounded-full p-1">
                  <X size={10} className="text-white"/>
                </button>
              </div>
            ) : (
              <button onClick={()=>imgRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-steel-400 hover:text-steel-200 transition-colors"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
                <span>📸</span> เลือกรูป
              </button>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-5 py-4 shrink-0 border-t border-steel-800">
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm font-medium text-steel-400 hover:text-white transition-colors"
            style={{background:'rgba(255,255,255,0.05)'}}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving || (txType==='sendout' && statusDisabled(status))}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
            style={{background: cfg.btnColor}}>
            {saving ? <Loader2 size={15} className="animate-spin"/> : <><span>{cfg.icon}</span>{cfg.btnText}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// PART FORM (เพิ่ม/แก้ไข)
// ─────────────────────────────────────────────────
function PartForm({ open, onClose, editPart, parts, onSaved, onDelete }) {
  const [form, setForm] = useState(() => editPart || {
    id: String(parts.length+1).padStart(3,'0'),
    name:'', category:'Extruder', minQty:2,
    new:0, repaired:0, waiting:0, waitingMC:0, MCnew:0, MCrepaired:0, mold:0,
    imgUrl:'', note:''
  })
  const [imgData, setImgData] = useState('')
  const imgRef = useRef()

  React.useEffect(() => {
    if (open) {
      setForm(editPart || {
        id: String(parts.length+1).padStart(3,'0'),
        name:'', category:'Extruder', minQty:2,
        new:0, repaired:0, waiting:0, waitingMC:0, MCnew:0, MCrepaired:0, mold:0,
        imgUrl:'', note:''
      })
      setImgData('')
    }
  }, [open, editPart?.id])

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleImg = (e) => {
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = ev => { setImgData(ev.target.result); set('imgUrl', ev.target.result) }
    r.readAsDataURL(f)
  }

  const previewSrc = imgData || form.imgUrl

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{ background:'#0d1f35', border:'1px solid #1e3a5f', maxHeight:'95vh' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background:'#1e3a5f'}}/>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <span>{editPart ? '✏️' : '➕'}</span>
            {editPart ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่ใหม่'}
          </h3>
          <button onClick={onClose} className="text-steel-500 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          {/* ID + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">รหัส (ID)</label>
              <input className="w-full" value={form.id} onChange={e=>set('id',e.target.value)}
                readOnly={!!editPart} style={editPart?{opacity:0.7}:{}}/>
            </div>
            <div>
              <label className="form-label">หมวดหมู่</label>
              <input list="cat-list" className="w-full" value={form.category}
                onChange={e=>set('category',e.target.value)} placeholder="Extruder"/>
              <datalist id="cat-list">{CATEGORIES.map(c=><option key={c} value={c}/>)}</datalist>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="form-label">ชื่ออะไหล่</label>
            <input className="w-full" placeholder="เช่น สกรู Ext. ชิ้นที่ 1 (Inlet)"
              value={form.name} onChange={e=>set('name',e.target.value)}/>
          </div>

          {/* Min Stock */}
          <div>
            <label className="form-label">จำนวนขั้นต่ำ (Min Stock)</label>
            <input type="number" min="0" className="w-full"
              value={form.minQty} onChange={e=>set('minQty',parseInt(e.target.value)||0)}/>
          </div>

          {/* Image URL + upload */}
          <div>
            <label className="form-label">รูปภาพ</label>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImg}/>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 text-xs py-2 px-3" placeholder="https://..."
                value={form.imgUrl||''} onChange={e=>set('imgUrl',e.target.value)}/>
              <button onClick={()=>imgRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{background:'rgba(56,139,253,0.15)',border:'1px solid rgba(56,139,253,0.35)',color:'#60a5fa'}}>
                <span>📸</span> เลือกรูป
              </button>
            </div>
            {previewSrc && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden"
                style={{border:'1px solid #1e3a5f'}}>
                <img src={previewSrc} className="w-full h-full object-cover"/>
                <button onClick={()=>{setImgData('');set('imgUrl','')}}
                  className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5">
                  <X size={9} className="text-white"/>
                </button>
              </div>
            )}
          </div>

          {/* Status quantities */}
          <div>
            <label className="form-label flex items-center gap-1.5">🎨 จำนวนแต่ละสถานะ</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                ['new',        '✅ พร้อมใช้ (ใหม่)',       '#4ade80'],
                ['repaired',   '🔧 พร้อมใช้ (ซ่อม)',       '#60a5fa'],
                ['waiting',    '🔗 รอประกอบ (บาเรล)',      '#fbbf24'],
                ['waitingMC',  '⏳ รอ Machine',             '#fb923c'],
                ['MCnew',      '⚙️ กำลัง Machine (ใหม่)', '#a78bfa'],
                ['MCrepaired', '⚙️ กำลัง Machine (ซ่อม)', '#818cf8'],
                ['mold',       '🏗️ หล่อ รอ Machine',      '#f472b6'],
              ].map(([k,label,color])=>(
                <div key={k} className="rounded-xl p-2.5" style={{background:'rgba(255,255,255,0.03)',border:`1px solid rgba(255,255,255,0.05)`}}>
                  <label className="text-xs mb-1.5 block font-semibold" style={{color}}>{label}</label>
                  <input type="number" min="0" className="w-full text-center text-base font-bold"
                    style={{background:'transparent',border:'1px solid #1e3a5f',borderRadius:8,padding:'6px'}}
                    value={form[k]||0} onChange={e=>set(k,parseInt(e.target.value)||0)}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 shrink-0 border-t border-steel-800">
          {editPart && (
            <button onClick={() => { if(window.confirm('ลบอะไหล่นี้ใช่ไหมครับ?')) { onDelete(editPart); onClose() }}}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all"
              style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',color:'#f87171'}}>
              <Trash2 size={13}/> ลบ
            </button>
          )}
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm text-steel-400 hover:text-white transition-colors"
            style={{background:'rgba(255,255,255,0.05)'}}>
            ยกเลิก
          </button>
          <button onClick={() => { onSaved({...form}); onClose() }}
            disabled={!form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 active:scale-95 transition-all"
            style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
            <span>💾</span> บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// PART CARD
// ─────────────────────────────────────────────────
function PartCard({ part, onAction }) {
  const total   = totalStock(part)
  const usable  = usableStock(part)
  const isLow   = usable <= part.minQty && part.minQty > 0
  const isEmpty = usable === 0

  const pct = part.minQty > 0
    ? Math.min(100, (usable / Math.max(1, part.minQty * 2)) * 100)
    : 50

  const barColor = isEmpty ? '#f87171' : isLow ? '#fbbf24' : '#4ade80'

  return (
    <div className="card p-3 flex flex-col gap-2 relative overflow-hidden"
      style={{ borderColor: isEmpty?'rgba(248,113,113,0.4)':isLow?'rgba(251,191,36,0.3)':'#1e3a5f' }}>
      {/* Low/Empty badge */}
      {(isEmpty || isLow) && (
        <div className="absolute top-2 right-2">
          {isEmpty
            ? <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold" style={{background:'rgba(248,113,113,0.15)',color:'#f87171',border:'1px solid rgba(248,113,113,0.3)'}}><XCircle size={10}/>หมด</span>
            : <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold" style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.3)'}}><AlertTriangle size={10}/>สต็อกต่ำ</span>
          }
        </div>
      )}

      {/* Header: image + info */}
      <div className="flex gap-2.5 items-start">
        <div className="w-14 h-14 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background:'#071624', border:'1px solid #0f2744' }}>
          {part.imgUrl
            ? <img src={part.imgUrl} alt={part.name} className="w-full h-full object-cover"/>
            : <Package size={20} className="text-steel-700"/>
          }
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-mono font-bold text-accent-400">{part.id}</span>
            <span className="text-xs text-steel-600">{part.category}</span>
          </div>
          <div className="text-steel-200 text-sm font-medium leading-tight truncate">{part.name}</div>
          {/* Stock number */}
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono" style={{color: isEmpty?'#f87171':isLow?'#fbbf24':'#4ade80'}}>{usable}</span>
            <span className="text-steel-500 text-xs">/ {total} ชิ้น (พร้อมใช้รวม)</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
        <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background:barColor}}/>
      </div>
      <div className="text-xs text-steel-600">ขั้นต่ำ {part.minQty} ชิ้น</div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(STATUSES).map(([k]) =>
          part[k] > 0 ? <StatusBadge key={k} type={k} count={part[k]}/> : null
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-1 mt-1">
        <button onClick={() => onAction(part,'receive')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold text-white transition-all active:scale-95"
          style={{background:'rgba(74,222,128,0.15)',border:'1px solid rgba(74,222,128,0.3)',color:'#4ade80'}}>
          <ArrowDownCircle size={12}/> รับเข้า
        </button>
        <button onClick={() => onAction(part,'sendout')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.3)',color:'#f87171'}}>
          <ArrowUpCircle size={12}/> เบิกออก
        </button>
        <button onClick={() => onAction(part,'transfer')}
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.3)',color:'#60a5fa'}}>
          <Wrench size={12}/> โอนย้าย
        </button>
      </div>
      <button onClick={() => onAction(part,'edit')}
        className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-steel-500 hover:text-white transition-colors"
        style={{background:'rgba(255,255,255,0.03)',border:'1px solid #1e3a5f'}}>
        <Edit2 size={11}/> แก้ไข
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────
// EXTRUDER SET DASHBOARD (ความพร้อม 1 ชุด)
// ─────────────────────────────────────────────────
function ExtruderSetDashboard({ parts }) {
  // กรุ๊ป screw (สกรู) และ sleeve (สลีฟ)
  const screwParts = parts.filter(p => p.name?.includes('สกรู') || p.name?.includes('Screw') || p.name?.toLowerCase().includes('สกรู'))
  const sleeveParts = parts.filter(p => p.name?.includes('สลีฟ') || p.name?.includes('Sleeve') || p.name?.toLowerCase().includes('สลีฟ'))

  // 1 set = 6 screw + 6 sleeve
  const screwSets = screwParts.length > 0
    ? Math.floor(Math.min(...screwParts.map(p => usableStock(p))))
    : 0
  const sleeveSets = sleeveParts.length > 0
    ? Math.floor(Math.min(...sleeveParts.map(p => usableStock(p))))
    : 0
  const completeSets = Math.min(screwSets, sleeveSets)

  const groups = [
    { label:'สกรู Extruder', parts: screwParts, icon:'⚙️' },
    { label:'สลีฟ Extruder', parts: sleeveParts, icon:'🔩' },
  ]

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚙️</span>
          <h3 className="text-steel-300 text-sm font-bold">ความพร้อม 1 ชุด EXTRUDER (6 ท่อน)</h3>
        </div>
        <div className="flex items-center gap-2">
          {completeSets > 0
            ? <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(74,222,128,0.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.3)'}}><Check size={11}/>พร้อม {completeSets} ชุด</span>
            : <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(248,113,113,0.12)',color:'#f87171',border:'1px solid rgba(248,113,113,0.3)'}}><X size={11}/>ไม่ครบชุด</span>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map(g => {
          const sets = g.parts.length > 0
            ? Math.floor(Math.min(...g.parts.map(p => usableStock(p))))
            : 0
          return (
            <div key={g.label} className="rounded-xl p-3" style={{background:'#071624',border:'1px solid #0f2744'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-steel-400 text-xs font-semibold">{g.icon} {g.label}</span>
                <div className="flex gap-2 text-center">
                  <div>
                    <div className="text-xs text-steel-600">ชุดใหม่</div>
                    <div className="text-lg font-bold" style={{color: sets>0?'#4ade80':'#f87171'}}>{sets>0?<Check size={14} className="inline"/>:'✗'}</div>
                    <div className="text-xs font-mono" style={{color:sets>0?'#4ade80':'#f87171'}}>{sets}</div>
                  </div>
                  <div className="w-px bg-steel-800"/>
                  <div>
                    <div className="text-xs text-steel-600">ชุดซ่อม</div>
                    <div className="text-lg font-bold text-blue-400"><Check size={14} className="inline"/></div>
                    <div className="text-xs font-mono text-blue-400">{g.parts.reduce((s,p)=>s+(p.repaired||0),0)}</div>
                  </div>
                </div>
              </div>
              {/* Part list */}
              <div className="space-y-1">
                <div className="grid grid-cols-4 text-xs text-steel-600 px-1 mb-1">
                  <span>ท่อน</span><span className="text-center text-green-500">ใหม่</span>
                  <span className="text-center text-blue-400">ซ่อม</span>
                  <span className="text-center text-steel-500">×</span>
                </div>
                {g.parts.slice(0,6).map((p,i) => (
                  <div key={i} className="grid grid-cols-4 text-xs py-1 px-1 rounded"
                    style={{background:'rgba(255,255,255,0.03)'}}>
                    <button className="text-accent-400 text-left hover:underline truncate"
                      style={{fontSize:10}}>
                      {p.id}
                    </button>
                    <span className="text-center font-mono" style={{color:'#4ade80'}}>{p.new||0}</span>
                    <span className="text-center font-mono" style={{color:'#60a5fa'}}>{p.repaired||0}</span>
                    <span className="text-center text-steel-600 text-xs">×{i<4?1:i===4?3:1}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// MAIN STOCK PAGE
// ─────────────────────────────────────────────────
export default function Stock({ spareParts: sheetData = [], sheetHistory = [] }) {
  // Merge sheet data with local
  const [localParts, setLocalPartsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_PARTS_KEY)||'[]') } catch { return [] }
  })
  const [history, setHistoryState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_HIST_KEY)||'[]') } catch { return [] }
  })

  const setLocalParts = fn => {
    setLocalPartsState(prev => {
      const next = typeof fn==='function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_PARTS_KEY, JSON.stringify(next))
      return next
    })
  }
  const addHistory = (record) => {
    setHistoryState(prev => {
      const next = [record, ...prev].slice(0, 500)
      localStorage.setItem(LOCAL_HIST_KEY, JSON.stringify(next))
      return next
    })
  }

  // Merge sheet + local (local overrides by id)
  // Sheet columns: id, Item_Name, Category, Status_Ready_New, Status_Ready_Repair,
  //   Status_Assembly_Wait, Status_Wait_Machine, Status_Machining_New, Status_Machining_Repair,
  //   Image_URL, Min_Stock, Status_Casting
  const parts = useMemo(() => {
    const localIds = new Set(localParts.map(p => p.id))
    const fromSheet = sheetData
      .filter(r => !localIds.has(String(r['id'] || r['ID'] || '')))
      .map(r => ({
        id:         String(r['id']   || r['ID']   || '').trim(),
        name:       r['Item_Name']   || r['ชื่ออะไหล่'] || r['ชื่อ'] || '',
        category:   r['Category']   || r['หมวดหมู่']   || 'Extruder',
        minQty:     parseInt(r['Min_Stock'] || r['Min'] || '2') || 0,
        new:        parseInt(r['Status_Ready_New']          || r['ใหม่']        || '0') || 0,
        repaired:   parseInt(r['Status_Ready_Repair']       || r['ซ่อม']        || '0') || 0,
        waiting:    parseInt(r['Status_Assembly_Wait']      || r['รอประกอบ']    || '0') || 0,
        waitingMC:  parseInt(r['Status_Wait_Machine']       || r['รอ MC']       || '0') || 0,
        MCnew:      parseInt(r['Status_Machining_New']      || r['MC ใหม่']     || '0') || 0,
        MCrepaired: parseInt(r['Status_Machining_Repair']   || r['MC ซ่อม']     || '0') || 0,
        mold:       parseInt(r['Status_Casting']            || r['หล่อ']        || '0') || 0,
        imgUrl:     r['Image_URL']   || r['รูป'] || '',
        note:       r['หมายเหตุ']   || '',
        fromSheet:  true,
      }))
    return [...localParts, ...fromSheet].sort((a,b) => (a.id||'').localeCompare(b.id||''))
  }, [localParts, sheetData])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [txModal, setTxModal] = useState({ open:false, part:null, type:'receive' })
  const [partForm, setPartForm] = useState({ open:false, editPart:null })
  const [histFilter, setHistFilter] = useState('all')
  const [histSearch, setHistSearch] = useState('')

  // Stats
  const stats = useMemo(() => ({
    total: parts.length,
    totalQty: parts.reduce((s,p)=>s+totalStock(p),0),
    low: parts.filter(p=>usableStock(p)<=p.minQty && p.minQty>0 && usableStock(p)>0).length,
    empty: parts.filter(p=>usableStock(p)===0).length,
  }), [parts])

  const filtered = useMemo(() => parts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
    const matchCat = !catFilter || p.category===catFilter
    const matchLow = !showLowOnly || usableStock(p) <= p.minQty
    return matchSearch && matchCat && matchLow
  }), [parts, search, catFilter, showLowOnly])

  // Merge sheet history (id, date, itemName, type IN/OUT/EDIT/ADD, details) + local history
  const allHistory = useMemo(() => {
    const fromSheet = sheetHistory.map(r => ({
      ts:       r['date'] || '',
      txType:   r['type']==='IN'?'receive': r['type']==='OUT'?'sendout': r['type']==='ADD'?'addnew':'edit',
      partId:   String(r['id']||'').padStart(3,'0'),
      partName: r['itemName'] || '',
      qty:      0,
      remark:   r['details'] || '',
      imgData:  r['details']?.includes('|PHOTO|') ? r['details'].split('|PHOTO|')[1] : '',
      fromSheet: true,
    }))
    return [...history, ...fromSheet].sort((a,b) => (b.ts||'').localeCompare(a.ts||''))
  }, [history, sheetHistory])

  const filteredHistory = useMemo(() => allHistory.filter(h => {
    const q = histSearch.toLowerCase()
    return (histFilter==='all' || h.txType===histFilter) &&
      (!q || h.partName?.toLowerCase().includes(q) || h.partId?.toLowerCase().includes(q) || h.remark?.toLowerCase().includes(q))
  }), [allHistory, histFilter, histSearch])

  const handleAction = (part, type) => {
    if (type === 'edit') { setPartForm({ open:true, editPart: {...part} }); return }
    setTxModal({ open:true, part, type })
  }

  const handleDelete = (part) => {
    setLocalParts(ps => ps.filter(p => p.id !== part.id))
    addHistory({ ts:nowStr(), txType:'edit', partId:part.id, partName:part.name, qty:0, remark:'ลบอะไหล่ออกจากระบบ' })
    postSheet({ action:'addSparePartHistory', data:{
      date: new Date().toLocaleString('th-TH'),
      itemName: part.name,
      type: 'EDIT',
      details: 'ลบออกจากระบบ',
    }}).catch(()=>{})
  }

  const handleTxDone = ({ qty, status, toStatus, remark, imgData, txType }) => {
    const part = txModal.part
    let updatedPart = { ...part }

    setLocalParts(ps => {
      const existing = ps.find(p=>p.id===part.id)
      let updated = existing ? {...existing} : {...part}
      if (txType === 'receive')   updated[status] = (updated[status]||0) + qty
      if (txType === 'sendout')   updated[status] = Math.max(0,(updated[status]||0)-qty)
      if (txType === 'transfer') {
        updated[status]   = Math.max(0,(updated[status]||0)-qty)
        updated[toStatus] = (updated[toStatus]||0)+qty
      }
      updatedPart = updated
      if (existing) return ps.map(p=>p.id===part.id ? updated : p)
      return [updated, ...ps]
    })

    // บันทึกกลับ Google Sheet
    const typeMap = { receive:'IN', sendout:'OUT', transfer:'EDIT', edit:'EDIT' }
    const detailTx = txType==='transfer'
      ? `โอนย้าย ${STATUSES[status]?.label||status} → ${STATUSES[toStatus]?.label||toStatus} ${qty} ชิ้น${remark?' | '+remark:''}${imgData?'|PHOTO|'+imgData:''}`
      : txType==='receive' ? `รับเข้า ${qty} ชิ้น [${STATUSES[status]?.label||status}]${remark?' | '+remark:''}${imgData?'|PHOTO|'+imgData:''}`
      : `เบิกออก ${qty} ชิ้น [${STATUSES[status]?.label||status}]${remark?' | '+remark:''}${imgData?'|PHOTO|'+imgData:''}`

    postSheet({ action:'addSparePartHistory', data:{
      date: new Date().toLocaleString('th-TH'),
      itemName: part.name,
      type: typeMap[txType] || 'EDIT',
      details: detailTx,
    }}).catch(()=>{}) // ไม่ block UI ถ้า offline

    // update stock ใน sheet
    postSheet({ action:'updateSparePart', data:{
      id: updatedPart.id,
      Status_Ready_New:        updatedPart.new        || 0,
      Status_Ready_Repair:     updatedPart.repaired   || 0,
      Status_Assembly_Wait:    updatedPart.waiting    || 0,
      Status_Wait_Machine:     updatedPart.waitingMC  || 0,
      Status_Machining_New:    updatedPart.MCnew      || 0,
      Status_Machining_Repair: updatedPart.MCrepaired || 0,
      Status_Casting:          updatedPart.mold       || 0,
    }}).catch(()=>{})

    addHistory({
      ts: nowStr(), txType, partId: part.id, partName: part.name,
      qty, status, toStatus: txType==='transfer'?toStatus:undefined,
      remark, imgData,
    })
  }

  const handlePartSaved = (part) => {
    setLocalParts(ps => {
      const exists = ps.find(p=>p.id===part.id)
      if (exists) return ps.map(p=>p.id===part.id ? part : p)
      return [...ps, part]
    })
    // บันทึกใหม่หรืออัพเดท sheet
    if (!part.fromSheet) {
      postSheet({ action:'addSparePart', data:{
        id: part.id,
        Item_Name:               part.name,
        Category:                part.category,
        Status_Ready_New:        part.new        || 0,
        Status_Ready_Repair:     part.repaired   || 0,
        Status_Assembly_Wait:    part.waiting    || 0,
        Status_Wait_Machine:     part.waitingMC  || 0,
        Status_Machining_New:    part.MCnew      || 0,
        Status_Machining_Repair: part.MCrepaired || 0,
        Status_Casting:          part.mold       || 0,
        Image_URL:               part.imgUrl     || '',
        Min_Stock:               part.minQty     || 2,
      }}).catch(()=>{})
    } else {
      postSheet({ action:'updateSparePart', data:{
        id: part.id,
        Item_Name: part.name, Category: part.category,
        Min_Stock: part.minQty, Image_URL: part.imgUrl||'',
      }}).catch(()=>{})
    }
    addHistory({ ts:nowStr(), txType:'addnew', partId:part.id, partName:part.name, qty:totalStock(part), remark:'เพิ่ม/แก้ไขอะไหล่' })
  }

  const exportCSV = () => {
    const cols = ['ID','ชื่อ','หมวดหมู่','ใหม่','ซ่อม','รอประกอบ','รอ MC','MC ใหม่','MC ซ่อม','หล่อ','รวม','พร้อมใช้','Min']
    const rows = parts.map(p=>[p.id,p.name,p.category,p.new||0,p.repaired||0,p.waiting||0,p.waitingMC||0,p.MCnew||0,p.MCrepaired||0,p.mold||0,totalStock(p),usableStock(p),p.minQty])
    const csv = '\uFEFF'+[cols,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    a.download = `spare-parts-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const TABS = [
    { id:'dashboard', label:'Dashboard', icon:<BarChart2 size={14}/> },
    { id:'parts',     label:'อะไหล่ทั้งหมด', icon:<LayoutGrid size={14}/> },
    { id:'history',   label:'ประวัติ',    icon:<History size={14}/> },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">สต็อกอะไหล่</h1>
          <p className="text-steel-400 text-sm mt-0.5">SMEC Spare Parts Management</p>
        </div>
        <button onClick={() => setPartForm({open:true, editPart:null})}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
          style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
          <Plus size={15}/> เพิ่มอะไหล่
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid #1e3a5f',width:'fit-content'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab===tab.id ? 'rgba(56,139,253,0.2)' : 'transparent',
              color: activeTab===tab.id ? '#60a5fa' : '#4a6584',
              border: activeTab===tab.id ? '1px solid rgba(56,139,253,0.35)' : '1px solid transparent'
            }}>
            {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {activeTab==='dashboard' && (
        <div className="space-y-4">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'รายการอะไหล่', val:stats.total, color:'#60a5fa', icon:<Package size={16}/> },
              { label:'ชิ้นรวมทั้งหมด', val:stats.totalQty.toLocaleString(), color:'#4ade80', icon:<Archive size={16}/> },
              { label:'สต็อกต่ำ', val:stats.low, color:'#fbbf24', icon:<AlertTriangle size={16}/> },
              { label:'หมดสต็อก', val:stats.empty, color:'#f87171', icon:<XCircle size={16}/> },
            ].map(c => (
              <div key={c.label} className="metric-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-steel-400 text-xs uppercase tracking-wider">{c.label}</p>
                    <p className="text-3xl font-bold mt-2 font-mono" style={{color:c.color}}>{c.val}</p>
                  </div>
                  <div className="p-2 rounded-lg mt-0.5" style={{background:`${c.color}18`}}>
                    <span style={{color:c.color}}>{c.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Extruder set readiness */}
          <ExtruderSetDashboard parts={parts.filter(p=>p.category==='Extruder')}/>

          {/* Low/Empty alerts */}
          {(stats.low > 0 || stats.empty > 0) && (
            <div className="card p-4">
              <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-yellow-400"/> แจ้งเตือนสต็อก
              </h3>
              <div className="space-y-2">
                {parts.filter(p => usableStock(p) === 0 && p.minQty > 0).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.25)'}}>
                    <div className="flex items-center gap-2">
                      <XCircle size={13} className="text-red-400 shrink-0"/>
                      <span className="text-xs font-mono text-accent-400">{p.id}</span>
                      <span className="text-sm text-steel-200">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-400 text-sm">0/{p.minQty} ชิ้น</span>
                      <button onClick={() => handleAction(p,'receive')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white active:scale-95"
                        style={{background:'rgba(74,222,128,0.2)',border:'1px solid rgba(74,222,128,0.4)',color:'#4ade80'}}>
                        + รับเข้า
                      </button>
                    </div>
                  </div>
                ))}
                {parts.filter(p => usableStock(p) > 0 && usableStock(p) <= p.minQty && p.minQty > 0).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)'}}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} className="text-yellow-400 shrink-0"/>
                      <span className="text-xs font-mono text-accent-400">{p.id}</span>
                      <span className="text-sm text-steel-200">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-yellow-400 text-sm">{usableStock(p)}/{p.minQty} ชิ้น</span>
                      <button onClick={() => handleAction(p,'receive')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold active:scale-95"
                        style={{background:'rgba(251,191,36,0.15)',border:'1px solid rgba(251,191,36,0.35)',color:'#fbbf24'}}>
                        + รับเข้า
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status summary table */}
          <div className="card overflow-hidden">
            <div className="p-3 border-b border-steel-800 flex items-center justify-between">
              <span className="text-steel-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Package size={12}/> สถานะอะไหล่ EXTRUDER
              </span>
              <button onClick={exportCSV} className="flex items-center gap-1 text-xs text-steel-500 hover:text-white transition-colors">
                <Download size={11}/> Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>อะไหล่</th>
                    <th className="text-center text-green-400">ใหม่</th>
                    <th className="text-center text-blue-400">ซ่อม</th>
                    <th className="text-center text-yellow-400">รอประกอบ</th>
                    <th className="text-center text-orange-400">รอ MC</th>
                    <th className="text-center text-purple-400">MC ใหม่</th>
                    <th className="text-center text-indigo-400">MC ซ่อม</th>
                    <th className="text-center text-pink-400">หล่อ</th>
                    <th className="text-center text-steel-300">รวม</th>
                    <th className="text-center text-green-400">พร้อม</th>
                    <th className="text-center text-steel-500">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p,i) => {
                    const ready = usableStock(p)
                    const total = totalStock(p)
                    return (
                      <tr key={i} className="hover:bg-white/[0.02] cursor-pointer" onClick={()=>handleAction(p,'receive')}>
                        <td className="font-mono text-accent-400">{p.id}</td>
                        <td className="text-steel-200">{p.name}</td>
                        {['new','repaired','waiting','waitingMC','MCnew','MCrepaired','mold'].map(k=>(
                          <td key={k} className="text-center font-mono">
                            {p[k]>0 ? <span style={{color:STATUSES[k]?.color}}>{p[k]}</span> : <span className="text-steel-700">-</span>}
                          </td>
                        ))}
                        <td className="text-center font-mono font-bold text-steel-300">{total}</td>
                        <td className="text-center font-mono font-bold" style={{color:ready===0?'#f87171':ready<=p.minQty?'#fbbf24':'#4ade80'}}>{ready}</td>
                        <td className="text-center font-mono text-steel-500">{p.minQty}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PARTS GRID TAB ── */}
      {activeTab==='parts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1" style={{minWidth:160}}>
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
              <input className="w-full pl-8 pr-3 py-2 text-sm" placeholder="ค้นหาอะไหล่..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="text-sm py-2 px-2" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
              <option value="">ทุกหมวด</option>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setShowLowOnly(v=>!v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{background:showLowOnly?'rgba(251,191,36,0.15)':'rgba(255,255,255,0.05)',
                border:`1px solid ${showLowOnly?'rgba(251,191,36,0.4)':'#1e3a5f'}`,
                color:showLowOnly?'#fbbf24':'#64748b'}}>
              <AlertTriangle size={11}/> สต็อกต่ำ
            </button>
            <span className="text-xs text-steel-500 ml-auto">{filtered.length} รายการ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(p => (
              <PartCard key={p.id} part={p} onAction={handleAction}/>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-steel-600">
                <Package size={40} className="mx-auto mb-3 opacity-20"/>
                ไม่พบอะไหล่ที่ตรงกัน
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab==='history' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1" style={{minWidth:160}}>
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
              <input className="w-full pl-8 pr-3 py-2 text-xs" placeholder="ค้นหา ID, ชื่อ, หมายเหตุ..."
                value={histSearch} onChange={e=>setHistSearch(e.target.value)}/>
            </div>
            <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f'}}>
              {[['all','ทั้งหมด'],['receive','รับเข้า'],['sendout','เบิกออก'],['transfer','โอนย้าย'],['edit','แก้ไข'],['addnew','เพิ่มใหม่']].map(([v,l])=>(
                <button key={v} onClick={()=>setHistFilter(v)}
                  className="px-2.5 py-1.5 text-xs transition-colors"
                  style={{background:histFilter===v?'rgba(56,139,253,0.2)':'transparent',color:histFilter===v?'#60a5fa':'#4a6584'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>วันที่-เวลา</th>
                    <th>ID</th>
                    <th>อะไหล่</th>
                    <th>ประเภท</th>
                    <th>รายละเอียด</th>
                    <th>รูป</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length===0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-steel-600">ยังไม่มีประวัติ</td></tr>
                  )}
                  {filteredHistory.map((h,i)=>{
                    const tx = TX_TYPES[h.txType] || TX_TYPES.edit
                    const detail = h.txType==='transfer'
                      ? `${STATUSES[h.status]?.label||h.status} → ${STATUSES[h.toStatus]?.label||h.toStatus} (${h.qty} ชิ้น)`
                      : h.txType==='receive' ? `รับ ${h.qty} ชิ้น [${STATUSES[h.status]?.label||h.status}]`
                      : h.txType==='sendout' ? `เบิก ${h.qty} ชิ้น [${STATUSES[h.status]?.label||h.status}]`
                      : h.remark || '–'
                    return (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="text-steel-600">{filteredHistory.length-i}</td>
                        <td className="text-steel-500 whitespace-nowrap">{h.ts}</td>
                        <td className="font-mono text-accent-400">{h.partId}</td>
                        <td className="text-steel-200">{h.partName}</td>
                        <td>
                          <span className="px-1.5 py-0.5 rounded font-semibold text-xs"
                            style={{background:`${tx.color}15`,color:tx.color,border:`1px solid ${tx.color}30`}}>
                            {tx.icon} {tx.label}
                          </span>
                        </td>
                        <td className="text-steel-400 max-w-xs">
                          <div className="truncate">{detail}</div>
                          {h.remark && h.txType!=='edit' && <div className="text-steel-600 truncate">{h.remark}</div>}
                        </td>
                        <td>
                          {h.imgData
                            ? <img src={h.imgData} alt="" className="w-8 h-8 rounded object-cover cursor-pointer"
                                style={{border:'1px solid #1e3a5f'}}/>
                            : <span className="text-steel-700">–</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TxModal open={txModal.open} onClose={()=>setTxModal(v=>({...v,open:false}))}
        part={txModal.part} txType={txModal.type} onDone={handleTxDone}/>
      <PartForm open={partForm.open} onClose={()=>setPartForm({open:false,editPart:null})}
        editPart={partForm.editPart} parts={parts} onSaved={handlePartSaved} onDelete={handleDelete}/>
    </div>
  )
}
