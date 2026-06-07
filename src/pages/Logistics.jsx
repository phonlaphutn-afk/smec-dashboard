import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Truck, Key, FileText, Search, Plus, X, BarChart2, History,
  Printer, Download, ChevronDown, Camera, Trash2, CheckCircle2,
  Package, Calendar, Building2, Hash, AlertCircle, ExternalLink
} from 'lucide-react'
import { formatDate, postSheet } from '../api'

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const COMPANIES = ['BFLPC','BFL','BFLFP','SMEC','อื่นๆ']
const COMPANY_LABELS = { BFLPC:'บจก. บลูฟาโล', BFL:'บ. บลูฟาโล้ จำกัด', BFLFP:'บ. บลูฟาโล้ เพ็ทแคร์ฯ', SMEC:'SMEC' }
const LOCAL_DO_KEY = 'smec_do_v1'
const LOCAL_GP_KEY = 'smec_gp_v1'
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function todayStr() {
  return new Date().toISOString().slice(0,10)
}
function fmtDateTH(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
}
function genDONo(existing) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const prefix = `DO-${yy}${mm}`
  const nums = existing
    .map(d => d.doNo || '')
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix+'-',''))||0)
  const next = nums.length > 0 ? Math.max(...nums)+1 : 1
  return `${prefix}-${String(next).padStart(3,'0')}`
}
function genGPNo(existing) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth()+1).padStart(2,'0')
  const prefix = `GP-${yy}${mm}`
  const nums = existing
    .map(d => d.gpNo || '')
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.replace(prefix+'-',''))||0)
  const next = nums.length > 0 ? Math.max(...nums)+1 : 1
  return `${prefix}-${String(next).padStart(3,'0')}`
}

