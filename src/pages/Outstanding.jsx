import React, { useMemo, useState } from 'react'
import { AlertCircle, Search, Package, ChevronRight, X, TrendingUp, Clock, Building2, User } from 'lucide-react'
import { statusBadge, formatDate, formatCurrency } from '../api'
import JobDetailModal from '../components/JobDetailModal'

// สถานะที่ถือว่า "ยังค้าง" (งานยังไม่เสร็จสมบูรณ์)
const ACTIVE_STATUSES = ['งานใหม่','รอดำเนินการ','กำลังดำเนินการ','งานเสร็จรอส่ง','รออะไหล่']

function isOutstanding(job) {
  const qty  = parseInt(job['จำนวน'] || '0')
  const sent = parseInt(job['จำนวนส่งแล้ว'] || job['จำนวนที่ส่ง'] || '0')
  const outstanding = parseInt(job['จำนวนค้างส่ง'] || '0')
  const status = job['สถานะ'] || ''
  // ค้างส่ง = สถานะยังไม่ปิด/ยกเลิก/ส่งหมด และมีจำนวนค้าง
  if (['ปิดงาน','ยกเลิก','ส่งงานแล้ว'].includes(status)) return false
  return outstanding > 0 || (qty > 0 && sent < qty)
}

// Mini bar chart (inline svg)
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono shrink-0" style={{ color, minWidth:28, textAlign:'right' }}>{value}</span>
    </div>
  )
}

// Card สรุปที่กดได้
function SummaryCard({ label, value, sub, color, active, onClick, icon }) {
  return (
    <button onClick={onClick} className="metric-card text-left w-full transition-all hover:brightness-110 relative overflow-hidden"
      style={{ border: active ? `1px solid ${color}` : '1px solid #1e3a5f',
               boxShadow: active ? `0 0 0 1px ${color}22` : 'none' }}>
      {active && <div className="absolute inset-0 opacity-5" style={{ background: color }}/>}
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-steel-400 text-xs uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
          <p className="text-steel-500 text-xs mt-1">{sub}</p>
        </div>
        <div className="p-2 rounded-lg" style={{ background:`${color}18` }}>
          {icon}
        </div>
      </div>
      {active && (
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-xs" style={{ color }}>
          กรองแล้ว <ChevronRight size={11}/>
        </div>
      )}
    </button>
  )
}

