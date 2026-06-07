// ── เพิ่มใน Apps Script (doGet) ──────────────────────────────────
// เพิ่ม case เหล่านี้ใน switch(action) ของ doGet

/*
case 'getSpareParts':
  return getSpareParts()
case 'getSparePartsHistory':
  return getSparePartsHistory()
*/

// ── Functions ────────────────────────────────────────────────────
function getSpareParts() {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID)
    var sheet = ss.getSheetByName('SpareParts_Stock') || ss.getSheetByName('Inventory')
    if (!sheet) return jsonRes({ status:'error', message:'Sheet SpareParts_Stock not found' })
    var rows = sheet.getDataRange().getValues()
    var headers = rows[0]
    var data = rows.slice(1).filter(r => r[0]).map(r => {
      var obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? String(r[i]) : '' })
      return obj
    })
    return jsonRes({ status:'success', data: data })
  } catch(e) {
    return jsonRes({ status:'error', message: e.toString() })
  }
}

function getSparePartsHistory() {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID)
    var sheet = ss.getSheetByName('SpareParts_History') || ss.getSheetByName('History')
    if (!sheet) return jsonRes({ status:'success', data:[] })
    var rows = sheet.getDataRange().getValues()
    var headers = rows[0]
    var data = rows.slice(1).filter(r => r[0]).map(r => {
      var obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? String(r[i]) : '' })
      return obj
    })
    return jsonRes({ status:'success', data: data })
  } catch(e) {
    return jsonRes({ status:'error', message: e.toString() })
  }
}

// ── เพิ่มใน doPost ────────────────────────────────────────────────
/*
case 'updateSparePart':
  return updateSparePart(payload.data)
case 'addSparePartHistory':
  return addSparePartHistory(payload.data)
case 'addSparePart':
  return addSparePart(payload.data)
*/

function updateSparePart(data) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID)
    var sheet = ss.getSheetByName('SpareParts_Stock') || ss.getSheetByName('Inventory')
    if (!sheet) return jsonRes({ status:'error', message:'Sheet not found' })
    var rows    = sheet.getDataRange().getValues()
    var headers = rows[0]
    var idCol   = headers.indexOf('id')
    if (idCol < 0) return jsonRes({ status:'error', message:'Column id not found' })

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][idCol]) === String(data.id)) {
        headers.forEach((h, j) => {
          if (data[h] !== undefined) sheet.getRange(i+1, j+1).setValue(data[h])
        })
        return jsonRes({ status:'success', message:'Updated row '+(i+1) })
      }
    }
    return jsonRes({ status:'error', message:'id not found: '+data.id })
  } catch(e) {
    return jsonRes({ status:'error', message: e.toString() })
  }
}

function addSparePartHistory(data) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID)
    var sheet = ss.getSheetByName('SpareParts_History') || ss.getSheetByName('History')
    if (!sheet) {
      // สร้าง sheet ใหม่ถ้ายังไม่มี
      sheet = ss.insertSheet('SpareParts_History')
      sheet.appendRow(['id','date','itemName','type','details'])
    }
    var id = Date.now()
    var row = [id, data.date, data.itemName, data.type, data.details]
    sheet.appendRow(row)
    return jsonRes({ status:'success', id: id })
  } catch(e) {
    return jsonRes({ status:'error', message: e.toString() })
  }
}

function addSparePart(data) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID)
    var sheet = ss.getSheetByName('SpareParts_Stock') || ss.getSheetByName('Inventory')
    if (!sheet) return jsonRes({ status:'error', message:'Sheet not found' })
    var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]
    var row = headers.map(h => data[h] !== undefined ? data[h] : '')
    sheet.appendRow(row)
    return jsonRes({ status:'success', message:'Added '+data.id })
  } catch(e) {
    return jsonRes({ status:'error', message: e.toString() })
  }
}
