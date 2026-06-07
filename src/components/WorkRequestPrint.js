// ── Work Request Print ──────────────────────────────────────────────────────
// พิมพ์ใบแจ้งงาน / WORK REQUEST ตามแบบฟอร์มมาตรฐาน SMEC

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmtDateTH(val) {
  if (!val) return ''
  const s = String(val).replace(/-/g,'/')
  const p = s.split('/')
  if (p.length === 3) {
    const [a,b,c] = p
    // dd/mm/yyyy or yyyy/mm/dd
    const day   = a.length===4 ? c : a
    const month = a.length===4 ? parseInt(b)-1 : parseInt(b)-1
    const year  = a.length===4 ? a : c
    return `${parseInt(day)} ${MONTHS_TH[month] || ''} ${String(year).slice(-2)}`
  }
  return val
}

function parseSubItems(str) {
  if (!str) return []
  return str.split('\n').map(line => {
    line = line.trim()
    if (!line.startsWith('-')) return null
    const m = line.match(/^- (.*?)\s+\((\d+)\/(\d+)\s+(.*?)\)\s+\[(.*?)\]/)
    if (!m) return { name: line.replace(/^- /,''), qty:'', unit:'', status:'' }
    return { name: m[1].trim(), qty: m[2], sent: m[3], unit: m[4].trim(), status: m[5].trim() }
  }).filter(Boolean)
}

