// =========================================================================
// SALES ANALYTICS
// =========================================================================
// ==================== SALES ANALYTICS - VERSION WITH CARTON ====================
function tampilkanSales() {
    let keyword = document.getElementById("sa-search").value.toLowerCase();
    let from = document.getElementById("sa-from").value;
    let to = document.getElementById("sa-to").value;
    let tipeF = document.getElementById("sa-tipe").value;
    let viewMode = document.getElementById("sa-view").value;

    // Ambil data master untuk konversi PCS -> KARTON
    let semuaMaster = dapatkanSemuaMasterData();

    let hasil = stockOutLog.filter(r => {
        let matchK = r.sku.toLowerCase().includes(keyword) || r.nama.toLowerCase().includes(keyword);
        let matchW = matchWarehouseMulti("sa-wh", r.warehouse);
        let matchF = !from || r.tanggal >= from;
        let matchT = !to || r.tanggal <= to;
        let matchTipe = tipeF === "All" || (r.tipe || "Stock Out") === tipeF;
        return matchK && matchW && matchF && matchT && matchTipe;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    // Hitung total dalam PCS dan KARTON
    let totalQtyPcs = hasil.reduce((s, r) => s + r.qty, 0);
    let totalNilaiAll = hasil.reduce((s, r) => s + (r.qty * r.harga), 0);
    
    // Konversi total Qty ke KARTON (rata-rata berdasarkan isi karton masing-masing SKU)
    let totalQtyCtn = 0;
    hasil.forEach(r => {
        let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
        let isiKarton = master ? (master.qtyCtn || 1) : 1;
        totalQtyCtn += r.qty / isiKarton;
    });

    document.getElementById("sa-total-item").innerText = hasil.length;
    document.getElementById("sa-total-qty").innerHTML = totalQtyCtn.toFixed(1) + " ctn <span style='font-size:10px;color:#718096'>(" + totalQtyPcs.toLocaleString("id-ID") + " pcs)</span>";
    document.getElementById("sa-total-nilai").innerText = rpFormat(totalNilaiAll);

    // SKU Terlaris (dalam KARTON)
    let skuMapCtn = {};
    hasil.forEach(r => {
        let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
        let isiKarton = master ? (master.qtyCtn || 1) : 1;
        let qtyCtn = r.qty / isiKarton;
        skuMapCtn[r.sku] = (skuMapCtn[r.sku] || 0) + qtyCtn;
    });
    let topSku = Object.entries(skuMapCtn).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("sa-top-sku").innerHTML = topSku ? topSku[0] + " (" + topSku[1].toFixed(1) + " ctn)" : "-";

    // Hitung rata-rata per hari (dalam KARTON)
    if (hasil.length > 0) {
        let dates = hasil.map(r => r.tanggal).sort();
        let d1 = new Date(dates[dates.length - 1]);
        let d2 = new Date(dates[0]);
        let diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 1;
        let avgDayCtn = totalQtyCtn / diffDays;
        document.getElementById("sa-avg-day").innerHTML = avgDayCtn.toFixed(1) + " ctn/hr <span style='font-size:10px;color:#718096'>(" + (totalQtyPcs / diffDays).toFixed(1) + " pcs/hr)</span>";
        document.getElementById("sa-avg-month").innerHTML = (avgDayCtn * 30).toFixed(1) + " ctn <span style='font-size:10px;color:#718096'>(" + (totalQtyPcs / diffDays * 30).toFixed(0) + " pcs)</span>";
        document.getElementById("sa-avg-3month").innerHTML = (avgDayCtn * 90).toFixed(1) + " ctn <span style='font-size:10px;color:#718096'>(" + (totalQtyPcs / diffDays * 90).toFixed(0) + " pcs)</span>";
    } else {
        ["sa-avg-day", "sa-avg-month", "sa-avg-3month"].forEach(id => document.getElementById(id).innerHTML = "0 ctn");
    }

    let tbody = document.getElementById("tabelSales");
    let thead = document.getElementById("sa-thead");
    let rows;

    if (viewMode === "rekap") {
        thead.innerHTML = "<tr><th>No</th><th>"+t("th_sku")+"</th><th>"+t("th_nama")+"</th><th>"+t("th_gudang")+"</th><th>"+t("sa_th_total_transaksi")+"</th><th>"+t("sa_th_total_qty_ctn")+"</th><th>"+t("sa_th_total_qty_pcs")+"</th><th>"+t("th_konversi")+"</th><th>"+t("th_total_nilai")+"</th><th>"+t("sa_th_tgl_pertama")+"</th><th>"+t("sa_th_tgl_terakhir")+"</th></tr>";
        
        let grouped = {};
        hasil.forEach(r => {
            let key = r.sku.toUpperCase() + "__" + (r.warehouse || "Bintaro");
            let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
            let isiKarton = master ? (master.qtyCtn || 1) : 1;
            let qtyCtn = r.qty / isiKarton;
            if (!grouped[key]) {
                grouped[key] = {
                    sku: r.sku,
                    nama: r.nama,
                    warehouse: r.warehouse || "Bintaro",
                    isiKarton: isiKarton,
                    transaksi: 0,
                    qtyPcs: 0,
                    qtyCtn: 0,
                    nilai: 0,
                    tglArr: []
                };
            }
            grouped[key].transaksi++;
            grouped[key].qtyPcs += r.qty;
            grouped[key].qtyCtn += qtyCtn;
            grouped[key].nilai += r.qty * r.harga;
            grouped[key].tglArr.push(r.tanggal);
        });
        
        let grpRows = Object.values(grouped).sort((a, b) => b.qtyCtn - a.qtyCtn);
        if (grpRows.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' class='kosong'>"+t("tidak_ada_data_penjualan")+"</td></tr>";
            return;
        }
        
        rows = grpRows.map(function (g, i) {
            let tglArr = g.tglArr.sort();
            let uom = hitungUOM(g.qtyPcs, g.isiKarton);
            return "<tr>" +
                "<td>" + (i + 1) + "</td>" +
                "<td style='font-size:10px' title='" + g.sku + "'>" + g.sku + "</td>" +
                "<td title='" + g.nama + "'>" + g.nama + "</td>" +
                "<td><span class='badge badge-gudang'>" + g.warehouse + "</span></td>" +
                "<td style='text-align:center'>" + g.transaksi + "x</td>" +
                "<td><span class='badge badge-out'><strong>" + g.qtyCtn.toFixed(1) + " ctn</strong></span></td>" +
                "<td><span style='font-size:10px;color:#718096'>" + g.qtyPcs + " pcs</span></td>" +
                "<td><strong>" + uom + "</strong></td>" +
                "<td><strong>" + rpFormat(g.nilai) + "</strong></td>" +
                "<td style='font-size:10px'>" + tglArr[0] + "</td>" +
                "<td style='font-size:10px'>" + tglArr[tglArr.length - 1] + "</td>" +
                "</tr>";
        });
    } else {
        thead.innerHTML = "<tr><th>No</th><th>"+t("th_tanggal")+"</th><th>Tipe</th><th>"+t("th_sku")+"</th><th>"+t("th_nama")+"</th><th>"+t("th_gudang")+"</th><th>"+t("sa_th_qty_ctn")+"</th><th>"+t("sa_th_qty_pcs")+"</th><th>"+t("th_konversi")+"</th><th>"+t("sa_th_harga_satuan")+"</th><th>"+t("th_total_nilai")+"</th><th>"+t("th_keterangan")+"</th></tr>";
        
        if (hasil.length === 0) {
            tbody.innerHTML = "<tr><td colspan='12' class='kosong'>"+t("tidak_ada_data_penjualan")+"</td></tr>";
            return;
        }
        
        rows = hasil.map(function (r, i) {
            let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
            let isiKarton = master ? (master.qtyCtn || 1) : 1;
            let qtyCtn = r.qty / isiKarton;
            let uom = hitungUOM(r.qty, isiKarton);
            let nilai = r.qty * r.harga;
            let tipe = r.tipe || "Stock Out";
            let tipeBadge = tipe === "Expired" ? "<span class='badge' style='background:#fef3c7;color:#92400e'>⚠️ "+t("badge_expired")+"</span>" :
                            tipe === "Damage" ? "<span class='badge' style='background:#f3e8ff;color:#6b21a8'>💥 "+t("badge_damage")+"</span>" :
                            "<span class='badge badge-out'>📤 "+t("badge_stockout")+"</span>";
            return "<tr>" +
                "<td>" + (i + 1) + "</td>" +
                "<td>" + r.tanggal + "</td>" +
                "<td>" + tipeBadge + "</td>" +
                "<td style='font-size:10px' title='" + r.sku + "'>" + r.sku + "</td>" +
                "<td title='" + r.nama + "'>" + r.nama + "</td>" +
                "<td><span class='badge badge-gudang'>" + (r.warehouse || "Bintaro") + "</span></td>" +
                "<td><span class='badge badge-out'><strong>" + qtyCtn.toFixed(2) + " ctn</strong></span></td>" +
                "<td><span style='font-size:10px;color:#718096'>" + r.qty + " pcs</span></td>" +
                "<td><strong>" + uom + "</strong></td>" +
                "<td>" + rpFormat(r.harga) + "</td>" +
                "<td><strong>" + rpFormat(nilai) + "</strong></td>" +
                "<td title=\"" + (r.ref || "").replace(/"/g, '&quot;') + "\">" + (r.ref || "-") + "</td>" +
                "</tr>";
        });
    }
    tbody.innerHTML = "";
    tbody.appendChild(buildRows(rows));
}

// ==================== EXPORT SALES ANALYTICS (KARTON VERSION) ====================
function exportSales() {
    let keyword = document.getElementById("sa-search").value.toLowerCase();
    let from = document.getElementById("sa-from").value;
    let to = document.getElementById("sa-to").value;
    let tipeF = document.getElementById("sa-tipe").value;
    let viewMode = document.getElementById("sa-view").value;
    
    let semuaMaster = dapatkanSemuaMasterData();
    
    let hasil = stockOutLog.filter(r => {
        let matchK = r.sku.toLowerCase().includes(keyword) || r.nama.toLowerCase().includes(keyword);
        let matchW = matchWarehouseMulti("sa-wh", r.warehouse);
        let matchF = !from || r.tanggal >= from;
        let matchT = !to || r.tanggal <= to;
        let matchTipe = tipeF === "All" || (r.tipe || "Stock Out") === tipeF;
        return matchK && matchW && matchF && matchT && matchTipe;
    }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    
    let rows;
    if (viewMode === "rekap") {
        let grouped = {};
        hasil.forEach(r => {
            let key = r.sku.toUpperCase() + "__" + (r.warehouse || "Bintaro");
            let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
            let isiKarton = master ? (master.qtyCtn || 1) : 1;
            let qtyCtn = r.qty / isiKarton;
            if (!grouped[key]) {
                grouped[key] = {
                    sku: r.sku,
                    nama: r.nama,
                    warehouse: r.warehouse || "Bintaro",
                    isiKarton: isiKarton,
                    transaksi: 0,
                    qtyPcs: 0,
                    qtyCtn: 0,
                    nilai: 0
                };
            }
            grouped[key].transaksi++;
            grouped[key].qtyPcs += r.qty;
            grouped[key].qtyCtn += qtyCtn;
            grouped[key].nilai += r.qty * r.harga;
        });
        rows = [["SKU", "Nama Barang", "Gudang", "Total Transaksi", "Total Qty (Karton)", "Total Qty (Pcs)", "Total Nilai (Rp)"]];
        Object.values(grouped).sort((a, b) => b.qtyCtn - a.qtyCtn).forEach(g => {
            rows.push([g.sku, g.nama, g.warehouse, g.transaksi, g.qtyCtn.toFixed(1), g.qtyPcs, g.nilai]);
        });
    } else {
        rows = [["Tanggal", "Tipe", "SKU", "Nama Barang", "Gudang", "Qty Keluar (Karton)", "Qty Keluar (Pcs)", "Harga Satuan", "Total Nilai", "Keterangan"]];
        hasil.forEach(r => {
            let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
            let isiKarton = master ? (master.qtyCtn || 1) : 1;
            let qtyCtn = r.qty / isiKarton;
            rows.push([r.tanggal, r.tipe || "Stock Out", r.sku, r.nama, r.warehouse || "Bintaro", qtyCtn.toFixed(2), r.qty, r.harga, r.qty * r.harga, r.ref || "-"]);
        });
    }
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sales Analytics (Karton)");
    XLSX.writeFile(wb, "Sales_Analytics_Karton.xlsx");
}

// Close dropdowns when clicking outside
document.addEventListener("click",function(e){
  document.querySelectorAll(".sku-dd").forEach(dd=>{
    if(!dd.parentElement.contains(e.target)) dd.style.display="none";
  });
});

// =========================================================================
// ⚡ PERFORMANCE OPTIMIZATIONS
// =========================================================================

// --- 1. DEBOUNCE UTILITY ---
const _debounceTimers = {};
function debounce(key, fn, delay){
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, delay);
}

// --- 2. THROTTLED FIREBASE SAVE ---
const _fbSaveTimers = {};
const _origFbSave = fbSave;
window.fbSave = function(key, data){
  clearTimeout(_fbSaveTimers[key]);
  _fbSaveTimers[key] = setTimeout(()=>{ _origFbSave(key, data); }, 800);
};

// --- 3. PAGINATION STATE ---
const PAGE_SIZE = 50;
const _pageState = { monitor:1, in:1, out:1, tr:1, led:1, an:1, sa:1, it:1 };

// Reset halaman ke 1 saat filter berubah
const _origMarkDirty = markDirty;
window.markDirty = function(...tabs){
  tabs.forEach(t=>{
    if(t==="monitor") _pageState.monitor=1;
    else if(t==="in") _pageState.in=1;
    else if(t==="out") _pageState.out=1;
    else if(t==="transfer") _pageState.tr=1;
    else if(t==="ledger") _pageState.led=1;
    else if(t==="analisis") _pageState.an=1;
    else if(t==="sales") _pageState.sa=1;
    else if(t==="intransit") _pageState.it=1;
  });
  _origMarkDirty(...tabs);
};

// --- 4. PAGINATION RENDERER ---
function renderPagination(containerId, total, page, pageSize, onPageChange){
  let old = document.getElementById(containerId);
  if(old) old.remove();
  if(total <= pageSize) return;
  let totalPages = Math.ceil(total/pageSize);
  let div = document.createElement("div");
  div.id = containerId;
  div.style.cssText = "display:flex;gap:4px;align-items:center;justify-content:flex-end;padding:6px 4px;flex-wrap:wrap;font-size:12px";
  let info = document.createElement("span");
  info.style.cssText = "color:#718096;margin-right:4px";
  info.textContent = "Hal "+page+" / "+totalPages+" ("+total+" data)";
  div.appendChild(info);
  let makeBtn = (label, pg, disabled, active)=>{
    let b = document.createElement("button");
    b.textContent = label;
    b.disabled = disabled;
    b.style.cssText = "padding:3px 8px;font-size:11px;border-radius:4px;border:1px solid #cbd5e0;cursor:pointer;background:"+(active?"#2c3e50":"white")+";color:"+(active?"white":"#4a5568");
    b.onclick = ()=>{ onPageChange(pg); };
    return b;
  };
  div.appendChild(makeBtn("«", 1, page===1, false));
  div.appendChild(makeBtn("‹", page-1, page===1, false));
  let start = Math.max(1, page-2), end = Math.min(totalPages, page+2);
  for(let p=start; p<=end; p++) div.appendChild(makeBtn(p, p, false, p===page));
  div.appendChild(makeBtn("›", page+1, page===totalPages, false));
  div.appendChild(makeBtn("»", totalPages, page===totalPages, false));
  return div;
}

function attachPagination(tbodyEl, containerId, total, page, pageSize, onPageChange){
  let tableContainer = tbodyEl.closest(".table-container");
  if(!tableContainer) return;
  let pgDiv = renderPagination(containerId, total, page, pageSize, onPageChange);
  if(pgDiv){
    let existing = document.getElementById(containerId);
    if(existing) existing.remove();
    tableContainer.parentElement.insertBefore(pgDiv, tableContainer.nextSibling);
  } else {
    let existing = document.getElementById(containerId);
    if(existing) existing.remove();
  }
}

// --- 5. FAST DOM BUILDER (DocumentFragment) ---
function buildRows(rowsHTML){
  let t = document.createElement("tbody");
  t.innerHTML = rowsHTML.join("");
  let frag = document.createDocumentFragment();
  while(t.firstChild) frag.appendChild(t.firstChild);
  return frag;
}

// --- 6. OVERRIDE tampilkanTabel (Monitor Stok) ---
window.tampilkanTabel = function(){
  let tabel = document.getElementById("tabelBarang");
  let keyword = document.getElementById("search").value.toLowerCase();
  let selWH = document.getElementById("filterWarehouse").value;
  let tglSnapshot = document.getElementById("stokTanggal") ? document.getElementById("stokTanggal").value : "";
  let isSnapshot = !!tglSnapshot;
  let infoBox = document.getElementById("monitorSnapshotInfo");
  let btnReset = document.getElementById("btn-reset-tanggal-monitor");
  let btnHapusSemua = document.getElementById("btn-hapus-semua-monitor");

  if(isSnapshot){
    if(infoBox){ infoBox.style.display="block"; infoBox.innerText = t("info_snapshot_mode").replace("{tgl}",tglSnapshot); }
    if(btnReset) btnReset.style.display="inline-block";
    if(btnHapusSemua) btnHapusSemua.style.display="none";
    document.getElementById("assetTitle").innerText = (selWH==="All" ? t("asset_title_snapshot_all") : t("asset_title_snapshot_wh").replace("{wh}", selWH)).replace("{tgl}", tglSnapshot);
  } else {
    if(infoBox) infoBox.style.display="none";
    if(btnReset) btnReset.style.display="none";
    if(btnHapusSemua) btnHapusSemua.style.display="inline-block";
    document.getElementById("assetTitle").innerText = selWH==="All" ? t('asset_title_all') : t('asset_title_wh').replace('{wh}', selWH);
  }

  let sumberData = isSnapshot ? getStockSnapshot(tglSnapshot) : daftarBarang;
  let hasil = sumberData.filter(b=>{
    let wh = b.warehouse||"Bintaro";
    return (selWH==="All"||wh.toUpperCase()===selWH.toUpperCase()) &&
           ((b.nama||"").toLowerCase().includes(keyword)||(b.sku||"").toLowerCase().includes(keyword));
  });
  let total = 0, totalPcsAll = 0, totalCtnAll = 0;
  hasil.forEach(b=>{
    let pcsB = Number(b.totalPcs)||0;
    let isiB = Number(b.isiKarton)||1;
    total += pcsB*Number(b.harga);
    totalPcsAll += pcsB;
    totalCtnAll += pcsB/isiB;
  });
  document.getElementById("assetValue").innerText = rpFormat(total);
  let tfoot = document.getElementById("tabelBarangFoot");
  if(hasil.length===0){
    tabel.innerHTML="<tr><td colspan='10' class='kosong'>"+t('tidak_ada_data')+"</td></tr>";
    if(tfoot) tfoot.innerHTML = "";
    attachPagination(tabel,"pg-monitor",0,1,PAGE_SIZE,()=>{});
    return;
  }
  if(tfoot){
    let labelWH = selWH==="All" ? t('monitor_semua_gudang') : t('monitor_gudang').replace('{wh}', selWH);
    tfoot.innerHTML = "<tr style='font-weight:700'>"
      + "<td colspan='5' style='text-align:right;padding:8px'>"+t('monitor_total_keseluruhan').replace('{n}', hasil.length).replace('{wh}', labelWH)+"</td>"
      + "<td>"+totalPcsAll.toLocaleString('id-ID')+" pcs</td>"
      + "<td>"+totalCtnAll.toFixed(1)+" ctn</td>"
      + "<td></td>"
      + "<td>"+rpFormat(total)+"</td>"
      + "<td></td>"
      + "</tr>";
  }
  let page = _pageState.monitor;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(b,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let idx = isSnapshot ? -1 : daftarBarang.indexOf(b);
    let pcs = Number(b.totalPcs);
    let uom = hitungUOM(pcs,Number(b.isiKarton));
    let nilaiB = pcs*Number(b.harga);
    let isNeg = pcs<0;
    let stokCell = isNeg
      ? "<span style='color:#c53030;font-weight:700;background:#fff5f5;padding:2px 6px;border-radius:4px;border:1px solid #fc8181'>⚠️ "+pcs+" pcs (selisih)</span>"
      : pcs+" pcs";
    let aksiCell = isSnapshot
      ? "<span style='color:#a0aec0;font-size:10px'>📅 -</span>"
      : (isAdmin()?"<button class='btn-action btn-edit' onclick='editBarang("+idx+")'>"+t("btn_edit")+"</button> <button class='btn-action btn-hapus' onclick='hapusBarang("+idx+")'>"+t("btn_hapus")+"</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>");
    return "<tr style='"+(isNeg?"background:#fff5f5":"")+"'><td>"+(i+1)+"</td><td title='"+b.sku+"'>"+b.sku+"</td><td title='"+b.nama+"'>"+b.nama+"</td><td title='"+b.kategori+"'>"+b.kategori+"</td><td><span class='badge badge-gudang'>"+(b.warehouse||"Bintaro")+"</span></td><td>"+stokCell+"</td><td><strong>"+uom+"</strong></td><td>"+rpFormat(b.harga)+"</td><td><strong>"+rpFormat(nilaiB)+"</strong></td><td style='text-align:center'>"+aksiCell+"</td></tr>";
  });
  tabel.innerHTML = "";
  tabel.appendChild(buildRows(rows));
  attachPagination(tabel,"pg-monitor",hasil.length,page,PAGE_SIZE,function(pg){ _pageState.monitor=pg; window.tampilkanTabel(); });
};

// --- 7. OVERRIDE tampilkanStockIn ---
window.tampilkanStockIn = function(){
  let tbody = document.getElementById("tabelStockIn");
  let keyword = document.getElementById("in-search").value.toLowerCase();
  let from = document.getElementById("in-filter-from").value;
  let to = document.getElementById("in-filter-to").value;
  let wh = document.getElementById("in-filter-wh").value;
  let hasil = stockInLog.filter(r=>{
    return (r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.ref||"").toLowerCase().includes(keyword)) &&
           (!from||r.tanggal>=from) && (!to||r.tanggal<=to) &&
           (wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase());
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML="<tr><td colspan='11' class='kosong'>"+t("no_data_in")+"</td></tr>"; attachPagination(tbody,"pg-in",0,1,PAGE_SIZE,()=>{}); return; }
  let page = _pageState.in;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(r,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let uom = hitungUOM(r.qty,r.isiKarton);
    let nilai = r.qty*r.harga;
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.warehouse+"</span></td><td><span class='badge badge-in'>+"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td><td title='"+(r.keterangan||"-")+"'>"+(r.keterangan||"-")+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockIn(\""+r.id+"\")'>"+t("btn_edit")+"</button> <button class='btn-action btn-hapus' onclick='hapusStockIn(\""+r.id+"\")'>"+t("btn_hapus")+"</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
  });
  tbody.innerHTML = "";
  tbody.appendChild(buildRows(rows));
  attachPagination(tbody,"pg-in",hasil.length,page,PAGE_SIZE,function(pg){ _pageState.in=pg; window.tampilkanStockIn(); });
};

// --- 8. OVERRIDE tampilkanStockOut ---
window.tampilkanStockOut = function(){
  let tbody = document.getElementById("tabelStockOut");
  let keyword = document.getElementById("out-search").value.toLowerCase();
  let from = document.getElementById("out-filter-from").value;
  let to = document.getElementById("out-filter-to").value;
  let wh = document.getElementById("out-filter-wh").value;
  let tipeF = document.getElementById("out-filter-tipe").value;
  let hasil = stockOutLog.filter(r=>{
    return (r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.ref||"").toLowerCase().includes(keyword)) &&
           (!from||r.tanggal>=from) && (!to||r.tanggal<=to) &&
           (wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()) &&
           (tipeF==="All"||(r.tipe||"Stock Out")===tipeF);
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML="<tr><td colspan='12' class='kosong'>"+t("no_data_out")+"</td></tr>"; attachPagination(tbody,"pg-out",0,1,PAGE_SIZE,()=>{}); return; }
  let page = _pageState.out;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(r,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let uom = hitungUOM(r.qty,r.isiKarton);
    let nilai = r.qty*r.harga;
    let tipe = r.tipe||"Stock Out";
    let tipeBadge = tipe==="Expired"?"<span class='badge' style='background:#fef3c7;color:#92400e'>⚠️ "+t("badge_expired")+"</span>":tipe==="Damage"?"<span class='badge' style='background:#f3e8ff;color:#6b21a8'>💥 "+t("badge_damage")+"</span>":"<span class='badge badge-out'>📤 "+t("badge_stockout")+"</span>";
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td>"+tipeBadge+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.warehouse+"</span></td><td><span class='badge badge-out'>-"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td><td title='"+r.ref+"'>"+r.ref+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockOut(\""+r.id+"\")'>"+t("btn_edit")+"</button> <button class='btn-action btn-hapus' onclick='hapusStockOut(\""+r.id+"\")'>"+t("btn_hapus")+"</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
  });
  tbody.innerHTML = "";
  tbody.appendChild(buildRows(rows));
  attachPagination(tbody,"pg-out",hasil.length,page,PAGE_SIZE,function(pg){ _pageState.out=pg; window.tampilkanStockOut(); });
};

// --- 9. OVERRIDE tampilkanTransfer ---
window.tampilkanTransfer = function(){
  let tbody = document.getElementById("tabelTransfer");
  let keyword = document.getElementById("tr-search").value.toLowerCase();
  let from = document.getElementById("tr-filter-from").value;
  let to = document.getElementById("tr-filter-to").value;
  let wh = document.getElementById("tr-filter-wh").value;
  let hasil = transferLog.filter(r=>{
    return (r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.ref||"").toLowerCase().includes(keyword)) &&
           (!from||r.tanggal>=from) && (!to||r.tanggal<=to) &&
           (wh==="All"||r.fromWh.toUpperCase()===wh.toUpperCase()||r.toWh.toUpperCase()===wh.toUpperCase());
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML="<tr><td colspan='11' class='kosong'>"+t("no_data_transfer")+"</td></tr>"; attachPagination(tbody,"pg-tr",0,1,PAGE_SIZE,()=>{}); return; }
  let page = _pageState.tr;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(r,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let uom = hitungUOM(r.qty,r.isiKarton);
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.fromWh+"</span></td><td style='text-align:center;color:#7c3aed;font-weight:700'>→</td><td><span class='badge badge-gudang' style='background:#553c9a'>"+r.toWh+"</span></td><td><span class='badge badge-transfer'>"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td title='"+r.ref+"'>"+r.ref+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editTransfer(\""+r.id+"\")'>"+t("btn_edit")+"</button> <button class='btn-action btn-hapus' onclick='hapusTransfer(\""+r.id+"\")'>"+t("btn_hapus")+"</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
  });
  tbody.innerHTML = "";
  tbody.appendChild(buildRows(rows));
  attachPagination(tbody,"pg-tr",hasil.length,page,PAGE_SIZE,function(pg){ _pageState.tr=pg; window.tampilkanTransfer(); });
};

