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
  if(log.length===0){ tbody.innerHTML = emptyStateRow(6,"📜",t("belum_ada_aktivitas")); return; }
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
  if(!window.jspdf){ alert(t("pdf_library_belum_siap")); return null; }
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
  showToast(t("pdf_berhasil_dibuat")+filename, "success");
}

function exportLedgerPDF(){
  let rows = [];
  document.querySelectorAll("#tabelLedger tr").forEach(tr=>{
    let cells = Array.from(tr.children).map(td=>td.innerText.trim());
    if(cells.length>1) rows.push(cells);
  });
  if(rows.length===0){ alert(t("no_data_ledger_export")); return; }
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
  if(rows.length===0){ alert(t("no_data_analisis_export")); return; }
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
  if(rows.length===0){ alert(t("no_data_sales_export")); return; }
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
    let status = ketahananHari<7 ? t("status_kritis_reorder") : ketahananHari<15 ? t("status_segera") : t("status_perhatian");
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
    tbody.innerHTML = emptyStateRow(10,"✅",t("semua_stok_aman"),t("hint_reorder_aman").replace("{n}",thresholdDays));
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
      "<td>"+r.ketahananHari.toFixed(1)+" "+t("dash_hari")+"</td>"+
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
  if(!canInput()){ alert(t("access_denied_staff")); return; }
  // Konversi avg dari CTN/hari ke PCS/hari supaya cocok dengan panel Planning PO di tab Analisis
  let avgPerHariPcs = avgPerHariCtn * (isiKarton||1);
  switchTab("analisis");
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    bukaAnPOPanel(sku, nama, stokPcs, isiKarton, avgPerHariPcs, whEncoded);
    document.getElementById("an-po-qty-ctn").value = suggestedCtn;
    anHitungPO();
    showToast(t("panel_po_dibuka").replace("{n}", suggestedCtn), "info");
  }));
}

function exportReorderPDF(){
  let list = window._lastReorderList || [];
  if(list.length===0){ alert(t("no_data_reorder_export")); return; }
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
  if(!canManageSettings()){ alert(t("access_denied_admin")); return; }
  if(!window._db){ alert(t("firebase_belum_siap")); return; }
  let token = document.getElementById("tg-bot-token").value.trim();
  let chatId = document.getElementById("tg-chat-id").value.trim();
  let threshold = parseInt(document.getElementById("tg-threshold-days").value)||7;
  let enabled = document.getElementById("tg-enable-switch").classList.contains("on");
  window._db.ref("appSettings").update({
    telegramBotToken: token, telegramChatId: chatId, telegramThresholdDays: threshold, telegramEnabled: enabled
  }).then(()=>{ alert(t("telegram_config_disimpan")); }).catch(e=>{ alert(t("gagal_menyimpan")+e.message); });
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

// -------------------------------------------------------------------------
// KARTU GAMBAR (CANVAS) — dipakai untuk kirim notifikasi Telegram sebagai foto
// -------------------------------------------------------------------------
function _severityColor(hari){
  if(hari<7) return "#dc2626";
  if(hari<15) return "#ea580c";
  return "#ca8a04";
}

function _buildTelegramCardImage(list){
  let s = window._appSettings || {};
  let companyName = s.companyName || "Inventory IC";
  let SCALE = 2;
  let W = 720;
  let headerH = 108;
  let rowH = 66;
  let maxRows = 10;
  let items = list.slice(0, maxRows);
  let showMore = list.length > maxRows;
  let footerH = showMore ? 40 : 0;
  let brandH = 40;
  let H = headerH + items.length*rowH + footerH + brandH + 24;

  let canvas = document.createElement("canvas");
  canvas.width = W*SCALE; canvas.height = H*SCALE;
  let ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0,0,W,H);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0,0,W,headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px -apple-system, Segoe UI, Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("🔔 "+t("tg_card_title"), 28, 24);
  ctx.font = "600 13px -apple-system, Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(companyName+" · "+new Date().toLocaleString("id-ID"), 28, 56);
  ctx.font = "500 13px -apple-system, Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#93c5fd";
  ctx.fillText(t("tg_card_subtitle").replace("{n}", list.length), 28, 78);

  // Rows
  let y = headerH;
  items.forEach(function(r, i){
    ctx.fillStyle = i%2===0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(0, y, W, rowH);
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath(); ctx.moveTo(0, y+rowH); ctx.lineTo(W, y+rowH); ctx.stroke();

    // Nama barang
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 15px -apple-system, Segoe UI, Arial, sans-serif";
    let nama = r.nama.length>34 ? r.nama.slice(0,33)+"…" : r.nama;
    ctx.fillText(nama, 24, y+12);
    // SKU + warehouse
    ctx.fillStyle = "#64748b";
    ctx.font = "500 11.5px -apple-system, Segoe UI, Arial, sans-serif";
    ctx.fillText(r.sku+" — "+r.warehouse, 24, y+34);

    // Kanan: sisa stok + ketahanan
    ctx.textAlign = "right";
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 14px -apple-system, Segoe UI, Arial, sans-serif";
    ctx.fillText(t("tg_sisa")+" "+r.totalStokCtn.toFixed(1)+" ctn", W-24, y+10);
    ctx.fillStyle = _severityColor(r.ketahananHari);
    ctx.font = "700 13px -apple-system, Segoe UI, Arial, sans-serif";
    ctx.fillText("~"+r.ketahananHari.toFixed(1)+" "+t("dash_hari"), W-24, y+28);
    ctx.fillStyle = "#2563eb";
    ctx.font = "600 11.5px -apple-system, Segoe UI, Arial, sans-serif";
    ctx.fillText(t("tg_saran_po")+": "+r.suggestedCtn+" ctn", W-24, y+46);
    ctx.textAlign = "left";

    y += rowH;
  });

  if(showMore){
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, y, W, footerH);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px -apple-system, Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("tg_card_more").replace("{n}", list.length-maxRows), W/2, y+13);
    ctx.textAlign = "left";
    y += footerH;
  }

  // Footer brand
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, y, W, brandH);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 11px -apple-system, Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(t("tg_card_footer").replace("{company}", companyName), W/2, y+13);
  ctx.textAlign = "left";

  return new Promise(function(resolve){
    canvas.toBlob(function(blob){ resolve(blob); }, "image/png");
  });
}

