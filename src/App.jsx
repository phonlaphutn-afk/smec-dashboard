import React, { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Briefcase, AlertCircle, DollarSign,
  Calendar, Truck, Package, RefreshCw, Menu, X, ChevronLeft
} from 'lucide-react'
import { fetchSheet } from './api'
import Dashboard   from './pages/Dashboard'
import Jobs        from './pages/Jobs'
import Outstanding from './pages/Outstanding'
import Accounting  from './pages/Accounting'
import Schedule    from './pages/Schedule'
import Logistics   from './pages/Logistics'
import Stock       from './pages/Stock'

const LOGO_URL = 'https://lh3.googleusercontent.com/d/1j1u-pVN-Ov6CDnYAdSa4p8g_bZzKfzpz'

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'jobs',        label: 'รายการงาน',    icon: Briefcase },
  { id: 'outstanding', label: 'งานค้างส่ง',   icon: AlertCircle },
  { id: 'accounting',  label: 'บัญชี',         icon: DollarSign },
  { id: 'schedule',    label: 'Schedule',      icon: Calendar },
  { id: 'logistics',   label: 'Logistics',     icon: Truck },
  { id: 'stock',       label: 'สต็อก',         icon: Package },
]

const FETCHES = [
  { key: 'jobs',             action: 'getJobs' },
  { key: 'accounting',       action: 'getAccounting' },
  { key: 'schedule',         action: 'getSchedule' },
  { key: 'doData',           action: 'getDO' },
  { key: 'gatepass',         action: 'getGatePass' },
  { key: 'spareParts',       action: 'getSpareParts' },
  { key: 'sparePartsHistory',action: 'getSparePartsHistory' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)   // mobile drawer
  const [collapsed, setCollapsed]     = useState(false)    // desktop collapsed
  const [data, setData] = useState({ jobs:[], accounting:[], schedule:[], doData:[], gatepass:[], spareParts:[], sparePartsHistory:[] })
  const [loading, setLoading]     = useState({})
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

  const navigate = (id) => { setPage(id); setSidebarOpen(false) }

  const getDoList = () => {
    try { return JSON.parse(localStorage.getItem('smec_do_v1')||'[]') } catch { return [] }
  }

  const badgeCount = (id) => {
    if (id === 'outstanding')
      return data.jobs.filter(j => parseInt(j['จำนวนค้างส่ง']||'0')>0 && !['ปิดงาน','ยกเลิก'].includes(j['สถานะ'])).length
    return null
  }

  // ── Sidebar content (shared between desktop + mobile drawer) ──
  const SidebarContent = ({ compact }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-steel-800 ${compact?'justify-center':''}`}>
        <img src={LOGO_URL} alt="SMEC" className="w-8 h-8 rounded object-contain shrink-0"
          onError={e => e.target.style.display='none'}/>
        {!compact && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">SMEC</div>
            <div className="text-steel-500 text-xs">Engineering</div>
          </div>
        )}
        {/* Close on mobile */}
        {!compact && (
          <button className="ml-auto lg:hidden text-steel-500 hover:text-white p-1"
            onClick={() => setSidebarOpen(false)}>
            <X size={16}/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const badge = badgeCount(id)
          return (
            <button key={id}
              className={`nav-item w-full ${page===id?'active':''} ${compact?'justify-center px-0':''}`}
              onClick={() => navigate(id)} title={compact ? label : ''}>
              <Icon size={16} className="shrink-0"/>
              {!compact && <span className="flex-1 text-left">{label}</span>}
              {!compact && badge > 0 && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded-full text-red-300"
                  style={{ background:'rgba(252,129,129,0.15)', border:'1px solid rgba(252,129,129,0.3)' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-steel-800 space-y-1">
        <button
          className={`nav-item w-full ${compact?'justify-center px-0':''} ${isLoading?'opacity-50':''}`}
          onClick={() => loadData()} disabled={isLoading} title="Refresh">
          <RefreshCw size={15} className={isLoading?'animate-spin':''}/>
          {!compact && <span className="text-xs">{isLoading?'กำลังโหลด...':'รีเฟรช'}</span>}
        </button>
        {/* Desktop collapse toggle */}
        <button
          className={`nav-item w-full hidden lg:flex ${compact?'justify-center px-0':''}`}
          onClick={() => setCollapsed(c => !c)}>
          {compact
            ? <ChevronLeft size={14} className="rotate-180"/>
            : <><ChevronLeft size={14}/><span className="text-xs">ย่อ Sidebar</span></>
          }
        </button>
      </div>

      {!compact && lastUpdate && (
        <div className="px-3 py-2 text-xs text-steel-600 border-t border-steel-800 font-mono">
          อัปเดต: {lastUpdate.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}
        </div>
      )}
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#0a1929'}}>

      {/* ── Desktop Sidebar ── */}
      <aside className={`hidden lg:flex flex-col border-r border-steel-800 transition-all duration-200 shrink-0 ${collapsed?'w-14':'w-52'}`}
        style={{ background:'#0d2137' }}>
        <SidebarContent compact={collapsed}/>
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}
          style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(2px)' }}/>
      )}

      {/* ── Mobile Drawer ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 transition-transform duration-300 lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background:'#0d2137', borderRight:'1px solid #1e3a5f' }}>
        <SidebarContent compact={false}/>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-steel-800 lg:hidden shrink-0"
          style={{ background:'#0d2137' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-steel-400 hover:text-white p-1">
            <Menu size={20}/>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img src={LOGO_URL} alt="SMEC" className="w-6 h-6 rounded object-contain"
              onError={e => e.target.style.display='none'}/>
            <span className="text-white font-bold text-sm">SMEC Engineering</span>
          </div>
          <button onClick={() => loadData()} disabled={isLoading}
            className="text-steel-400 hover:text-white p-1 disabled:opacity-50">
            <RefreshCw size={16} className={isLoading?'animate-spin':''}/>
          </button>
        </header>

        {/* Loading bar */}
        {isLoading && <div className="loading-bar fixed top-0 left-0 right-0 z-50"/>}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 lg:p-6 min-h-full pb-20 lg:pb-6">
            {isLoading && data.jobs.length===0 ? (
              <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
                <div className="text-steel-400 text-sm">กำลังโหลดข้อมูล...</div>
                <div className="text-steel-600 text-xs font-mono">
                  {FETCHES.filter(f => loading[f.key]===false).length} / {FETCHES.length} เสร็จแล้ว
                </div>
              </div>
            ) : (
              <>
                {page==='dashboard'   && <Dashboard jobs={data.jobs} accounting={data.accounting}/>}
                {page==='jobs'        && <Jobs jobs={data.jobs} doList={getDoList()} onRefresh={()=>loadData(['jobs'])}/>}
                {page==='outstanding' && <Outstanding jobs={data.jobs}/>}
                {page==='accounting'  && <Accounting accounting={data.accounting} jobs={data.jobs}/>}
                {page==='schedule'    && <Schedule schedule={data.schedule} jobs={data.jobs}/>}
                {page==='logistics'   && <Logistics jobs={data.jobs} doData={data.doData} gatepass={data.gatepass}/>}
                {page==='stock'       && <Stock spareParts={data.spareParts} sheetHistory={data.sparePartsHistory}/>}
              </>
            )}
          </div>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-steel-800 grid"
          style={{
            background:'rgba(13,33,55,0.97)', backdropFilter:'blur(12px)',
            gridTemplateColumns:`repeat(${NAV.length}, 1fr)`
          }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const badge = badgeCount(id)
            const active = page === id
            return (
              <button key={id} onClick={() => navigate(id)}
                className="flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all active:scale-95"
                style={{ color: active ? '#60a5fa' : '#4a6584' }}>
                {badge > 0 && (
                  <div className="absolute top-1 right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                    style={{ background:'#ef4444', fontSize:9, fontWeight:700 }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8}/>
                <span className="leading-none" style={{fontSize:9, fontWeight: active?600:400}}>
                  {label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-blue-400"/>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
