import React, { useMemo, useState } from 'react'
import { AlertCircle, Search, Package } from 'lucide-react'
import { statusBadge, formatDate, formatCurrency } from '../api'

export default function Outstanding({ jobs }) {
  const [search, setSearch] = useState('')
  const [compFilter, setCompFilter] = useState('')

  const companies = useMemo(() => [...new Set(jobs.map(j => j['บริษัท']).filter(Boolean))].sort(), [jobs])

  const outstanding = useMemo(() =>
    jobs.filter(j => {
      const c = parseInt(j['จำนวนค้างส่ง'] || '0')
      return c > 0 && !['ปิดงาน', 'ยกเลิก'].includes(j['สถานะ'])
    }).filter(j => {
      const q = search.toLowerCase()
      return (!q ||
        (j['เลขที่'] || '').toLowerCase().includes(q) ||
        (j['รายละเอียด'] || '').toLowerCase().includes(q) ||
        (j['บริษัท'] || '').toLowerCase().includes(q)) &&
        (!compFilter || j['บริษัท'] === compFilter)
    }).sort((a, b) => parseInt(b['จำนวนค้างส่ง'] || '0') - parseInt(a['จำนวนค้างส่ง'] || '0'))
  , [jobs, search, compFilter])

  const totalOutstanding = outstanding.reduce((s, j) => s + parseInt(j['จำนวนค้างส่ง'] || '0'), 0)
  const totalValue = outstanding.reduce((s, j) => {
    const c = parseInt(j['จำนวนค้างส่ง'] || '0')
    const p = parseFloat(String(j['ขาย/หน่วย'] || '0').replace(/[฿,]/g, '')) || 0
    return s + c * p
  }, 0)

  const byCompany = useMemo(() => {
    const map = {}
    outstanding.forEach(j => {
      const c = j['บริษัท'] || 'อื่นๆ'
      if (!map[c]) map[c] = { count: 0, qty: 0 }
      map[c].count++
      map[c].qty += parseInt(j['จำนวนค้างส่ง'] || '0')
    })
    return Object.entries(map).sort(([, a], [, b]) => b.count - a.count)
  }, [outstanding])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">งานค้างส่ง</h1>
        <p className="text-steel-400 text-sm mt-0.5">รายการที่ยังมีจำนวนค้างส่งอยู่</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="text-steel-400 text-xs uppercase tracking-wider">ใบงานค้างส่ง</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{outstanding.length}</p>
          <p className="text-steel-500 text-xs mt-1">รายการ</p>
        </div>
        <div className="metric-card">
          <p className="text-steel-400 text-xs uppercase tracking-wider">จำนวนรวมค้าง</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">{totalOutstanding.toLocaleString()}</p>
          <p className="text-steel-500 text-xs mt-1">ชิ้น/รายการ</p>
        </div>
        <div className="card p-5">
          <p className="text-steel-400 text-xs uppercase tracking-wider mb-3">แยกตามบริษัท</p>
          <div className="space-y-2">
            {byCompany.slice(0, 4).map(([comp, d]) => (
              <div key={comp} className="flex justify-between text-xs">
                <span className="text-steel-300">{comp}</span>
                <span className="text-red-400 font-mono">{d.count} ใบ ({d.qty} ชิ้น)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหา..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="text-sm" value={compFilter} onChange={e => setCompFilter(e.target.value)}>
          <option value="">บริษัททั้งหมด</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เลขที่</th>
                <th>รายละเอียด</th>
                <th>บริษัท</th>
                <th>ประเภท</th>
                <th>ผู้รับผิดชอบ</th>
                <th className="text-center">จำนวนรวม</th>
                <th className="text-center">ส่งแล้ว</th>
                <th className="text-center">ค้างส่ง</th>
                <th>สถานะ</th>
                <th>วันที่สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((job, i) => {
                const c = parseInt(job['จำนวนค้างส่ง'] || '0')
                const urgency = c > 20 ? 'high' : c > 5 ? 'mid' : 'low'
                return (
                  <tr key={i}>
                    <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(job['วันที่'])}</td>
                    <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{job['เลขที่']}</td>
                    <td className="text-steel-200 max-w-xs">
                      <div className="truncate text-xs">{job['รายละเอียด']}</div>
                    </td>
                    <td className="text-steel-400 text-xs">{job['บริษัท']}</td>
                    <td><span className="status-pill badge-blue text-xs">{job['ประเภท']}</span></td>
                    <td className="text-steel-400 text-xs">{job['ผู้รับผิดชอบ']}</td>
                    <td className="text-center font-mono text-xs text-steel-300">{job['จำนวน']}</td>
                    <td className="text-center font-mono text-xs text-green-400">{job['จำนวนที่ส่ง'] || 0}</td>
                    <td className="text-center">
                      <span className={`font-mono text-sm font-bold ${
                        urgency === 'high' ? 'text-red-400' :
                        urgency === 'mid' ? 'text-orange-400' : 'text-yellow-400'
                      }`}>{c}</span>
                    </td>
                    <td><span className={`status-pill ${statusBadge(job['สถานะ'])}`}>{job['สถานะ']}</span></td>
                    <td className="font-mono text-xs text-steel-500 whitespace-nowrap">{formatDate(job['วันที่สถานะ'])}</td>
                  </tr>
                )
              })}
              {outstanding.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-steel-500">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    ไม่มีงานค้างส่ง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
