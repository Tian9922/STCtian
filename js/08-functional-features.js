// =========================================================================
// 08 - FUNGSIONAL: AUDIT LOG, REORDER PREDICTION, PDF EXPORT, TELEGRAM ALERT
// =========================================================================

// -------------------------------------------------------------------------
// AUDIT LOG (render di halaman Settings)
// -------------------------------------------------------------------------
function renderAuditLogTable(){
  let tbody = document.getElementById("audit-log-tbody");
  if(!tbody) return;
  let log = (window._auditLog || []).slice().reverse();
  if(log.length===0){ tbody.innerHTML = emptyStateRow(6,"📜","Belum ada aktivitas tercatat"); return; }
  tbody.innerHTML = log.map(function(e){
    let d = new Date(e.time);
    let waktu = isNaN(d) ? e.time : d.toLocaleString("id-ID");
    return "<tr><td>"+waktu+"</td><td><b>"+e.user+"</b></td><td>"+_roleLabel(e.role)+"</td>"+
      "<td>"+e.module+"</td><td>"+e.action+"</td><td style='color:#94a3b8;font-size:11px'>"+(e.detail||"")+"</td></tr>";
  }).join("");
}

// -------------------------------------------------------------------------
// PDF EXPORT — laporan cantik pakai jsPDF + autoTable
// -------------------------------------------------------------------------
function _pdfDoc(){
  if(!window.jspdf){ alert("⛔ Library PDF belum siap. Pastikan koneksi internet aktif lalu coba lagi."); return null; }
  const { jsPDF } = window.jspdf;
  return new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
}

// title: judul laporan, subtitle: sub-info (periode dll), summaryPairs: [[label,value],...]
// headers: array of column names, rows: array of array of cell strings
function generatePDFReport(title, subtitle, summaryPairs, headers, rows, filename){
  let doc = _pdfDoc();
  if(!doc) return;
  let s = window._appSettings || {};
  let companyName = s.companyName || "Inventory IC";
  let pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Letterhead
  doc.setFontSize(15); doc.setFont(undefined,"bold");
  doc.text(companyName, 40, y);
  doc.setFontSize(10); doc.setFont(undefined,"normal"); doc.setTextColor(120);
  doc.text("Laporan dibuat: "+new Date().toLocaleString("id-ID"), pageWidth-40, y, {align:"right"});
  doc.setTextColor(0);
  y += 22;
  doc.setFontSize(13); doc.setFont(undefined,"bold");
  doc.text(title, 40, y);
  y += 16;
  if(subtitle){
    doc.setFontSize(10); doc.setFont(undefined,"normal"); doc.setTextColor(90);
    doc.text(subtitle, 40, y);
    doc.setTextColor(0);
    y += 14;
  }

  // Summary cards (baris ringkasan angka penting)
  if(summaryPairs && summaryPairs.length){
    let boxW = (pageWidth-80)/summaryPairs.length;
    summaryPairs.forEach(function(p, i){
      let x = 40 + i*boxW;
      doc.setFillColor(245,247,250);
      doc.roundedRect(x, y, boxW-8, 40, 4, 4, "F");
      doc.setFontSize(8.5); doc.setTextColor(110);
      doc.text(String(p[0]), x+8, y+15);
      doc.setFontSize(12.5); doc.setTextColor(20); doc.setFont(undefined,"bold");
      doc.text(String(p[1]), x+8, y+31);
      doc.setFont(undefined,"normal");
    });
    y += 54;
  }

  doc.autoTable({
    head:[headers],
    body:rows,
    startY:y,
    styles:{ fontSize:8, cellPadding:4 },
    headStyles:{ fillColor:[15,23,42], textColor:255, fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[248,250,252] },
    margin:{ left:40, right:40 }
  });

  doc.save(filename);
  showToast("📄 PDF berhasil dibuat: "+filename, "success");
}

function exportLedgerPDF(){
  let rows = [];
  document.querySelectorAll("#tabelLedger tr").forEach(tr=>{
    let cells = Array.from(tr.children).map(td=>td.innerText.trim());
    if(cells.length>1) rows.push(cells);
  });
  if(rows.length===0){ alert("⚠️ Tidak ada data ledger untuk di-export!"); return; }
  let headers = ["No","Tanggal","Tipe","SKU","Nama Barang","Gudang","Qty Masuk","Qty Keluar","Referensi","Keterangan"].slice(0, rows[0].length);
  generatePDFReport("Laporan Stock Ledger","Seluruh histori transaksi stok",
    [["Total Transaksi", document.getElementById("led-total-trx")?document.getElementById("led-total-trx").innerText:rows.length]],
    headers, rows, "Stock_Ledger_"+new Date().toISOString().split("T")[0]+".pdf");
}

