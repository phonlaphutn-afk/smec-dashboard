import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  Calendar, BarChart2, Users, Settings, Search, Plus, X, ChevronLeft, ChevronRight,
  Download, Printer, Trash2, GripVertical, Check, AlertCircle, Package, ChevronDown
} from 'lucide-react'
import { postSheet, formatDate } from '../api'

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const WEEKDAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']
const MONTHS_TH   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const STATUS_COLORS = {
  'เสร็จแล้ว':      '#4ade80',
  'กำลังดำเนินการ': '#60a5fa',
  'รอดำเนินการ':    '#fbbf24',
  'ยกเลิก':         '#94a3b8',
  'ไม่ได้ทำ':       '#f87171',
}

function toISO(thaiDate) {
  if (!thaiDate) return ''
  const s = String(thaiDate).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const p = s.replace(/-/g,'/').split('/')
  if (p.length === 3) {
    let [d,m,y] = p
    if (y.length===2) y = '20'+y
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  return ''
}

function addDays(isoDate, n) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0,10)
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function fmtDateTH(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()}`
}

function getWeekDates(startISO, count=7) {
  return Array.from({length:count}, (_,i) => addDays(startISO,i))
}

function getMondayOf(isoDate) {
  const d = new Date(isoDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0,10)
}

function todayISO() { return new Date().toISOString().slice(0,10) }

// parse sub-items from sheet text
function parseSubItems(str) {
  if (!str) return []
  return str.split('\n').map(line => {
    line = line.trim()
    if (!line.startsWith('-')) return null
    const m = line.match(/^- (.*?)\s+\((.*?)\/(.*?)\s+(.*?)\)\s+\[(.*?)\]/)
    if (!m) return { name: line.replace(/^- /,''), qty:'–', sent:'–', unit:'', status:'รอดำเนินการ' }
    return { name:m[1].trim(), qty:m[2], sent:m[3], unit:m[4].trim(), status:m[5].trim() }
  }).filter(Boolean)
}

// ═══════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// ── 1. SCHEDULE DASHBOARD ──────────────────────────────────────────
function ScheduleDashboard({ jobs, plans, holidays }) {
  const today = todayISO()
  const thisMonth = today.slice(0,7)

  const stats = useMemo(() => {
    const activePlans = plans.filter(p => p.status !== 'ยกเลิก')
    const done = activePlans.filter(p => p.status === 'เสร็จแล้ว')
    const inProgress = activePlans.filter(p => p.status === 'กำลังดำเนินการ')
    const overdue = activePlans.filter(p => p.endDate < today && p.status !== 'เสร็จแล้ว' && p.status !== 'ยกเลิก')
    const thisMonthPlans = activePlans.filter(p => (p.startDate||'').startsWith(thisMonth) || (p.endDate||'').startsWith(thisMonth))

    // by person
    const byPerson = {}
    activePlans.forEach(p => {
      const name = p.assignee || 'ไม่ระบุ'
      if (!byPerson[name]) byPerson[name] = { total:0, done:0 }
      byPerson[name].total++
      if (p.status === 'เสร็จแล้ว') byPerson[name].done++
    })

    return { total:activePlans.length, done:done.length, inProgress:inProgress.length,
             overdue:overdue.length, thisMonth:thisMonthPlans.length,
             byPerson: Object.entries(byPerson).sort(([,a],[,b])=>b.total-a.total) }
  }, [plans, today, thisMonth])

  const upcomingJobs = useMemo(() =>
    plans.filter(p => p.startDate >= today && p.startDate <= addDays(today,7) && p.status !== 'ยกเลิก')
      .sort((a,b) => a.startDate.localeCompare(b.startDate)).slice(0,8)
  , [plans, today])

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'แผนงานทั้งหมด',    val:stats.total,      color:'#60a5fa', sub:'รายการ' },
          { label:'กำลังดำเนินการ',  val:stats.inProgress, color:'#fbbf24', sub:'รายการ' },
          { label:'เสร็จสมบูรณ์',    val:stats.done,       color:'#4ade80', sub:'รายการ' },
          { label:'เกินกำหนด',        val:stats.overdue,    color:'#f87171', sub:'รายการ' },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <p className="text-steel-400 text-xs uppercase tracking-wider">{c.label}</p>
            <p className="text-3xl font-bold mt-2" style={{color:c.color}}>{c.val}</p>
            <p className="text-steel-500 text-xs mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming this week */}
        <div className="card p-4">
          <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={12}/> งานที่จะเริ่ม 7 วันข้างหน้า ({upcomingJobs.length})
          </h3>
          {upcomingJobs.length === 0 ? (
            <div className="text-steel-600 text-xs text-center py-6">ไม่มีงานที่จะเริ่มใน 7 วัน</div>
          ) : (
            <div className="space-y-2">
              {upcomingJobs.map((p,i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{background:'#071624',border:'1px solid #0f2744'}}>
                  <div className="shrink-0 text-center" style={{minWidth:32}}>
                    <div className="text-xs font-bold" style={{color:'#60a5fa'}}>{new Date(p.startDate).getDate()}</div>
                    <div className="text-xs text-steel-600">{MONTHS_TH[new Date(p.startDate).getMonth()]}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-steel-200 truncate">{p.taskName}</div>
                    <div className="text-xs text-steel-500">{p.jobNo} · {p.assignee||'ไม่ระบุ'}</div>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.25)'}}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By person */}
        <div className="card p-4">
          <h3 className="text-steel-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12}/> ภาระงานรายบุคคล
          </h3>
          {stats.byPerson.length === 0 ? (
            <div className="text-steel-600 text-xs text-center py-6">ยังไม่มีข้อมูลแผนงาน</div>
          ) : (
            <div className="space-y-3">
              {stats.byPerson.map(([name, d]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-steel-300 font-medium">{name}</span>
                    <span className="text-steel-500">{d.done}/{d.total} งาน</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{
                      width:`${d.total>0?(d.done/d.total*100):0}%`,
                      background:'linear-gradient(90deg,#4ade80,#22d3ee)'
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 2. MASTER PLAN ─────────────────────────────────────────────────
// แสดง Gantt + tree hierarchy จาก TaskName pattern [1], [1.1], [1.1.1]
// ─────────────────────────────────────────────────────────────────

// ── helpers ──
function detectLevel(taskName) {
  // [1] = level 1, [1.1] = level 2, [1.1.1] = level 3
  const m = String(taskName||'').match(/^\[(\d+(?:\.\d+)*)\]/)
  if (!m) return 0
  return m[1].split('.').length
}

function detectLevelStr(taskName) {
  const m = String(taskName||'').match(/^\[(\d+(?:\.\d+)*)\]/)
  return m ? m[1] : null
}

// group tasks โดย DocNo แล้วสร้าง tree
function buildTree(plans) {
  // group by DocNo
  const byDoc = {}
  plans.forEach(p => {
    const key = p.jobNo || '(ไม่มีเลขงาน)'
    if (!byDoc[key]) byDoc[key] = []
    byDoc[key].push(p)
  })

  return Object.entries(byDoc).map(([docNo, tasks]) => {
    // คำนวณ progress รวมของ group
    const withProgress = tasks.filter(t => t.progress !== undefined && t.progress !== '')
    const avgProgress = withProgress.length
      ? Math.round(withProgress.reduce((s, t) => s + parseFloat(t.progress || 0), 0) / withProgress.length)
      : 0
    const gs = tasks.reduce((mn, t) => t.startDate && t.startDate < mn ? t.startDate : mn, '9999')
    const ge = tasks.reduce((mx, t) => t.endDate && t.endDate > mx ? t.endDate : mx, '0000')
    return { docNo, tasks, avgProgress, groupStart: gs === '9999' ? '' : gs, groupEnd: ge === '0000' ? '' : ge }
  })
}

const STATUS_COLORS_PLAN = {
  'เสร็จแล้ว':       { bg: '#4ade8030', border: '#4ade80', text: '#4ade80' },
  'กำลังดำเนินการ':  { bg: '#60a5fa30', border: '#60a5fa', text: '#60a5fa' },
  'รอดำเนินการ':     { bg: '#fbbf2430', border: '#fbbf24', text: '#fbbf24' },
  'ยกเลิก':          { bg: '#94a3b830', border: '#94a3b8', text: '#94a3b8' },
}
function scolor(status) {
  return STATUS_COLORS_PLAN[status] || { bg: '#60a5fa20', border: '#60a5fa80', text: '#60a5fa' }
}

const DOC_COLORS = ['#60a5fa','#34d399','#f59e0b','#f472b6','#a78bfa','#38bdf8','#fb923c','#4ade80','#e879f9','#facc15']

// ── EditCell ── inline editable cell
function EditCell({ value, onChange, type = 'text', options, style }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  if (editing) {
    if (options) return (
      <select autoFocus className="text-xs w-full"
        style={{ background: '#0d2137', border: '1px solid #3b82f6', borderRadius: 4, color: '#e2e8f0', padding: '1px 4px', ...style }}
        value={v} onChange={e => { setV(e.target.value); onChange(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    return (
      <input autoFocus type={type} className="text-xs w-full"
        style={{ background: '#0d2137', border: '1px solid #3b82f6', borderRadius: 4, color: '#e2e8f0', padding: '1px 4px', ...style }}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onChange(v); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(v); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }
  return (
    <span className="cursor-pointer hover:text-blue-400 transition-colors" style={style}
      onClick={() => setEditing(true)} title="คลิกเพื่อแก้ไข">{value || <span style={{color:'#4a6584'}}>–</span>}</span>
  )
}

function MasterPlan({ jobs, plans, setPlans, holidays }) {
  const [viewMode, setViewMode]     = useState('2w')
  const [anchor, setAnchor]         = useState(getMondayOf(todayISO()))
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch]         = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [collapsed, setCollapsed]   = useState({})   // { docNo: bool }
  const scrollRef = useRef(null)
  const today = todayISO()

  const COL_W      = viewMode === '3m' ? 20 : viewMode === '1m' ? 28 : 38
  const displayDays = viewMode === '2w' ? 14 : viewMode === '1m' ? 30 : 90
  const dates       = useMemo(() => getWeekDates(anchor, displayDays), [anchor, displayDays])
  const endAnchor   = dates[dates.length - 1]
  const holidaySet  = useMemo(() => new Set(holidays.map(h => h.date)), [holidays])
  const totalW      = displayDays * COL_W
  const LABEL_W     = 320

  // month groups for header
  const monthGroups = useMemo(() => {
    const groups = []
    let cur = null
    dates.forEach(d => {
      const ym = d.slice(0, 7)
      if (!cur || cur.ym !== ym) {
        cur = { ym, label: `${MONTHS_TH[parseInt(d.slice(5, 7)) - 1]} ${parseInt(d.slice(0, 4)) + 543}`, count: 1 }
        groups.push(cur)
      } else cur.count++
    })
    return groups
  }, [dates])

  const move = n => setAnchor(addDays(anchor, n * (viewMode === '2w' ? 7 : viewMode === '1m' ? 14 : 30)))

  // filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (!p.startDate || !p.endDate) return false
      const isProj = !!p.isProject || jobs.find(j => j['เลขที่'] === p.jobNo)?.['ประเภท'] === 'โครงการ'
      if (filterType === 'project' && !isProj) return false
      if (filterType === 'general' && isProj) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.taskName?.toLowerCase().includes(q) && !p.jobNo?.toLowerCase().includes(q) &&
            !p.assignee?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [plans, filterType, search, jobs])

  const grouped = useMemo(() => buildTree(filteredPlans), [filteredPlans])

  // color map per docNo
  const colorMap = useMemo(() => {
    const m = {}
    grouped.forEach(({ docNo }, i) => { m[docNo] = DOC_COLORS[i % DOC_COLORS.length] })
    return m
  }, [grouped])

  // Gantt position helpers
  const dayX = iso => Math.max(0, daysBetween(anchor, iso)) * COL_W
  const barLeft  = iso => dayX(iso < anchor ? anchor : iso)
  const barWidth = (s, e) => {
    const cs = s < anchor ? anchor : s
    const ce = e > endAnchor ? endAnchor : e
    return Math.max(COL_W * 0.4, (daysBetween(cs, ce) + 1) * COL_W)
  }

  // update a plan field
  const updatePlan = (id, key, val) => {
    setPlans(ps => ps.map(p => p.id === id ? { ...p, [key]: val } : p))
  }
  const deletePlan = id => { if (window.confirm('ลบแผนงานนี้?')) setPlans(ps => ps.filter(p => p.id !== id)) }

  useEffect(() => {
    if (scrollRef.current) {
      const off = dayX(today)
      scrollRef.current.scrollLeft = Math.max(0, off - 150)
    }
  }, [anchor, COL_W])

  // ── render row helper ──────────────────────────────────────────
  const STATUS_OPTIONS = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จแล้ว', 'ยกเลิก']

  function PlanRow({ plan, docColor }) {
    const level  = detectLevel(plan.taskName)
    const sc     = scolor(plan.status)
    const prog   = Math.min(100, Math.max(0, parseFloat(plan.progress || 0)))
    const inView = plan.startDate && plan.endDate && !(plan.endDate < anchor || plan.startDate > endAnchor)
    const indentPx = level > 1 ? (level - 1) * 16 : 0

    return (
      <div className="flex border-b hover:bg-white/[0.025] group/row transition-colors"
        style={{ borderColor: '#0f2235', minHeight: 38 }}>

        {/* LABEL */}
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5"
          style={{ width: LABEL_W, borderRight: '1px solid #0f2235', paddingLeft: 8 + indentPx }}>
          {/* level indicator */}
          {level > 1 && <div className="shrink-0 w-px self-stretch my-1 rounded" style={{ background: docColor + '50' }} />}
          {/* status dot */}
          <div className="shrink-0 w-2 h-2 rounded-full" style={{ background: sc.border }} />
          {/* task name — editable */}
          <div className="min-w-0 flex-1">
            <EditCell value={plan.taskName} onChange={v => updatePlan(plan.id, 'taskName', v)}
              style={{ fontSize: level === 0 ? 12 : level === 1 ? 11.5 : 11, color: level > 1 ? '#94a3b8' : '#e2e8f0', fontWeight: level <= 1 ? 500 : 400 }} />
            <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: '#4a6584' }}>
              <EditCell value={plan.assignee || ''} onChange={v => updatePlan(plan.id, 'assignee', v)} style={{ fontSize: 10 }} />
            </div>
          </div>
          {/* progress pill */}
          <div className="shrink-0 flex items-center gap-1">
            <div className="relative rounded overflow-hidden" style={{ width: 40, height: 4, background: '#1e3a5f' }}>
              <div className="absolute left-0 top-0 h-full rounded" style={{ width: `${prog}%`, background: prog >= 100 ? '#4ade80' : prog > 50 ? '#60a5fa' : '#fbbf24', transition: 'width 0.3s' }} />
            </div>
            <EditCell value={String(Math.round(prog))} onChange={v => updatePlan(plan.id, 'progress', v)} type="number"
              style={{ fontSize: 10, color: prog >= 100 ? '#4ade80' : prog > 50 ? '#60a5fa' : '#fbbf24', minWidth: 24, textAlign: 'right' }} />
            <span style={{ fontSize: 9, color: '#4a6584' }}>%</span>
          </div>
          {/* status badge - editable */}
          <EditCell value={plan.status} onChange={v => updatePlan(plan.id, 'status', v)} options={STATUS_OPTIONS}
            style={{ fontSize: 9, color: sc.text, padding: '1px 5px', borderRadius: 4, background: sc.bg, border: `1px solid ${sc.border}50`, whiteSpace: 'nowrap', flexShrink: 0 }} />
          {/* delete — only local plans */}
          {!plan.fromSheet && (
            <button onClick={() => deletePlan(plan.id)}
              className="opacity-0 group-hover/row:opacity-100 text-steel-700 hover:text-red-400 transition-all p-0.5 shrink-0">
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* GANTT */}
        <div className="flex-1 relative" style={{ minHeight: 38 }}>
          {/* weekend/holiday shading */}
          {dates.map(d => {
            const dow = new Date(d).getDay()
            if (dow !== 0 && dow !== 6 && !holidaySet.has(d)) return null
            return <div key={d} className="absolute inset-y-0" style={{ left: dayX(d), width: COL_W, background: 'rgba(248,113,113,0.04)' }} />
          })}
          {/* today line */}
          {today >= anchor && today <= endAnchor && (
            <div className="absolute inset-y-0" style={{ left: dayX(today) + COL_W / 2, width: 1.5, background: 'rgba(56,139,253,0.7)', zIndex: 5 }} />
          )}
          {/* Plan bar */}
          {inView && plan.startDate && plan.endDate && (
            <div className="absolute rounded flex items-center overflow-hidden"
              title={`แผน: ${plan.startDate} → ${plan.endDate}\nจริง: ${plan.actualStart || '–'} → ${plan.actualEnd || '–'}\nProgress: ${prog}%`}
              style={{
                left: barLeft(plan.startDate), width: barWidth(plan.startDate, plan.endDate),
                top: '50%', transform: 'translateY(-50%)',
                height: level > 1 ? 16 : 20,
                background: sc.bg, border: `1px solid ${sc.border}60`,
                minWidth: 4, zIndex: 2
              }}>
              <div className="h-full" style={{ width: `${prog}%`, background: sc.border + '70' }} />
              {barWidth(plan.startDate, plan.endDate) > 50 && (
                <span className="absolute inset-0 flex items-center px-1.5 truncate"
                  style={{ color: sc.text, fontSize: '0.6rem', fontWeight: 500 }}>
                  {prog > 0 ? `${Math.round(prog)}%` : ''} {COL_W >= 32 ? plan.taskName : ''}
                </span>
              )}
            </div>
          )}
          {/* Actual bar */}
          {inView && plan.actualStart && plan.actualEnd && (
            <div className="absolute rounded"
              style={{
                left: barLeft(plan.actualStart), width: barWidth(plan.actualStart, plan.actualEnd),
                top: '50%', transform: `translateY(${level > 1 ? '-15%' : '30%'})`,
                height: level > 1 ? 5 : 7,
                background: '#4ade8080', border: '1px solid #4ade8080',
                minWidth: 4, zIndex: 3, opacity: 0.85
              }} />
          )}
        </div>
      </div>
    )
  }

  // ── main render ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
          <button onClick={() => move(-1)} className="px-2 py-1.5 text-steel-400 hover:text-white hover:bg-white/10 transition-colors"><ChevronLeft size={14} /></button>
          <button onClick={() => setAnchor(getMondayOf(today))} className="px-3 py-1.5 text-xs text-steel-400 hover:text-white transition-colors border-x border-steel-800">วันนี้</button>
          <button onClick={() => move(1)} className="px-2 py-1.5 text-steel-400 hover:text-white hover:bg-white/10 transition-colors"><ChevronRight size={14} /></button>
        </div>
        <span className="text-white text-sm font-semibold">{fmtDateTH(anchor)} – {fmtDateTH(endAnchor)}</span>

        <div className="flex items-center rounded-lg overflow-hidden ml-auto" style={{ border: '1px solid #1e3a5f' }}>
          {[['2w', '2 สัปดาห์'], ['1m', '1 เดือน'], ['3m', '3 เดือน']].map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v)} className="px-3 py-1.5 text-xs transition-colors"
              style={{ background: viewMode === v ? 'rgba(56,139,253,0.2)' : 'transparent', color: viewMode === v ? '#60a5fa' : '#4a6584' }}>{l}</button>
          ))}
        </div>

        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
          {[['all', 'ทั้งหมด'], ['project', 'โครงการ'], ['general', 'ทั่วไป']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterType(v)} className="px-3 py-1.5 text-xs transition-colors"
              style={{ background: filterType === v ? 'rgba(56,139,253,0.2)' : 'transparent', color: filterType === v ? '#60a5fa' : '#4a6584' }}>{l}</button>
          ))}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="pl-7 pr-3 py-1.5 text-xs w-44" placeholder="ค้นหางาน / ผู้รับผิดชอบ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#1d6fd8,#1a56b0)' }}>
          <Plus size={13} /> เพิ่มแผนงาน
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-steel-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="inline-block w-8 h-3 rounded" style={{ background: '#60a5fa30', border: '1px solid #60a5fa60' }} />แผนงาน (Plan)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-8 h-2 rounded" style={{ background: '#4ade8080' }} />จริง (Actual)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-px h-4" style={{ background: 'rgba(56,139,253,0.7)' }} />วันนี้</span>
        <span className="flex items-center gap-1.5 ml-auto text-xs" style={{color:'#4a6584'}}>
          💡 คลิกที่ชื่องาน / ผู้รับผิดชอบ / % / สถานะ เพื่อแก้ไข
        </span>
      </div>

      {/* Gantt */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f', background: '#050e1a' }}>
        {grouped.length === 0 ? (
          <div className="py-20 text-center text-steel-600 text-sm">ไม่มีแผนงานในช่วงนี้</div>
        ) : (
          <div className="flex" style={{ height: 'calc(100vh - 320px)', minHeight: 350 }}>
            {/* LEFT sticky label */}
            <div className="shrink-0 border-r border-steel-900 overflow-y-auto" style={{ width: LABEL_W }}>
              {/* column headers */}
              <div className="sticky top-0 z-10 flex items-center px-2 py-1.5 border-b border-steel-800"
                style={{ background: '#050e1a', height: 49 }}>
                <span className="text-xs font-semibold" style={{ color: '#4a6584' }}>งาน / รายการ</span>
                <span className="ml-auto text-xs" style={{ color: '#4a6584' }}>% / สถานะ</span>
              </div>
              {/* rows */}
              {grouped.map(({ docNo, tasks, avgProgress, groupStart, groupEnd }) => {
                const docColor = colorMap[docNo]
                const isCol = collapsed[docNo]
                return (
                  <div key={docNo}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-2 py-2 cursor-pointer select-none border-b border-steel-800 hover:bg-white/5"
                      onClick={() => setCollapsed(p => ({ ...p, [docNo]: !p[docNo] }))}
                      style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${docColor}` }}>
                      <ChevronDown size={11} className="text-steel-500 shrink-0 transition-transform duration-200"
                        style={{ transform: isCol ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate" style={{ color: docColor }}>{docNo}</div>
                        <div className="text-xs" style={{ color: '#4a6584' }}>{tasks.length} งาน · {groupStart && groupEnd ? `${fmtDateTH(groupStart)} – ${fmtDateTH(groupEnd)}` : ''}</div>
                      </div>
                      <div className="shrink-0 text-xs font-bold" style={{ color: avgProgress >= 100 ? '#4ade80' : avgProgress > 50 ? '#60a5fa' : '#fbbf24' }}>
                        {avgProgress}%
                      </div>
                    </div>
                    {/* Task rows */}
                    {!isCol && tasks.map((t, ti) => (
                      <PlanRow key={t.id || ti} plan={t} docColor={docColor} />
                    ))}
                  </div>
                )
              })}
            </div>

            {/* RIGHT timeline */}
            <div ref={scrollRef} className="flex-1 overflow-auto">
              <div style={{ width: totalW, minWidth: '100%' }}>
                {/* Month header */}
                <div className="flex sticky top-0 z-20" style={{ background: '#050e1a', borderBottom: '1px solid #1e3a5f', height: 24 }}>
                  {monthGroups.map(g => (
                    <div key={g.ym} className="flex items-center justify-center text-xs font-semibold border-r border-steel-800 shrink-0"
                      style={{ width: g.count * COL_W, color: '#4a6584' }}>{g.label}</div>
                  ))}
                </div>
                {/* Day header */}
                <div className="flex sticky top-6 z-20" style={{ background: '#050e1a', borderBottom: '1px solid #1e3a5f', height: 25 }}>
                  {dates.map(d => {
                    const isToday = d === today
                    const dow = new Date(d).getDay()
                    const isWeekend = dow === 0 || dow === 6
                    return (
                      <div key={d} className="shrink-0 flex flex-col items-center justify-center border-r border-steel-800/40 text-xs"
                        style={{ width: COL_W, background: isToday ? 'rgba(56,139,253,0.15)' : isWeekend || holidaySet.has(d) ? 'rgba(248,113,113,0.05)' : 'transparent', color: isToday ? '#60a5fa' : isWeekend ? '#475569' : '#4a6584' }}>
                        <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 400 }}>{new Date(d).getDate()}</span>
                        {COL_W >= 32 && <span style={{ fontSize: 8 }}>{WEEKDAYS_TH[dow]}</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Gantt rows — must match left panel */}
                {/* header spacer */}
                <div style={{ height: 49, borderBottom: '1px solid #0f2235' }} />
                {grouped.map(({ docNo, tasks, groupStart, groupEnd, avgProgress }) => {
                  const docColor = colorMap[docNo]
                  const isCol = collapsed[docNo]
                  return (
                    <div key={docNo}>
                      {/* Group row */}
                      <div className="relative border-b" style={{ height: 49, background: 'rgba(255,255,255,0.015)', borderColor: '#1e3a5f' }}>
                        {dates.map(d => { const dow = new Date(d).getDay(); if (dow !== 0 && dow !== 6 && !holidaySet.has(d)) return null; return <div key={d} className="absolute inset-y-0" style={{ left: dayX(d), width: COL_W, background: 'rgba(248,113,113,0.04)' }} /> })}
                        {today >= anchor && today <= endAnchor && <div className="absolute inset-y-0" style={{ left: dayX(today) + COL_W / 2, width: 1.5, background: 'rgba(56,139,253,0.7)', zIndex: 5 }} />}
                        {/* group summary bar */}
                        {groupStart && groupEnd && (
                          <div className="absolute rounded flex items-center overflow-hidden"
                            style={{ left: barLeft(groupStart), width: barWidth(groupStart, groupEnd), top: '50%', transform: 'translateY(-50%)', height: 18, background: docColor + '18', border: `1.5px solid ${docColor}60`, minWidth: 6, zIndex: 2 }}>
                            <div className="h-full rounded" style={{ width: `${avgProgress}%`, background: docColor + '40' }} />
                            <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold truncate" style={{ color: docColor, fontSize: '0.62rem' }}>
                              {avgProgress}% · {tasks.length} งาน
                            </span>
                          </div>
                        )}
                      </div>
                      {/* task rows */}
                      {!isCol && tasks.map((t, ti) => {
                        const level = detectLevel(t.taskName)
                        const sc = scolor(t.status)
                        const prog = Math.min(100, Math.max(0, parseFloat(t.progress || 0)))
                        const inView = t.startDate && t.endDate && !(t.endDate < anchor || t.startDate > endAnchor)
                        return (
                          <div key={t.id || ti} className="relative border-b"
                            style={{ height: 38, background: ti % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)', borderColor: '#0f2235' }}>
                            {dates.map(d => { const dow = new Date(d).getDay(); if (dow !== 0 && dow !== 6 && !holidaySet.has(d)) return null; return <div key={d} className="absolute inset-y-0" style={{ left: dayX(d), width: COL_W, background: 'rgba(248,113,113,0.03)' }} /> })}
                            {today >= anchor && today <= endAnchor && <div className="absolute inset-y-0" style={{ left: dayX(today) + COL_W / 2, width: 1, background: 'rgba(56,139,253,0.4)', zIndex: 5 }} />}
                            {/* plan bar */}
                            {inView && t.startDate && t.endDate && (
                              <div className="absolute rounded flex items-center overflow-hidden"
                                title={`${t.taskName}\n${t.startDate} → ${t.endDate} | ${prog}%`}
                                style={{ left: barLeft(t.startDate), width: barWidth(t.startDate, t.endDate), top: '50%', transform: 'translateY(-50%)', height: level > 1 ? 14 : 18, background: sc.bg, border: `1px solid ${sc.border}60`, minWidth: 4, zIndex: 2 }}>
                                <div className="h-full" style={{ width: `${prog}%`, background: sc.border + '70' }} />
                                {barWidth(t.startDate, t.endDate) > 45 && (
                                  <span className="absolute inset-0 flex items-center px-1.5 truncate" style={{ color: sc.text, fontSize: '0.58rem' }}>
                                    {prog > 0 ? `${Math.round(prog)}%` : ''}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* actual bar */}
                            {inView && t.actualStart && t.actualEnd && (
                              <div className="absolute rounded"
                                style={{ left: barLeft(t.actualStart), width: barWidth(t.actualStart, t.actualEnd), top: '50%', transform: `translateY(${level > 1 ? '-10%' : '40%'})`, height: level > 1 ? 4 : 5, background: '#4ade8080', border: '1px solid #4ade8080', minWidth: 4, zIndex: 3 }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddPlanModal jobs={jobs} onClose={() => setShowAdd(false)}
          onAdd={p => { setPlans(ps => [...ps, { ...p, id: Date.now().toString() }]); setShowAdd(false) }} />
      )}
    </div>
  )
}


// ── 3. DAILY PLAN ─────────────────────────────────────────────────
function DailyPlan({ jobs, plans, holidays }) {
  const [weekStart, setWeekStart] = useState(getMondayOf(todayISO()))
  const [filterPerson, setFilterPerson] = useState('')
  const [filterJob, setFilterJob] = useState('')
  const weekDates = getWeekDates(weekStart, 7)
  const holidaySet = useMemo(() => new Set(holidays.map(h=>h.date)), [holidays])

  const persons = useMemo(() => [...new Set(plans.map(p=>p.assignee).filter(Boolean))].sort(), [plans])
  const jobNos  = useMemo(() => [...new Set(plans.map(p=>p.jobNo).filter(Boolean))].sort(), [plans])

  // Build daily grid: { date -> { person -> [tasks] } }
  const grid = useMemo(() => {
    const g = {}
    weekDates.forEach(d => { g[d] = {} })
    plans.forEach(p => {
      if (!p.startDate || !p.endDate) return
      if (filterPerson && p.assignee !== filterPerson) return
      if (filterJob && p.jobNo !== filterJob) return
      // for each day in plan range that's in this week
      let cur = p.startDate > weekStart ? p.startDate : weekStart
      const last = p.endDate < weekDates[6] ? p.endDate : weekDates[6]
      while (cur <= last) {
        if (!g[cur]) cur = addDays(cur,1)
        const person = p.assignee || 'ไม่ระบุ'
        if (!g[cur][person]) g[cur][person] = []
        g[cur][person].push(p)
        cur = addDays(cur,1)
      }
    })
    return g
  }, [plans, weekDates, weekStart, filterPerson, filterJob])

  const allPersons = useMemo(() => {
    const s = new Set()
    Object.values(grid).forEach(day => Object.keys(day).forEach(p => s.add(p)))
    return [...s].sort()
  }, [grid])

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>แผนงานรายสัปดาห์</title>
    <style>
      body{font-family:'Sarabun',sans-serif;font-size:10px;margin:15px}
      h2{font-size:13px;margin:0 0 8px} table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top}
      th{background:#1a3a5c;color:#fff;font-size:9px}
      .task{background:#f0f7ff;border-radius:3px;padding:2px 4px;margin-bottom:2px;font-size:9px}
      @media print{@page{size:A4 landscape;margin:10mm}}
    </style></head><body>
    <h2>แผนงานรายสัปดาห์ ${fmtDateTH(weekStart)} – ${fmtDateTH(weekDates[6])}</h2>
    <table><thead><tr>
      <th style="width:80px">ผู้รับผิดชอบ</th>
      ${weekDates.map(d=>`<th>${new Date(d).getDate()} ${MONTHS_TH[new Date(d).getMonth()]}<br>${WEEKDAYS_TH[new Date(d).getDay()]}</th>`).join('')}
    </tr></thead><tbody>
    ${allPersons.map(person=>`<tr>
      <td style="font-weight:bold">${person}</td>
      ${weekDates.map(d=>{
        const tasks = grid[d]?.[person]||[]
        return `<td>${tasks.map(t=>`<div class="task">${t.jobNo}: ${t.taskName}</div>`).join('')}</td>`
      }).join('')}
    </tr>`).join('')}
    </tbody></table>
    <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`
    const w = window.open('','_blank','width=1100,height=700'); w.document.write(html); w.document.close()
  }

  const handleExcel = () => {
    const rows = [['ผู้รับผิดชอบ', ...weekDates.map(d=>`${new Date(d).getDate()} ${MONTHS_TH[new Date(d).getMonth()]}`)]]
    allPersons.forEach(person => {
      const row = [person]
      weekDates.forEach(d => {
        const tasks = grid[d]?.[person]||[]
        row.push(tasks.map(t=>`${t.jobNo}: ${t.taskName}`).join(', '))
      })
      rows.push(row)
    })
    const csv = '\uFEFF' + rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    a.download = `daily-plan-${weekStart}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{border:'1px solid #1e3a5f'}}>
          <button onClick={() => setWeekStart(addDays(weekStart,-7))} className="p-2 hover:bg-white/10 text-steel-400 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <button onClick={() => setWeekStart(getMondayOf(todayISO()))} className="px-3 py-1.5 text-xs text-steel-400 hover:text-white">สัปดาห์นี้</button>
          <button onClick={() => setWeekStart(addDays(weekStart,7))} className="p-2 hover:bg-white/10 text-steel-400 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
        <span className="text-steel-300 text-sm">{fmtDateTH(weekStart)} – {fmtDateTH(weekDates[6])}</span>
        <select className="text-xs py-1.5 px-2 ml-auto" value={filterPerson} onChange={e=>setFilterPerson(e.target.value)}>
          <option value="">ทุกคน</option>
          {persons.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select className="text-xs py-1.5 px-2" value={filterJob} onChange={e=>setFilterJob(e.target.value)}>
          <option value="">ทุกงาน</option>
          {jobNos.map(j=><option key={j} value={j}>{j}</option>)}
        </select>
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-steel-300 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
          <Printer size={12}/> พิมพ์
        </button>
        <button onClick={handleExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-steel-300 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.05)',border:'1px solid #1e3a5f'}}>
          <Download size={12}/> Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{background:'#071624'}}>
                <th className="text-left px-3 py-2.5 text-steel-500 font-medium border-b border-steel-800" style={{minWidth:100}}>ผู้รับผิดชอบ</th>
                {weekDates.map(d => {
                  const isToday = d === todayISO()
                  const dow = new Date(d).getDay()
                  const isWeekend = dow===0||dow===6
                  const isHol = holidaySet.has(d)
                  return (
                    <th key={d} className="text-center px-2 py-2.5 border-b border-l border-steel-800 font-medium"
                      style={{
                        minWidth:120, background: isToday?'rgba(56,139,253,0.12)':isHol||isWeekend?'rgba(248,113,113,0.05)':'transparent',
                        color: isToday?'#60a5fa':isHol?'#f87171':isWeekend?'#4a6584':'#94a3b8'
                      }}>
                      <div>{new Date(d).getDate()} {MONTHS_TH[new Date(d).getMonth()]}</div>
                      <div style={{fontSize:9}}>{WEEKDAYS_TH[new Date(d).getDay()]}{isHol?' 🔴':''}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {allPersons.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-steel-600">ยังไม่มีแผนงานในสัปดาห์นี้</td></tr>
              ) : allPersons.map((person,pi) => (
                <tr key={person} style={{background:pi%2===0?'transparent':'rgba(255,255,255,0.01)'}}>
                  <td className="px-3 py-2 font-semibold text-steel-200 border-b border-steel-800/30" style={{verticalAlign:'top'}}>{person}</td>
                  {weekDates.map(d => {
                    const tasks = grid[d]?.[person]||[]
                    const isHol = holidaySet.has(d)
                    const dow = new Date(d).getDay()
                    const isWeekend = dow===0||dow===6
                    return (
                      <td key={d} className="px-2 py-2 border-b border-l border-steel-800/30 align-top"
                        style={{background:isHol||isWeekend?'rgba(248,113,113,0.03)':'transparent'}}>
                        {isHol||isWeekend ? (
                          <div className="text-xs text-steel-700 text-center">{isHol?'หยุด':'–'}</div>
                        ) : tasks.length === 0 ? (
                          <div className="text-xs text-steel-700 text-center">–</div>
                        ) : tasks.map((t,ti) => (
                          <div key={ti} className="mb-1 px-2 py-1 rounded text-xs"
                            style={{background:`${STATUS_COLORS[t.status]||'#60a5fa'}15`,border:`1px solid ${STATUS_COLORS[t.status]||'#60a5fa'}30`,color:STATUS_COLORS[t.status]||'#60a5fa'}}>
                            <div className="font-mono text-xs opacity-70">{t.jobNo}</div>
                            <div className="truncate">{t.taskName}</div>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── 4. HOLIDAYS SETTINGS ──────────────────────────────────────────
function HolidaySettings({ holidays, setHolidays }) {
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const PRESET_HOLIDAYS_2025 = [
    {date:'2025-01-01',name:'วันขึ้นปีใหม่'},{date:'2025-02-12',name:'วันมาฆบูชา'},
    {date:'2025-04-06',name:'วันจักรี'},{date:'2025-04-13',name:'วันสงกรานต์'},
    {date:'2025-04-14',name:'วันสงกรานต์'},{date:'2025-04-15',name:'วันสงกรานต์'},
    {date:'2025-05-01',name:'วันแรงงาน'},{date:'2025-05-12',name:'วันวิสาขบูชา'},
    {date:'2025-06-03',name:'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'},
    {date:'2025-07-11',name:'วันอาสาฬหบูชา'},{date:'2025-07-28',name:'วันเฉลิมพระชนมพรรษาร.10'},
    {date:'2025-08-12',name:'วันแม่แห่งชาติ'},{date:'2025-10-13',name:'วันคล้ายวันสวรรคต ร.9'},
    {date:'2025-10-23',name:'วันปิยมหาราช'},{date:'2025-12-05',name:'วันพ่อแห่งชาติ'},
    {date:'2025-12-10',name:'วันรัฐธรรมนูญ'},{date:'2025-12-31',name:'วันสิ้นปี'},
    {date:'2026-01-01',name:'วันขึ้นปีใหม่'},{date:'2026-04-06',name:'วันจักรี'},
    {date:'2026-04-13',name:'วันสงกรานต์'},{date:'2026-04-14',name:'วันสงกรานต์'},
    {date:'2026-04-15',name:'วันสงกรานต์'},{date:'2026-05-01',name:'วันแรงงาน'},
    {date:'2026-07-28',name:'วันเฉลิมพระชนมพรรษาร.10'},{date:'2026-08-12',name:'วันแม่แห่งชาติ'},
    {date:'2026-10-23',name:'วันปิยมหาราช'},{date:'2026-12-05',name:'วันพ่อแห่งชาติ'},
    {date:'2026-12-10',name:'วันรัฐธรรมนูญ'},{date:'2026-12-31',name:'วันสิ้นปี'},
  ]

  const addHoliday = () => {
    if (!newDate) return
    if (holidays.find(h=>h.date===newDate)) return
    setHolidays(hs => [...hs, {date:newDate, name:newName||'วันหยุด'}].sort((a,b)=>a.date.localeCompare(b.date)))
    setNewDate(''); setNewName('')
  }

  const addPresets = () => {
    const existing = new Set(holidays.map(h=>h.date))
    const toAdd = PRESET_HOLIDAYS_2025.filter(h=>!existing.has(h.date))
    setHolidays(hs => [...hs, ...toAdd].sort((a,b)=>a.date.localeCompare(b.date)))
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-4">
        <h3 className="text-steel-300 text-sm font-semibold mb-3">เพิ่มวันหยุดใหม่</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="form-label">วันที่</label>
            <input type="date" className="w-full" value={newDate} onChange={e=>setNewDate(e.target.value)}/>
          </div>
          <div className="flex-1">
            <label className="form-label">ชื่อวันหยุด</label>
            <input className="w-full" placeholder="เช่น วันสงกรานต์" value={newName} onChange={e=>setNewName(e.target.value)}/>
          </div>
          <button onClick={addHoliday} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
            เพิ่ม
          </button>
        </div>
        <button onClick={addPresets} className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          + เพิ่มวันหยุดนักขัตฤกษ์ไทย 2025-2026 ทั้งหมด
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-3 border-b border-steel-800 flex items-center justify-between">
          <span className="text-steel-400 text-xs font-semibold uppercase tracking-wider">วันหยุดทั้งหมด ({holidays.length})</span>
        </div>
        <div className="divide-y divide-steel-800/50" style={{maxHeight:400,overflowY:'auto'}}>
          {holidays.length === 0 ? (
            <div className="text-center py-8 text-steel-600 text-sm">ยังไม่มีวันหยุด</div>
          ) : holidays.map(h => (
            <div key={h.date} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent-400">{h.date}</span>
                <span className="text-steel-300 text-xs">{h.name}</span>
                <span className="text-xs text-steel-600">{WEEKDAYS_TH[new Date(h.date).getDay()]}</span>
              </div>
              <button onClick={() => setHolidays(hs=>hs.filter(x=>x.date!==h.date))}
                className="p-1 text-steel-600 hover:text-red-400 transition-colors">
                <Trash2 size={12}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── ADD PLAN MODAL ────────────────────────────────────────────────
function AddPlanModal({ jobs, onClose, onAdd }) {
  const [jobNo, setJobNo] = useState('')
  const [taskName, setTaskName] = useState('')
  const [assignee, setAssignee] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(addDays(todayISO(),3))
  const [status, setStatus] = useState('รอดำเนินการ')
  const [progress, setProgress] = useState('0')
  const [planType, setPlanType] = useState('plan') // plan | actual
  const [subTasks, setSubTasks] = useState([])

  const selectedJob = jobs.find(j=>j['เลขที่']===jobNo)
  const jobSubItems = selectedJob ? parseSubItems(selectedJob['รายการย่อย']) : []
  const responsibles = [...new Set(jobs.map(j=>j['ผู้รับผิดชอบ']).filter(Boolean))].sort()
  const jobNos = jobs.map(j=>j['เลขที่']).filter(Boolean).sort()

  const loadFromJob = () => {
    if (!selectedJob) return
    setTaskName(selectedJob['รายละเอียด']||'')
    setAssignee(selectedJob['ผู้รับผิดชอบ']||'')
  }

  const addSubTask = (name) => {
    setSubTasks(ts => [...ts, { name, assignee:'', startDate, endDate, status:'รอดำเนินการ', progress:'0' }])
  }

  const handleSave = () => {
    if (!taskName.trim()) return
    const plans = []
    plans.push({ jobNo, taskName, assignee, startDate, endDate, status, progress, planType, isProject: selectedJob?.['ประเภท']==='โครงการ' })
    subTasks.forEach(st => {
      plans.push({ jobNo, taskName:st.name, assignee:st.assignee||assignee, startDate:st.startDate||startDate, endDate:st.endDate||endDate, status:st.status, progress:st.progress, planType, isSubTask:true })
    })
    plans.forEach(p => onAdd(p))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
      <div className="w-full max-w-2xl mx-4 rounded-xl shadow-2xl flex flex-col" style={{background:'#0a1929',border:'1px solid #1e3a5f',maxHeight:'90vh'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-800">
          <h3 className="text-white font-bold">เพิ่มแผนงาน</h3>
          <button onClick={onClose} className="text-steel-500 hover:text-white"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Job selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">เลขที่ใบงาน</label>
              <input list="jobno-list" className="w-full text-xs" placeholder="SM-2606001-PC"
                value={jobNo} onChange={e=>{setJobNo(e.target.value)}}/>
              <datalist id="jobno-list">{jobNos.map(j=><option key={j} value={j}/>)}</datalist>
              {selectedJob && (
                <button onClick={loadFromJob} className="mt-1 text-xs text-blue-400 hover:text-blue-300">ดึงข้อมูลจากใบงาน →</button>
              )}
            </div>
            <div>
              <label className="form-label">ประเภทแผน</label>
              <div className="flex gap-2">
                {['plan','actual'].map(t=>(
                  <button key={t} onClick={()=>setPlanType(t)}
                    className="flex-1 py-2 rounded text-xs font-medium transition-colors"
                    style={{background:planType===t?'rgba(56,139,253,0.2)':'rgba(255,255,255,0.04)',border:`1px solid ${planType===t?'rgba(56,139,253,0.5)':'#1e3a5f'}`,color:planType===t?'#60a5fa':'#94a3b8'}}>
                    {t==='plan'?'แผน (Plan)':'จริง (Actual)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">ชื่องาน/รายการ *</label>
            <input className="w-full" placeholder="ระบุชื่องาน..." value={taskName} onChange={e=>setTaskName(e.target.value)}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">ผู้รับผิดชอบ</label>
              <input list="resp-list2" className="w-full" value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="ชื่อ..."/>
              <datalist id="resp-list2">{responsibles.map(r=><option key={r} value={r}/>)}</datalist>
            </div>
            <div>
              <label className="form-label">วันเริ่ม</label>
              <input type="date" className="w-full" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
            </div>
            <div>
              <label className="form-label">วันสิ้นสุด</label>
              <input type="date" className="w-full" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">สถานะ</label>
              <select className="w-full" value={status} onChange={e=>setStatus(e.target.value)}>
                {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">ความคืบหน้า (%)</label>
              <input type="range" min="0" max="100" className="w-full mt-2" value={progress} onChange={e=>setProgress(e.target.value)}/>
              <div className="text-xs text-steel-400 text-right">{progress}%</div>
            </div>
          </div>

          {/* Sub-items from job */}
          {jobSubItems.length > 0 && (
            <div>
              <label className="form-label">รายการย่อยจากใบงาน (คลิกเพื่อเพิ่ม)</label>
              <div className="space-y-1">
                {jobSubItems.map((sub,i) => {
                  const already = subTasks.find(t=>t.name===sub.name)
                  return (
                    <button key={i} onClick={() => !already && addSubTask(sub.name)}
                      className="w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 transition-colors"
                      style={{background:already?'rgba(74,222,128,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${already?'rgba(74,222,128,0.2)':'#1e3a5f'}`,color:already?'#4ade80':'#94a3b8'}}>
                      {already ? <Check size={11}/> : <Plus size={11}/>}
                      {sub.name} ({sub.qty} {sub.unit})
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-steel-800">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-steel-400 hover:text-white" style={{background:'rgba(255,255,255,0.04)'}}>ยกเลิก</button>
          <button onClick={handleSave} disabled={!taskName.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{background:'linear-gradient(135deg,#1d6fd8,#1a56b0)'}}>
            บันทึกแผนงาน {subTasks.length>0?`+ ${subTasks.length} รายการย่อย`:''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCHEDULE PAGE
// ═══════════════════════════════════════════════════════════════════
const LOCAL_PLANS_KEY = 'smec_plans_v1'
const LOCAL_HOLIDAYS_KEY = 'smec_holidays_v1'

// แปลง row จาก Schedule_DB → plan object
function sheetRowToPlan(row) {
  return {
    id:         row.Task_ID || row.task_id || '',
    jobNo:      row.DocNo   || row.docno   || '',
    taskName:   row.TaskName|| row.taskname|| '',
    assignee:   row.Assignee|| row.assignee|| '',
    startDate:  row.StartDate || row.startdate || '',
    endDate:    row.EndDate   || row.enddate   || '',
    status:     row.Status    || row.status    || 'รอดำเนินการ',
    progress:   row.Progress  || row.progress  || '0',
    actualStart:row.ActualStartDate || '',
    actualEnd:  row.ActualEndDate   || '',
    fromSheet:  true,
  }
}

export default function Schedule({ schedule, jobs }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Local plans (เพิ่มเองจาก App)
  const [localPlans, setLocalPlansState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_PLANS_KEY)||'[]') } catch { return [] }
  })
  const setLocalPlans = (fn) => {
    setLocalPlansState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(next))
      return next
    })
  }

  // Merge: Sheet data เป็น base, local plans เพิ่มเติม (ถ้า id ซ้ำกับ Sheet ให้ Sheet ชนะ)
  const plans = useMemo(() => {
    const sheetPlans = (schedule || []).map(sheetRowToPlan).filter(p => p.taskName)
    const sheetIds   = new Set(sheetPlans.map(p => p.id))
    const onlyLocal  = localPlans.filter(p => !p.id || !sheetIds.has(p.id))
    return [...sheetPlans, ...onlyLocal]
  }, [schedule, localPlans])

  // setPlans ใช้แก้ local plans เท่านั้น (Sheet plans แก้ผ่าน Google Sheet)
  const setPlans = (fn) => {
    setLocalPlansState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(next))
      return next
    })
  }

  const [holidays, setHolidaysState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_HOLIDAYS_KEY)||'[]') } catch { return [] }
  })
  const setHolidays = (fn) => {
    setHolidaysState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      localStorage.setItem(LOCAL_HOLIDAYS_KEY, JSON.stringify(next))
      return next
    })
  }

  const TABS = [
    { id:'dashboard', label:'Dashboard',     icon:<BarChart2 size={14}/> },
    { id:'masterplan', label:'Master Plan',  icon:<Calendar size={14}/> },
    { id:'daily',      label:'แผนรายวัน',    icon:<Users size={14}/> },
    { id:'holidays',   label:'วันหยุด',       icon:<Settings size={14}/> },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <p className="text-steel-400 text-sm mt-0.5">จัดการแผนงานและตารางเวลา</p>
      </div>

      {/* Tab bar */}
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
            {tab.id==='masterplan' && plans.length>0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:'rgba(56,139,253,0.25)',color:'#60a5fa'}}>{plans.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard'  && <ScheduleDashboard jobs={jobs} plans={plans} holidays={holidays}/>}
      {activeTab === 'masterplan' && <MasterPlan jobs={jobs} plans={plans} setPlans={setPlans} holidays={holidays}/>}
      {activeTab === 'daily'      && <DailyPlan  jobs={jobs} plans={plans} holidays={holidays}/>}
      {activeTab === 'holidays'   && <HolidaySettings holidays={holidays} setHolidays={setHolidays}/>}
    </div>
  )
}
