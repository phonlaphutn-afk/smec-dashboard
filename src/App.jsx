import React, { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Briefcase, AlertCircle, DollarSign, Calendar, Truck, RefreshCw, ChevronLeft, ChevronRight, Cog } from 'lucide-react'
import { fetchSheet } from './api'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Outstanding from './pages/Outstanding'
import Accounting from './pages/Accounting'
import Schedule from './pages/Schedule'
import Logistics from './pages/Logistics'

const LOGO_URL = 'https://lh3.googleusercontent.com/d/1j1u-pVN-Ov6CDnYAdSa4p8g_bZzKfzpz'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'jobs', label: 'รายการงาน', icon: Briefcase },
  { id: 'outstanding', label: 'งานค้างส่ง', icon: AlertCircle },
  { id: 'accounting', label: 'บัญชี', icon: DollarSign },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'logistics', label: 'Logistics', icon: Truck },
]

const FETCHES = [
  { key: 'jobs', action: 'getJobs' },
  { key: 'accounting', action: 'getAccounting' },
  { key: 'schedule', action: 'getSchedule' },
  { key: 'doData', action: 'getDO' },
  { key: 'gatepass', action: 'getGatePass' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState({ jobs: [], accounting: [], schedule: [], doData: [], gatepass: [] })
  const [loading, setLoading] = useState({})
  const [lastUpdate, setLastUpdate] = useState(null)

  const loadData = useCallback(async (keys = null) => {
    const toLoad = keys ? FETCHES.filter(f => keys.includes(f.key)) : FETCHES
    const newLoading = {}
    toLoad.forEach(f => newLoading[f.key] = true)
    setLoading(prev => ({ ...prev, ...newLoading }))

    await Promise.all(toLoad.map(async ({ key, action }) => {
      const result = await fetchSheet(action)
      setData(prev => ({ ...prev, [key]: result }))
      setLoading(prev => ({ ...prev, [key]: false }))
    }))
    setLastUpdate(new Date())
  }, [])

  useEffect(() => { loadData() }, [])

  const isLoading = Object.values(loading).some(Boolean)
  const totalLoaded = Object.values(loading).filter(v => v === false).length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-steel-900 border-r border-steel-800 transition-all duration-200 shrink-0 ${collapsed ? 'w-14' : 'w-52'}`}
        style={{ background: '#0d2137' }}>
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-steel-800 ${collapsed ? 'justify-center' : ''}`}>
          <img src={LOGO_URL} alt="SMEC" className="w-8 h-8 rounded object-contain shrink-0"
            onError={e => { e.target.style.display = 'none' }} />
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-sm leading-tight">SMEC</div>
              <div className="text-steel-500 text-xs">Engineering</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const badge = id === 'outstanding'
              ? data.jobs.filter(j => parseInt(j['จำนวนค้างส่ง'] || '0') > 0 && !['ปิดงาน', 'ยกเลิก'].includes(j['สถานะ'])).length
              : null
            return (
              <button key={id} className={`nav-item w-full ${page === id ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                onClick={() => setPage(id)} title={collapsed ? label : ''}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{label}</span>}
                {!collapsed && badge > 0 && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-full text-red-300"
                    style={{ background: 'rgba(252,129,129,0.15)', border: '1px solid rgba(252,129,129,0.3)' }}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-steel-800 space-y-1">
          <button className={`nav-item w-full ${collapsed ? 'justify-center px-0' : ''} ${isLoading ? 'opacity-50' : ''}`}
            onClick={() => loadData()} disabled={isLoading} title="Refresh">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            {!collapsed && <span className="text-xs">{isLoading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>}
          </button>
          <button className={`nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
            onClick={() => setCollapsed(c => !c)} title={collapsed ? 'ขยาย' : 'ย่อ'}>
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span className="text-xs">ย่อ Sidebar</span></>}
          </button>
        </div>

        {/* Last update */}
        {!collapsed && lastUpdate && (
          <div className="px-3 py-2 text-xs text-steel-600 border-t border-steel-800 font-mono">
            อัปเดต: {lastUpdate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Loading bar */}
        {isLoading && <div className="loading-bar fixed top-0 left-0 right-0 z-50" />}

        {/* Content */}
        <div className="p-6 min-h-full">
          {isLoading && data.jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-steel-400 text-sm">กำลังโหลดข้อมูลจาก Google Sheets...</div>
              <div className="text-steel-600 text-xs font-mono">
                {FETCHES.filter(f => loading[f.key] === false).length} / {FETCHES.length} เสร็จแล้ว
              </div>
            </div>
          ) : (
            <>
              {page === 'dashboard' && <Dashboard jobs={data.jobs} accounting={data.accounting} />}
              {page === 'jobs' && <Jobs jobs={data.jobs} />}
              {page === 'outstanding' && <Outstanding jobs={data.jobs} />}
              {page === 'accounting' && <Accounting accounting={data.accounting} />}
              {page === 'schedule' && <Schedule schedule={data.schedule} jobs={data.jobs} />}
              {page === 'logistics' && <Logistics doData={data.doData} gatepass={data.gatepass} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