function exportAnalisisPDF(){
  let rows = [];
  document.querySelectorAll("#tabelAnalisis tr").forEach(tr=>{
    let cells = Array.from(tr.children).map(td=>td.innerText.replace(/\n/g," ").trim());
    if(cells.length>1) rows.push(cells);
  });
  if(rows.length===0){ alert("⚠️ Tidak ada data analisis untuk di-export!"); return; }
  let headers = ["No","SKU","Nama Barang","Gudang","Stok","InTransit","Konversi","Total Out","Avg/Bln","Avg 3Bln","Kategori","Ketahanan"];
  generatePDFReport("Laporan Analisa Stock","Kategori moving & ketahanan stok per SKU",
    [["Fast Moving", document.getElementById("cnt-fast")?.innerText||"-"],
     ["Medium Moving", document.getElementById("cnt-med")?.innerText||"-"],
     ["Slow Moving", document.getElementById("cnt-slow")?.innerText||"-"]],
    headers, rows, "Analisa_Stock_"+new Date().toISOString().split("T")[0]+".pdf");
}

function exportSalesPDF(){
  let rows = [];
  document.querySelectorAll("#tabelSales tr").forEach(tr=>{
    let cells = Array.from(tr.children).map(td=>td.innerText.trim());
    if(cells.length>1) rows.push(cells);
  });
  if(rows.length===0){ alert("⚠️ Tidak ada data sales untuk di-export!"); return; }
  let headHtml = document.getElementById("sa-thead");
  let headers = headHtml ? Array.from(headHtml.querySelectorAll("th")).map(th=>th.innerText.trim()) : [];
  generatePDFReport("Laporan Sales Analytics","Ringkasan penjualan & pergerakan barang keluar",
    [["Total Nilai Penjualan", document.getElementById("sa-total-nilai")?.innerText||"-"],
     ["Total Qty Keluar", document.getElementById("sa-total-qty")?.innerText||"-"],
     ["SKU Terlaris", document.getElementById("sa-top-sku")?.innerText||"-"]],
    headers, rows, "Sales_Analytics_"+new Date().toISOString().split("T")[0]+".pdf");
}

