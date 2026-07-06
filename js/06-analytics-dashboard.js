// =========================================================================
// SALES ANALYTICS
// =========================================================================
// ==================== SALES ANALYTICS - VERSION WITH CARTON ====================
function tampilkanSales() {
    let keyword = document.getElementById("sa-search").value.toLowerCase();
    let wh = document.getElementById("sa-wh").value;
    let from = document.getElementById("sa-from").value;
    let to = document.getElementById("sa-to").value;
    let tipeF = document.getElementById("sa-tipe").value;
    let viewMode = document.getElementById("sa-view").value;

    // Ambil data master untuk konversi PCS -> KARTON
    let semuaMaster = dapatkanSemuaMasterData();

    let hasil = stockOutLog.filter(r => {
        let matchK = r.sku.toLowerCase().includes(keyword) || r.nama.toLowerCase().includes(keyword);
        let matchW = wh === "All" || (r.warehouse || "Bintaro").toUpperCase() === wh.toUpperCase();
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
        thead.innerHTML = "<tr><th>No</th><th>SKU</th><th>Nama Barang</th><th>Gudang</th><th>Total Transaksi</th><th>Total Qty Keluar (Karton)</th><th>Total Qty Keluar (Pcs)</th><th>Konversi</th><th>Total Nilai</th><th>Tgl Pertama</th><th>Tgl Terakhir</th></tr>";
        
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
            tbody.innerHTML = "<tr><td colspan='11' class='kosong'>Tidak ada data penjualan</td></tr>";
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
        thead.innerHTML = "<tr><th>No</th><th>Tanggal</th><th>Tipe</th><th>SKU</th><th>Nama Barang</th><th>Gudang</th><th>Qty Keluar (Karton)</th><th>Qty Keluar (Pcs)</th><th>Konversi</th><th>Harga Satuan</th><th>Total Nilai</th><th>Keterangan</th></tr>";
        
        if (hasil.length === 0) {
            tbody.innerHTML = "<tr><td colspan='12' class='kosong'>Tidak ada data penjualan</td></tr>";
            return;
        }
        
        rows = hasil.map(function (r, i) {
            let master = semuaMaster.find(m => m.sku.toUpperCase() === r.sku.toUpperCase());
            let isiKarton = master ? (master.qtyCtn || 1) : 1;
            let qtyCtn = r.qty / isiKarton;
            let uom = hitungUOM(r.qty, isiKarton);
            let nilai = r.qty * r.harga;
            let tipe = r.tipe || "Stock Out";
            let tipeBadge = tipe === "Expired" ? "<span class='badge' style='background:#fef3c7;color:#92400e'>⚠️ Expired</span>" :
                            tipe === "Damage" ? "<span class='badge' style='background:#f3e8ff;color:#6b21a8'>💥 Damage</span>" :
                            "<span class='badge badge-out'>📤 Stock Out</span>";
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
    let wh = document.getElementById("sa-wh").value;
    let from = document.getElementById("sa-from").value;
    let to = document.getElementById("sa-to").value;
    let tipeF = document.getElementById("sa-tipe").value;
    let viewMode = document.getElementById("sa-view").value;
    
    let semuaMaster = dapatkanSemuaMasterData();
    
    let hasil = stockOutLog.filter(r => {
        let matchK = r.sku.toLowerCase().includes(keyword) || r.nama.toLowerCase().includes(keyword);
        let matchW = wh === "All" || (r.warehouse || "Bintaro").toUpperCase() === wh.toUpperCase();
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
  document.getElementById("assetTitle").innerText = selWH==="All"?"💰 Total Nilai Barang (All Warehouse):":"🏢 Total Nilai Barang (Gudang "+selWH+"):";
  let hasil = daftarBarang.filter(b=>{
    let wh = b.warehouse||"Bintaro";
    return (selWH==="All"||wh.toUpperCase()===selWH.toUpperCase()) &&
           (b.nama.toLowerCase().includes(keyword)||b.sku.toLowerCase().includes(keyword));
  });
  let total = 0;
  hasil.forEach(b=>{ total+=Number(b.totalPcs)*Number(b.harga); });
  document.getElementById("assetValue").innerText = rpFormat(total);
  if(hasil.length===0){ tabel.innerHTML="<tr><td colspan='10' class='kosong'>Tidak ada data</td></tr>"; attachPagination(tabel,"pg-monitor",0,1,PAGE_SIZE,()=>{}); return; }
  let page = _pageState.monitor;
  let sliced = hasil.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  let rows = sliced.map(function(b,ii){
    let i = (page-1)*PAGE_SIZE+ii;
    let idx = daftarBarang.indexOf(b);
    let pcs = Number(b.totalPcs);
    let uom = hitungUOM(pcs,Number(b.isiKarton));
    let nilaiB = pcs*Number(b.harga);
    let isNeg = pcs<0;
    let stokCell = isNeg
      ? "<span style='color:#c53030;font-weight:700;background:#fff5f5;padding:2px 6px;border-radius:4px;border:1px solid #fc8181'>⚠️ "+pcs+" pcs (selisih)</span>"
      : pcs+" pcs";
    return "<tr style='"+(isNeg?"background:#fff5f5":"")+"'><td>"+(i+1)+"</td><td title='"+b.sku+"'>"+b.sku+"</td><td title='"+b.nama+"'>"+b.nama+"</td><td title='"+b.kategori+"'>"+b.kategori+"</td><td><span class='badge badge-gudang'>"+(b.warehouse||"Bintaro")+"</span></td><td>"+stokCell+"</td><td><strong>"+uom+"</strong></td><td>"+rpFormat(b.harga)+"</td><td><strong>"+rpFormat(nilaiB)+"</strong></td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editBarang("+idx+")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusBarang("+idx+")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
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
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.warehouse+"</span></td><td><span class='badge badge-in'>+"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td><td title='"+(r.keterangan||"-")+"'>"+(r.keterangan||"-")+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockIn(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusStockIn(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
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
    let tipeBadge = tipe==="Expired"?"<span class='badge' style='background:#fef3c7;color:#92400e'>⚠️ Expired</span>":tipe==="Damage"?"<span class='badge' style='background:#f3e8ff;color:#6b21a8'>💥 Damage</span>":"<span class='badge badge-out'>📤 Stock Out</span>";
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td>"+tipeBadge+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.warehouse+"</span></td><td><span class='badge badge-out'>-"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td><td title='"+r.ref+"'>"+r.ref+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockOut(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusStockOut(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
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
    return "<tr><td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td><td><span class='badge badge-gudang'>"+r.fromWh+"</span></td><td style='text-align:center;color:#7c3aed;font-weight:700'>→</td><td><span class='badge badge-gudang' style='background:#553c9a'>"+r.toWh+"</span></td><td><span class='badge badge-transfer'>"+r.qty+" pcs</span></td><td><strong>"+uom+"</strong></td><td title='"+r.ref+"'>"+r.ref+"</td><td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editTransfer(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusTransfer(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td></tr>";
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

function getMonthStr(d) {
  return d.toISOString().slice(0, 7); // YYYY-MM
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
  let last30 = getDateStr(30);

  // ── KPI DATA ────────────────────────────────────────────
  let totalNilaiStok = daftarBarang.reduce((s, b) => s + (Number(b.totalPcs) || 0) * (Number(b.harga) || 0), 0);

  let totalSkuAktif = [...new Set(daftarBarang.map(b => b.sku.toUpperCase()))].length;

  let outBulanIni = stockOutLog.filter(r => (r.tanggal || '').slice(0, 7) === thisMonth);
  let nilaiOutBulanIni = outBulanIni.reduce((s, r) => s + (r.qty || 0) * (r.harga || 0), 0);
  let qtyOutBulanIni = outBulanIni.reduce((s, r) => s + (r.qty || 0), 0);

  let inBulanIni = stockInLog.filter(r => (r.tanggal || '').slice(0, 7) === thisMonth);
  let nilaiInBulanIni = inBulanIni.reduce((s, r) => s + (r.qty || 0) * (r.harga || 0), 0);

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

  // ── RENDER KPI CARDS ───────────────────────────────────
  let kpiRow = document.getElementById('db-kpi-row');
  kpiRow.innerHTML = [
    { icon: '💰', label: 'Nilai Stok', val: rpFormat(totalNilaiStok), color: '#2b6cb0' },
    { icon: '📦', label: 'SKU Aktif', val: totalSkuAktif + ' SKU', color: '#065f46' },
    { icon: '📤', label: 'Out Bulan Ini', val: rpFormat(nilaiOutBulanIni), color: '#991b1b', sub: qtyOutBulanIni.toLocaleString('id-ID') + ' pcs' },
    { icon: '📥', label: 'In Bulan Ini', val: rpFormat(nilaiInBulanIni), color: '#553c9a' },
    { icon: '🚀', label: 'Fast / Med / Slow', val: cF + ' / ' + cM + ' / ' + cS, color: '#0369a1', sub: cN + ' no data' },
  ].map(k => `
    <div style="background:white;border-radius:6px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <div style="font-size:11px;color:#718096;margin-bottom:4px">${k.icon} ${k.label}</div>
      <div style="font-size:15px;font-weight:700;color:${k.color}">${k.val}</div>
      ${k.sub ? `<div style="font-size:10px;color:#a0aec0;margin-top:2px">${k.sub}</div>` : ''}
    </div>`).join('');

  // ── CHART 1: Stock Out 7 hari terakhir (ctn) ──────────
  destroyChart('out7');
  let labels7 = [], data7 = [];
  for (let i = 6; i >= 0; i--) {
    let dStr = getDateStr(i);
    let label = new Date(dStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    labels7.push(label);
    let dayOut = stockOutLog.filter(r => r.tanggal === dStr);
    let ctn = dayOut.reduce((s, r) => {
      let isi = getIsiKarton(r.sku);
      return s + (r.qty || 0) / isi;
    }, 0);
    data7.push(Math.round(ctn * 10) / 10);
  }
  let ctx7 = document.getElementById('db-chart-out7').getContext('2d');
  _dbCharts['out7'] = new Chart(ctx7, {
    type: 'bar',
    data: {
      labels: labels7,
      datasets: [{ label: 'Ctn Keluar', data: data7, backgroundColor: 'rgba(59,130,246,.7)', borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
  });

  // ── CHART 2: Top 5 SKU bulan ini ───────────────────────
  destroyChart('top5');
  let skuTotals = {};
  outBulanIni.forEach(r => {
    let k = r.sku.toUpperCase();
    let isi = getIsiKarton(r.sku);
    skuTotals[k] = (skuTotals[k] || 0) + (r.qty || 0) / isi;
  });
  let top5 = Object.entries(skuTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let labelMap = {};
  daftarBarang.forEach(b => { if (!labelMap[b.sku.toUpperCase()]) labelMap[b.sku.toUpperCase()] = b.nama; });
  let ctx5 = document.getElementById('db-chart-top5').getContext('2d');
  _dbCharts['top5'] = new Chart(ctx5, {
    type: 'bar',
    data: {
      labels: top5.map(x => (labelMap[x[0]] || x[0]).substring(0, 20)),
      datasets: [{ label: 'Ctn', data: top5.map(x => Math.round(x[1] * 10) / 10), backgroundColor: ['rgba(16,185,129,.75)', 'rgba(59,130,246,.75)', 'rgba(139,92,246,.75)', 'rgba(245,158,11,.75)', 'rgba(239,68,68,.75)'], borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } }
    }
  });

  // ── CHART 3: Donut Moving ──────────────────────────────
  destroyChart('moving');
  let ctxM = document.getElementById('db-chart-moving').getContext('2d');
  _dbCharts['moving'] = new Chart(ctxM, {
    type: 'doughnut',
    data: {
      labels: ['Fast', 'Medium', 'Slow', 'No Data'],
      datasets: [{ data: [cF, cM, cS, cN], backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#d1d5db'], borderWidth: 2 }]
    },
    options: { responsive: false, plugins: { legend: { display: false } }, cutout: '65%' }
  });
  document.getElementById('db-moving-legend').innerHTML = [
    { c: '#10b981', l: 'Fast', v: cF }, { c: '#f59e0b', l: 'Medium', v: cM },
    { c: '#ef4444', l: 'Slow', v: cS }, { c: '#d1d5db', l: 'No Data', v: cN }
  ].map(x => `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
    <div style="width:10px;height:10px;border-radius:2px;background:${x.c};flex-shrink:0"></div>
    <span style="color:#4a5568">${x.l}</span><span style="margin-left:auto;font-weight:700">${x.v}</span></div>`).join('');

  // ── TABLE: Low / Critical Stock ────────────────────────
  let lowItems = [];
  let seen2 = {};
  daftarBarang.forEach(b => {
    let key = b.sku.toUpperCase() + '__' + (b.warehouse || 'Bintaro').toUpperCase();
    if (seen2[key]) return; seen2[key] = true;
    let isi = Number(b.isiKarton) || 1;
    let stokCtn = Number(b.totalPcs) / isi;
    let avg30 = hitungAvgOutKarton(b.sku, b.warehouse || 'Bintaro', 30).avgPerHariCtn;
    if (avg30 <= 0) return; // skip no-data
    let hariTahan = stokCtn / avg30;
    if (hariTahan < 30) {
      let avgBln = avg30 * 22;
      lowItems.push({ b, stokCtn, avgBln, hariTahan });
    }
  });
  lowItems.sort((a, b) => a.hariTahan - b.hariTahan);

  let tbody = document.getElementById('db-low-stock-body');
  if (lowItems.length === 0) {
    tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;color:#a0aec0;padding:20px'>✅ Semua stok aman (ketahanan ≥ 1 bulan)</td></tr>";
  } else {
    tbody.innerHTML = lowItems.map(({ b, stokCtn, avgBln, hariTahan }) => {
      let bln = hariTahan / 30;
      let status = hariTahan <= 7
        ? "<span style='background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700'>🔴 Kritis</span>"
        : "<span style='background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700'>🟡 Rendah</span>";
      let warna = hariTahan <= 7 ? '#991b1b' : '#92400e';
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px;color:#4a5568">${b.sku}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.nama}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7"><span style="background:#4a5568;color:white;padding:2px 6px;border-radius:3px;font-size:10px">${b.warehouse || 'Bintaro'}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700">${stokCtn.toFixed(1)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right">${avgBln.toFixed(1)} ctn</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:700;color:${warna}">${bln.toFixed(1)} bln (${Math.round(hariTahan)} hr)</td>
        <td style="padding:6px 8px;border-bottom:1px solid #edf2f7;text-align:center">${status}</td>
      </tr>`;
    }).join('');
  }
}

console.log("⚡ Performance optimizations loaded: debounce, pagination, DocumentFragment, throttled Firebase save");

