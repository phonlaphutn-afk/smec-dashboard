import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Briefcase, TrendingUp, AlertCircle, CheckCircle, Clock, Package, ArrowUpRight } from 'lucide-react'
import { statusBadge, formatCurrency } from '../api'

const COLORS = ['#4299e1', '#48bb78', '#ed8936', '#f6e05e', '#fc8181', '#9f7aea']

export default function Dashboard({ jobs, accounting }) {
  const stats = useMemo(() => {
    const total = jobs.length
    const active = jobs.filter(j => j['สถานะ'] === 'กำลังดำเนินการ').length
    const done = jobs.filter(j => ['ส่งงานแล้ว', 'ปิดงาน'].includes(j['สถานะ'])).length
    const pending = jobs.filter(j => j['สถานะ'] === 'รอดำเนินการ').length
    const outstanding = jobs.filter(j => {
      const c = parseInt(j['จำนวนค้างส่ง'] || '0')
      return c > 0 && !['ปิดงาน', 'ยกเลิก'].includes(j['สถานะ'])
    }).length

    // revenue by month from accounting
    const monthMap = {}
    accounting.forEach(row => {
      const m = row['เดือน'] || row['month'] || ''
      const y = row['ปี'] || row['year'] || ''
      if (!m || !y) return
      const key = `${y}-${String(m).padStart(2, '0')}`
      const amt = parseFloat(String(row['รวมเป็นเงิน'] || '0').replace(/[฿,]/g, '')) || 0
      monthMap[key] = (monthMap[key] || 0) + amt
    })
    const monthlyRevenue = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => ({ month: k.slice(5), revenue: v }))

    // status distribution
    const statusMap = {}
    jobs.forEach(j => {
      const s = j['สถานะ'] || 'ไม่ระบุ'
      statusMap[s] = (statusMap[s] || 0) + 1
    })
    const statusDist = Object.entries(statusMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    // job type distribution
    const typeMap = {}
    jobs.forEach(j => {
      const t = j['ประเภท'] || 'อื่นๆ'
      typeMap[t] = (typeMap[t] || 0) + 1
    })
    const typeDist = Object.entries(typeMap).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }))

    // company distribution
    const compMap = {}
    jobs.forEach(j => {
      const c = j['บริษัท'] || 'อื่นๆ'
      compMap[c] = (compMap[c] || 0) + 1
    })
    const compDist = Object.entries(compMap).sort(([, a], [, b]) => b - a).slice(0, 5)

    return { total, active, done, pending, outstanding, monthlyRevenue, statusDist, typeDist, compDist }
  }, [jobs, accounting])

  const recentJobs = useMemo(() =>
    [...jobs].reverse().slice(0, 8)
  , [jobs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-steel-400 text-sm mt-1">ภาพรวมระบบงาน SMEC Engineering & Construction</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'งานทั้งหมด', value: stats.total, icon: Briefcase, color: '#4299e1', sub: 'รายการในระบบ' },
          { label: 'กำลังดำเนินการ', value: stats.active, icon: Clock, color: '#f6ad55', sub: 'งานที่กำลังทำ' },
          { label: 'ส่งงานแล้ว', value: stats.done, icon: CheckCircle, color: '#48bb78', sub: 'เสร็จสมบูรณ์' },
          { label: 'งานค้างส่ง', value: stats.outstanding, icon: AlertCircle, color: '#fc8181', sub: 'รอจัดส่ง' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-steel-400 text-xs font-medium uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-bold mt-2" style={{ color }}>{value.toLocaleString()}</p>
                <p className="text-steel-500 text-xs mt-1">{sub}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">ยอดรายได้รายเดือน</h3>
              <p className="text-steel-500 text-xs mt-0.5">6 เดือนล่าสุด</p>
            </div>
            <TrendingUp size={16} className="text-steel-400" />
          </div>
          {stats.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.monthlyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#829ab1', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#829ab1', fontSize: 10 }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip contentStyle={{ background: '#102a43', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }}
                  formatter={v => ['฿' + v.toLocaleString(), 'รายได้']} />
                <Bar dataKey="revenue" fill="#4299e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-steel-500 text-sm">ไม่มีข้อมูลรายรับ</div>
          )}
        </div>

        {/* Status Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-1">สถานะงาน</h3>
          <p className="text-steel-500 text-xs mb-4">สัดส่วนตามสถานะ</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={stats.statusDist} cx="50%" cy="50%" outerRadius={60} innerRadius={35}
                dataKey="value" paddingAngle={2}>
                {stats.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#102a43', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.statusDist.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-steel-300">{item.name}</span>
                </div>
                <span className="text-steel-400 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job Type Distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">ประเภทงาน</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.typeDist} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#829ab1', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9fb3c8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#102a43', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stats.typeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Company Distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">ลูกค้าหลัก</h3>
          <div className="space-y-3">
            {stats.compDist.map(([name, count], i) => {
              const pct = Math.round((count / stats.total) * 100)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-steel-300">{name}</span>
                    <span className="text-steel-400 font-mono">{count} งาน ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-steel-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-steel-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">งานล่าสุด</h3>
          <span className="text-steel-500 text-xs">{jobs.length} รายการทั้งหมด</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>รายละเอียด</th>
                <th>บริษัท</th>
                <th>ประเภท</th>
                <th>ผู้รับผิดชอบ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs text-accent-400">{job['เลขที่']}</td>
                  <td className="text-steel-200 max-w-xs truncate">{job['รายละเอียด']}</td>
                  <td className="text-steel-400">{job['บริษัท']}</td>
                  <td><span className="status-pill badge-blue">{job['ประเภท']}</span></td>
                  <td className="text-steel-400">{job['ผู้รับผิดชอบ']}</td>
                  <td><span className={`status-pill ${statusBadge(job['สถานะ'])}`}>{job['สถานะ']}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