// -------------------------------------------------------------------------
// REORDER PREDICTION (otomatis, berbasis tren 90 hari)
// -------------------------------------------------------------------------
function _reorderList(targetDays, thresholdDays, wh){
  let seen = {}; let items = [];
  daftarBarang.forEach(b=>{
    let key = b.sku.toUpperCase()+"__"+(b.warehouse||"Bintaro").toUpperCase();
    if(!seen[key]){ seen[key]=true; items.push(b); }
  });
  if(wh && wh!=="All") items = items.filter(b=>(b.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase());

  let list = [];
  items.forEach(b=>{
    let warehouse = b.warehouse || "Bintaro";
    let isiKarton = Number(b.isiKarton) || 1;
    let avg90 = hitungAvgOutKarton(b.sku, warehouse, 90).avgPerHariCtn;
    if(avg90<=0) return; // tidak ada tren, tidak bisa diprediksi -> skip
    let stokAktualCtn = Number(b.totalPcs)/isiKarton;
    let stokITCtn = getIntransitStok(b.sku)/isiKarton;
    let stokDraftCtn = getDraftStok(b.sku)/isiKarton;
    let totalStokCtn = stokAktualCtn + stokITCtn + stokDraftCtn;
    let ketahananHari = totalStokCtn/avg90;
    if(ketahananHari >= thresholdDays) return; // masih aman, tidak perlu ditampilkan
    let suggestedCtn = Math.max(0, Math.ceil((targetDays*avg90) - totalStokCtn));
    let status = ketahananHari<7 ? "🔴 Kritis" : ketahananHari<15 ? "🟠 Segera" : "🟡 Perhatian";
    list.push({
      sku:b.sku, nama:b.nama, warehouse, isiKarton,
      stokAktualPcs:Number(b.totalPcs), stokAktualCtn, totalStokCtn,
      avg90, ketahananHari, suggestedCtn, status
    });
  });
  list.sort((a,b)=>a.ketahananHari-b.ketahananHari);
  return list;
}

function tampilkanReorder(){
  let targetDays = parseInt(document.getElementById("ro-target-days").value)||45;
  let thresholdDays = parseInt(document.getElementById("ro-threshold-days").value)||30;
  let wh = document.getElementById("ro-wh").value;
  let tbody = document.getElementById("tabelReorder");
  if(!window._icDataReady){ renderSkeletonRows("tabelReorder", 10, 6); return; }
  let list = _reorderList(targetDays, thresholdDays, wh);
  window._lastReorderList = list;
  if(list.length===0){
    tbody.innerHTML = emptyStateRow(10,"✅","Semua stok aman","Tidak ada barang dengan ketahanan di bawah "+thresholdDays+" hari.");
    return;
  }
  tbody.innerHTML = list.map(function(r){
    let whEnc = encodeURIComponent(r.warehouse);
    return "<tr>"+
      "<td></td>"+
      "<td style='font-size:10px'>"+r.sku+"</td>"+
      "<td>"+r.nama+"</td>"+
      "<td><span class='badge badge-gudang'>"+r.warehouse+"</span></td>"+
      "<td style='text-align:right'>"+r.totalStokCtn.toFixed(1)+" ctn</td>"+
      "<td style='text-align:right'>"+r.avg90.toFixed(2)+" ctn</td>"+
      "<td>"+r.ketahananHari.toFixed(1)+" hari</td>"+
      "<td>"+r.status+"</td>"+
      "<td style='text-align:right;font-weight:700;color:#2b6cb0'>"+r.suggestedCtn+" ctn</td>"+
      "<td style='text-align:center'><button class='btn btn-blue' style='padding:3px 8px;font-size:10px' "+
      "onclick=\"reorderBuatPlanningPO('"+r.sku.replace(/'/g,"\\'")+"','"+r.nama.replace(/'/g,"\\'")+"',"+r.stokAktualPcs+","+r.isiKarton+","+r.avg90+",'"+whEnc+"',"+r.suggestedCtn+")\">📋 Buat PO</button></td>"+
      "</tr>";
  }).join("").replace(/<td><\/td>/, function(){ return ""; });
  // Nomor urut baris
  Array.from(tbody.querySelectorAll("tr")).forEach((tr,i)=>{ if(tr.children[0]) tr.children[0].innerText = i+1; });
}

function reorderBuatPlanningPO(sku, nama, stokPcs, isiKarton, avgPerHariCtn, whEncoded, suggestedCtn){
  if(!canInput()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin/Staff Gudang."); return; }
  // Konversi avg dari CTN/hari ke PCS/hari supaya cocok dengan panel Planning PO di tab Analisis
  let avgPerHariPcs = avgPerHariCtn * (isiKarton||1);
  switchTab("analisis");
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    bukaAnPOPanel(sku, nama, stokPcs, isiKarton, avgPerHariPcs, whEncoded);
    document.getElementById("an-po-qty-ctn").value = suggestedCtn;
    anHitungPO();
    showToast("📋 Panel Planning PO dibuka dengan rekomendasi "+suggestedCtn+" ctn.", "info");
  }));
}

function exportReorderPDF(){
  let list = window._lastReorderList || [];
  if(list.length===0){ alert("⚠️ Tidak ada rekomendasi reorder untuk di-export!"); return; }
  let rows = list.map((r,i)=>[i+1, r.sku, r.nama, r.warehouse, r.totalStokCtn.toFixed(1)+" ctn", r.avg90.toFixed(2)+" ctn/hr", r.ketahananHari.toFixed(1)+" hr", r.status.replace(/[^\w\s]/g,"").trim(), r.suggestedCtn+" ctn"]);
  generatePDFReport("Rekomendasi Reorder Otomatis","Barang dengan ketahanan stok rendah, berdasarkan tren Stock Out 90 hari",
    [["Total Item Perlu PO", list.length],
     ["Kritis (<7 hari)", list.filter(r=>r.ketahananHari<7).length],
     ["Segera (<15 hari)", list.filter(r=>r.ketahananHari>=7&&r.ketahananHari<15).length]],
    ["No","SKU","Nama Barang","Gudang","Stok Saat Ini","Avg Out/Hari","Ketahanan","Status","Rekomendasi PO"],
    rows, "Rekomendasi_Reorder_"+new Date().toISOString().split("T")[0]+".pdf");
}

// -------------------------------------------------------------------------
// TELEGRAM — Notifikasi Stok Kritis
// -------------------------------------------------------------------------
function toggleTelegramEnabled(){
  let btn = document.getElementById("tg-enable-switch");
  let on = btn.classList.toggle("on");
  btn.style.background = on ? "" : "#cbd5e0";
  window._tgEnabledPending = on;
}

