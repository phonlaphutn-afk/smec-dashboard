import React, { useMemo, useState, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Plus, X, Search,
  ChevronDown, ChevronRight, Printer, Download, Edit2, Trash2,
  Package, Wallet, BarChart2, FileText, AlertCircle, Filter
} from 'lucide-react'
import { postSheet, formatDate } from '../api'

// ─────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────
const LOCAL_KEY = 'smec_accounting_v1'
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const CHART_COLORS = ['#60a5fa','#4ade80','#fb923c','#c084fc','#f472b6','#facc15']
const COST_CATS = ['วัสดุ/อะไหล่','ค่าแรง','ค่าขนส่ง','ค่าเช่า/อุปกรณ์','ค่าบริการภายนอก','อื่นๆ']

function todayStr() { return new Date().toISOString().slice(0,10) }

function fmtB(n) {
  if (!n && n !== 0) return '–'
  const num = parseFloat(String(n).replace(/[฿,]/g,'')) || 0
  return '฿' + num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function parseAmt(v) {
  return parseFloat(String(v||'0').replace(/[฿,]/g,'')) || 0
}

function getYYMM(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).replace(/-/g,'/')
  const p = s.split('/')
  if (p.length < 2) return ''
  const [a,b,c] = p
  if (a.length === 4) return `${a}-${b.padStart(2,'0')}`  // yyyy/mm/dd
  return `${c}-${b.padStart(2,'0')}`  // dd/mm/yyyy
}

