import React, { useState, useMemo } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, FileText, AlertCircle } from 'lucide-react'
import { statusBadge, formatCurrency, formatDate } from '../api'

const PAGE_SIZE = 30

export default function Jobs({ jobs }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [sort, setSort] = useState({ key: 'วันที่', dir: 'desc' })

  const companies = useMemo(() => [...new Set(jobs.map(j => j['บริษัท']).filter(Boolean))].sort(), [jobs])
  const types = useMemo(() => [...new Set(jobs.map(j => j['ประเภท']).filter(Boolean))].sort(), [jobs])
  const statuses = ['กำลังดำเนินการ', 'ส่งงานแล้ว', 'ปิดงาน', 'รอดำเนินการ', 'งานเสร็จรอส่ง', 'ยกเลิก', 'รออะไหล่']

  const filtered = useMemo(() => {
    let data = jobs.filter(j => {
      const q = search.toLowerCase()
      const match = !q ||
        (j['เลขที่'] || '').toLowerCase().includes(q) ||
        (j['รายละเอียด'] || '').toLowerCase().includes(q) ||
        (j['บริษัท'] || '').toLowerCase().includes(q) ||
        (j['ผู้รับผิดชอบ'] || '').toLowerCase().includes(q) ||
        (j['PO'] || '').toLowerCase().includes(q)
      return match &&
        (!statusFilter || j['สถานะ'] === statusFilter) &&
        (!companyFilter || j['บริษัท'] === companyFilter) &&
        (!typeFilter || j['ประเภท'] === typeFilter)
    })
    data.sort((a, b) => {
      const av = a[sort.key] || '', bv = b[sort.key] || ''
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return data
  }, [jobs, search, statusFilter, companyFilter, typeFilter, sort])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const toggleSort = key => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  }

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return null
    return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  // Parse sub-items
  const parseSubItems = (str) => {
    if (!str) return []
    return str.split('\n').map(line => {
      line = line.trim()
      if (!line.startsWith('-')) return null
      const match = line.match(/^- (.*?)\s+\((.*?)\/(.*?)\s+(.*?)\)\s+\[(.*?)\](?:\s+\{(?:C:.*?,)?P:(.*?)\})?/)
      if (!match) return { name: line.replace(/^- /, ''), qty: '-', sent: '-', unit: '', status: '', price: '' }
      return {
        name: match[1].trim(),
        qty: match[2], sent: match[3], unit: match[4].trim(),
        status: match[5].trim(),
        price: match[6] ? '฿' + parseFloat(match[6]).toLocaleString() : ''
      }
    }).filter(Boolean)
  }

  const outstanding = jobs.filter(j => parseInt(j['จำนวนค้างส่ง'] || '0') > 0 && !['ปิดงาน', 'ยกเลิก'].includes(j['สถานะ']))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">รายการงาน</h1>
          <p className="text-steel-400 text-sm mt-0.5">ทั้งหมด {jobs.length} รายการ · แสดง {filtered.length} รายการ</p>
        </div>
        {outstanding.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.25)' }}>
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-red-300 text-xs font-medium">{outstanding.length} งานค้างส่ง</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหาเลขที่, รายละเอียด, บริษัท..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">สถานะทั้งหมด</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="text-sm" value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1) }}>
          <option value="">บริษัททั้งหมด</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="text-sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">ประเภททั้งหมด</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('วันที่')}>
                  <div className="flex items-center gap-1">วันที่<SortIcon k="วันที่" /></div>
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('เลขที่')}>
                  <div className="flex items-center gap-1">เลขที่<SortIcon k="เลขที่" /></div>
                </th>
                <th>รายละเอียด</th>
                <th>บริษัท</th>
                <th>PO</th>
                <th>ประเภท</th>
                <th>ผู้รับผิดชอบ</th>
                <th>จำนวน</th>
                <th>ค้าง</th>
                <th>ยอดขาย</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((job, i) => {
                const isExp = expanded === i
                const subs = parseSubItems(job['รายการย่อย'])
                const hasDoc = job['เอกสาร'] || job['เอกสารแนบใบส่งของชั่วคราว']
                const outstanding = parseInt(job['จำนวนค้างส่ง'] || '0')
                return (
                  <React.Fragment key={i}>
                    <tr className={isExp ? 'bg-steel-900/30' : ''}>
                      <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(job['วันที่'])}</td>
                      <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{job['เลขที่']}</td>
                      <td className="text-steel-200 max-w-xs">
                        <div className="truncate text-xs">{job['รายละเอียด']}</div>
                        {job['ชื่อโครงการ'] && <div className="text-steel-500 text-xs truncate">{job['ชื่อโครงการ']}</div>}
                      </td>
                      <td className="text-steel-400 text-xs whitespace-nowrap">{job['บริษัท']}</td>
                      <td className="font-mono text-xs text-steel-500">{job['PO']}</td>
                      <td><span className="status-pill badge-blue text-xs">{job['ประเภท']}</span></td>
                      <td className="text-steel-400 text-xs">{job['ผู้รับผิดชอบ']}</td>
                      <td className="text-center font-mono text-xs text-steel-300">{job['จำนวน'] || '–'}</td>
                      <td className="text-center font-mono text-xs">
                        {outstanding > 0
                          ? <span className="text-red-400 font-medium">{outstanding}</span>
                          : <span className="text-steel-600">–</span>}
                      </td>
                      <td className="font-mono text-xs text-green-400 whitespace-nowrap">{formatCurrency(job['ยอดขายรวม'])}</td>
                      <td><span className={`status-pill ${statusBadge(job['สถานะ'])}`}>{job['สถานะ']}</span></td>
                      <td>
                        <button className="text-steel-500 hover:text-steel-200 p-1"
                          onClick={() => setExpanded(isExp ? null : i)}>
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={12} className="p-0">
                          <div className="bg-steel-950/60 border-t border-b border-steel-800 p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-xs">
                              {[
                                ['วันที่สถานะ', job['วันที่สถานะ']],
                                ['ผู้แจ้ง', job['ผู้แจ้ง']],
                                ['เลขที่ใบส่งของ', job['เลขที่ใบส่งของ']],
                                ['ยอดขายรวม', formatCurrency(job['ยอดขายรวม'])],
                              ].map(([label, val]) => (
                                <div key={label}>
                                  <div className="text-steel-500">{label}</div>
                                  <div className="text-steel-200 mt-0.5">{val || '–'}</div>
                                </div>
                              ))}
                            </div>
                            {subs.length > 0 && (
                              <div>
                                <div className="text-steel-500 text-xs mb-2 font-medium uppercase tracking-wider">รายการย่อย ({subs.length})</div>
                                <div className="space-y-1">
                                  {subs.map((s, si) => (
                                    <div key={si} className="flex items-center gap-3 text-xs py-1.5 px-3 rounded" style={{ background: '#0d2137' }}>
                                      <span className={`status-pill text-xs ${
                                        s.status === 'เสร็จแล้ว' ? 'badge-green' :
                                        s.status === 'กำลังดำเนินการ' ? 'badge-blue' :
                                        s.status === 'ยกเลิก' ? 'badge-gray' : 'badge-yellow'
                                      }`}>{s.status}</span>
                                      <span className="text-steel-200 flex-1">{s.name}</span>
                                      <span className="text-steel-400 font-mono">{s.qty}/{s.sent} {s.unit}</span>
                                      {s.price && <span className="text-green-400 font-mono">{s.price}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {hasDoc && (
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {[job['เอกสาร'], job['เอกสารแนบใบส่งของชั่วคราว']].filter(Boolean).map((url, ui) => (
                                  url.split(',').map((u, j) => (
                                    <a key={`${ui}-${j}`} href={u.trim()} target="_blank" rel="noopener noreferrer"
                                      className="btn btn-ghost text-xs py-1 px-3">
                                      <FileText size={12} /> เอกสาร {ui + j + 1}
                                    </a>
                                  ))
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-steel-800 flex items-center justify-between">
            <span className="text-steel-500 text-xs">หน้า {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← ก่อนหน้า</button>
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>ถัดไป →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