function _sendTelegramPhoto(token, chatId, blob, caption){
  let formData = new FormData();
  formData.append("chat_id", chatId);
  if(caption) formData.append("caption", caption);
  formData.append("photo", blob, "stok-kritis.png");
  return fetch("https://api.telegram.org/bot"+token+"/sendPhoto", {
    method: "POST",
    body: formData
  }).then(r=>r.json());
}

function testTelegramAlert(){
  let token = document.getElementById("tg-bot-token").value.trim();
  let chatId = document.getElementById("tg-chat-id").value.trim();
  let threshold = parseInt(document.getElementById("tg-threshold-days").value)||7;
  if(!token || !chatId){ alert(t("isi_bot_token")); return; }
  let list = _criticalStockForTelegram(threshold);
  if(list.length===0){
    let text = "✅ "+t("tg_card_none").replace("{n}", threshold);
    _sendTelegramRaw(token, chatId, text).then(res=>{
      if(res.ok){ alert(t("notif_test_berhasil")); }
      else { alert(t("gagal_kirim")+(res.description||t("periksa_bot_token"))); }
    }).catch(e=>{ alert(t("gagal_kirim_notif")+e.message+t("cek_koneksi_bot")); });
    return;
  }
  _buildTelegramCardImage(list).then(function(blob){
    let s = window._appSettings || {};
    let caption = "🔔 "+t("tg_card_title")+" — "+(s.companyName||"Inventory IC");
    return _sendTelegramPhoto(token, chatId, blob, caption);
  }).then(res=>{
    if(res.ok){ alert(t("notif_test_berhasil")); }
    else { alert(t("gagal_kirim")+(res.description||t("periksa_bot_token"))); }
  }).catch(e=>{ alert(t("gagal_kirim_notif")+e.message+t("cek_koneksi_bot")); });
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
  _buildTelegramCardImage(list).then(function(blob){
    let caption = "🔔 "+t("tg_card_title")+" — "+(s.companyName||"Inventory IC");
    return _sendTelegramPhoto(s.telegramBotToken, s.telegramChatId, blob, caption);
  }).then(res=>{
    if(res.ok){
      window._db.ref("appSettings/lastTelegramAlertTime").set(new Date().toISOString());
      showToast(t("notif_terkirim_telegram").replace("{n}", list.length), "info", 6000);
    }
  }).catch(()=>{});
}