function fmtMonthTH(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_TH[parseInt(m)-1]} ${String(y).slice(-2)}`
}

// ─────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, onClick, active }) {
  return (
    <button onClick={onClick} className="metric-card text-left w-full transition-all hover:brightness-110"
      style={{ border: active ? `1px solid ${color}` : '1px solid #1e3a5f' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-steel-400 text-xs uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1.5 font-mono" style={{color}}>{value}</p>
          {sub && <p className="text-steel-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg mt-0.5" style={{background:`${color}18`}}>
          <span style={{color}}>{icon}</span>
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// TRANSACTION FORM MODAL
// ─────────────────────────────────────────────────────────────────
function TransactionModal({ open, onClose, jobs, editData, onSaved }) {
  const [type, setType] = useState(editData?.type || 'income')   // income | cost
  const [date, setDate] = useState(editData?.date || todayStr())
  const [jobNo, setJobNo] = useState(editData?.jobNo || '')
  const [po, setPo] = useState(editData?.po || '')
  const [desc, setDesc] = useState(editData?.desc || '')
  const [amount, setAmount] = useState(editData?.amount || '')
  const [vat, setVat] = useState(editData?.vat || '7')
  const [vatIncluded, setVatIncluded] = useState(editData?.vatIncluded ?? true)
  const [category, setCategory] = useState(editData?.category || 'วัสดุ/อะไหล่')
  const [note, setNote] = useState(editData?.note || '')
  const [saving, setSaving] = useState(false)

  // Auto-fill from job
  const selectedJob = jobs.find(j => j['เลขที่'] === jobNo)
  const loadFromJob = () => {
    if (!selectedJob) return
    setPo(selectedJob['PO'] || po)
    if (!desc) setDesc(selectedJob['รายละเอียด'] || '')
    if (type === 'income' && !amount) setAmount(
      String(parseAmt(selectedJob['ยอดขายรวม']))
    )
  }

  const net = parseAmt(amount)
  const vatAmt = vatIncluded ? net - net/1.07 : net * parseAmt(vat) / 100
  const total = vatIncluded ? net : net + vatAmt

  const existingPOs = useMemo(() => [...new Set(jobs.map(j=>j['PO']).filter(Boolean))].sort(), [jobs])
  const jobNos = useMemo(() => jobs.map(j=>j['เลขที่']).filter(Boolean).sort(), [jobs])

  const handleSave = () => {
    if (!amount || !desc) return
    setSaving(true)
    const record = {
      id: editData?.id || Date.now().toString(),
      type, date, jobNo, po, desc, amount: parseAmt(amount),
      vat: parseAmt(vat), vatIncluded, vatAmt,
      net: vatIncluded ? net/1.07 : net,
      total,
      category: type==='income' ? 'รายรับ' : category,
      note,
      createdAt: editData?.createdAt || new Date().toISOString()
    }
    onSaved(record)
    setSaving(false)
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
      <div className="w-full max-w-lg mx-4 rounded-xl shadow-2xl flex flex-col" style={{background:'#0a1929',border:'1px solid #1e3a5f',maxHeight:'90vh'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-800">
          <h3 className="text-white font-bold">{editData?'แก้ไข':'เพิ่ม'}รายการบัญชี</h3>
          <button onClick={onClose} className="text-steel-500 hover:text-white"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {[['income','รายรับ','#4ade80'],['cost','ต้นทุน/รายจ่าย','#f87171']].map(([v,l,c])=>(
              <button key={v} onClick={()=>setType(v)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{background:type===v?`${c}18`:'rgba(255,255,255,0.04)',border:`1px solid ${type===v?c:'#1e3a5f'}`,color:type===v?c:'#4a6584'}}>
                {l}
              </button>
            ))}
          </div>

          {/* Job + PO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">เลขที่ใบงาน</label>
              <input list="acc-jobno" className="w-full" placeholder="SM-..." value={jobNo}
                onChange={e=>{ setJobNo(e.target.value) }}
                onBlur={loadFromJob}/>
              <datalist id="acc-jobno">{jobNos.map(j=><option key={j} value={j}/>)}</datalist>
            </div>
            <div>
              <label className="form-label">เลขที่ PO</label>
              <input list="acc-po" className="w-full" placeholder="PO/..." value={po} onChange={e=>setPo(e.target.value)}/>
              <datalist id="acc-po">{existingPOs.map(p=><option key={p} value={p}/>)}</datalist>
            </div>
          </div>

          <div>
            <label className="form-label">วันที่</label>
            <input type="date" className="w-full" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>

          <div>
            <label className="form-label">รายละเอียด *</label>
            <input className="w-full" placeholder="ระบุรายละเอียด..." value={desc} onChange={e=>setDesc(e.target.value)}/>
          </div>

          {type === 'cost' && (
            <div>
              <label className="form-label">หมวดหมู่ต้นทุน</label>
              <select className="w-full" value={category} onChange={e=>setCategory(e.target.value)}>
                {COST_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Amount */}
          <div className="rounded-lg p-3 space-y-2" style={{background:'#071624',border:'1px solid #1e3a5f'}}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">จำนวนเงิน (บาท) *</label>
                <input type="number" min="0" className="w-full" placeholder="0.00"
                  value={amount} onChange={e=>setAmount(e.target.value)}/>
              </div>
              <div>
                <label className="form-label">VAT (%)</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min="0" className="w-20" value={vat} onChange={e=>setVat(e.target.value)}/>
                  <label className="flex items-center gap-1.5 text-xs text-steel-400 cursor-pointer">
                    <input type="checkbox" checked={vatIncluded} onChange={e=>setVatIncluded(e.target.checked)} className="accent-blue-400"/>
                    รวม VAT แล้ว
                  </label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-steel-800 text-xs">
              <div className="text-center">
                <div className="text-steel-500">ก่อน VAT</div>
                <div className="text-steel-200 font-mono mt-0.5">{fmtB(vatIncluded ? net/1.07 : net)}</div>
              </div>
              <div className="text-center">
                <div className="text-steel-500">VAT</div>
                <div className="text-steel-200 font-mono mt-0.5">{fmtB(vatAmt)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold" style={{color: type==='income'?'#4ade80':'#f87171',fontSize:10}}>รวมสุทธิ</div>
                <div className="font-bold font-mono mt-0.5" style={{color: type==='income'?'#4ade80':'#f87171'}}>{fmtB(total)}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">หมายเหตุ</label>
            <input className="w-full" placeholder="(ถ้ามี)" value={note} onChange={e=>setNote(e.target.value)}/>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-steel-800">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-steel-400" style={{background:'rgba(255,255,255,0.04)'}}>ยกเลิก</button>
          <button onClick={handleSave} disabled={!amount||!desc||saving}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{background: type==='income'?'linear-gradient(135deg,#16a34a,#15803d)':'linear-gradient(135deg,#dc2626,#b91c1c)'}}>
            {saving?'บันทึก...':editData?'บันทึกการแก้ไข':'เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// JOB P&L DETAIL MODAL
// ─────────────────────────────────────────────────────────────────
function JobPLModal({ open, onClose, jobNo, po, transactions }) {
  if (!open) return null
  const key = jobNo || po
  const txs = transactions.filter(t => t.jobNo===jobNo || (po && t.po===po))
  const income = txs.filter(t=>t.type==='income')
  const costs  = txs.filter(t=>t.type==='cost')
  const totalIncome = income.reduce((s,t)=>s+t.total,0)
  const totalCost   = costs.reduce((s,t)=>s+t.total,0)
  const profit = totalIncome - totalCost
  const margin = totalIncome > 0 ? (profit/totalIncome*100).toFixed(1) : 0

  const byCategory = {}
  costs.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = 0
    byCategory[t.category] += t.total
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
      <div className="h-full w-full max-w-xl flex flex-col overflow-hidden" style={{background:'#0a1929',borderLeft:'1px solid #1e3a5f'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-800 shrink-0">
          <div>
            <h3 className="text-white font-bold">กำไร-ขาดทุน</h3>
            <p className="text-steel-500 text-xs mt-0.5">{jobNo || po}</p>
          </div>
          <button onClick={onClose} className="text-steel-500 hover:text-white"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3 text-center" style={{background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.25)'}}>
              <div className="text-xs text-steel-500 mb-1">รายรับรวม</div>
              <div className="font-bold font-mono text-green-400">{fmtB(totalIncome)}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.25)'}}>
              <div className="text-xs text-steel-500 mb-1">ต้นทุนรวม</div>
              <div className="font-bold font-mono text-red-400">{fmtB(totalCost)}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{
              background: profit>=0?'rgba(56,139,253,0.08)':'rgba(248,113,113,0.12)',
              border: `1px solid ${profit>=0?'rgba(56,139,253,0.3)':'rgba(248,113,113,0.4)'}`
            }}>
              <div className="text-xs text-steel-500 mb-1">กำไรสุทธิ</div>
              <div className="font-bold font-mono" style={{color:profit>=0?'#60a5fa':'#f87171'}}>{fmtB(profit)}</div>
              <div className="text-xs mt-0.5" style={{color:profit>=0?'#60a5fa':'#f87171'}}>Margin {margin}%</div>
            </div>
          </div>

          {/* Cost by category */}
          {Object.keys(byCategory).length > 0 && (
            <div className="card p-3">
              <div className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-2">ต้นทุนแยกหมวด</div>
              {Object.entries(byCategory).sort(([,a],[,b])=>b-a).map(([cat,amt],i) => (
                <div key={cat} className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-steel-300">{cat}</span>
                      <span className="text-steel-400 font-mono">{fmtB(amt)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                      <div className="h-full rounded-full" style={{width:`${totalCost>0?amt/totalCost*100:0}%`,background:CHART_COLORS[i%6]}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transactions */}
          {['income','cost'].map(tp => {
            const list = txs.filter(t=>t.type===tp)
            if (list.length===0) return null
            return (
              <div key={tp}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  style={{color:tp==='income'?'#4ade80':'#f87171'}}>
                  {tp==='income'?<TrendingUp size={11}/>:<TrendingDown size={11}/>}
                  {tp==='income'?'รายรับ':'ต้นทุน / รายจ่าย'} ({list.length})
                </div>
                <div className="space-y-1">
                  {list.map((t,i)=>(
                    <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg text-xs"
                      style={{background:'#071624',border:'1px solid #0f2744'}}>
                      <div className="flex-1 min-w-0">
                        <div className="text-steel-200 truncate">{t.desc}</div>
                        <div className="text-steel-500 mt-0.5">{t.date} {t.category&&t.category!=='รายรับ'?`· ${t.category}`:''}</div>
                      </div>
                      <div className="font-mono font-semibold shrink-0" style={{color:tp==='income'?'#4ade80':'#f87171'}}>
                        {fmtB(t.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {txs.length===0 && (
            <div className="text-center py-12 text-steel-600">ยังไม่มีรายการบัญชีสำหรับงานนี้</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{background:'#0d2137',border:'1px solid #1e3a5f'}}>
      <div className="text-steel-400 mb-1.5">{fmtMonthTH(label) || label}</div>
      {payload.map((p,i)=>(
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{background:p.color}}/>
          <span className="text-steel-300">{p.name}:</span>
          <span className="font-mono font-semibold" style={{color:p.color}}>{fmtB(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN ACCOUNTING PAGE
// ─────────────────────────────────────────────────────────────────
export default function Accounting({ accounting: sheetData = [], jobs = [] }) {
  // Local transactions (income + cost)
  const [transactions, setTxState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]') } catch { return [] }
  })
  const setTx = fn => {
    setTxState(prev => {
      const next = typeof fn==='function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
      return next
    })
  }

  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [filterType, setFilterType] = useState('all')   // all|income|cost
  const [filterMonth, setFilterMonth] = useState('')
  const [filterComp, setFilterComp] = useState('')
  const [filterPO, setFilterPO] = useState('')
  const [search, setSearch] = useState('')
  const [activeKpi, setActiveKpi] = useState(null)
  const [detailJob, setDetailJob] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Merge sheet data + local transactions
  const allTx = useMemo(() => {
    // Convert sheet accounting rows → transaction format
    const fromSheet = sheetData.map(r => ({
      id: `sheet_${r['เลขที่']||Math.random()}`,
      type: 'income',
      date: r['วันที่'] || '',
      jobNo: r['เลขที่ใบแจ้ง'] || r['เลขที่'] || '',
      po: r['เลขที่ PO'] || r['PO'] || '',
      desc: r['ชื่อรายการ'] || r['รายการ'] || '',
      amount: parseAmt(r['รวมเป็นเงิน'] || r['ยอดสุทธิ']),
      total: parseAmt(r['รวมเป็นเงิน'] || r['ยอดสุทธิ']),
      vatAmt: parseAmt(r['ยอดVAT']),
      net: parseAmt(r['ยอดก่อนVAT'] || r['รวมเป็นเงิน']),
      category: 'รายรับ',
      note: '',
      fromSheet: true,
    }))
    return [...fromSheet, ...transactions]
  }, [sheetData, transactions])

  // Stats
  const stats = useMemo(() => {
    const income = allTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.total,0)
    const cost   = allTx.filter(t=>t.type==='cost').reduce((s,t)=>s+t.total,0)
    const profit = income - cost
    const thisMonth = new Date().toISOString().slice(0,7)
    const monthIncome = allTx.filter(t=>t.type==='income' && (t.date||'').startsWith(thisMonth)).reduce((s,t)=>s+t.total,0)
    const monthCost   = allTx.filter(t=>t.type==='cost'   && (t.date||'').startsWith(thisMonth)).reduce((s,t)=>s+t.total,0)
    return { income, cost, profit, margin: income>0?(profit/income*100).toFixed(1):0, monthIncome, monthCost }
  }, [allTx])

  // Monthly chart data (12 months)
  const monthlyChart = useMemo(() => {
    const map = {}
    allTx.forEach(t => {
      const m = getYYMM(t.date)
      if (!m) return
      if (!map[m]) map[m] = { month:m, income:0, cost:0 }
      if (t.type==='income') map[m].income += t.total
      else map[m].cost += t.total
    })
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12).map(d=>({
      ...d, profit: d.income - d.cost
    }))
  }, [allTx])

  // By company
  const byComp = useMemo(() => {
    const map = {}
    jobs.forEach(j => {
      const co = j['บริษัท'] || 'อื่นๆ'
      const amt = parseAmt(j['ยอดขายรวม'])
      if (!map[co]) map[co] = { income:0, jobs:0 }
      map[co].income += amt; map[co].jobs++
    })
    return Object.entries(map).sort(([,a],[,b])=>b.income-a.income).slice(0,5)
  }, [jobs])

  // Cost by category pie
  const costByCat = useMemo(() => {
    const map = {}
    allTx.filter(t=>t.type==='cost').forEach(t => {
      if (!map[t.category]) map[t.category] = 0
      map[t.category] += t.total
    })
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
  }, [allTx])

  // P&L by job/PO
  const jobPL = useMemo(() => {
    const map = {}
    jobs.forEach(j => {
      const key = j['PO'] || j['เลขที่']
      if (!key) return
      if (!map[key]) map[key] = { key, jobNo:j['เลขที่'], po:j['PO'], desc:j['รายละเอียด']||'', company:j['บริษัท']||'', income:0, cost:0 }
      map[key].income += parseAmt(j['ยอดขายรวม'])
    })
    allTx.forEach(t => {
      const key = t.po || t.jobNo
      if (!key) return
      if (!map[key]) map[key] = { key, jobNo:t.jobNo, po:t.po, desc:t.desc, company:'', income:0, cost:0 }
      if (t.type==='income') map[key].income += t.total
      else map[key].cost += t.total
    })
    return Object.values(map)
      .map(r=>({...r, profit:r.income-r.cost, margin:r.income>0?((r.income-r.cost)/r.income*100).toFixed(1):0}))
      .sort((a,b)=>b.income-a.income)
  }, [jobs, allTx])

  // Filter for transaction list
  const months = useMemo(() => [...new Set(allTx.map(t=>getYYMM(t.date)).filter(Boolean))].sort().reverse(), [allTx])
  const companies = useMemo(() => [...new Set(jobs.map(j=>j['บริษัท']).filter(Boolean))].sort(), [jobs])
  const allPOs = useMemo(() => [...new Set(allTx.map(t=>t.po).filter(Boolean))].sort(), [allTx])

  const filtered = useMemo(() => {
    return allTx.filter(t => {
      const q = search.toLowerCase()
      return (!q || t.desc.toLowerCase().includes(q) || (t.jobNo||'').toLowerCase().includes(q) || (t.po||'').toLowerCase().includes(q)) &&
        (filterType==='all' || t.type===filterType) &&
        (!filterMonth || getYYMM(t.date)===filterMonth) &&
        (!filterPO || t.po===filterPO)
    }).sort((a,b) => (b.date||'').localeCompare(a.date||''))
  }, [allTx, search, filterType, filterMonth, filterPO])

  const hasFilter = search||filterType!=='all'||filterMonth||filterPO

  const deleteTx = (id) => {
    if (window.confirm('ลบรายการนี้ใช่ไหมครับ?')) setTx(ts=>ts.filter(t=>t.id!==id))
  }

  const exportCSV = () => {
    const cols = ['ประเภท','วันที่','เลขที่งาน','PO','รายละเอียด','หมวดหมู่','จำนวนเงิน','VAT','รวมสุทธิ','หมายเหตุ']
    const rows = filtered.map(t=>[
      t.type==='income'?'รายรับ':'รายจ่าย', t.date, t.jobNo, t.po,
      t.desc, t.category, t.amount, t.vatAmt, t.total, t.note
    ])
    const csv = '\uFEFF' + [cols,...rows].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    a.download = `accounting-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const TABS = [
    {id:'dashboard',label:'Dashboard',icon:<BarChart2 size={13}/>},
    {id:'pl',label:'P&L รายงาน',icon:<TrendingUp size={13}/>},
    {id:'transactions',label:'รายการทั้งหมด',icon:<FileText size={13}/>},
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ระบบบัญชี</h1>
          <p className="text-steel-400 text-sm mt-0.5">รายรับ · ต้นทุน · กำไรขาดทุน</p>
        </div>
        <button onClick={()=>{ setEditRecord(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:brightness-110"
          style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
          <Plus size={14}/> เพิ่มรายการ
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid #1e3a5f',width:'fit-content'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab===tab.id?'rgba(56,139,253,0.2)':'transparent',
              color: activeTab===tab.id?'#60a5fa':'#4a6584',
              border: activeTab===tab.id?'1px solid rgba(56,139,253,0.35)':'1px solid transparent'
            }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {activeTab==='dashboard' && (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="รายรับรวม" value={fmtB(stats.income)} sub="ทั้งหมด" color="#4ade80"
              icon={<TrendingUp size={16}/>} onClick={()=>{ setActiveTab('transactions'); setFilterType('income') }}/>
            <KpiCard label="ต้นทุนรวม" value={fmtB(stats.cost)} sub="ทั้งหมด" color="#f87171"
              icon={<TrendingDown size={16}/>} onClick={()=>{ setActiveTab('transactions'); setFilterType('cost') }}/>
            <KpiCard label="กำไรสุทธิ" value={fmtB(stats.profit)}
              sub={`Margin ${stats.margin}%`}
              color={stats.profit>=0?'#60a5fa':'#f87171'}
              icon={<DollarSign size={16}/>} onClick={()=>setActiveTab('pl')}/>
            <KpiCard label="เดือนนี้ (รายรับ)" value={fmtB(stats.monthIncome)}
              sub={`ต้นทุน ${fmtB(stats.monthCost)}`} color="#fbbf24"
              icon={<Wallet size={16}/>}/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly bar chart */}
            <div className="card p-4 lg:col-span-2">
              <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-4">รายรับ vs ต้นทุน รายเดือน</h3>
              {monthlyChart.length===0
                ? <div className="text-center py-10 text-steel-600 text-sm">ยังไม่มีข้อมูล</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyChart} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false}/>
                      <XAxis dataKey="month" tickFormatter={fmtMonthTH} tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="income" name="รายรับ" fill="#4ade80" radius={[3,3,0,0]} maxBarSize={28}/>
                      <Bar dataKey="cost"   name="ต้นทุน" fill="#f87171" radius={[3,3,0,0]} maxBarSize={28}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>

            {/* Cost by category pie */}
            <div className="card p-4">
              <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3">ต้นทุนแยกหมวด</h3>
              {costByCat.length===0
                ? <div className="text-center py-10 text-steel-600 text-sm">ยังไม่มีข้อมูล</div>
                : <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={costByCat} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                          dataKey="value" nameKey="name">
                          {costByCat.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%6]}/>)}
                        </Pie>
                        <Tooltip formatter={(v)=>fmtB(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {costByCat.slice(0,4).map((c,i)=>(
                        <div key={c.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{background:CHART_COLORS[i%6]}}/>
                          <span className="text-steel-400 flex-1 truncate">{c.name}</span>
                          <span className="font-mono text-steel-300">{fmtB(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
              }
            </div>
          </div>

          {/* Top company revenue */}
          <div className="card p-4">
            <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3">รายรับแยกบริษัท (จากใบงาน)</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {byComp.map(([co,d],i)=>(
                <div key={co} className="rounded-lg p-3 text-center" style={{background:'#071624',border:'1px solid #0f2744'}}>
                  <div className="text-xs text-steel-500 mb-1">{co}</div>
                  <div className="font-bold font-mono text-sm" style={{color:CHART_COLORS[i%6]}}>{fmtB(d.income)}</div>
                  <div className="text-xs text-steel-600 mt-0.5">{d.jobs} ใบงาน</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── P&L TAB ── */}
      {activeTab==='pl' && (
        <div className="space-y-4">
          <div className="card p-3 flex flex-wrap gap-2 items-center">
            <div className="relative" style={{minWidth:180}}>
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
              <input className="w-full pl-7 pr-3 py-1.5 text-xs" placeholder="ค้นหา PO, งาน, บริษัท..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <select className="text-xs py-1.5 px-2" value={filterPO} onChange={e=>setFilterPO(e.target.value)}>
              <option value="">ทุก PO</option>
              {allPOs.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <span className="ml-auto text-xs text-steel-500">{jobPL.length} รายการ</span>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>เลขที่งาน / PO</th>
                    <th>บริษัท</th>
                    <th>รายละเอียด</th>
                    <th className="text-right">รายรับ</th>
                    <th className="text-right">ต้นทุน</th>
                    <th className="text-right">กำไร</th>
                    <th className="text-center">Margin</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobPL.filter(r=>!search||(r.po+r.jobNo+r.desc+r.company).toLowerCase().includes(search.toLowerCase()))
                    .filter(r=>!filterPO||r.po===filterPO)
                    .map((r,i)=>(
                    <tr key={i} className="cursor-pointer hover:bg-white/[0.025] transition-colors"
                      onClick={()=>setDetailJob(r)}>
                      <td>
                        {r.jobNo && <div className="font-mono text-xs text-accent-400">{r.jobNo}</div>}
                        {r.po    && <div className="font-mono text-xs text-steel-500">{r.po}</div>}
                      </td>
                      <td className="text-steel-400 text-xs">{r.company}</td>
                      <td className="text-steel-300 text-xs max-w-xs"><div className="truncate">{r.desc}</div></td>
                      <td className="text-right font-mono text-xs text-green-400">{fmtB(r.income)}</td>
                      <td className="text-right font-mono text-xs text-red-400">{r.cost>0?fmtB(r.cost):'–'}</td>
                      <td className="text-right font-mono text-xs font-semibold" style={{color:r.profit>=0?'#60a5fa':'#f87171'}}>
                        {fmtB(r.profit)}
                      </td>
                      <td className="text-center">
                        {r.income>0 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                              <div className="h-full rounded-full" style={{width:`${Math.min(100,Math.max(0,parseFloat(r.margin)))}%`,background:parseFloat(r.margin)>=20?'#4ade80':parseFloat(r.margin)>=0?'#fbbf24':'#f87171'}}/>
                            </div>
                            <span className="text-xs font-mono" style={{color:parseFloat(r.margin)>=20?'#4ade80':parseFloat(r.margin)>=0?'#fbbf24':'#f87171'}}>{r.margin}%</span>
                          </div>
                        ) : <span className="text-steel-700">–</span>}
                      </td>
                      <td>
                        <button className="p-1.5 text-steel-600 hover:text-blue-400 transition-colors">
                          <ChevronRight size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab==='transactions' && (
        <div className="space-y-4">
          <div className="card p-3 flex flex-wrap gap-2 items-center">
            <div className="relative" style={{minWidth:180}}>
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
              <input className="w-full pl-7 pr-3 py-1.5 text-xs" placeholder="ค้นหา..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="flex gap-1 rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f'}}>
              {[['all','ทั้งหมด'],['income','รายรับ'],['cost','รายจ่าย']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilterType(v)}
                  className="px-3 py-1.5 text-xs transition-colors"
                  style={{background:filterType===v?'rgba(56,139,253,0.2)':'transparent',color:filterType===v?'#60a5fa':'#4a6584'}}>
                  {l}
                </button>
              ))}
            </div>
            <select className="text-xs py-1.5 px-2" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
              <option value="">ทุกเดือน</option>
              {months.map(m=><option key={m} value={m}>{fmtMonthTH(m)}</option>)}
            </select>
            <select className="text-xs py-1.5 px-2" value={filterPO} onChange={e=>setFilterPO(e.target.value)}>
              <option value="">ทุก PO</option>
              {allPOs.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            {hasFilter && <button onClick={()=>{setSearch('');setFilterType('all');setFilterMonth('');setFilterPO('')}}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-red-400" style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)'}}>
              <X size={10}/> ล้าง
            </button>}
            <button onClick={exportCSV} className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded text-xs text-steel-400 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
              <Download size={12}/> Excel
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>วันที่</th>
                    <th>เลขที่งาน</th>
                    <th>PO</th>
                    <th>รายละเอียด</th>
                    <th>หมวด</th>
                    <th className="text-right">ก่อน VAT</th>
                    <th className="text-right">VAT</th>
                    <th className="text-right">รวมสุทธิ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0 && <tr><td colSpan={10} className="text-center py-12 text-steel-600">ไม่พบรายการ</td></tr>}
                  {filtered.map((t,i)=>(
                    <tr key={t.id||i} className="hover:bg-white/[0.02]">
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{background:t.type==='income'?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',
                            color:t.type==='income'?'#4ade80':'#f87171',
                            border:`1px solid ${t.type==='income'?'rgba(74,222,128,0.25)':'rgba(248,113,113,0.25)'}`}}>
                          {t.type==='income'?'รายรับ':'รายจ่าย'}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{t.date}</td>
                      <td className="font-mono text-xs text-accent-400">{t.jobNo||'–'}</td>
                      <td className="font-mono text-xs text-steel-500">{t.po||'–'}</td>
                      <td className="text-steel-200 text-xs max-w-xs"><div className="truncate">{t.desc}</div></td>
                      <td className="text-xs text-steel-500">{t.category}</td>
                      <td className="text-right font-mono text-xs text-steel-400">{fmtB(t.net||t.amount)}</td>
                      <td className="text-right font-mono text-xs text-steel-500">{t.vatAmt>0?fmtB(t.vatAmt):'–'}</td>
                      <td className="text-right font-mono text-xs font-semibold" style={{color:t.type==='income'?'#4ade80':'#f87171'}}>
                        {fmtB(t.total)}
                      </td>
                      <td>
                        {!t.fromSheet && (
                          <div className="flex items-center gap-0.5">
                            <button onClick={()=>{setEditRecord(t);setShowForm(true)}} className="p-1 text-steel-600 hover:text-yellow-400 transition-colors"><Edit2 size={11}/></button>
                            <button onClick={()=>deleteTx(t.id)} className="p-1 text-steel-600 hover:text-red-400 transition-colors"><Trash2 size={11}/></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <TransactionModal open={showForm} onClose={()=>{setShowForm(false);setEditRecord(null)}}
          jobs={jobs} editData={editRecord}
          onSaved={r=>setTx(ts=>editRecord ? ts.map(t=>t.id===r.id?r:t) : [r,...ts])}/>
      )}
      {detailJob && (
        <JobPLModal open={!!detailJob} onClose={()=>setDetailJob(null)}
          jobNo={detailJob.jobNo} po={detailJob.po} transactions={allTx}/>
      )}
    </div>
  )
}
