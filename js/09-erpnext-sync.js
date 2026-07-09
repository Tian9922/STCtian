// =========================================================================
// ERPNEXT SYNC — Tarik data Stock Ledger dari ERPNext (Frappe) ke dashboard
// Sync satu arah: ERPNext -> Dashboard (read-only, tidak mengubah data ERPNext)
// =========================================================================

// -------------------------------------------------------------------------
// 1) KONFIGURASI — isi 3 nilai ini setelah API Key/Secret sudah digenerate
//    di ERPNext (My Settings > API Access > Generate Keys)
// -------------------------------------------------------------------------
const ERP_CONFIG = {
  baseUrl:   "https://erp.seoultrading.id", // domain ERPNext, tanpa trailing slash
  apiKey:    "ISI_API_KEY_DISINI",
  apiSecret: "ISI_API_SECRET_DISINI",
  reportName: "Stock Ledger" // nama report persis seperti di ERPNext
};

function _erpHeaders(){
  return {
    "Authorization": `token ${ERP_CONFIG.apiKey}:${ERP_CONFIG.apiSecret}`,
    "Content-Type": "application/json"
  };
}

function _erpConfigured(){
  return ERP_CONFIG.apiKey && ERP_CONFIG.apiKey !== "ISI_API_KEY_DISINI"
      && ERP_CONFIG.apiSecret && ERP_CONFIG.apiSecret !== "ISI_API_SECRET_DISINI";
}

// -------------------------------------------------------------------------
// 2) TEST KONEKSI — dipakai untuk cek cepat apakah API key & CORS sudah oke
//    Bisa dipanggil dari tombol UI, atau langsung dari console:
//    testERPNextConnection()
// -------------------------------------------------------------------------
async function testERPNextConnection(){
  let statusEl = document.getElementById("erp-sync-status");
  if(!_erpConfigured()){
    if(statusEl){ statusEl.textContent = "⚠️ API Key/Secret belum diisi di js/09-erpnext-sync.js"; statusEl.className = "erp-status erp-warn"; }
    return false;
  }
  if(statusEl){ statusEl.textContent = "⏳ Menghubungkan ke ERPNext..."; statusEl.className = "erp-status"; }
  try{
    let res = await fetch(`${ERP_CONFIG.baseUrl}/api/method/frappe.auth.get_logged_user`, {
      method: "GET",
      headers: _erpHeaders()
    });
    if(res.ok){
      let data = await res.json();
      if(statusEl){ statusEl.textContent = `✅ Terhubung sebagai: ${data.message}`; statusEl.className = "erp-status erp-ok"; }
      return true;
    } else {
      if(statusEl){ statusEl.textContent = `❌ Gagal (HTTP ${res.status}). Cek API Key/Secret.`; statusEl.className = "erp-status erp-err"; }
      return false;
    }
  } catch(e){
    // Kalau error di sini kemungkinan besar karena CORS diblokir browser
    if(statusEl){ statusEl.textContent = "❌ Tidak bisa terhubung — kemungkinan diblokir CORS. Minta admin IT untuk mengizinkan domain ini di server ERPNext (allow_cors)."; statusEl.className = "erp-status erp-err"; }
    console.error("ERPNext connection error:", e);
    return false;
  }
}

// -------------------------------------------------------------------------
// 3) TARIK DATA STOCK LEDGER dari ERPNext lewat query_report.run
// -------------------------------------------------------------------------
let erpLedgerData = [];

async function fetchStockLedgerFromERPNext(filters){
  filters = filters || {};
  let statusEl = document.getElementById("erp-sync-status");
  if(!_erpConfigured()){
    if(statusEl){ statusEl.textContent = "⚠️ API Key/Secret belum diisi."; statusEl.className = "erp-status erp-warn"; }
    return [];
  }
  if(statusEl){ statusEl.textContent = "⏳ Menarik data dari ERPNext..."; statusEl.className = "erp-status"; }

  try{
    let body = {
      report_name: ERP_CONFIG.reportName,
      filters: filters // contoh: { from_date: "2026-07-01", to_date: "2026-07-07" }
    };
    let res = await fetch(`${ERP_CONFIG.baseUrl}/api/method/frappe.desk.query_report.run`, {
      method: "POST",
      headers: _erpHeaders(),
      body: JSON.stringify(body)
    });
    if(!res.ok) throw new Error("HTTP " + res.status);
    let json = await res.json();
    let result = (json.message && json.message.result) || [];
    erpLedgerData = result;
    if(statusEl){ statusEl.textContent = `✅ Berhasil menarik ${result.length} baris data (${new Date().toLocaleTimeString()})`; statusEl.className = "erp-status erp-ok"; }
    renderErpLedgerTable(result);
    return result;
  } catch(e){
    console.error("Fetch Stock Ledger error:", e);
    if(statusEl){ statusEl.textContent = "❌ Gagal menarik data — kemungkinan CORS diblokir atau nama report berbeda. Lihat console untuk detail."; statusEl.className = "erp-status erp-err"; }
    return [];
  }
}

// -------------------------------------------------------------------------
// 4) RENDER TABEL hasil tarikan ke tab "ERP Sync"
// -------------------------------------------------------------------------
function renderErpLedgerTable(rows){
  let tbody = document.getElementById("tabelErpLedger");
  if(!tbody) return;
  if(!rows || rows.length===0){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">Belum ada data. Klik "Tarik Data" di atas.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r,i)=>{
    return `<tr>
      <td>${i+1}</td>
      <td>${r.posting_date || r.date || "-"}</td>
      <td>${r.item_code || "-"}</td>
      <td>${r.item_name || "-"}</td>
      <td>${r.stock_uom || "-"}</td>
      <td>${r.qty_after_transaction ?? r.actual_qty ?? "-"}</td>
    </tr>`;
  }).join("");
}

// -------------------------------------------------------------------------
// 5) SYNC MANUAL — dipanggil dari tombol "Tarik Data dari ERPNext"
// -------------------------------------------------------------------------
function syncFromERPNext(){
  let from = document.getElementById("erp-from")?.value;
  let to   = document.getElementById("erp-to")?.value;
  let filters = {};
  if(from) filters.from_date = from;
  if(to)   filters.to_date   = to;
  fetchStockLedgerFromERPNext(filters);
}