function saveTelegramConfig(){
  if(!canManageSettings()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  if(!window._db){ alert("⚠️ Firebase belum siap."); return; }
  let token = document.getElementById("tg-bot-token").value.trim();
  let chatId = document.getElementById("tg-chat-id").value.trim();
  let threshold = parseInt(document.getElementById("tg-threshold-days").value)||7;
  let enabled = document.getElementById("tg-enable-switch").classList.contains("on");
  window._db.ref("appSettings").update({
    telegramBotToken: token, telegramChatId: chatId, telegramThresholdDays: threshold, telegramEnabled: enabled
  }).then(()=>{ alert("✅ Konfigurasi Telegram disimpan!"); }).catch(e=>{ alert("⛔ Gagal menyimpan: "+e.message); });
}

function _criticalStockForTelegram(thresholdDays){
  return _reorderList(45, thresholdDays, "All");
}

function _buildTelegramMessage(list){
  let s = window._appSettings || {};
  let lines = [];
  lines.push("🔔 *Peringatan Stok Kritis — "+(s.companyName||"Inventory IC")+"*");
  lines.push("📅 "+new Date().toLocaleString("id-ID"));
  lines.push("");
  lines.push("Ditemukan *"+list.length+" barang* dengan stok menipis:");
  lines.push("");
  list.slice(0,15).forEach(function(r){
    lines.push("• *"+r.nama+"* ("+r.sku+") — "+r.warehouse);
    lines.push("  Sisa "+r.totalStokCtn.toFixed(1)+" ctn, tahan ~"+r.ketahananHari.toFixed(1)+" hari. Saran PO: "+r.suggestedCtn+" ctn");
  });
  if(list.length>15) lines.push("\n...dan "+(list.length-15)+" barang lainnya. Cek dashboard untuk detail lengkap.");
  return lines.join("\n");
}

function _sendTelegramRaw(token, chatId, text){
  return fetch("https://api.telegram.org/bot"+token+"/sendMessage", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
  }).then(r=>r.json());
}

function testTelegramAlert(){
  let token = document.getElementById("tg-bot-token").value.trim();
  let chatId = document.getElementById("tg-chat-id").value.trim();
  let threshold = parseInt(document.getElementById("tg-threshold-days").value)||7;
  if(!token || !chatId){ alert("⚠️ Isi Bot Token & Chat ID terlebih dahulu!"); return; }
  let list = _criticalStockForTelegram(threshold);
  let text = list.length>0 ? _buildTelegramMessage(list) : "✅ Test notifikasi dari "+(window._appSettings?.companyName||"Inventory IC")+" — saat ini tidak ada stok kritis (ketahanan < "+threshold+" hari).";
  _sendTelegramRaw(token, chatId, text).then(res=>{
    if(res.ok){ alert("✅ Notifikasi test berhasil dikirim ke Telegram!"); }
    else { alert("⛔ Gagal kirim: "+(res.description||"periksa Bot Token & Chat ID")); }
  }).catch(e=>{ alert("⛔ Gagal kirim notifikasi: "+e.message+"\n(Cek koneksi internet / Bot Token / Chat ID)"); });
}

// Dipanggil otomatis tiap kali appSettings ter-load (biasanya setelah login).
// Throttle: maksimal 1x per 12 jam supaya tidak spam berulang tiap kali dashboard dibuka.
function maybeAutoSendTelegramAlert(){
  let s = window._appSettings || {};
  if(!s.telegramEnabled || !s.telegramBotToken || !s.telegramChatId) return;
  if(!currentRole || currentRole==="viewer") return; // cukup dicek oleh admin/staff yang login
  if(!window._icDataReady) return; // tunggu data barang & log lengkap dulu
  let last = s.lastTelegramAlertTime ? new Date(s.lastTelegramAlertTime) : null;
  let hoursSince = last ? (Date.now()-last.getTime())/36e5 : 999;
  if(hoursSince < 12) return;
  let threshold = s.telegramThresholdDays || 7;
  let list = _criticalStockForTelegram(threshold);
  if(list.length===0) return;
  let text = _buildTelegramMessage(list);
  _sendTelegramRaw(s.telegramBotToken, s.telegramChatId, text).then(res=>{
    if(res.ok){
      window._db.ref("appSettings/lastTelegramAlertTime").set(new Date().toISOString());
      showToast("🔔 Notifikasi stok kritis otomatis terkirim ke Telegram ("+list.length+" item).", "info", 6000);
    }
  }).catch(()=>{});
}