export function printWorkRequest(job) {
  const subItems = parseSubItems(job['รายการย่อย'] || '')
  const jobType = job['ประเภท'] || ''

  // SMEC logo base64 placeholder — ใช้ text แทน
  const logoHtml = `
    <div style="display:flex;align-items:center;gap:0;border:2px solid #1a3a5c;border-radius:4px;overflow:hidden;width:80px;height:60px;justify-content:center;background:#1a3a5c">
      <span style="color:white;font-size:9px;font-weight:700;text-align:center;line-height:1.2;padding:4px">SIAMMAC<br/>ENG&amp;CON</span>
    </div>`

  const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <title>ใบแจ้งงาน ${job['เลขที่']||''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sarabun',sans-serif;font-size:11px;color:#111;background:#fff}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm;background:#fff}
    table{width:100%;border-collapse:collapse}
    .main-table td,.main-table th{border:1px solid #333;padding:5px 8px;vertical-align:top}
    .label-cell{background:#f0f4f8;font-weight:700;white-space:nowrap;width:1%;font-size:10px}
    .header-row{display:grid;grid-template-columns:90px 1fr 160px;gap:0;border:1px solid #333;margin-bottom:0}
    .header-logo{border-right:1px solid #333;display:flex;align-items:center;justify-content:center;padding:6px}
    .header-title{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 0;border-right:1px solid #333}
    .header-meta{padding:6px 8px;font-size:10px}
    h1{font-size:18px;font-weight:700;letter-spacing:1px}
    h2{font-size:11px;font-weight:600;color:#333}
    .section-header{background:#d0e4f7;font-weight:700;font-size:11px;padding:4px 8px;border:1px solid #333;border-bottom:none;margin-top:8px}
    .cb-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:6px 8px}
    .cb-item{display:flex;align-items:center;gap:5px;font-size:10px}
    .cb{width:12px;height:12px;border:1px solid #555;display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
    .cb.checked{background:#1a3a5c;color:white;border-color:#1a3a5c}
    .desc-box{border:1px solid #333;padding:8px;min-height:48px;font-size:11px;line-height:1.6}
    .sub-table th{background:#1a3a5c;color:white;font-size:10px;padding:4px 6px;text-align:center;border:1px solid #555}
    .sub-table td{padding:4px 6px;border:1px solid #ccc;font-size:10px}
    .sub-table td.name-col{text-align:left}
    .report-box{border:1px solid #333;padding:6px 8px;min-height:50px}
    .dotline{border-bottom:1px dotted #999;margin:8px 0;height:16px}
    .date-row{display:flex;gap:40px;font-size:10px;padding:6px 0}
    .date-field{display:flex;align-items:flex-end;gap:4px}
    .date-line{min-width:140px;border-bottom:1px solid #555;padding-bottom:1px}
    .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px}
    .sig-box{text-align:center}
    .sig-line{border-bottom:1px solid #333;min-height:36px;margin-bottom:3px}
    .sig-role{font-weight:700;font-size:10px}
    .sig-date{font-size:9px;color:#666}
    .note-box{border:1px solid #333;padding:8px;min-height:80px}
    .note-dotline{border-bottom:1px dotted #aaa;margin:10px 0}
    @media print{@page{size:A4 portrait;margin:0}body{margin:0}.page{padding:10mm 12mm}}
  </style></head><body>
  <div class="page">

    <!-- Header -->
    <div class="header-row">
      <div class="header-logo">${logoHtml}</div>
      <div class="header-title">
        <h1>ใบแจ้งงาน / WORK REQUEST</h1>
        <h2>บริษัท สยามแมค เอ็นจิเนียริ้ง แอนด์ คอนสตรัคชั่น จำกัด</h2>
      </div>
      <div class="header-meta">
        <div style="margin-bottom:4px">วันที่: <strong style="color:#c00">${fmtDateTH(job['วันที่'])}</strong></div>
        <div style="font-size:12px;font-weight:700;color:#1a3a5c">${job['เลขที่']||''}</div>
      </div>
    </div>

    <!-- Basic Info -->
    <table class="main-table" style="margin-top:0;border-top:none">
      <tr>
        <td class="label-cell">ผู้แจ้ง (Requester)</td>
        <td>${job['ผู้แจ้ง']||''}</td>
        <td class="label-cell">บริษัท (Company)</td>
        <td style="font-weight:700;color:#1a3a5c">${job['บริษัท']||''}</td>
      </tr>
      <tr>
        <td class="label-cell">เลขที่ PO</td>
        <td style="font-family:monospace">${job['PO']||'–'}</td>
        <td class="label-cell">จำนวน</td>
        <td>${job['จำนวน']||''}</td>
      </tr>
    </table>

    <!-- Department + Job Type (2 columns) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid #333;border-top:none">
      <div style="border-right:1px solid #333">
        <div style="background:#f0f4f8;font-weight:700;padding:4px 8px;font-size:10px;border-bottom:1px solid #ccc">แผนก (Department):</div>
        <div class="cb-grid">
          ${[['แผนกเครื่องจักร',''],['แผนก CNC',''],['วิศวัด',''],['แผนก Manual','']].map(([l,ref])=>`
          <div class="cb-item">
            <span class="cb">${(job['ผู้รับผิดชอบ']||'').includes(ref)?'✓':''}</span>${l}
          </div>`).join('')}
        </div>
        <div style="font-size:9px;color:#666;padding:2px 8px 4px">* (อ้างอิง: ${job['ผู้รับผิดชอบ']||''})</div>
      </div>
      <div>
        <div style="background:#f0f4f8;font-weight:700;padding:4px 8px;font-size:10px;border-bottom:1px solid #ccc">ประเภทงาน (Job Type):</div>
        <div class="cb-grid">
          ${['ซ่อม','สร้าง','ปรับปรุง','สั่งซื้อ','งาน DIE','โครงการ'].map(t=>`
          <div class="cb-item">
            <span class="cb ${jobType===t||jobType.includes(t)?'checked':''}">${jobType===t||jobType.includes(t)?'✓':''}</span>${t}
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Description -->
    <div class="section-header">รายละเอียดงาน (Description):</div>
    <div class="desc-box">${job['รายละเอียด']||''}</div>

    <!-- Sub-Items -->
    <div class="section-header">รายการสั่งซื้อ/เบิกของ / รายการย่อย (Material / Sub-Items)</div>
    <table class="sub-table">
      <thead>
        <tr>
          <th style="width:32px">ลำดับ</th>
          <th>รายการ</th>
          <th style="width:60px">จำนวน</th>
          <th style="width:52px">หน่วย</th>
          <th style="width:120px">สถานะ</th>
          <th style="width:80px">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${subItems.length > 0
          ? subItems.map((s,i)=>`<tr>
              <td style="text-align:center">${i+1}</td>
              <td class="name-col">${s.name}</td>
              <td style="text-align:center">${s.qty}</td>
              <td style="text-align:center">${s.unit}</td>
              <td style="text-align:center">${s.status}</td>
              <td></td>
            </tr>`).join('')
          : `<tr><td style="text-align:center">1</td><td></td><td></td><td></td><td></td><td></td></tr>
             <tr><td style="text-align:center">2</td><td></td><td></td><td></td><td></td><td></td></tr>`
        }
        ${Array.from({length:Math.max(0, 3-subItems.length)},(_,i)=>`
          <tr><td style="text-align:center">${subItems.length+i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
      </tbody>
    </table>

    <!-- Operation Report -->
    <div class="section-header" style="margin-top:10px">รายงานการปฏิบัติงาน (Operation Report):</div>
    <div class="report-box">
      <div class="dotline"></div>
      <div class="dotline"></div>
      <div class="dotline"></div>
    </div>

    <!-- Date/Time -->
    <div class="date-row">
      <div class="date-field">วันที่เริ่ม: <span class="date-line"></span></div>
      <div class="date-field">วันที่เสร็จ: <span class="date-line"></span></div>
      <div style="margin-left:auto;font-weight:600">รวมเวลา: ........... วัน ........... ชม.</div>
    </div>

    <!-- Signatures -->
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-role">ผู้ปฏิบัติงาน</div>
        <div class="sig-date">วันที่ ......./......./......</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-role">ผู้ตรวจสอบ</div>
        <div class="sig-date">วันที่ ......./......./......</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-role">ผู้รับงาน</div>
        <div class="sig-date">วันที่ ......./......./......</div>
      </div>
    </div>

    <!-- Note -->
    <div style="margin-top:10px">
      <div style="font-weight:700;font-size:11px;margin-bottom:4px">Note:</div>
      <div class="note-box">
        <div class="note-dotline"></div>
        <div class="note-dotline"></div>
        <div class="note-dotline"></div>
        <div class="note-dotline"></div>
      </div>
    </div>

  </div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`

  const w = window.open('','_blank','width=900,height=750')
  w.document.write(html)
  w.document.close()
}
