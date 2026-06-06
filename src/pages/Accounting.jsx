import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Search, TrendingUp, DollarSign } from 'lucide-react'

const COLORS = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f6e05e', '#fc8181']

export default function Accounting({ accounting }) {
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [compFilter, setCompFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 40

  const months = useMemo(() => {
    const set = new Set()
    accounting.forEach(r => {
      const m = r['เดือน'] || '', y = r['ปี'] || ''
      if (m && y) set.add(`${y}-${String(m).padStart(2, '0')}`)
    })
    return [...set].sort().reverse()
  }, [accounting])

  const companies = useMemo(() => [...new Set(accounting.map(r => r['บริษัท']).filter(Boolean))].sort(), [accounting])

  const filtered = useMemo(() => {
    return accounting.filter(r => {
      const q = search.toLowerCase()
      const key = `${r['ปี']}-${String(r['เดือน'] || '').padStart(2, '0')}`
      return (!search ||
        (r['เลขที่ใบแจ้ง'] || r['เลขที่'] || '').toLowerCase().includes(q) ||
        (r['ชื่อรายการ'] || r['รายการ'] || '').toLowerCase().includes(q) ||
        (r['บริษัท'] || '').toLowerCase().includes(q)) &&
        (!monthFilter || key === monthFilter) &&
        (!compFilter || r['บริษัท'] === compFilter)
    })
  }, [accounting, search, monthFilter, compFilter])

  const totalRevenue = useMemo(() =>
    filtered.reduce((s, r) => s + (parseFloat(String(r['รวมเป็นเงิน'] || '0').replace(/[฿,]/g, '')) || 0), 0)
  , [filtered])

  const totalVat = useMemo(() =>
    filtered.reduce((s, r) => s + (parseFloat(String(r['ยอดVAT'] || '0').replace(/[฿,]/g, '')) || 0), 0)
  , [filtered])

  const totalNet = useMemo(() =>
    filtered.reduce((s, r) => s + (parseFloat(String(r['ยอดสุทธิ'] || '0').replace(/[฿,]/g, '')) || 0), 0)
  , [filtered])

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const map = {}
    accounting.forEach(r => {
      const m = r['เดือน'] || '', y = r['ปี'] || ''
      if (!m || !y) return
      const key = `${y}-${String(m).padStart(2, '0')}`
      const amt = parseFloat(String(r['ยอดสุทธิ'] || r['รวมเป็นเงิน'] || '0').replace(/[฿,]/g, '')) || 0
      map[key] = (map[key] || 0) + amt
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-8)
      .map(([k, v]) => ({ month: k, revenue: v }))
  }, [accounting])

  // By company
  const byCompany = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const c = r['บริษัท'] || 'อื่นๆ'
      const amt = parseFloat(String(r['รวมเป็นเงิน'] || '0').replace(/[฿,]/g, '')) || 0
      map[c] = (map[c] || 0) + amt
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5)
  }, [filtered])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const fmt = v => {
    if (!v || v === '0') return '–'
    const n = parseFloat(String(v).replace(/[฿,]/g, ''))
    if (isNaN(n) || n === 0) return '–'
    return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">บัญชี / รายรับ</h1>
        <p className="text-steel-400 text-sm mt-0.5">{accounting.length} รายการในระบบ</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="text-steel-400 text-xs uppercase tracking-wider">รายได้รวม (ก่อน VAT)</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">฿{totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
          <p className="text-steel-500 text-xs mt-1">{filtered.length} รายการที่เลือก</p>
        </div>
        <div className="metric-card">
          <p className="text-steel-400 text-xs uppercase tracking-wider">VAT รวม</p>
          <p className="text-2xl font-bold text-yellow-400 mt-2">฿{totalVat.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="metric-card">
          <p className="text-steel-400 text-xs uppercase tracking-wider">ยอดสุทธิรวม</p>
          <p className="text-2xl font-bold text-green-400 mt-2">฿{totalNet.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">ยอดรายรับรายเดือน (ยอดสุทธิ)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#829ab1', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#829ab1', fontSize: 9 }} axisLine={false} tickLine={false} width={60}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ background: '#102a43', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
                formatter={v => ['฿' + v.toLocaleString(), 'ยอดสุทธิ']} />
              <Bar dataKey="revenue" fill="#48bb78" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">แยกตามบริษัท</h3>
          <div className="space-y-3">
            {byCompany.map(([comp, amt], i) => {
              const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-steel-300 truncate">{comp}</span>
                    <span className="text-steel-400 font-mono ml-2 whitespace-nowrap">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-steel-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <div className="text-xs text-steel-500 mt-0.5">{fmt(amt)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
          <input className="w-full pl-9 pr-3 py-2 text-sm" placeholder="ค้นหา..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="text-sm" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}>
          <option value="">ทุกเดือน</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="text-sm" value={compFilter} onChange={e => { setCompFilter(e.target.value); setPage(1) }}>
          <option value="">ทุกบริษัท</option>
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
                <th>เลขที่ใบแจ้ง</th>
                <th>บริษัท</th>
                <th>PO</th>
                <th>ประเภท</th>
                <th>ชื่อรายการ</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ราคา/หน่วย</th>
                <th className="text-right">รวม</th>
                <th className="text-right">VAT</th>
                <th className="text-right">ยอดสุทธิ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{row['วันที่']}</td>
                  <td className="font-mono text-xs text-accent-400">{row['เลขที่ใบแจ้ง'] || row['เลขที่']}</td>
                  <td className="text-steel-400 text-xs">{row['บริษัท']}</td>
                  <td className="font-mono text-xs text-steel-500">{row['เลขที่ PO'] || row['PO']}</td>
                  <td><span className="status-pill badge-blue text-xs">{row['ประเภทงาน'] || row['ประเภท']}</span></td>
                  <td className="text-steel-200 text-xs max-w-xs truncate">{row['ชื่อรายการ'] || row['รายการ']}</td>
                  <td className="text-right font-mono text-xs text-steel-300">{row['จำนวน'] || '–'}</td>
                  <td className="text-right font-mono text-xs text-steel-300">{fmt(row['ราคา/หน่วย'])}</td>
                  <td className="text-right font-mono text-xs text-blue-400">{fmt(row['รวมเป็นเงิน'])}</td>
                  <td className="text-right font-mono text-xs text-yellow-400">{fmt(row['ยอดVAT'])}</td>
                  <td className="text-right font-mono text-xs text-green-400 font-medium">{fmt(row['ยอดสุทธิ'])}</td>
                  <td><span className="status-pill badge-gray text-xs">{row['สถานะรายการย่อย'] || row['สถานะ']}</span></td>
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