// ─────────────────────────────────────────────────────────────────
// Signature Pad (Canvas)
// ─────────────────────────────────────────────────────────────────
function SignaturePad({ value, onChange, label }) {
  const canvasRef = useRef()
  const drawing = useRef(false)
  const [signed, setSigned] = useState(!!value)

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
        ctx.drawImage(img,0,0)
      }
      img.src = value
    }
  }, [])

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect()
    const src = e.touches?.[0] || e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e, canvasRef.current)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  const draw = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineWidth = 2; ctx.strokeStyle = '#1e3a5f'; ctx.lineCap = 'round'
    const p = getPos(e, canvasRef.current)
    ctx.lineTo(p.x, p.y); ctx.stroke()
    setSigned(true)
  }
  const end = () => {
    drawing.current = false
    onChange(canvasRef.current.toDataURL())
  }
  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
    setSigned(false); onChange('')
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="form-label mb-0">{label}</span>
        {signed && <button onClick={clear} className="text-xs text-red-400 hover:text-red-300">ล้าง</button>}
      </div>
      <div className="rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f', background:'#f8fafc', cursor:'crosshair'}}>
        <canvas ref={canvasRef} width={280} height={80}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          style={{display:'block',width:'100%',height:80}}/>
      </div>
      {!signed && <p className="text-xs text-steel-600">วาดลายเซ็นในช่องด้านบน</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Image Uploader (base64)
// ─────────────────────────────────────────────────────────────────
function ImageUploader({ images, setImages, max=10, label='แนบรูป' }) {
  const inputRef = useRef()
  const handlePick = (e) => {
    const files = Array.from(e.target.files).slice(0, max - images.length)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setImages(imgs => [...imgs, { name: file.name, data: ev.target.result }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="form-label mb-0">{label} (สูงสุด {max})</span>
        <span className="text-xs text-steel-600">{images.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img,i) => (
          <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f'}}>
            <img src={img.data} alt="" className="w-full h-full object-cover"/>
            <button onClick={() => setImages(imgs=>imgs.filter((_,j)=>j!==i))}
              className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={8} className="text-white"/>
            </button>
          </div>
        ))}
        {images.length < max && (
          <button onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-steel-600 hover:text-steel-400 transition-colors"
            style={{border:'2px dashed #1e3a5f'}}>
            <Camera size={14}/>
            <span style={{fontSize:9}}>เพิ่ม</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePick}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
function LogisticsDashboard({ doList, gpList }) {
  const thisMonth = new Date().toISOString().slice(0,7)
  const stats = useMemo(() => {
    const doThis = doList.filter(d => (d.date||'').startsWith(thisMonth))
    const gpThis = gpList.filter(g => (g.date||'').startsWith(thisMonth))
    const byComp = {}
    doList.forEach(d => {
      const c = d.customer || 'อื่นๆ'
      if (!byComp[c]) byComp[c] = { do:0, gp:0 }
      byComp[c].do++
    })
    gpList.forEach(g => {
      const c = g.company || 'อื่นๆ'
      if (!byComp[c]) byComp[c] = { do:0, gp:0 }
      byComp[c].gp++
    })
    return { totalDO: doList.length, totalGP: gpList.length, thisMonthDO: doThis.length, thisMonthGP: gpThis.length,
             byComp: Object.entries(byComp).sort(([,a],[,b])=>(b.do+b.gp)-(a.do+a.gp)) }
  }, [doList, gpList, thisMonth])

  const recentDO = [...doList].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5)
  const recentGP = [...gpList].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'ใบส่งของทั้งหมด', val:stats.totalDO, sub:'รายการ', color:'#60a5fa', icon:<Truck size={16}/> },
          { label:'เดือนนี้ (DO)', val:stats.thisMonthDO, sub:'รายการ', color:'#4ade80', icon:<FileText size={16}/> },
          { label:'Gate Pass ทั้งหมด', val:stats.totalGP, sub:'รายการ', color:'#fb923c', icon:<Key size={16}/> },
          { label:'เดือนนี้ (GP)', val:stats.thisMonthGP, sub:'รายการ', color:'#c084fc', icon:<Key size={16}/> },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-steel-400 text-xs uppercase tracking-wider">{c.label}</p>
                <p className="text-3xl font-bold mt-2" style={{color:c.color}}>{c.val}</p>
                <p className="text-steel-500 text-xs mt-1">{c.sub}</p>
              </div>
              <div className="p-2 rounded-lg" style={{background:`${c.color}18`}}>
                <span style={{color:c.color}}>{c.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 size={12}/>แยกตามบริษัท</h3>
          {stats.byComp.length === 0 ? <div className="text-steel-600 text-xs text-center py-4">ยังไม่มีข้อมูล</div> :
          stats.byComp.map(([comp,d]) => (
            <div key={comp} className="mb-2.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-steel-300">{comp}</span>
                <span className="text-steel-500">DO:{d.do} GP:{d.gp}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full" style={{width:`${Math.min(100,(d.do+d.gp)/Math.max(1,stats.totalDO+stats.totalGP)*100*3)}%`,background:'linear-gradient(90deg,#60a5fa,#818cf8)'}}/>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Truck size={12}/>ใบส่งของล่าสุด</h3>
          {recentDO.length === 0 ? <div className="text-steel-600 text-xs text-center py-4">ยังไม่มีข้อมูล</div> :
          recentDO.map((d,i) => (
            <div key={i} className="flex items-start gap-2 py-2 border-b border-steel-800/30 last:border-0">
              <div className="shrink-0 mt-0.5">
                <span className="font-mono text-xs text-accent-400">{d.doNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-steel-300 truncate">{d.customer}</div>
                <div className="text-xs text-steel-600">{fmtDateTH(d.date)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Key size={12}/>Gate Pass ล่าสุด</h3>
          {recentGP.length === 0 ? <div className="text-steel-600 text-xs text-center py-4">ยังไม่มีข้อมูล</div> :
          recentGP.map((g,i) => (
            <div key={i} className="flex items-start gap-2 py-2 border-b border-steel-800/30 last:border-0">
              <div className="shrink-0 mt-0.5">
                <span className="font-mono text-xs" style={{color:'#fb923c'}}>{g.gpNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-steel-300 truncate">{g.requesterName}</div>
                <div className="text-xs text-steel-600">{fmtDateTH(g.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// DO FORM
// ─────────────────────────────────────────────────────────────────
function DOForm({ jobs, doList, onSaved, editData=null, onClose }) {
  const doNo = editData?.doNo || genDONo(doList)
  const [customer, setCustomer] = useState(editData?.customer || 'BFLPC')
  const [customCustomer, setCustomCustomer] = useState(editData?.customCustomer || '')
  const [dept, setDept] = useState(editData?.dept || '')
  const [date, setDate] = useState(editData?.date || todayStr())
  const [poRef, setPoRef] = useState(editData?.poRef || '')
  const [imgLinks, setImgLinks] = useState(editData?.imgLinks || '')
  const [images, setImages] = useState([])
  const [signature, setSignature] = useState(editData?.signature || '')
  const [items, setItems] = useState(editData?.items || [{ name:'', total:1, sent:0, thisRound:1, unit:'EA', note:'' }])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [linkedJob, setLinkedJob] = useState(editData?.jobNo || '')

  const selectedJob = jobs.find(j => j['เลขที่'] === linkedJob)

  const loadFromJob = () => {
    if (!selectedJob) return
    setPoRef(selectedJob['PO'] || '')
    // find company
    const co = selectedJob['บริษัท'] || ''
    if (COMPANIES.includes(co)) setCustomer(co)
    else { setCustomer('อื่นๆ'); setCustomCustomer(co) }
    // load sub-items
    const subs = (selectedJob['รายการย่อย']||'').split('\n')
      .filter(l=>l.trim().startsWith('-'))
      .map(l => {
        const m = l.match(/^- (.*?)\s+\((\d+)\/(\d+)\s+(.*?)\)/)
        return m ? { name:m[1], total:parseInt(m[2]), sent:parseInt(m[3]), thisRound:Math.max(0,parseInt(m[2])-parseInt(m[3])), unit:m[4], note:'' } : null
      }).filter(Boolean)
    if (subs.length > 0) setItems(subs)
    else setItems([{ name: selectedJob['รายละเอียด']||'', total:1, sent:0, thisRound:1, unit:'EA', note:'' }])
  }

  const addItem = () => setItems(is => [...is, { name:'', total:1, sent:0, thisRound:1, unit:'EA', note:'' }])
  const updateItem = (i,k,v) => setItems(is => is.map((it,j) => j===i ? {...it,[k]:v} : it))
  const removeItem = (i) => setItems(is => is.filter((_,j)=>j!==i))

  const companyLabel = customer==='อื่นๆ' ? customCustomer : (COMPANY_LABELS[customer]||customer)

  const printDO = () => {
    const allImgs = [
      ...images.map(img => img.data),
      ...(imgLinks ? imgLinks.split('\n').map(s=>s.trim()).filter(Boolean) : [])
    ]
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>ใบส่งของชั่วคราว ${doNo}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
      body{font-family:'Sarabun',sans-serif;font-size:11px;color:#000;margin:0;padding:0}
      .page{width:210mm;min-height:148mm;margin:0 auto;padding:12mm 15mm;border:1px solid #999;position:relative;page-break-after:always}
      .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}
      .logo{width:50px;height:50px;object-fit:contain}
      .co-name{font-size:12px;font-weight:700;color:#1a3a5c}
      .co-sub{font-size:9px;color:#555;letter-spacing:.5px}
      .title{text-align:center;font-size:16px;font-weight:700;margin:6px 0;letter-spacing:1px}
      .copy-badge{float:right;font-size:10px;font-weight:700;border:2px solid #1a3a5c;padding:2px 8px;border-radius:4px;color:#1a3a5c}
      .docno{text-align:right;font-size:10px;color:#555;margin-bottom:8px}
      .cb-row{display:flex;gap:20px;margin:6px 0;font-size:10px}
      .cb-item{display:flex;align-items:center;gap:4px}
      .cb{width:11px;height:11px;border:1px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:8px}
      .dept-row{font-size:10px;margin:4px 0;border-bottom:1px solid #333;padding-bottom:2px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
      th{background:#1a3a5c;color:#fff;padding:4px 6px;text-align:center;border:1px solid #999}
      td{padding:3px 5px;border:1px solid #ccc;text-align:center}
      td.name{text-align:left}
      .sig-row{display:flex;justify-content:space-between;margin-top:12px;gap:20px}
      .sig-box{flex:1;text-align:center}
      .sig-line{border-bottom:1px solid #333;margin:2px 0;min-height:40px;display:flex;align-items:flex-end;justify-content:center}
      .sig-img{max-height:36px;max-width:120px}
      .sig-label{font-size:9px;color:#555}
      .img-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .img-item{text-align:center}
      .img-item img{max-width:120px;max-height:100px;border:1px solid #ccc;border-radius:4px}
      .img-caption{font-size:8px;color:#777;margin-top:2px}
      @media print{@page{size:A5 landscape;margin:8mm}body{margin:0}.page{border:none;page-break-after:always}}
    </style></head><body>
    ${['ต้นฉบับ','สำเนา'].map(copy => `
    <div class="page">
      <div style="overflow:hidden">
        <span class="copy-badge">${copy}</span>
        <div class="logo-row">
          <div>
            <div class="co-name">บริษัท สยามแมค เอ็นจิเนียริ้ง แอนด์ คอนสตรัคชั่น จำกัด</div>
            <div class="co-sub">SIAMMAC ENGINEERING & CONSTRUCTION CO.,LTD.</div>
          </div>
        </div>
      </div>
      <div class="title">ใบส่งของชั่วคราว</div>
      <div class="docno">เลขที่: ${doNo}</div>
      <div class="cb-row">
        <span style="font-size:10px">สำหรับบริษัท:</span>
        ${['BFL','BFLFP','BFLPC'].map(c=>`<span class="cb-item"><span class="cb">${customer===c?'✓':''}</span> ${COMPANY_LABELS[c]||c}</span>`).join('')}
        <span class="cb-item"><span class="cb">${customer==='อื่นๆ'?'✓':''}</span> อื่นๆ ${customer==='อื่นๆ'?customCustomer:'...............................'}  </span>
      </div>
      <div class="dept-row">แผนก: ${dept||'...................................'}</div>
      <table>
        <thead><tr><th style="width:30px">ลำดับ</th><th>รายการ</th><th style="width:60px">จำนวน</th><th style="width:80px">หมายเหตุ</th></tr></thead>
        <tbody>
          ${items.map((it,i)=>`<tr><td>${i+1}</td><td class="name">${it.name||''}</td><td>${it.thisRound||''} ${it.unit||'EA'}</td><td>${it.note||''}</td></tr>`).join('')}
          ${Array.from({length:Math.max(0,10-items.length)},(_,i)=>`<tr><td>${items.length+i+1}</td><td></td><td></td><td></td></tr>`).join('')}
          ${allImgs.length===0?`<tr><td colspan="4" style="text-align:center;color:#aaa;height:30px">**แนบรูปภาพ**</td></tr>`:''}
        </tbody>
      </table>
      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line">${signature?`<img src="${signature}" class="sig-img"/>`:'X'}</div>
          <div class="sig-label">(${signature?'ผู้ส่งสินค้า':'.......................'})</div>
          <div class="sig-label">ผู้ส่งสินค้า / วันที่ ${fmtDateTH(date)}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">X</div>
          <div class="sig-label">(..........................)</div>
          <div class="sig-label">ผู้รับสินค้า / วันที่ .............</div>
        </div>
      </div>
      ${allImgs.length>0?`<div class="img-grid">${allImgs.map((src,i)=>`<div class="img-item"><img src="${src}"/><div class="img-caption">รูปที่ ${i+1}</div></div>`).join('')}</div>`:''}
    </div>`).join('')}
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`
    const w = window.open('','_blank','width=900,height=700'); w.document.write(html); w.document.close()
  }

  const handleSave = async () => {
    setSaving(true)
    const record = {
      doNo, customer: companyLabel, customCustomer,
      dept, date, poRef, imgLinks,
      signature,
      items,
      jobNo: linkedJob,
      images: images.map(i=>i.data),
      createdAt: new Date().toISOString()
    }
    onSaved(record)
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{background:'rgba(56,139,253,0.12)'}}>
              <FileText size={18} className="text-blue-400"/>
            </div>
            <div>
              <h3 className="text-white font-bold">ใบส่งของ (Delivery Note)</h3>
              <p className="text-steel-500 text-xs">สร้างอิสระ หรือ ดึงข้อมูลจากใบแจ้งงาน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold" style={{color:'#60a5fa'}}>{doNo}</span>
          </div>
        </div>
        {/* Link job */}
        <div className="mt-3 pt-3 border-t border-steel-800">
          <label className="form-label">ดึงจากใบแจ้งงาน (ถ้ามี)</label>
          <div className="flex gap-2">
            <input list="do-jobno-list" className="flex-1 text-xs py-1.5 px-2"
              placeholder="SM-2606001-PC" value={linkedJob} onChange={e=>setLinkedJob(e.target.value)}/>
            <datalist id="do-jobno-list">{jobs.map(j=><option key={j['เลขที่']} value={j['เลขที่']}/>)}</datalist>
            <button onClick={loadFromJob} disabled={!selectedJob}
              className="px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-40 transition-all"
              style={{background:'rgba(56,139,253,0.2)',border:'1px solid rgba(56,139,253,0.4)'}}>
              ดึงข้อมูล
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="card p-4 space-y-3">
          <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider">ส่งถึงบริษัท / ลูกค้า (CUSTOMER)</h4>
          <div className="grid grid-cols-2 gap-2">
            {COMPANIES.map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${customer===c?'border-blue-400':'border-steel-600 group-hover:border-steel-400'}`}
                  onClick={()=>setCustomer(c)} style={{cursor:'pointer'}}>
                  {customer===c && <div className="w-2 h-2 rounded-full bg-blue-400"/>}
                </div>
                <span className="text-xs text-steel-300">{c==='อื่นๆ'?'อื่นๆ':(COMPANY_LABELS[c]||c)}</span>
              </label>
            ))}
          </div>
          {customer==='อื่นๆ' && (
            <input className="w-full text-xs py-1.5 px-2" placeholder="ระบุชื่อบริษัท..."
              value={customCustomer} onChange={e=>setCustomCustomer(e.target.value)}/>
          )}
          <div>
            <label className="form-label">แผนก (DEPARTMENT)</label>
            <input className="w-full" placeholder="เช่น ซ่อมบำรุง, วิศวกรรม..."
              value={dept} onChange={e=>setDept(e.target.value)}/>
          </div>
        </div>

        {/* Right side */}
        <div className="card p-4 space-y-3">
          <div>
            <label className="form-label">อ้างอิง PO / เอกสาร</label>
            <input className="w-full" placeholder="ระบุเลข PO..."
              value={poRef} onChange={e=>setPoRef(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">วันที่ส่ง</label>
            <input type="date" className="w-full" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">แนบรูป (URL, คั่นด้วยขึ้นบรรทัดใหม่)</label>
            <textarea className="w-full h-16 text-xs resize-none" placeholder="วางลิงก์รูป..."
              value={imgLinks} onChange={e=>setImgLinks(e.target.value)}/>
          </div>
          <ImageUploader images={images} setImages={setImages} max={10} label="อัปโหลดรูป"/>
        </div>
      </div>

      {/* Signature */}
      <div className="card p-4">
        <SignaturePad label="ลายเซ็น (ผู้ส่ง)" value={signature} onChange={setSignature}/>
      </div>

      {/* Items */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">≡ รายการจัดส่ง</h4>
          <button onClick={addItem} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white"
            style={{background:'rgba(56,139,253,0.2)',border:'1px solid rgba(56,139,253,0.4)'}}>
            <Plus size={11}/> เพิ่ม
          </button>
        </div>
        <div className="space-y-2">
          <div className="grid text-xs text-steel-600 font-medium px-2" style={{gridTemplateColumns:'24px 1fr 64px 56px 64px 56px 60px 28px'}}>
            <span/>
            <span>รายการ</span>
            <span className="text-center">ยอดเต็ม</span>
            <span className="text-center">ส่งไปแล้ว</span>
            <span className="text-center">ส่งรอบนี้</span>
            <span className="text-center">หน่วย</span>
            <span className="text-center">ค้าง</span>
            <span/>
          </div>
          {items.map((it,i) => (
            <div key={i} className="grid gap-1.5 items-center px-2" style={{gridTemplateColumns:'24px 1fr 64px 56px 64px 56px 60px 28px'}}>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-400"/>
              <input className="w-full text-xs py-1 px-2" placeholder="ชื่อรายการ..." value={it.name} onChange={e=>updateItem(i,'name',e.target.value)}/>
              <input className="w-full text-xs py-1 px-1 text-center" type="number" min="0" value={it.total} onChange={e=>updateItem(i,'total',e.target.value)}/>
              <input className="w-full text-xs py-1 px-1 text-center" type="number" min="0" value={it.sent} onChange={e=>updateItem(i,'sent',e.target.value)}/>
              <input className="w-full text-xs py-1 px-1 text-center" type="number" min="0" value={it.thisRound} onChange={e=>updateItem(i,'thisRound',e.target.value)}/>
              <input className="w-full text-xs py-1 px-1 text-center" value={it.unit} onChange={e=>updateItem(i,'unit',e.target.value)}/>
              <div className="text-center font-mono text-xs" style={{color: Math.max(0,(it.total||0)-(it.sent||0)-(it.thisRound||0))>0?'#f87171':'#4ade80'}}>
                {Math.max(0,(parseInt(it.total)||0)-(parseInt(it.sent)||0)-(parseInt(it.thisRound)||0))}
              </div>
              <button onClick={()=>removeItem(i)} className="text-steel-600 hover:text-red-400 transition-colors"><Trash2 size={12}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onClose && <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-steel-400 hover:text-white" style={{background:'rgba(255,255,255,0.05)'}}>ยกเลิก</button>}
        <button onClick={printDO} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-steel-300 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
          <Printer size={14}/> พรีวิว / สั่งปริ้น
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
          <CheckCircle2 size={14}/> {saving?'บันทึก...':'บันทึก DO'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// GATE PASS FORM
// ─────────────────────────────────────────────────────────────────
function GatePassForm({ gpList, onSaved, onClose }) {
  const gpNo = genGPNo(gpList)
  const [company, setCompany] = useState('SMEC')
  const [customCompany, setCustomCompany] = useState('')
  const [purpose, setPurpose] = useState('')
  const [requesterName, setRequesterName] = useState('')
  const [position, setPosition] = useState('')
  const [dept, setDept] = useState('')
  const [date, setDate] = useState(todayStr())
  const [exitDate, setExitDate] = useState(todayStr())
  const [exitTime, setExitTime] = useState('')
  const [vehType, setVehType] = useState('')
  const [vehBrand, setVehBrand] = useState('')
  const [vehColor, setVehColor] = useState('')
  const [vehPlate, setVehPlate] = useState('')
  const [vehExtra, setVehExtra] = useState('')
  const [gpItems, setGpItems] = useState(['','','','','',''])
  const [images, setImages] = useState([])
  const [sigRequester, setSigRequester] = useState('')
  const [saving, setSaving] = useState(false)

  const GPCOMS = [
    {v:'SMEC',l:'SMEC'},{v:'BFL',l:'BFL'},{v:'BFLFP',l:'BFLFP'},{v:'BFLPC',l:'BFLPC'},{v:'อื่นๆ',l:'อื่นๆ'}
  ]

  const printGP = () => {
    const compVal = company==='อื่นๆ' ? customCompany : company
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>ใบขออนุญาตนำของออก ${gpNo}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
      body{font-family:'Sarabun',sans-serif;font-size:11px;color:#000;margin:0;padding:0}
      .page{width:190mm;margin:0 auto;padding:12mm;border:1px solid #999}
      .title{text-align:center;font-size:15px;font-weight:700;margin-bottom:4px}
      .subtitle{text-align:center;font-size:11px;margin-bottom:10px;color:#555}
      .cb-row{display:flex;flex-wrap:wrap;gap:16px;margin:6px 0;font-size:10px;align-items:center}
      .cb{width:11px;height:11px;border:1px solid #333;display:inline-flex;align-items:center;justify-content:center;font-size:8px;margin-right:3px}
      .field-row{display:flex;gap:16px;margin:5px 0;font-size:10px}
      .field{flex:1;display:flex;align-items:flex-end;gap:4px}
      .field-label{white-space:nowrap;color:#333}
      .field-line{flex:1;border-bottom:1px solid #555;min-width:40px;padding-bottom:1px;color:#1a3a5c;font-weight:600}
      .items-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin:8px 0}
      .item-line{display:flex;gap:4px;align-items:flex-end;font-size:10px}
      .item-num{width:20px;shrink:0}
      .item-val{flex:1;border-bottom:1px solid #aaa;padding-bottom:1px;font-weight:500;color:#1a3a5c}
      .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px}
      .sig-box{text-align:center}
      .sig-line{border-bottom:1px solid #333;height:44px;display:flex;align-items:flex-end;justify-content:center;position:relative}
      .sig-img{max-height:40px;max-width:140px}
      .sig-name{font-size:9px;color:#333;margin:2px 0}
      .sig-sub{font-size:9px;color:#777}
      .docno{text-align:right;font-size:10px;color:#555;margin-bottom:6px}
      .img-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .img-item img{max-width:130px;max-height:110px;border:1px solid #ccc;border-radius:4px}
      .img-caption{font-size:8px;color:#777;text-align:center}
      @media print{@page{size:A4;margin:12mm}body{margin:0}.page{border:none}}
    </style></head><body>
    <div class="page">
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:#1a3a5c">แบบฟอร์มขออนุญาตนำของออกนอก เครือบลูฟาโล่</div>
      </div>
      <div class="docno">เลขที่: ${gpNo}</div>
      <div class="cb-row">
        <span style="font-weight:600">สำหรับเจ้าหน้าที่</span>
        ${['BFL','BFLFP','BFLPC','SMEC'].map(c=>`<span><span class="cb">${company===c?'✓':''}</span>${c}</span>`).join('')}
        <span><span class="cb">${company==='อื่นๆ'?'✓':''}</span>อื่นๆ ${company==='อื่นๆ'?customCompany:'__________'}</span>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">ข้าพเจ้า (นาย/นาง/น.ส.)</span><span class="field-line">${requesterName||''}</span></div>
        <div class="field"><span class="field-label">ตำแหน่ง</span><span class="field-line">${position||''}</span></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">ฝ่าย</span><span class="field-line">${dept||''}</span></div>
        <div class="field"><span class="field-label">วันที่</span><span class="field-line" style="color:#c00">${fmtDateTH(date)}</span></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">มีความประสงค์นำสิ่งของออกนอกบริษัทเพื่อ</span><span class="field-line">${purpose||''}</span></div>
      </div>
      <div style="font-size:10px;margin:8px 0 4px;font-weight:600">ดังรายการต่อไปนี้</div>
      <div class="items-grid">
        ${gpItems.map((item,i)=>`<div class="item-line"><span class="item-num">${i+1}.</span><span class="item-val">${item||''}</span></div>`).join('')}
      </div>
      <div class="field-row" style="margin-top:10px">
        <div class="field"><span class="field-label">ขอนำสิ่งของออกจากบริษัท ในวันที่</span><span class="field-line" style="color:#c00">${fmtDateTH(exitDate)}</span></div>
        <div class="field"><span class="field-label">เวลา</span><span class="field-line">${exitTime||''}</span></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">โดยใช้ยานพาหนะประเภท</span><span class="field-line">${vehType||''}</span></div>
        <div class="field"><span class="field-label">ยี่ห้อ</span><span class="field-line">${vehBrand||''}</span></div>
        <div class="field"><span class="field-label">สี</span><span class="field-line">${vehColor||''}</span></div>
      </div>
      <div class="field-row">
        <div class="field"><span class="field-label">หมายเลขทะเบียน</span><span class="field-line">${vehPlate||''}</span></div>
        <div class="field"><span class="field-label">อื่นๆ</span><span class="field-line">${vehExtra||''}</span></div>
      </div>
      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line">${sigRequester?`<img src="${sigRequester}" class="sig-img"/>`:''}</div>
          <div class="sig-name">ลงชื่อ ________________________ (ผู้ขออนุญาต)</div>
          <div class="sig-sub">( ${requesterName||'พลภัทร นิลสกุล'} )</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-name">ลงชื่อ ________________________ (ผู้รับรอง)</div>
          <div class="sig-sub">( ${requesterName||'พลภัทร นิลสกุล'} )</div>
        </div>
      </div>
      <div style="margin-top:10px;text-align:center;font-size:10px;font-weight:600">ได้ตรวจสอบถูกต้องแล้ว</div>
      <div class="sig-row" style="margin-top:8px">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-name">ลงชื่อ ________________________ (รปภ.)</div>
          <div class="sig-sub">(......................................)</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-name">ลงชื่อ ________________________ (ผู้นำออก)</div>
          <div class="sig-sub">(......................................)</div>
        </div>
      </div>
      <div style="margin-top:6px;font-size:9px;color:#777">เลขที่: ${gpNo}</div>
      ${images.length>0?`<div class="img-grid">${images.map((img,i)=>`<div class="img-item"><img src="${img.data}"/><div class="img-caption">รูปที่ ${i+1}</div></div>`).join('')}</div>`:`<div style="border:1px dashed #ccc;height:80px;margin-top:12px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px">พื้นที่สำหรับแนบรูปภาพ / เอกสารเพิ่มเติม</div>`}
    </div>
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`
    const w = window.open('','_blank','width=900,height=700'); w.document.write(html); w.document.close()
  }

  const handleSave = () => {
    setSaving(true)
    const record = {
      gpNo, company: company==='อื่นๆ'?customCompany:company,
      purpose, requesterName, position, dept, date, exitDate, exitTime,
      vehType, vehBrand, vehColor, vehPlate, vehExtra,
      items: gpItems.filter(Boolean),
      images: images.map(i=>i.data),
      signature: sigRequester,
      createdAt: new Date().toISOString()
    }
    onSaved(record)
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{background:'rgba(251,146,60,0.12)'}}>
              <Key size={18} style={{color:'#fb923c'}}/>
            </div>
            <div>
              <h3 className="text-white font-bold">นำของออก (Gate Pass)</h3>
              <p className="text-steel-500 text-xs">ฟอร์มขออนุญาตนำของออกนอกเครือข่าย</p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold" style={{color:'#fb923c'}}>{gpNo}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: requester */}
        <div className="card p-4 space-y-3">
          <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Hash size={11}/>ข้อมูลผู้ขอ</h4>
          <SignaturePad label="ลายเซ็น (ผู้ขอ)" value={sigRequester} onChange={setSigRequester}/>
          <div>
            <label className="form-label">ชื่อ-สกุล (ผู้ขอ / ผู้นำออก)</label>
            <input className="w-full" placeholder="ระบุชื่อผู้ขอ..." value={requesterName} onChange={e=>setRequesterName(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label">ตำแหน่ง</label>
              <input className="w-full" value={position} onChange={e=>setPosition(e.target.value)}/>
            </div>
            <div>
              <label className="form-label">แผนก</label>
              <input className="w-full" value={dept} onChange={e=>setDept(e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="form-label">วันที่สร้างเอกสาร</label>
            <input type="date" className="w-full" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
        </div>

        {/* Right: company + purpose */}
        <div className="card p-4 space-y-3">
          <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Building2 size={11}/>สำหรับบริษัท / จุดประสงค์</h4>
          <div>
            <label className="form-label">ระบุบริษัท</label>
            <div className="grid grid-cols-2 gap-2">
              {GPCOMS.map(c => (
                <label key={c.v} className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${company===c.v?'border-orange-400':'border-steel-600'}`}
                    onClick={()=>setCompany(c.v)} style={{cursor:'pointer'}}>
                    {company===c.v && <div className="w-2 h-2 rounded-full bg-orange-400"/>}
                  </div>
                  <span className="text-xs text-steel-300">{c.l}</span>
                </label>
              ))}
            </div>
            {company==='อื่นๆ' && (
              <input className="w-full mt-2 text-xs py-1.5 px-2" placeholder="ระบุชื่อบริษัท..."
                value={customCompany} onChange={e=>setCustomCompany(e.target.value)}/>
            )}
          </div>
          <div>
            <label className="form-label">จุดประสงค์ที่นำออก</label>
            <textarea className="w-full h-20 resize-none" placeholder="เช่น ส่งซ่อม, คืนสินค้า..."
              value={purpose} onChange={e=>setPurpose(e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Vehicle */}
      <div className="card p-4 space-y-3">
        <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><Truck size={11}/>ข้อมูลยานพาหนะ</h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="form-label">วันที่นำออก</label>
            <input type="date" className="w-full" value={exitDate} onChange={e=>setExitDate(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">เวลา (ถ้าทราบ)</label>
            <input type="time" className="w-full" value={exitTime} onChange={e=>setExitTime(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">ประเภท</label>
            <input className="w-full" placeholder="เช่น รถกระบะ..." value={vehType} onChange={e=>setVehType(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">ยี่ห้อ</label>
            <input className="w-full" placeholder="เช่น Isuzu..." value={vehBrand} onChange={e=>setVehBrand(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">สี</label>
            <input className="w-full" placeholder="เช่น ขาว..." value={vehColor} onChange={e=>setVehColor(e.target.value)}/>
          </div>
          <div>
            <label className="form-label">หมายเลขทะเบียน</label>
            <input className="w-full" placeholder="เช่น 1กข 1234" value={vehPlate} onChange={e=>setVehPlate(e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="form-label">ข้อมูลเพิ่มเติม (ถ้ามี)</label>
          <input className="w-full" value={vehExtra} onChange={e=>setVehExtra(e.target.value)}/>
        </div>
      </div>

      {/* Items */}
      <div className="card p-4 space-y-3">
        <h4 className="text-steel-400 text-xs font-semibold uppercase tracking-wider">รายการสิ่งของ (สูงสุด 6)</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {gpItems.map((item,i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-steel-600 text-xs w-5 shrink-0">{i+1}.</span>
              <input className="flex-1 text-xs py-1.5 px-2" placeholder={`รายการที่ ${i+1}...`}
                value={item} onChange={e=>setGpItems(its=>its.map((v,j)=>j===i?e.target.value:v))}/>
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="card p-4">
        <ImageUploader images={images} setImages={setImages} max={6} label="รูปประกอบ"/>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onClose && <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-steel-400 hover:text-white" style={{background:'rgba(255,255,255,0.05)'}}>ยกเลิก</button>}
        <button onClick={printGP} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-steel-300 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
          <Printer size={14}/> พรีวิวเอกสาร
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{background:'linear-gradient(135deg,#ea7c1f,#c2680f)'}}>
          <CheckCircle2 size={14}/> {saving?'บันทึก...':'บันทึก Gate Pass'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────
function LogisticsHistory({ doList, gpList }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const combined = useMemo(() => {
    const dos = doList.map(d => ({...d, _type:'DO', _no:d.doNo, _label:d.customer, _date:d.date}))
    const gps = gpList.map(g => ({...g, _type:'GP', _no:g.gpNo, _label:g.requesterName, _date:g.date}))
    return [...dos,...gps].sort((a,b)=>(b._date||'').localeCompare(a._date||''))
  },[doList,gpList])

  const filtered = useMemo(() => combined.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || (r._no||'').toLowerCase().includes(q) ||
      (r._label||'').toLowerCase().includes(q) ||
      (r.items||[]).some(it=>(it.name||it||'').toLowerCase().includes(q))
    const matchType = typeFilter==='all' || r._type===typeFilter
    const matchFrom = !dateFrom || (r._date||'')>=dateFrom
    const matchTo   = !dateTo   || (r._date||'')<=dateTo
    return matchSearch && matchType && matchFrom && matchTo
  }), [combined, search, typeFilter, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative" style={{minWidth:180}}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
          <input className="w-full pl-8 pr-3 py-1.5 text-xs" placeholder="ค้นหาเลขที่, บริษัท, รายการ..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f'}}>
          {[['all','ทั้งหมด'],['DO','ใบส่งของ'],['GP','Gate Pass']].map(([v,l])=>(
            <button key={v} onClick={()=>setTypeFilter(v)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{background:typeFilter===v?'rgba(56,139,253,0.2)':'transparent',color:typeFilter===v?'#60a5fa':'#4a6584'}}>
              {l}
            </button>
          ))}
        </div>
        <input type="date" className="text-xs py-1.5 px-2" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        <span className="text-steel-600 text-xs">–</span>
        <input type="date" className="text-xs py-1.5 px-2" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        <span className="ml-auto text-xs text-steel-500">{filtered.length} รายการ</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>เลขที่</th>
                <th>วันที่</th>
                <th>บริษัท/ผู้ขอ</th>
                <th>รายการ</th>
                <th>อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-steel-600">ไม่พบรายการ</td></tr>
              )}
              {filtered.map((r,i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{background:r._type==='DO'?'rgba(56,139,253,0.15)':'rgba(251,146,60,0.15)',color:r._type==='DO'?'#60a5fa':'#fb923c',border:`1px solid ${r._type==='DO'?'rgba(56,139,253,0.3)':'rgba(251,146,60,0.3)'}`}}>
                      {r._type==='DO'?'ใบส่งของ':'Gate Pass'}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-accent-400">{r._no}</td>
                  <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{fmtDateTH(r._date)}</td>
                  <td className="text-steel-300 text-xs">{r._label}</td>
                  <td className="text-steel-400 text-xs max-w-xs">
                    <div className="truncate">
                      {r._type==='DO'
                        ? (r.items||[]).map(it=>it.name||it).join(', ')
                        : (r.items||[]).filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td className="text-steel-500 text-xs font-mono">{r.poRef||r.jobNo||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
export default function Logistics({ jobs = [], doData = [], gatepass = [] }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  const [doList, setDoListState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_DO_KEY)||'[]') } catch { return [] }
  })
  const [gpList, setGpListState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_GP_KEY)||'[]') } catch { return [] }
  })

  const setDoList = (fn) => {
    setDoListState(prev => {
      const next = typeof fn==='function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_DO_KEY, JSON.stringify(next))
      return next
    })
  }
  const setGpList = (fn) => {
    setGpListState(prev => {
      const next = typeof fn==='function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_GP_KEY, JSON.stringify(next))
      return next
    })
  }

  const TABS = [
    { id:'dashboard', label:'Dashboard',    icon:<BarChart2 size={14}/> },
    { id:'do',        label:'สร้างใบส่งของ', icon:<Truck size={14}/> },
    { id:'gp',        label:'Gate Pass',    icon:<Key size={14}/> },
    { id:'history',   label:'ประวัติ',       icon:<History size={14}/> },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Logistics</h1>
        <p className="text-steel-400 text-sm mt-0.5">จัดการใบส่งของ และใบขออนุญาตนำของออก</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid #1e3a5f',width:'fit-content'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab===tab.id ? 'rgba(56,139,253,0.2)' : 'transparent',
              color: activeTab===tab.id ? '#60a5fa' : '#4a6584',
              border: activeTab===tab.id ? '1px solid rgba(56,139,253,0.35)' : '1px solid transparent'
            }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab==='dashboard' && <LogisticsDashboard doList={doList} gpList={gpList}/>}
      {activeTab==='do'        && <DOForm jobs={jobs||[]} doList={doList} onSaved={r=>{ setDoList(l=>[r,...l]); setActiveTab('history') }}/>}
      {activeTab==='gp'        && <GatePassForm gpList={gpList} onSaved={r=>{ setGpList(l=>[r,...l]); setActiveTab('history') }}/>}
      {activeTab==='history'   && <LogisticsHistory doList={doList} gpList={gpList}/>}
    </div>
  )
}
