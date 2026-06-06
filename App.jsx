import React, { useMemo, useState } from 'react'
import { Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_COLORS = {
  'เสร็จแล้ว': '#48bb78',
  'กำลังดำเนินการ': '#4299e1',
  'รอดำเนินการ': '#718096',
  'ยกเลิก': '#fc8181',
}

function GanttBar({ start, end, status, progress, minDate, totalDays }) {
  if (!start || !end) return null
  const s = new Date(start), e = new Date(end)
  if (isNaN(s) || isNaN(e)) return null
  const leftPct = ((s - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100
  const widthPct = Math.max(((e - s) / (1000 * 60 * 60 * 24) / totalDays) * 100, 0.5)
  const color = STATUS_COLORS[status] || '#718096'
  const prog = parseFloat(progress) || 0
  return (
    <div className="relative h-5 rounded overflow-hidden" style={{ marginLeft: `${Math.max(0, leftPct)}%`, width: `${Math.min(widthPct, 100 - Math.max(0, leftPct))}%`, background: `${color}25`, border: `1px solid ${color}40` }}>
      <div className="absolute top-0 left-0 h-full rounded transition-all" style={{ width: `${prog}%`, background: `${color}60` }} />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono" style={{ color, fontSize: '0.65rem' }}>
        {prog > 0 ? `${prog}%` : ''}
      </span>
    </div>
  )
}

export default function Schedule({ schedule, jobs }) {
  const [search, setSearch] = useState('')
  const [docFilter, setDocFilter] = useState('')
  const [expanded, setExpanded] = useState({})

  // Group tasks by docNo
  const grouped = useMemo(() => {
    const map = {}
    schedule.forEach(task => {
      const doc = task['DocNo'] || task['docNo'] || 'ไม่ระบุ'
      if (!map[doc]) map[doc] = []
      map[doc].push(task)
    })
    return map
  }, [schedule])

  const docNos = useMemo(() => Object.keys(grouped).sort(), [grouped])

  const filteredDocs = useMemo(() => {
    return docNos.filter(doc => {
      const tasks = grouped[doc]
      const q = search.toLowerCase()
      return (!search ||
        doc.toLowerCase().includes(q) ||
        tasks.some(t => (t['TaskName'] || '').toLowerCase().includes(q) || (t['Assignee'] || '').toLowerCase().includes(q))) &&
        (!docFilter || doc === docFilter)
    })
  }, [docNos, grouped, search, docFilter])

  // Date range for gantt
  const { minDate, totalDays } = useMemo(() => {
    let min = new Date(), max = new Date()
    schedule.forEach(t => {
      const s = new Date(t['StartDate'] || t['ActualStartDate'])
      const e = new Date(t['EndDate'] || t['ActualEndDate'])
      if (!isNaN(s) && s < min) min = s
      if (!isNaN(e) && e > max) max = e
    })
    min.setDate(min.getDate() - 3)
    max.setDate(max.getDate() + 3)
    const days = Math.max((max - min) / (1000 * 60 * 60 * 24), 30)
    return { minDate: min, totalDays: days }
  }, [schedule])

  // Month markers
  const monthMarkers = useMemo(() => {
    const markers = []
    const cur = new Date(minDate)
    cur.setDate(1)
    while (cur <= new Date(minDate.getTime() + totalDays * 86400000)) {
      const leftPct = ((cur - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100
      if (leftPct >= 0 && leftPct <= 100) {
        markers.push({ label: `${cur.getMonth() + 1}/${cur.getFullYear().toString().slice(2)}`, left: leftPct })
      }
      cur.setMonth(cur.getMonth() + 1)
    }
    return markers
  }, [minDate, totalDays])

  // Get job info for docNo
  const jobMap = useMemo(() => {
    const m = {}
    jobs.forEach(j => { if (j['เลขที่']) m[j['เลขที่']] = j })
    return m
  }, [jobs])

  const toggleExpand = doc => setExpanded(e => ({ ...e, [doc]: !e[doc] }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Schedule / แผนงาน</h1>
        <p className="text-steel-400 text-sm mt-0.5">{Object.keys(grouped).length} โครงการ · {schedule.length} task</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-2 text-xs text-steel-300">
            <div className="w-3 h-3 rounded" style={{ background: c }} />
            {s}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหาเลขที่, งาน, ผู้รับผิดชอบ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="text-sm" value={docFilter} onChange={e => setDocFilter(e.target.value)}>
          <option value="">ทุกโครงการ</option>
          {docNos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Gantt */}
      <div className="card overflow-hidden">
        {/* Month header */}
        <div className="flex border-b border-steel-800 bg-steel-900/50" style={{ height: 32 }}>
          <div className="w-64 shrink-0 border-r border-steel-800 flex items-center px-3 text-xs text-steel-500 uppercase tracking-wider">โครงการ / งาน</div>
          <div className="flex-1 relative">
            {monthMarkers.map((m, i) => (
              <div key={i} className="absolute top-0 h-full flex items-center border-l border-steel-800/50"
                style={{ left: `${m.left}%` }}>
                <span className="text-xs text-steel-500 pl-1 font-mono">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {filteredDocs.map(doc => {
            const tasks = grouped[doc]
            const job = jobMap[doc]
            const isExp = expanded[doc] !== false // default expanded
            const topTask = tasks.find(t => !(t['TaskName'] || '').startsWith('['))

            return (
              <div key={doc} className="border-b border-steel-800/50">
                {/* Doc header row */}
                <div className="flex hover:bg-steel-800/20 cursor-pointer" onClick={() => toggleExpand(doc)}
                  style={{ minHeight: 40 }}>
                  <div className="w-64 shrink-0 border-r border-steel-800/50 flex items-center px-3 gap-2">
                    <button className="text-steel-500 hover:text-steel-200">
                      {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-accent-400 truncate">{doc}</div>
                      {job && <div className="text-xs text-steel-500 truncate">{job['บริษัท']}</div>}
                    </div>
                  </div>
                  <div className="flex-1 flex items-center px-2">
                    {topTask && (
                      <GanttBar
                        start={topTask['StartDate'] || topTask['ActualStartDate']}
                        end={topTask['EndDate'] || topTask['ActualEndDate']}
                        status={topTask['Status']}
                        progress={topTask['Progress']}
                        minDate={minDate}
                        totalDays={totalDays}
                      />
                    )}
                  </div>
                </div>

                {/* Sub tasks */}
                {isExp && tasks.map((task, ti) => {
                  const isIndented = (task['TaskName'] || '').match(/^\[[\d.]+\]/)
                  const depth = isIndented ? (task['TaskName'].match(/\./g) || []).length : 0
                  const color = STATUS_COLORS[task['Status']] || '#718096'
                  return (
                    <div key={ti} className="flex hover:bg-steel-800/10" style={{ minHeight: 32 }}>
                      <div className="w-64 shrink-0 border-r border-steel-800/50 flex items-center px-3"
                        style={{ paddingLeft: `${12 + depth * 12}px` }}>
                        <div className="min-w-0">
                          <div className="text-xs text-steel-300 truncate">{task['TaskName']}</div>
                          <div className="text-xs text-steel-600 truncate">{task['Assignee']}</div>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center px-2">
                        <GanttBar
                          start={task['ActualStartDate'] || task['StartDate']}
                          end={task['ActualEndDate'] || task['EndDate']}
                          status={task['Status']}
                          progress={task['Progress']}
                          minDate={minDate}
                          totalDays={totalDays}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {filteredDocs.length === 0 && (
            <div className="text-center py-12 text-steel-500">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              ไม่พบข้อมูล Schedule
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