// --- 10. OVERRIDE tampilkanLedger dengan pagination ---
const _origTampilkanLedger = tampilkanLedger;
window.tampilkanLedger = function(){
  let tbody = document.getElementById("tabelLedger");
  let keyword = document.getElementById("led-search").value.toLowerCase().trim();
  let from = document.getElementById("led-from").value;
  let to = document.getElementById("led-to").value;
  let wh = document.getElementById("led-wh").value;
  let type = document.getElementById("led-type").value;

  let inData    = stockInLog.map(r=>({...r,tipe:"IN",warehouse:r.warehouse||"Bintaro"}));
  let outData   = stockOutLog.map(r=>({...r,tipe:"OUT",warehouse:r.warehouse||"Bintaro"}));
  let trOutData = transferLog.map(r=>({...r,tipe:"TRANSFER_OUT",warehouse:r.fromWh,ref:"Transfer → "+r.toWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let trInData  = transferLog.map(r=>({...r,tipe:"TRANSFER_IN",warehouse:r.toWh,ref:"Transfer ← "+r.fromWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let semua = [...inData,...outData,...trOutData,...trInData];

  semua.sort((a,b)=>{ let d=a.tanggal.localeCompare(b.tanggal); return d!==0?d:(Number(a.id)||0)-(Number(b.id)||0); });

  let runBalance = {};
  semua.forEach(r=>{
    let key = (r.sku||"").toUpperCase()+"|||"+(r.warehouse||"").toUpperCase();
    if(!runBalance[key]) runBalance[key]=0;
    if(r.tipe==="IN"||r.tipe==="TRANSFER_IN") runBalance[key]+=(r.qty||0);
    else runBalance[key]-=(r.qty||0);
    r._runBal = runBalance[key];
  });

  let hasil = semua.filter(r=>{
    return (keyword===""||((r.sku&&r.sku.toLowerCase().includes(keyword))||(r.nama&&r.nama.toLowerCase().includes(keyword)))) &&
           (!from||r.tanggal>=from) && (!to||r.tanggal<=to) &&
           (wh==="All"||(r.warehouse||"").toUpperCase()===wh.toUpperCase()) &&
           (type==="All"||r.tipe===type);
  }).sort((a,b)=>{ let d=b.tanggal.localeCompare(a.tanggal); return d!==0?d:(Number(b.id)||0)-(Number(a.id)||0); });

  let totalIn  = stockInLog.filter(r=>wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()).reduce((s,r)=>s+(r.qty||0)*(r.harga||0),0);
  let totalOut = stockOutLog.filter(r=>wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()).reduce((s,r)=>s+(r.qty||0)*(r.harga||0),0);
  let totalStok = daftarBarang.filter(b=>wh==="All"||(b.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()).reduce((s,b)=>s+(Number(b.totalPcs)||0)*(Number(b.harga)||0),0);
  document.getElementById("led-total-stok").innerText = rpFormat(totalStok);
  document.getElementById("led-total-in").innerText = rpFormat(totalIn);
  document.getElementById("led-total-out").innerText = rpFormat(totalOut);
  document.getElementById("led-total-trx").innerText = hasil.length;

  if(hasil.length===0){ tbody.innerHTML="<tr><td colspan='10' class='kosong'>"+t("no_data_ledger")+"</td></tr>"; attachPagination(tbody,"pg-led",0,1,PAGE_SIZE,()=>{}); return; }

  let page = _pageState.led;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(r,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let uomTrx = hitungUOM(r.qty||0,r.isiKarton||0);
    let sisaPcs = r._runBal||0;
    let sisaUom = hitungUOM(sisaPcs,r.isiKarton||0);
    let badge,qtyTxt;
    if(r.tipe==="IN"){ badge="<span class='badge badge-in'>📥 IN</span>"; qtyTxt="<span style='color:#065f46;font-weight:700'>+"+(r.qty||0)+" pcs</span>"; }
    else if(r.tipe==="OUT"){ badge="<span class='badge badge-out'>📤 OUT</span>"; qtyTxt="<span style='color:#991b1b;font-weight:700'>-"+(r.qty||0)+" pcs</span>"; }
    else if(r.tipe==="TRANSFER_OUT"){ badge="<span class='badge badge-transfer'>🔄 TRF OUT</span>"; qtyTxt="<span style='color:#3730a3;font-weight:700'>-"+(r.qty||0)+" pcs</span>"; }
    else { badge="<span class='badge badge-transfer' style='background:#d1fae5;color:#065f46'>🔄 TRF IN</span>"; qtyTxt="<span style='color:#065f46;font-weight:700'>+"+(r.qty||0)+" pcs</span>"; }
    let sisaColor = sisaPcs<0?"color:#c53030":"color:#2c3e50";
    let nilai = (r.qty||0)*(r.harga||0);
    return "<tr><td>"+(i+1)+"</td><td>"+(r.tanggal||"-")+"</td><td>"+badge+"</td><td title='"+(r.sku||"-")+"'>"+(r.sku||"-")+"</td><td title='"+(r.nama||"-")+"'>"+(r.nama||"-")+"</td><td><span class='badge badge-gudang'>"+(r.warehouse||"-")+"</span></td><td>"+qtyTxt+"</td><td><strong>"+uomTrx+"</strong></td><td style='"+sisaColor+";font-weight:700'>"+sisaPcs+" pcs</td><td>"+sisaUom+"</td></tr>";
  });
  tbody.innerHTML = "";
  tbody.appendChild(buildRows(rows));
  attachPagination(tbody,"pg-led",hasil.length,page,PAGE_SIZE,function(pg){ _pageState.led=pg; window.tampilkanLedger(); });
};


// =========================================================================
// DASHBOARD
// =========================================================================
let _dbCharts = {};

function destroyChart(id) {
  if (_dbCharts[id]) { _dbCharts[id].destroy(); delete _dbCharts[id]; }
}

function getDateStr(daysAgo) {
  let d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Dashboard date-range filter ─────────────────────────────
let _dashRange = { mode: 'thisMonth', from: null, to: null };

function setDashRange(mode) {
  _dashRange.mode = mode;
  document.querySelectorAll('#dash-daterange-btns .dr-btn').forEach(b => b.classList.toggle('active', b.dataset.range === mode));
  let customBox = document.getElementById('dash-custom-inputs');
  if (mode === 'custom') {
    customBox.classList.add('show');
    if (!_dashRange.from) {
      document.getElementById('dash-date-to').value = getDateStr(0);
      document.getElementById('dash-date-from').value = getDateStr(6);
    }
    return; // tunggu user klik "Terapkan"
  }
  customBox.classList.remove('show');
  tampilkanDashboard();
}

function applyDashCustomRange() {
  let from = document.getElementById('dash-date-from').value;
  let to = document.getElementById('dash-date-to').value;
  if (!from || !to) { showToast('⚠️ Pilih tanggal awal & akhir dulu.', 'warning'); return; }
  if (from > to) { showToast('⚠️ Tanggal awal harus sebelum tanggal akhir.', 'warning'); return; }
  _dashRange.from = from; _dashRange.to = to;
  tampilkanDashboard();
}

function getDashRangeDates() {
  let today = new Date();
  if (_dashRange.mode === '7d') return { from: getDateStr(6), to: getDateStr(0) };
  if (_dashRange.mode === '30d') return { from: getDateStr(29), to: getDateStr(0) };
  if (_dashRange.mode === 'lastMonth') {
    let firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
    let lastMonthEnd = new Date(firstThis.getTime() - 86400000);
    let lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    return { from: lastMonthStart.toISOString().slice(0, 10), to: lastMonthEnd.toISOString().slice(0, 10) };
  }
  if (_dashRange.mode === 'custom' && _dashRange.from && _dashRange.to) {
    return { from: _dashRange.from, to: _dashRange.to };
  }
  // default: thisMonth (juga fallback)
  let first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: getDateStr(0) };
}

function fmtTgl(dStr) {
  return new Date(dStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Bucket transaksi Stock Out ke dalam grup harian / mingguan / bulanan
// tergantung panjang rentang, supaya chart tetap enak dibaca untuk periode apa pun.
function buildOut7ChartData(range, getIsiKarton) {
  let from = new Date(range.from + 'T00:00:00');
  let to = new Date(range.to + 'T00:00:00');
  let totalDays = Math.round((to - from) / 86400000) + 1;
  let labels = [], data = [];

  function ctnForRange(dFrom, dTo) {
    let fromStr = dFrom.toISOString().slice(0, 10), toStr = dTo.toISOString().slice(0, 10);
    let recs = stockOutLog.filter(r => r.tanggal >= fromStr && r.tanggal <= toStr);
    return recs.reduce((s, r) => s + (r.qty || 0) / getIsiKarton(r.sku), 0);
  }

  if (totalDays <= 14) {
    // harian
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }));
      data.push(Math.round(ctnForRange(d, d) * 10) / 10);
    }
  } else if (totalDays <= 90) {
    // mingguan
    let cursor = new Date(from);
    while (cursor <= to) {
      let weekEnd = new Date(cursor); weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > to) weekEnd = new Date(to);
      labels.push(cursor.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + '–' + weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
      data.push(Math.round(ctnForRange(cursor, weekEnd) * 10) / 10);
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    // bulanan
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      let monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      let bucketEnd = monthEnd > to ? to : monthEnd;
      let bucketStart = cursor < from ? from : cursor;
      labels.push(cursor.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
      data.push(Math.round(ctnForRange(bucketStart, bucketEnd) * 10) / 10);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return { labels, data };
}

function getMonthStr(d) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

// Smooth count-up animation for KPI / donut-center numbers — gives the dashboard a "live" feel
function animateCountUp(el, endVal, opts) {
  if (!el) return;
  opts = opts || {};
  let duration = opts.duration || 900;
  let formatter = opts.formatter || (v => Math.round(v).toLocaleString('id-ID'));
  let startVal = 0;
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    let progress = Math.min((ts - startTime) / duration, 1);
    let eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    let current = startVal + (endVal - startVal) * eased;
    el.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = formatter(endVal);
  }
  requestAnimationFrame(step);
}

function tampilkanDashboard() {
  // ── helpers ──────────────────────────────────────────────
  function getIsiKarton(sku) {
    let all = dapatkanSemuaMasterData();
    let m = all.find(x => x.sku.toUpperCase() === sku.toUpperCase());
    return m ? (m.qtyCtn || 1) : 1;
  }
  function pcsToCtн(pcs, isi) { return isi > 0 ? pcs / isi : 0; }

  let today = new Date();
  let thisMonth = getMonthStr(today);
  let dashRange = getDashRangeDates();

  // ── KPI DATA ────────────────────────────────────────────
  let totalNilaiStok = daftarBarang.reduce((s, b) => s + (Number(b.totalPcs) || 0) * (Number(b.harga) || 0), 0);

  let totalSkuAktif = [...new Set(daftarBarang.map(b => b.sku.toUpperCase()))].length;

  let outBulanIni = stockOutLog.filter(r => r.tanggal >= dashRange.from && r.tanggal <= dashRange.to);
  let nilaiOutBulanIni = outBulanIni.reduce((s, r) => s + (r.qty || 0) * (r.harga || 0), 0);
  let qtyOutBulanIni = outBulanIni.reduce((s, r) => s + (r.qty || 0), 0);

  let inBulanIni = stockInLog.filter(r => r.tanggal >= dashRange.from && r.tanggal <= dashRange.to);
  let nilaiInBulanIni = inBulanIni.reduce((s, r) => s + (r.qty || 0) * (r.harga || 0), 0);

  // update period badge di atas dashboard
  let periodBadge = document.getElementById('dash-period-badge');
  if (periodBadge) periodBadge.textContent = '📅 ' + fmtTgl(dashRange.from) + ' — ' + fmtTgl(dashRange.to);

  // moving categories
  let cF = 0, cM = 0, cS = 0, cN = 0;
  let seen = {};
  daftarBarang.forEach(b => {
    let key = b.sku.toUpperCase() + '__' + (b.warehouse || 'Bintaro').toUpperCase();
    if (seen[key]) return; seen[key] = true;
    let avg = hitungAvgOutKarton(b.sku, b.warehouse || 'Bintaro', 30).avgPerHariCtn;
    let cat = getMovingCategory(avg);
    if (cat === 'Fast') cF++; else if (cat === 'Medium') cM++; else if (cat === 'Slow') cS++; else cN++;
  });

  // ── RENDER KPI CARDS (animated count-up for a "live" feel) ─
  let kpiRow = document.getElementById('db-kpi-row');
  let kpiData = [
    { icon: '💰', label: t('dash_kpi_nilai_stok'), raw: totalNilaiStok, fmt: 'rp', accent: '#3b82f6', bg: '#eff6ff' },
    { icon: '📦', label: t('dash_kpi_sku_aktif'), raw: totalSkuAktif, fmt: 'sku', accent: '#10b981', bg: '#ecfdf5' },
    { icon: '📤', label: t('dash_kpi_out_bulan'), raw: nilaiOutBulanIni, fmt: 'rp', accent: '#ef4444', bg: '#fef2f2', sub: qtyOutBulanIni.toLocaleString('id-ID') + ' ' + t('dash_kpi_pcs_terjual') },
    { icon: '📥', label: t('dash_kpi_in_bulan'), raw: nilaiInBulanIni, fmt: 'rp', accent: '#8b5cf6', bg: '#f5f3ff' },
    { icon: '🚀', label: t('dash_kpi_moving'), val: cF + ' / ' + cM + ' / ' + cS, accent: '#0ea5e9', bg: '#f0f9ff', sub: cN + ' ' + t('dash_kpi_item_no_data') },
  ];
  kpiRow.innerHTML = kpiData.map((k, i) => `
    <div class="dash-kpi-card" style="--dk-accent:${k.accent};--dk-accent-bg:${k.bg}">
      <div class="dash-kpi-top">
        <div class="dash-kpi-icon">${k.icon}</div>
      </div>
      <div class="dash-kpi-label">${k.label}</div>
      <div class="dash-kpi-value" id="db-kpi-val-${i}">${k.val || 0}</div>
      ${k.sub ? `<div class="dash-kpi-sub">${k.sub}</div>` : ''}
    </div>`).join('');
  kpiData.forEach((k, i) => {
    if (k.raw === undefined) return; // static composite value (moving ratio) — no count-up
    let el = document.getElementById('db-kpi-val-' + i);
    let formatter = k.fmt === 'rp' ? (v => rpFormat(Math.round(v))) : (v => Math.round(v).toLocaleString('id-ID') + ' SKU');
    animateCountUp(el, k.raw, { duration: 1000, formatter });
  });

  // ── TICKER — ringkasan bergulir ala dashboard trading ──────
  let tickerTrack = document.getElementById('dashTickerTrack');
  if (tickerTrack) {
    let tickerItems = [
      '<span><b>💰</b>' + t('dash_kpi_nilai_stok') + ': ' + rpFormat(Math.round(totalNilaiStok)) + '</span>',
      '<span><b>📦</b>' + t('dash_kpi_sku_aktif') + ': ' + totalSkuAktif + ' SKU</span>',
      '<span><b>📤</b>' + t('dash_kpi_out_bulan') + ': ' + rpFormat(Math.round(nilaiOutBulanIni)) + '</span>',
      '<span><b>📥</b>' + t('dash_kpi_in_bulan') + ': ' + rpFormat(Math.round(nilaiInBulanIni)) + '</span>',
      '<span><b>🚀</b> Fast/Medium/Slow: ' + cF + ' / ' + cM + ' / ' + cS + ' &nbsp;•&nbsp; No Data: ' + cN + '</span>'
    ].join('');
    // digandakan supaya loop-nya mulus tanpa jeda
    tickerTrack.innerHTML = tickerItems + tickerItems;
  }

  // ── CHART 1: Stock Out — mengikuti filter tanggal dashboard ──
  destroyChart('out7');
  let { labels: labels7, data: data7 } = buildOut7ChartData(dashRange, getIsiKarton);
  let out7TitleEl = document.getElementById('dash-out7-title');
  if (out7TitleEl) {
    let rangeLabelMap = { '7d': '7 Hari Terakhir', '30d': '30 Hari Terakhir', thisMonth: 'Bulan Ini', lastMonth: 'Bulan Lalu' };
    out7TitleEl.textContent = 'Stock Out — ' + (rangeLabelMap[_dashRange.mode] || (fmtTgl(dashRange.from) + ' – ' + fmtTgl(dashRange.to)));
  }
  let elOut7 = document.getElementById('db-chart-out7');
  _dbCharts['out7'] = new ApexCharts(elOut7, {
    chart: {
      type: 'bar', height: '100%', fontFamily: 'inherit', toolbar: { show: false },
      animations: { enabled: true, easing: 'easeout', speed: 700, animateGradually: { enabled: true, delay: 90 }, dynamicAnimation: { enabled: true, speed: 300 } },
      dropShadow: { enabled: true, top: 0, left: 0, blur: 6, color: '#3b82f6', opacity: 0.45 }
    },
    series: [{ name: 'Ctn Keluar', data: data7 }],
    xaxis: {
      categories: labels7,
      axisBorder: { color: '#eef1f6' },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontSize: '10px' } }
    },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '10px' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 0, padding: { left: 4, right: 4 } },
    plotOptions: { bar: { borderRadius: 7, borderRadiusApplication: 'end', columnWidth: '52%' } },
    stroke: { show: true, width: 1.5, colors: ['#60a5fa'] },
    fill: {
      type: 'gradient',
      gradient: { shade: 'light', type: 'vertical', shadeIntensity: .3, gradientToColors: ['rgba(59,130,246,.3)'], inverseColors: false, opacityFrom: .95, opacityTo: .5, stops: [0, 100] }
    },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark', y: { formatter: v => v.toLocaleString('id-ID') + ' ctn' } },
    states: { hover: { filter: { type: 'lighten', value: .12 } } }
  });
  _dbCharts['out7'].render();

  // ── TOP 15 SKU — leaderboard per bulan pilihan ──────────
  // Isi dropdown bulan sekali saja (biar pilihan user tidak ke-reset tiap render)
  let monthSel = document.getElementById('db-top-sku-month');
  if (monthSel && monthSel.options.length === 0) {
    let monthNames = { id: 'id-ID', en: 'en-US', ko: 'ko-KR' };
    let locale = monthNames[currentLang] || 'id-ID';
    for (let i = 0; i < 12; i++) {
      let d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      let val = getMonthStr(d);
      let label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      let opt = document.createElement('option');
      opt.value = val;
      opt.textContent = i === 0 ? label + ' (' + t('bulan_ini') + ')' : label;
      monthSel.appendChild(opt);
    }
  }
  let selectedMonth = (monthSel && monthSel.value) ? monthSel.value : thisMonth;
  let outSelMonth = stockOutLog.filter(r => (r.tanggal || '').slice(0, 7) === selectedMonth);

  let skuTotals = {};
  outSelMonth.forEach(r => {
    let k = r.sku.toUpperCase();
    let isi = getIsiKarton(r.sku);
    skuTotals[k] = (skuTotals[k] || 0) + (r.qty || 0) / isi;
  });
  let top15 = Object.entries(skuTotals).sort((a, b) => b[1] - a[1]).slice(0, 15);
  let labelMap = {};
  daftarBarang.forEach(b => { if (!labelMap[b.sku.toUpperCase()]) labelMap[b.sku.toUpperCase()] = b.nama; });
  let topSkuList = document.getElementById('db-top-sku-list');
  if (top15.length === 0) {
    topSkuList.innerHTML = "<div style='text-align:center;color:#a0aec0;padding:24px;font-size:11.5px'>" + t('dash_no_data_month') + "</div>";
  } else {
    let maxVal = top15[0][1] || 1;
    let rankClass = i => i === 0 ? 'r-gold' : i === 1 ? 'r-silver' : i === 2 ? 'r-bronze' : '';
    topSkuList.innerHTML = top15.map(([sku, val], i) => {
      let nama = labelMap[sku] || sku;
      let pct = Math.max(4, Math.round((val / maxVal) * 100));
      return `<div class="rank-item">
        <div class="rank-badge ${rankClass(i)}">${i + 1}</div>
        <div class="rank-info">
          <div class="rank-name-row">
            <span class="rank-name" title="${nama}">${nama}</span>
            <span class="rank-value">${(Math.round(val * 10) / 10).toLocaleString('id-ID')} ctn</span>
          </div>
          <div class="rank-bar-wrap"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    }).join('');
  }

  // ── CHART 3: Donut Moving — compact, animated, center total ──
  destroyChart('moving');
  let totalMoving = cF + cM + cS + cN;
  let movingLegendData = [
    { c: '#10b981', l: t('badge_fast'), v: cF }, { c: '#f59e0b', l: t('badge_medium'), v: cM },
    { c: '#ef4444', l: t('badge_slow'), v: cS }, { c: '#d1d5db', l: t('badge_nodata'), v: cN }
  ];
  let elMoving = document.getElementById('db-chart-moving');
  _dbCharts['moving'] = new ApexCharts(elMoving, {
    chart: {
      type: 'donut', height: '100%', fontFamily: 'inherit',
      animations: { enabled: true, easing: 'easeout', speed: 800, animateGradually: { enabled: true, delay: 100 } },
      dropShadow: { enabled: true, blur: 5, opacity: 0.4 }
    },
    series: movingLegendData.map(x => x.v),
    labels: movingLegendData.map(x => x.l),
    colors: movingLegendData.map(x => x.c),
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['#fff'] },
    plotOptions: { pie: { donut: { size: '70%', labels: { show: false } }, expandOnClick: true } },
    tooltip: { theme: 'dark', y: { formatter: v => v } },
    states: { hover: { filter: { type: 'darken', value: .08 } } }
  });
  _dbCharts['moving'].render();
  animateCountUp(document.getElementById('db-moving-total'), totalMoving, { duration: 1000, formatter: v => Math.round(v) });
  document.getElementById('db-moving-legend').innerHTML = movingLegendData.map(x => {
    let pct = totalMoving > 0 ? Math.round((x.v / totalMoving) * 100) : 0;
    return `<div class="dash-legend-item" style="--dot-color:${x.c}">
      <div class="dash-legend-dot" style="background:${x.c}"></div>
      <span class="dash-legend-label">${x.l}</span>
      <div class="dash-legend-bar"><div class="dash-legend-bar-fill" style="width:0%;background:${x.c}"></div></div>
      <span class="dash-legend-val">${x.v}</span>
    </div>`;
  }).join('');
  // animate the mini bars in on next frame (so the width transition actually plays)
  requestAnimationFrame(() => {
    document.querySelectorAll('#db-moving-legend .dash-legend-bar-fill').forEach((el, i) => {
      let pct = totalMoving > 0 ? Math.round((movingLegendData[i].v / totalMoving) * 100) : 0;
      el.style.width = pct + '%';
    });
  });

  // ── TABLE: Low / Critical Stock (AGREGAT SEMUA GUDANG per SKU) ──
  let lowItems = [];
  let aggSkuLow = {};
  daftarBarang.forEach(b => {
    let key = b.sku.toUpperCase();
    if (!aggSkuLow[key]) aggSkuLow[key] = { sku: b.sku, nama: b.nama, isiKarton: Number(b.isiKarton) || 1, totalPcs: 0 };
    aggSkuLow[key].totalPcs += Number(b.totalPcs) || 0;
  });
  Object.values(aggSkuLow).forEach(agg => {
    let isi = agg.isiKarton || 1;
    let stokCtn = agg.totalPcs / isi;
    let avg30 = hitungAvgOutKarton(agg.sku, "All", 30).avgPerHariCtn;
    if (avg30 <= 0) return; // skip no-data
    let hariTahan = stokCtn / avg30;
    if (hariTahan < 30) {
      let avgBln = avg30 * 22;
      lowItems.push({ b: agg, stokCtn, avgBln, hariTahan });
    }
  });
  lowItems.sort((a, b) => a.hariTahan - b.hariTahan);

  let tbody = document.getElementById('db-low-stock-body');
  if (lowItems.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;color:#a0aec0;padding:20px'>" + t('dash_low_stock_ok') + "</td></tr>";
  } else {
    tbody.innerHTML = lowItems.map(({ b, stokCtn, avgBln, hariTahan }) => {
      let bln = hariTahan / 30;
      let status = hariTahan <= 7
        ? "<span style='background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700'>" + t('dash_status_kritis') + "</span>"
        : "<span style='background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700'>" + t('dash_status_rendah') + "</span>";
      let warna = hariTahan <= 7 ? '#991b1b' : '#92400e';
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px;color:#4a5568">${b.sku}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.nama}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7"><span style="background:#4a5568;color:white;padding:2px 6px;border-radius:3px;font-size:10px">🏢 All Warehouse</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700">${stokCtn.toFixed(1)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right">${avgBln.toFixed(1)} ctn</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700;color:${warna}">${bln.toFixed(1)} ${t("dash_bln")} (${Math.round(hariTahan)} ${t("dash_hr")})</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:center">${status}</td>
      </tr>`;
    }).join('');
  }

  // ── HELPERS: tanggal transaksi terakhir per SKU (gabungan semua gudang, kecuali warehouse spesifik diminta) ─
  function getLastOutDate(sku, warehouse) {
    let recs = stockOutLog.filter(r => r.sku.toUpperCase() === sku.toUpperCase() && (warehouse === "All" || (r.warehouse || 'Bintaro').toUpperCase() === (warehouse || 'Bintaro').toUpperCase()));
    if (recs.length === 0) return null;
    return recs.map(r => r.tanggal).sort().pop();
  }
  function getLastInDate(sku, warehouse) {
    let recs = stockInLog.filter(r => r.sku.toUpperCase() === sku.toUpperCase() && (warehouse === "All" || (r.warehouse || 'Bintaro').toUpperCase() === (warehouse || 'Bintaro').toUpperCase()));
    if (recs.length === 0) return null;
    return recs.map(r => r.tanggal).sort().pop();
  }
  function daysSince(dateStr) {
    if (!dateStr) return Infinity;
    let d1 = new Date(dateStr + 'T00:00:00'), d2 = new Date();
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }


  // ── BEST SELLER — 3 BULAN TERAKHIR (90 hari) ───────────
  let cutoff90 = getDateStr(90);
  let out90 = stockOutLog.filter(r => (r.tanggal || '') >= cutoff90);
  let skuTotals90 = {};
  out90.forEach(r => {
    let k = r.sku.toUpperCase();
    let isi = getIsiKarton(r.sku);
    skuTotals90[k] = (skuTotals90[k] || 0) + (r.qty || 0) / isi;
  });
  let top90 = Object.entries(skuTotals90).sort((a, b) => b[1] - a[1]).slice(0, 15);
  let list90 = document.getElementById('db-top-sku-3m-list');
  if (list90) {
    if (top90.length === 0) {
      list90.innerHTML = "<div style='text-align:center;color:#a0aec0;padding:24px;font-size:11.5px'>"+t("belum_ada_stockout_3bln")+"</div>";
    } else {
      let maxVal90 = top90[0][1] || 1;
      let rankClass90 = i => i === 0 ? 'r-gold' : i === 1 ? 'r-silver' : i === 2 ? 'r-bronze' : '';
      list90.innerHTML = top90.map(([sku, val], i) => {
        let nama = labelMap[sku] || sku;
        let pct = Math.max(4, Math.round((val / maxVal90) * 100));
        return `<div class="rank-item">
          <div class="rank-badge ${rankClass90(i)}">${i + 1}</div>
          <div class="rank-info">
            <div class="rank-name-row">
              <span class="rank-name" title="${nama}">${nama}</span>
              <span class="rank-value">${(Math.round(val * 10) / 10).toLocaleString('id-ID')} ctn</span>
            </div>
            <div class="rank-bar-wrap"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // ── DEAD STOCK — tidak terjual ≥ 60 hari (atau belum pernah), AGREGAT SEMUA GUDANG per SKU ─
  let deadItems = [];
  let aggSkuDead = {};
  daftarBarang.forEach(b => {
    let key = b.sku.toUpperCase();
    if (!aggSkuDead[key]) aggSkuDead[key] = { sku: b.sku, nama: b.nama, isiKarton: Number(b.isiKarton) || 1, totalPcs: 0 };
    aggSkuDead[key].totalPcs += Number(b.totalPcs) || 0;
  });
  Object.values(aggSkuDead).forEach(agg => {
    let pcs = agg.totalPcs || 0;
    if (pcs <= 0) return;
    let lastOut = getLastOutDate(agg.sku, "All");
    let days = daysSince(lastOut);
    if (days >= 60) {
      let isi = agg.isiKarton || 1;
      deadItems.push({ b: agg, stokCtn: pcs / isi, lastOut, days });
    }
  });
  deadItems.sort((a, b) => b.days - a.days);
  let tbodyDead = document.getElementById('db-dead-stock-body');
  if (tbodyDead) {
    if (deadItems.length === 0) {
      tbodyDead.innerHTML = "<tr><td colspan='6' style='text-align:center;color:#a0aec0;padding:20px'>" + t('dash_deadstock_ok') + "</td></tr>";
    } else {
      tbodyDead.innerHTML = deadItems.slice(0, 40).map(({ b, stokCtn, lastOut, days }) => {
        let lastTxt = lastOut ? lastOut : t('dash_belum_pernah_terjual');
        let daysTxt = days === Infinity ? '-' : days + ' ' + t('dash_hari');
        return `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px;color:#4a5568">${b.sku}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.nama}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7"><span style="background:#4a5568;color:white;padding:2px 6px;border-radius:3px;font-size:10px">🏢 All Warehouse</span></td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700">${stokCtn.toFixed(1)} ctn</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px">${lastTxt}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:center;font-weight:700;color:#991b1b">${daysTxt}</td>
        </tr>`;
      }).join('');
    }
  }

  // ── OVERSTOCK / SLOW MOVING — SOH TERLAMA (aging inventory), AGREGAT SEMUA GUDANG per SKU ─
  let overItems = [];
  let aggSkuOver = {};
  daftarBarang.forEach(b => {
    let key = b.sku.toUpperCase();
    if (!aggSkuOver[key]) aggSkuOver[key] = { sku: b.sku, nama: b.nama, isiKarton: Number(b.isiKarton) || 1, totalPcs: 0 };
    aggSkuOver[key].totalPcs += Number(b.totalPcs) || 0;
  });
  Object.values(aggSkuOver).forEach(agg => {
    let pcs = agg.totalPcs || 0;
    if (pcs <= 0) return;
    let avg = hitungAvgOutKarton(agg.sku, "All", 30).avgPerHariCtn;
    let cat = getMovingCategory(avg);
    if (cat !== 'Slow' && cat !== 'NoData') return;
    let lastIn = getLastInDate(agg.sku, "All");
    let days = daysSince(lastIn);
    let isi = agg.isiKarton || 1;
    overItems.push({ b: agg, stokCtn: pcs / isi, lastIn, days, cat });
  });
  overItems.sort((a, b) => b.days - a.days);
  let tbodyOver = document.getElementById('db-overstock-body');
  if (tbodyOver) {
    if (overItems.length === 0) {
      tbodyOver.innerHTML = "<tr><td colspan='7' style='text-align:center;color:#a0aec0;padding:20px'>" + t('dash_overstock_ok') + "</td></tr>";
    } else {
      tbodyOver.innerHTML = overItems.slice(0, 40).map(({ b, stokCtn, lastIn, days, cat }) => {
        let badge = cat === 'Slow' ? "<span class='badge-slow'>🐢 "+t("badge_slow")+"</span>" : "<span class='badge-nodata'>⚪ "+t("badge_nodata")+"</span>";
        let lastTxt = lastIn ? lastIn : t('dash_tidak_ada_stockin');
        let daysTxt = days === Infinity ? '-' : days + ' ' + t('dash_hari');
        return `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px;color:#4a5568">${b.sku}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.nama}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7"><span style="background:#4a5568;color:white;padding:2px 6px;border-radius:3px;font-size:10px">🏢 All Warehouse</span></td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700">${stokCtn.toFixed(1)} ctn</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px">${lastTxt}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:center;font-weight:700;color:#92400e">${daysTxt}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:center">${badge}</td>
        </tr>`;
      }).join('');
    }
  }

  // ── FEED AKTIVITAS TERBARU — kesan real-time monitoring ────
  window._dashRenderTime = Date.now();
  renderActivityFeed();
  startDashboardClock();
}

function renderActivityFeed() {
  let feedEl = document.getElementById('db-activity-feed');
  if (!feedEl) return;
  let items = [];
  stockInLog.forEach(r => items.push({ type: 'in', icon: '📥', label: t('tab_in'), sku: r.sku, nama: r.nama, warehouse: r.warehouse || 'Bintaro', tanggal: r.tanggal, id: r.id }));
  stockOutLog.forEach(r => items.push({ type: 'out', icon: '📤', label: t('tab_out'), sku: r.sku, nama: r.nama, warehouse: r.warehouse || 'Bintaro', tanggal: r.tanggal, id: r.id }));
  transferLog.forEach(r => items.push({ type: 'transfer', icon: '🔁', label: t('tab_transfer'), sku: r.sku, nama: r.nama, warehouse: (r.fromWh || '?') + ' → ' + (r.toWh || '?'), tanggal: r.tanggal, id: r.id }));
  items.sort((a, b) => {
    let d = (b.tanggal || '').localeCompare(a.tanggal || '');
    if (d !== 0) return d;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
  items = items.slice(0, 20);
  if (items.length === 0) {
    feedEl.innerHTML = "<div style='text-align:center;color:#a0aec0;padding:16px;font-size:11.5px'>" + t('dash_activity_empty') + "</div>";
    return;
  }
  let today = new Date(); today.setHours(0, 0, 0, 0);
  function relTime(tgl) {
    if (!tgl) return '-';
    let d1 = new Date(tgl + 'T00:00:00');
    let diffDays = Math.round((today - d1) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t('dash_hari_ini');
    if (diffDays === 1) return t('dash_kemarin');
    return t('dash_n_hari_lalu').replace('{n}', diffDays);
  }
  feedEl.innerHTML = items.map(it => `
    <div class="dash-activity-item">
      <div class="dash-activity-icon ${it.type}">${it.icon}</div>
      <div class="dash-activity-name" title="${it.nama || it.sku}"><strong>${it.label}</strong> — ${it.nama || it.sku}</div>
      <div class="dash-activity-wh">${it.warehouse}</div>
      <div class="dash-activity-time">${relTime(it.tanggal)}</div>
    </div>`).join('');
}

// Jam berjalan + "diperbarui X detik/menit lalu" — interval dibuat sekali saja
function startDashboardClock() {
  if (window._dashClockInterval) return; // sudah jalan, jangan bikin interval dobel
  function tick() {
    let clockEl = document.getElementById('dashClockTime');
    let lastEl = document.getElementById('dashLastUpdated');
    if (!clockEl) return; // tab dashboard sedang tidak ditampilkan
    clockEl.textContent = '🕐 ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (lastEl && window._dashRenderTime) {
      let elapsed = Math.round((Date.now() - window._dashRenderTime) / 1000);
      let txt = elapsed < 5 ? t('dash_baru_saja') : elapsed < 60 ? t('dash_detik_lalu').replace('{n}', elapsed) : t('dash_menit_lalu').replace('{n}', Math.floor(elapsed / 60));
      lastEl.textContent = '• ' + txt;
    }
  }
  tick();
  window._dashClockInterval = setInterval(tick, 1000);
}

console.log("⚡ Performance optimizations loaded: debounce, pagination, DocumentFragment, throttled Firebase save");
