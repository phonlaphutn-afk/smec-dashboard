import React, { useState, useMemo } from 'react'
import { Search, Truck, Key, FileText } from 'lucide-react'
import { formatDate } from '../api'

const PAGE_SIZE = 40

function DOTable({ data }) {
  const [search, setSearch] = useState('')
  const [compFilter, setCompFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const companies = useMemo(() => [...new Set(data.map(r => r['บริษัท']).filter(Boolean))].sort(), [data])
  const types = useMemo(() => [...new Set(data.map(r => r['ประเภท']).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => data.filter(r => {
    const q = search.toLowerCase()
    return (!q ||
      (r['เลขที่ใบส่งของ'] || '').toLowerCase().includes(q) ||
      (r['รายการสินค้า'] || '').toLowerCase().includes(q) ||
      (r['บริษัท'] || '').toLowerCase().includes(q) ||
      (r['อ้างอิง'] || r['รายละเอียด/อ้างอิง'] || '').toLowerCase().includes(q)) &&
      (!compFilter || r['บริษัท'] === compFilter) &&
      (!typeFilter || r['ประเภท'] === typeFilter)
  }), [data, search, compFilter, typeFilter])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหาเลขที่ DO, รายการ, บริษัท..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="text-sm" value={compFilter} onChange={e => { setCompFilter(e.target.value); setPage(1) }}>
          <option value="">บริษัททั้งหมด</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="text-sm" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">ประเภททั้งหมด</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เลขที่ DO</th>
                <th>ประเภท</th>
                <th>บริษัท</th>
                <th>ผู้จัดทำ</th>
                <th>แผนก</th>
                <th>อ้างอิง</th>
                <th>รายการสินค้า</th>
                <th>เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(row['วันที่'])}</td>
                  <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{row['เลขที่ใบส่งของ']}</td>
                  <td><span className="status-pill badge-blue text-xs">{row['ประเภท']}</span></td>
                  <td className="text-steel-400 text-xs">{row['บริษัท']}</td>
                  <td className="text-steel-400 text-xs">{row['ผู้จัดทำ/ผู้แจ้ง'] || row['ผู้จัดทำ']}</td>
                  <td className="text-steel-500 text-xs">{row['แผนก']}</td>
                  <td className="text-steel-500 text-xs font-mono">{row['รายละเอียด/อ้างอิง'] || row['อ้างอิง']}</td>
                  <td className="text-steel-200 text-xs max-w-xs truncate">{row['รายการสินค้า']}</td>
                  <td>
                    {row['ไฟล์เอกสาร'] && (
                      <a href={row['ไฟล์เอกสาร']} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300">
                        <FileText size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-steel-800 flex items-center justify-between">
            <span className="text-steel-500 text-xs">หน้า {page} / {totalPages} · {filtered.length} รายการ</span>
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

function GatePassTable({ data }) {
  const [search, setSearch] = useState('')
  const [compFilter, setCompFilter] = useState('')
  const [page, setPage] = useState(1)

  const companies = useMemo(() => [...new Set(data.map(r => r['บริษัท']).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => data.filter(r => {
    const q = search.toLowerCase()
    return (!q ||
      (r['เลขที่'] || '').toLowerCase().includes(q) ||
      (r['รายการ'] || '').toLowerCase().includes(q) ||
      (r['บริษัท'] || '').toLowerCase().includes(q) ||
      (r['ผู้ขออนุญาต'] || '').toLowerCase().includes(q)) &&
      (!compFilter || r['บริษัท'] === compFilter)
  }), [data, search, compFilter])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหาเลขที่ GP, รายการ, บริษัท..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="text-sm" value={compFilter} onChange={e => { setCompFilter(e.target.value); setPage(1) }}>
          <option value="">บริษัททั้งหมด</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เลขที่ GP</th>
                <th>บริษัท</th>
                <th>ผู้ขออนุญาต</th>
                <th>ตำแหน่ง</th>
                <th>แผนก</th>
                <th>เหตุผล</th>
                <th>รายการ</th>
                <th>ยานพาหนะ</th>
                <th>เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(row['วันที่'])}</td>
                  <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{row['เลขที่']}</td>
                  <td className="text-steel-400 text-xs">{row['บริษัท']}</td>
                  <td className="text-steel-300 text-xs">{row['ผู้ขออนุญาต']}</td>
                  <td className="text-steel-500 text-xs">{row['ตำแหน่ง']}</td>
                  <td className="text-steel-500 text-xs">{row['แผนก']}</td>
                  <td className="text-steel-400 text-xs">{row['เหตุผล']}</td>
                  <td className="text-steel-200 text-xs max-w-xs truncate">{row['รายการ']}</td>
                  <td className="text-steel-400 text-xs">{row['ยานพาหนะ']}</td>
                  <td>
                    {row['เอกสารอ้างอิง'] && (
                      <a href={row['เอกสารอ้างอิง']} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300">
                        <FileText size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-steel-800 flex items-center justify-between">
            <span className="text-steel-500 text-xs">หน้า {page} / {totalPages} · {filtered.length} รายการ</span>
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

export default function Logistics({ doData, gatepass }) {
  const [tab, setTab] = useState('do')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Logistics</h1>
        <p className="text-steel-400 text-sm mt-0.5">ใบส่งของ และ Gate Pass</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(66,153,225,0.15)' }}>
              <Truck size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-steel-400 text-xs">ใบส่งของชั่วคราว</p>
              <p className="text-2xl font-bold text-blue-400">{doData.length.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(72,187,120,0.15)' }}>
              <Key size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-steel-400 text-xs">Gate Pass</p>
              <p className="text-2xl font-bold text-green-400">{gatepass.length.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`btn ${tab === 'do' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('do')}>
          <Truck size={14} /> ใบส่งของชั่วคราว ({doData.length})
        </button>
        <button className={`btn ${tab === 'gp' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('gp')}>
          <Key size={14} /> Gate Pass ({gatepass.length})
        </button>
      </div>

      {tab === 'do' ? <DOTable data={doData} /> : <GatePassTable data={gatepass} />}
    </div>
  )
}
