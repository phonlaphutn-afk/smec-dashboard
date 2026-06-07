import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, FileText, AlertCircle, Plus, Download, Printer, X, Edit2, Trash2 } from 'lucide-react'
import { statusBadge, formatCurrency, formatDate } from '../api'
import JobFormModal from '../components/JobFormModal'
import JobDetailModal from '../components/JobDetailModal'

const PAGE_SIZE = 30

// ── Export to CSV ──────────────────────────────────────────────────────────
function exportCSV(rows) {
  const cols = ['วันที่','เลขที่','รายละเอียด','บริษัท','PO','ประเภท','ผู้รับผิดชอบ','จำนวน','จำนวนค้างส่ง','ยอดขายรวม','สถานะ']
  const header = cols.join(',')
  const lines = rows.map(r =>
    cols.map(c => {
      const v = String(r[c] || '').replace(/"/g, '""')
      return `"${v}"`
    }).join(',')
  )
  const bom = '\uFEFF'
  const blob = new Blob([bom + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `smec-jobs-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Print report ────────────────────────────────────────────────────────────
function printReport(rows, filterLabel) {
  const total = rows.reduce((s, r) => s + (parseFloat(String(r['ยอดขายรวม'] || '0').replace(/[฿,]/g,'')) || 0), 0)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>รายงานรายการงาน SMEC</title>
  <style>
    body{font-family:'Sarabun',sans-serif;font-size:11px;color:#111;margin:20px}
    h2{font-size:15px;margin:0 0 4px}
    .sub{color:#555;font-size:10px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#1a3a5c;color:#fff;padding:5px 6px;text-align:left;white-space:nowrap}
    td{padding:4px 6px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    tr:nth-child(even) td{background:#f9fafb}
    .total{text-align:right;font-weight:bold;font-size:11px;margin-top:10px}
    @media print{@page{size:A4 landscape;margin:12mm}}
  </style></head><body>
  <h2>รายงานรายการงาน — SMEC Engineering & Construction</h2>
  <div class="sub">ตัวกรอง: ${filterLabel} · พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} · ${rows.length} รายการ</div>
  <table><thead><tr>
    <th>วันที่</th><th>เลขที่</th><th>รายละเอียด</th><th>บริษัท</th><th>PO</th>
    <th>ประเภท</th><th>ผู้รับผิดชอบ</th><th>จน.</th><th>ค้าง</th><th>ยอดขาย</th><th>สถานะ</th>
  </tr></thead><tbody>
  ${rows.map(r => `<tr>
    <td>${r['วันที่']||''}</td>
    <td style="font-family:monospace">${r['เลขที่']||''}</td>
    <td>${r['รายละเอียด']||''}</td>
    <td>${r['บริษัท']||''}</td>
    <td style="font-family:monospace">${r['PO']||''}</td>
    <td>${r['ประเภท']||''}</td>
    <td>${r['ผู้รับผิดชอบ']||''}</td>
    <td style="text-align:center">${r['จำนวน']||'–'}</td>
    <td style="text-align:center;color:${parseInt(r['จำนวนค้างส่ง']||0)>0?'#dc2626':'#999'}">${r['จำนวนค้างส่ง']||'–'}</td>
    <td style="text-align:right;font-family:monospace">฿${(parseFloat(String(r['ยอดขายรวม']||'0').replace(/[฿,]/g,''))||0).toLocaleString('th-TH')}</td>
    <td>${r['สถานะ']||''}</td>
  </tr>`).join('')}
  </tbody></table>
  <div class="total">ยอดรวมทั้งหมด: ฿${total.toLocaleString('th-TH', {minimumFractionDigits:0})}</div>
  <script>window.onload=()=>{window.print();window.close()}<\/script>
  </body></html>`
  const w = window.open('','_blank','width=1100,height=700')
  w.document.write(html); w.document.close()
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Jobs({ jobs, onRefresh, doList = [] }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [jobNoFilter, setJobNoFilter] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ key: 'วันที่', dir: 'desc' })

  // Derive unique filter options
  const years = useMemo(() => {
    const ys = [...new Set(jobs.map(j => {
      const d = j['วันที่'] || ''; return d.split('/')[2] || d.split('-')[0]
    }).filter(Boolean))].sort((a,b) => b-a)
    return ys
  }, [jobs])
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12']
  const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const companies = useMemo(() => [...new Set(jobs.map(j => j['บริษัท']).filter(Boolean))].sort(), [jobs])
  const types = useMemo(() => [...new Set(jobs.map(j => j['ประเภท']).filter(Boolean))].sort(), [jobs])
  const statuses = ['กำลังดำเนินการ','ส่งงานแล้ว','ปิดงาน','รอดำเนินการ','งานเสร็จรอส่ง','ยกเลิก','รออะไหล่']

  const hasFilter = search || yearFilter || monthFilter || companyFilter || typeFilter || statusFilter || jobNoFilter || poFilter

  const clearFilters = () => {
    setSearch(''); setYearFilter(''); setMonthFilter('')
    setCompanyFilter(''); setTypeFilter(''); setStatusFilter('')
    setJobNoFilter(''); setPoFilter(''); setPage(1)
  }

  // ── Group rows ที่มีเลขที่ + PO เดียวกัน → รวมเป็นใบงานเดียว ──
  const groupedJobs = useMemo(() => {
    const map = {}
    const order = []
    jobs.forEach(row => {
      const key = (row['เลขที่'] || '') + '||' + (row['PO'] || '')
      if (!map[key]) {
        map[key] = { ...row, _rows: [row] }
        order.push(key)
      } else {
        const g = map[key]
        // รวม sub-items
        const existingLines = new Set(
          (g['รายการย่อย'] || '').split('\n').map(l => l.trim()).filter(Boolean)
        )
        const newLines = (row['รายการย่อย'] || '').split('\n')
          .map(l => l.trim()).filter(l => l && !existingLines.has(l))
        if (newLines.length > 0) {
          g['รายการย่อย'] = [g['รายการย่อย'], ...newLines].filter(Boolean).join('\n')
        }
        // รวม qty
        const addNum = (a, b) => String((parseFloat(a) || 0) + (parseFloat(b) || 0))
        g['จำนวน']        = addNum(g['จำนวน'],        row['จำนวน'])
        g['จำนวนที่ส่ง']  = addNum(g['จำนวนที่ส่ง'],  row['จำนวนที่ส่ง'])
        g['จำนวนค้างส่ง'] = addNum(g['จำนวนค้างส่ง'], row['จำนวนค้างส่ง'])
        // ใช้ค่าล่าสุด
        ;['สถานะ','ผู้รับผิดชอบ','ยอดขายรวม','วันที่ลงบันทึก'].forEach(f => {
          if (row[f]) g[f] = row[f]
        })
        g._rows.push(row)
      }
    })
    return order.map(k => map[k])
  }, [jobs])

  const filtered = useMemo(() => {
    let data = groupedJobs.filter(j => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        (j['เลขที่']||'').toLowerCase().includes(q) ||
        (j['รายละเอียด']||'').toLowerCase().includes(q) ||
        (j['บริษัท']||'').toLowerCase().includes(q) ||
        (j['ผู้รับผิดชอบ']||'').toLowerCase().includes(q) ||
        (j['PO']||'').toLowerCase().includes(q)

      // Date parts
      const d = j['วันที่'] || ''
      const parts = d.includes('/') ? d.split('/') : d.split('-')
      const jYear = parts[2] || parts[0] || ''
      const jMonth = d.includes('/')
        ? String(parseInt(parts[1]||0)).padStart(2,'0')
        : (parts[1]||'')

      return matchSearch &&
        (!yearFilter  || jYear === yearFilter) &&
        (!monthFilter || jMonth === monthFilter) &&
        (!companyFilter || j['บริษัท'] === companyFilter) &&
        (!typeFilter || j['ประเภท'] === typeFilter) &&
        (!statusFilter || j['สถานะ'] === statusFilter) &&
        (!jobNoFilter || (j['เลขที่']||'').toLowerCase().includes(jobNoFilter.toLowerCase())) &&
        (!poFilter || (j['PO']||'').toLowerCase().includes(poFilter.toLowerCase()))
    })
    data.sort((a, b) => {
      const av = a[sort.key] || '', bv = b[sort.key] || ''
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return data
  }, [groupedJobs, search, yearFilter, monthFilter, companyFilter, typeFilter, statusFilter, jobNoFilter, poFilter, sort])

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // Summary totals from filtered
  const totalRevenue = useMemo(() =>
    filtered.reduce((s,r) => s + (parseFloat(String(r['ยอดขายรวม']||'0').replace(/[฿,]/g,''))||0), 0)
  , [filtered])

  const toggleSort = key => {
    setSort(s => s.key === key ? { key, dir: s.dir==='asc'?'desc':'asc' } : { key, dir: 'desc' })
    setPage(1)
  }
  const SortIcon = ({ k }) => {
    if (sort.key !== k) return null
    return sort.dir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>
  }

  // Build filter label for print
  const filterLabel = [
    yearFilter ? `ปี ${yearFilter}` : '',
    monthFilter ? `เดือน ${MONTH_TH[parseInt(monthFilter)-1]}` : '',
    companyFilter || '', typeFilter || '', statusFilter || '',
    search ? `"${search}"` : ''
  ].filter(Boolean).join(', ') || 'ทั้งหมด'

  const parseSubItems = (str) => {
    if (!str) return []
    return str.split('\n').map(line => {
      line = line.trim()
      if (!line.startsWith('-')) return null
      const match = line.match(/^- (.*?)\s+\((.*?)\/(.*?)\s+(.*?)\)\s+\[(.*?)\](?:\s+\{(?:C:.*?,)?P:(.*?)\})?/)
      if (!match) return { name: line.replace(/^- /,''), qty:'-', sent:'-', unit:'', status:'', price:'' }
      return {
        name: match[1].trim(), qty: match[2], sent: match[3], unit: match[4].trim(),
        status: match[5].trim(), price: match[6] ? '฿'+parseFloat(match[6]).toLocaleString() : ''
      }
    }).filter(Boolean)
  }

  const outstandingCount = jobs.filter(j => parseInt(j['จำนวนค้างส่ง']||'0')>0 && !['ปิดงาน','ยกเลิก'].includes(j['สถานะ'])).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการรายการงาน <span className="text-steel-500 font-normal text-lg">(Job Management)</span></h1>
          <p className="text-steel-400 text-sm mt-0.5">ค้นหาและจัดการรายการแจ้งงานทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {outstandingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background:'rgba(252,129,129,0.1)', border:'1px solid rgba(252,129,129,0.25)' }}>
              <AlertCircle size={14} className="text-red-400"/>
              <span className="text-red-300 text-xs font-medium">{outstandingCount} งานค้างส่ง</span>
            </div>
          )}
          <button onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-steel-300 hover:text-white transition-colors"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid #1e3a5f' }}>
            <Download size={13}/> โหลดไฟล์ให้บัญชี
          </button>
          <button onClick={() => printReport(filtered, filterLabel)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-steel-300 hover:text-white transition-colors"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid #1e3a5f' }}>
            <Printer size={13}/> พิมพ์รายการนี้
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
            style={{ background:'linear-gradient(135deg, #1d6fd8, #1a56b0)' }}>
            <Plus size={15}/> เพิ่มงานใหม่
          </button>
        </div>
      </div>

      <JobFormModal open={showForm} onClose={() => setShowForm(false)} jobs={jobs}
        onSaved={() => { onRefresh && onRefresh(); setShowForm(false) }}/>

      <JobDetailModal
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        doList={doList}
        onEdit={(job) => { setSelectedJob(null); setShowForm(true) }}
        onDelete={(job) => {
          if (window.confirm(`ลบงาน ${job['เลขที่']} ใช่ไหมครับ?`)) {
            setSelectedJob(null)
            onRefresh && onRefresh()
          }
        }}
      />

      {/* Filter bar */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative" style={{ minWidth: 180 }}>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500"/>
            <input className="w-full pl-8 pr-3 py-1.5 text-xs" placeholder="ค้นหาทั่วไป..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/>
          </div>

          {/* Year */}
          <select className="text-xs py-1.5 px-2" value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1) }}>
            <option value="">ทุกปี</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Month */}
          <select className="text-xs py-1.5 px-2" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}>
            <option value="">ทุกเดือน</option>
            {months.map((m,i) => <option key={m} value={m}>{MONTH_TH[i]}</option>)}
          </select>

          {/* Company */}
          <select className="text-xs py-1.5 px-2" value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1) }}>
            <option value="">ทุกบริษัท</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Type */}
          <select className="text-xs py-1.5 px-2" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
            <option value="">ทุกประเภท</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Status */}
          <select className="text-xs py-1.5 px-2" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">ทุกสถานะ</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Job No */}
          <input className="text-xs py-1.5 px-2" style={{ width: 140 }} placeholder="เลขที่ใบแจ้ง..."
            value={jobNoFilter} onChange={e => { setJobNoFilter(e.target.value); setPage(1) }}/>

          {/* PO */}
          <input className="text-xs py-1.5 px-2" style={{ width: 120 }} placeholder="เลขที่ PO..."
            value={poFilter} onChange={e => { setPoFilter(e.target.value); setPage(1) }}/>

          {/* Clear */}
          {hasFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-red-400 hover:text-red-300 transition-colors"
              style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)' }}>
              <X size={11}/> ล้าง
            </button>
          )}
        </div>

        {/* Result summary */}
        <div className="flex items-center justify-between text-xs text-steel-500">
          <span>
            แสดง <span className="text-steel-300 font-medium">{filtered.length}</span> จาก {jobs.length} รายการ
            {hasFilter && <span className="text-blue-400 ml-1">(กรองแล้ว)</span>}
          </span>
          <span className="font-mono">
            ยอดรวม: <span className="text-green-400 font-semibold">฿{totalRevenue.toLocaleString('th-TH',{minimumFractionDigits:0})}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('วันที่')}>
                  <div className="flex items-center gap-1">วันที่<SortIcon k="วันที่"/></div>
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('เลขที่')}>
                  <div className="flex items-center gap-1">เลขที่<SortIcon k="เลขที่"/></div>
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
              {paginated.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-steel-600">ไม่พบรายการที่ตรงกับเงื่อนไข</td></tr>
              )}
              {paginated.map((job, i) => {
                const outstandingQty = parseInt(job['จำนวนค้างส่ง']||'0')
                return (
                  <tr key={i}
                    className="cursor-pointer hover:bg-white/[0.025] transition-colors"
                    onClick={() => setSelectedJob(job)}>
                    <td className="font-mono text-xs text-steel-400 whitespace-nowrap">{formatDate(job['วันที่'])}</td>
                    <td className="font-mono text-xs text-accent-400 whitespace-nowrap">{job['เลขที่']}</td>
                    <td className="text-steel-200 max-w-xs">
                      <div className="truncate text-xs">{job['รายละเอียด']}</div>
                      {job['ชื่อโครงการ'] && <div className="text-steel-500 text-xs truncate">{job['ชื่อโครงการ']}</div>}
                      {(job['อ้างใบส่งของ DO']||'').split(',').filter(Boolean).map((d,di) => (
                        <span key={di} className="inline-block mr-1 mt-0.5 px-1.5 py-0.5 rounded text-xs font-mono"
                          style={{ background:'rgba(6,182,212,0.12)', color:'#22d3ee', border:'1px solid rgba(6,182,212,0.2)' }}>
                          📦 {d.trim()}
                        </span>
                      ))}
                    </td>
                    <td className="text-steel-400 text-xs whitespace-nowrap">{job['บริษัท']}</td>
                    <td className="font-mono text-xs text-steel-500">{job['PO'] || <span className="text-steel-700">รอ PO</span>}</td>
                    <td><span className="status-pill badge-blue text-xs">{job['ประเภท']}</span></td>
                    <td className="text-steel-400 text-xs">{job['ผู้รับผิดชอบ']}</td>
                    <td className="text-center font-mono text-xs">
                      <div className="text-steel-300">รวม: {job['จำนวน']||'–'}</div>
                      {outstandingQty > 0
                        ? <div className="text-red-400 font-medium text-xs">ค้าง: {outstandingQty}</div>
                        : <div className="text-green-600 text-xs">ส่งครบ</div>}
                    </td>
                    <td className="font-mono text-xs text-green-400 whitespace-nowrap">{formatCurrency(job['ยอดขายรวม'])}</td>
                    <td><span className={`status-pill ${statusBadge(job['สถานะ'])}`}>{job['สถานะ']}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        {(job['เอกสาร']||job['เอกสารแนบใบส่งของชั่วคราว']) ? (
                          <a href={(job['เอกสาร']||job['เอกสารแนบใบส่งของชั่วคราว']).split(',')[0].trim()}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-white/10 text-steel-500 hover:text-blue-400 transition-colors" title="เปิดเอกสาร">
                            <FileText size={13}/>
                          </a>
                        ) : (
                          <span className="p-1.5 text-steel-700"><FileText size={13}/></span>
                        )}
                        <button className="p-1.5 rounded hover:bg-white/10 text-steel-500 hover:text-steel-200 transition-colors"
                          title="พิมพ์" onClick={() => setSelectedJob(job)}>
                          <Printer size={13}/>
                        </button>
                        <button className="p-1.5 rounded hover:bg-white/10 text-steel-500 hover:text-yellow-400 transition-colors"
                          title="แก้ไข" onClick={() => setSelectedJob(job)}>
                          <Edit2 size={13}/>
                        </button>
                        <button className="p-1.5 rounded hover:bg-white/10 text-steel-500 hover:text-red-400 transition-colors"
                          title="ลบ" onClick={() => window.confirm(`ลบงาน ${job['เลขที่']} ใช่ไหมครับ?`) && onRefresh && onRefresh()}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-steel-800 flex items-center justify-between">
            <span className="text-steel-500 text-xs">หน้า {page} / {totalPages} · {filtered.length} รายการ</span>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(1)} disabled={page===1}>«</button>
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← ก่อนหน้า</button>
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>ถัดไป →</button>
              <button className="btn btn-ghost text-xs py-1 px-3" onClick={() => setPage(totalPages)} disabled={page===totalPages}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