export default function Outstanding({ jobs, onSelectJob }) {
  const [search, setSearch] = useState('')
  const [compFilter, setCompFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState('')
  const [activeCard, setActiveCard] = useState(null) // 'high'|'mid'|'low'|'overdue'|null
  const [selectedJob, setSelectedJob] = useState(null)

  // งานค้างทั้งหมด (filter สถานะถูกต้อง)
  const allOutstanding = useMemo(() =>
    jobs.filter(isOutstanding)
  , [jobs])

  const companies    = useMemo(() => [...new Set(allOutstanding.map(j => j['บริษัท']).filter(Boolean))].sort(), [allOutstanding])
  const responsibles = useMemo(() => [...new Set(allOutstanding.map(j => j['ผู้รับผิดชอบ']).filter(Boolean))].sort(), [allOutstanding])
  const statuses     = useMemo(() => [...new Set(allOutstanding.map(j => j['สถานะ']).filter(Boolean))].sort(), [allOutstanding])

  // คำนวณ urgency
  const withUrgency = useMemo(() => allOutstanding.map(j => {
    const c = parseInt(j['จำนวนค้างส่ง'] || '0')
    const statusDate = j['วันที่สถานะ'] || j['วันที่'] || ''
    const daysParts = statusDate.replace(/-/g,'/').split('/')
    let daysOld = 0
    if (daysParts.length === 3) {
      const d = new Date(daysParts[2], daysParts[1]-1, daysParts[0])
      daysOld = Math.floor((Date.now() - d)/86400000)
    }
    const urgency = daysOld > 30 || c > 20 ? 'high' : daysOld > 14 || c > 5 ? 'mid' : 'low'
    return { ...j, _outstanding: c, _daysOld: daysOld, _urgency: urgency }
  }), [allOutstanding])

  // Dashboard stats
  const stats = useMemo(() => ({
    total: withUrgency.length,
    high:  withUrgency.filter(j => j._urgency === 'high').length,
    mid:   withUrgency.filter(j => j._urgency === 'mid').length,
    low:   withUrgency.filter(j => j._urgency === 'low').length,
    overdue: withUrgency.filter(j => j._daysOld > 30).length,
    totalQty: withUrgency.reduce((s,j) => s+j._outstanding, 0),
  }), [withUrgency])

  const byCompany = useMemo(() => {
    const map = {}
    withUrgency.forEach(j => {
      const c = j['บริษัท'] || 'อื่นๆ'
      if (!map[c]) map[c] = { count:0, qty:0 }
      map[c].count++; map[c].qty += j._outstanding
    })
    return Object.entries(map).sort(([,a],[,b]) => b.count - a.count)
  }, [withUrgency])

  const byResponsible = useMemo(() => {
    const map = {}
    withUrgency.forEach(j => {
      const r = j['ผู้รับผิดชอบ'] || 'ไม่ระบุ'
      if (!map[r]) map[r] = { count:0 }
      map[r].count++
    })
    return Object.entries(map).sort(([,a],[,b]) => b.count - a.count)
  }, [withUrgency])

  const maxComp = byCompany.length > 0 ? byCompany[0][1].count : 1

  // Apply filters
  const filtered = useMemo(() => {
    return withUrgency.filter(j => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        (j['เลขที่']||'').toLowerCase().includes(q) ||
        (j['รายละเอียด']||'').toLowerCase().includes(q) ||
        (j['บริษัท']||'').toLowerCase().includes(q) ||
        (j['ผู้รับผิดชอบ']||'').toLowerCase().includes(q)
      const matchCard = !activeCard ||
        (activeCard === 'high' && j._urgency === 'high') ||
        (activeCard === 'mid'  && j._urgency === 'mid') ||
        (activeCard === 'low'  && j._urgency === 'low') ||
        (activeCard === 'overdue' && j._daysOld > 30)
      return matchSearch &&
        matchCard &&
        (!compFilter        || j['บริษัท']       === compFilter) &&
        (!statusFilter      || j['สถานะ']         === statusFilter) &&
        (!responsibleFilter || j['ผู้รับผิดชอบ']  === responsibleFilter)
    }).sort((a,b) => {
      if (a._urgency !== b._urgency) {
        const ord = { high:0, mid:1, low:2 }
        return ord[a._urgency] - ord[b._urgency]
      }
      return b._outstanding - a._outstanding
    })
  }, [withUrgency, search, compFilter, statusFilter, responsibleFilter, activeCard])

  const hasFilter = search || compFilter || statusFilter || responsibleFilter || activeCard
  const clearAll  = () => { setSearch(''); setCompFilter(''); setStatusFilter(''); setResponsibleFilter(''); setActiveCard(null) }

  const urgencyStyle = {
    high:    { color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.3)', label:'เร่งด่วนสูง' },
    mid:     { color:'#fb923c', bg:'rgba(251,146,60,0.1)',  border:'rgba(251,146,60,0.3)',  label:'ปานกลาง' },
    low:     { color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.3)',  label:'ปกติ' },
    overdue: { color:'#c084fc', bg:'rgba(192,132,252,0.1)', border:'rgba(192,132,252,0.3)', label:'เกิน 30 วัน' },
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">งานค้างส่ง</h1>
        <p className="text-steel-400 text-sm mt-0.5">
          ทั้งหมด <span className="text-red-400 font-semibold">{stats.total}</span> รายการ ·
          ค้างรวม <span className="text-orange-400 font-semibold">{stats.totalQty}</span> ชิ้น
        </p>
      </div>

      {/* Dashboard summary cards — กดได้เพื่อกรอง */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="เร่งด่วนสูง" value={stats.high} sub="ค้างมาก / นานมาก"
          color="#f87171" active={activeCard==='high'} icon={<AlertCircle size={18} style={{color:'#f87171'}}/>}
          onClick={() => setActiveCard(activeCard==='high' ? null : 'high')}/>
        <SummaryCard label="ปานกลาง" value={stats.mid} sub="> 14 วัน หรือ > 5 ชิ้น"
          color="#fb923c" active={activeCard==='mid'} icon={<Clock size={18} style={{color:'#fb923c'}}/>}
          onClick={() => setActiveCard(activeCard==='mid' ? null : 'mid')}/>
        <SummaryCard label="ปกติ" value={stats.low} sub="ค้างน้อย ยังไม่นาน"
          color="#fbbf24" active={activeCard==='low'} icon={<Package size={18} style={{color:'#fbbf24'}}/>}
          onClick={() => setActiveCard(activeCard==='low' ? null : 'low')}/>
        <SummaryCard label="เกิน 30 วัน" value={stats.overdue} sub="ต้องติดตามด่วน"
          color="#c084fc" active={activeCard==='overdue'} icon={<TrendingUp size={18} style={{color:'#c084fc'}}/>}
          onClick={() => setActiveCard(activeCard==='overdue' ? null : 'overdue')}/>
      </div>

      {/* By company + By responsible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* แยกตามบริษัท */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={13} className="text-steel-500"/>
            <span className="text-steel-400 text-xs font-semibold uppercase tracking-wider">แยกตามบริษัท</span>
          </div>
          <div className="space-y-2.5">
            {byCompany.map(([comp, d]) => (
              <button key={comp} className="w-full text-left group"
                onClick={() => setCompFilter(compFilter===comp ? '' : comp)}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium transition-colors ${compFilter===comp ? 'text-blue-400' : 'text-steel-300 group-hover:text-white'}`}>{comp}</span>
                  <span className="text-xs text-steel-500">{d.count} ใบ</span>
                </div>
                <MiniBar value={d.count} max={maxComp} color={compFilter===comp ? '#60a5fa' : '#4a6584'}/>
              </button>
            ))}
          </div>
        </div>

        {/* แยกตามผู้รับผิดชอบ */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={13} className="text-steel-500"/>
            <span className="text-steel-400 text-xs font-semibold uppercase tracking-wider">แยกตามผู้รับผิดชอบ</span>
          </div>
          <div className="space-y-2.5">
            {byResponsible.map(([resp, d]) => (
              <button key={resp} className="w-full text-left group"
                onClick={() => setResponsibleFilter(responsibleFilter===resp ? '' : resp)}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium transition-colors ${responsibleFilter===resp ? 'text-blue-400' : 'text-steel-300 group-hover:text-white'}`}>{resp}</span>
                  <span className="text-xs text-steel-500">{d.count} ใบ</span>
                </div>
                <MiniBar value={d.count} max={byResponsible[0]?.[1].count||1} color={responsibleFilter===resp ? '#60a5fa' : '#4a6584'}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative" style={{ minWidth:180 }}>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
            <input className="w-full pl-8 pr-3 py-1.5 text-xs" placeholder="ค้นหา..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="text-xs py-1.5 px-2" value={compFilter} onChange={e => setCompFilter(e.target.value)}>
            <option value="">ทุกบริษัท</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="text-xs py-1.5 px-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">ทุกสถานะ</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="text-xs py-1.5 px-2" value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)}>
            <option value="">ทุกผู้รับผิดชอบ</option>
            {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasFilter && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-red-400 hover:text-red-300 transition-colors"
              style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)' }}>
              <X size={11}/> ล้างทั้งหมด
            </button>
          )}
          <span className="ml-auto text-xs text-steel-500">
            แสดง <span className="text-steel-300 font-medium">{filtered.length}</span> รายการ
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ระดับ</th>
                <th>วันที่</th>
                <th>เลขที่</th>
                <th>รายละเอียด</th>
                <th>บริษัท</th>
                <th>ผู้รับผิดชอบ</th>
                <th className="text-center">รวม</th>
                <th className="text-center">ส่งแล้ว</th>
                <th className="text-center">ค้าง</th>
                <th>สถานะ</th>
                <th>นานแค่ไหน</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job, i) => {
                const us = urgencyStyle[job._urgency]
                return (
                  <tr key={i} className="cursor-pointer hover:bg-white/[0.025] transition-colors"
                    onClick={() => setSelectedJob(job)}>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background:us.bg, color:us.color, border:`1px solid ${us.border}` }}>
                        {us.label}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(job['วันที่'])}</td>
                    <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{job['เลขที่']}</td>
                    <td className="text-steel-200 max-w-xs">
                      <div className="truncate text-xs">{job['รายละเอียด']}</div>
                    </td>
                    <td className="text-steel-400 text-xs">{job['บริษัท']}</td>
                    <td className="text-steel-400 text-xs">{job['ผู้รับผิดชอบ']}</td>
                    <td className="text-center font-mono text-xs text-steel-300">{job['จำนวน']||'–'}</td>
                    <td className="text-center font-mono text-xs text-green-400">
                      {job['จำนวนส่งแล้ว'] || job['จำนวนที่ส่ง'] || '0'}
                    </td>
                    <td className="text-center">
                      <span className="font-mono text-sm font-bold" style={{ color: us.color }}>{job._outstanding}</span>
                    </td>
                    <td><span className={`status-pill ${statusBadge(job['สถานะ'])}`}>{job['สถานะ']}</span></td>
                    <td className="text-xs whitespace-nowrap" style={{
                      color: job._daysOld > 30 ? '#c084fc' : job._daysOld > 14 ? '#fb923c' : '#64748b'
                    }}>
                      {job._daysOld > 0 ? `${job._daysOld} วันที่แล้ว` : 'วันนี้'}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-steel-600">
                    <Package size={36} className="mx-auto mb-3 opacity-20"/>
                    <div>{hasFilter ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ไม่มีงานค้างส่ง 🎉'}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onEdit={() => setSelectedJob(null)}
        onDelete={() => setSelectedJob(null)}
      />
    </div>
  )
}
