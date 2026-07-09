// =========================================================================
// STOCK LEDGER (IN + OUT + TRANSFER) - FIXED SEARCH
// =========================================================================
function tampilkanLedger(){
  let tbody = document.getElementById("tabelLedger");
  let keyword = document.getElementById("led-search").value.toLowerCase().trim();
  let from = document.getElementById("led-from").value;
  let to = document.getElementById("led-to").value;
  let wh = document.getElementById("led-wh").value;
  let type = document.getElementById("led-type").value;
  tbody.innerHTML = "";

  // Gabungkan semua transaksi
  let inData    = stockInLog.map(r => ({...r, tipe:"IN", warehouse: r.warehouse||"Bintaro"}));
  let outData   = stockOutLog.map(r => ({...r, tipe:"OUT", warehouse: r.warehouse||"Bintaro"}));
  let trOutData = transferLog.map(r => ({...r, tipe:"TRANSFER_OUT", warehouse: r.fromWh, ref:"Transfer → "+r.toWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let trInData  = transferLog.map(r => ({...r, tipe:"TRANSFER_IN",  warehouse: r.toWh,   ref:"Transfer ← "+r.fromWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let semua = [...inData, ...outData, ...trOutData, ...trInData];

  // Urutkan ascending dulu (terlama ke terbaru) untuk hitung running balance
  semua.sort((a,b) => {
    let d = a.tanggal.localeCompare(b.tanggal);
    return d !== 0 ? d : (Number(a.id)||0) - (Number(b.id)||0);
  });

  // Hitung running balance per SKU+Gudang
  let runBalance = {}; // key: "SKU|||GUDANG"
  semua.forEach(r => {
    let key = (r.sku||"").toUpperCase()+"|||"+(r.warehouse||"").toUpperCase();
    if(!runBalance[key]) runBalance[key] = 0;
    if(r.tipe==="IN"||r.tipe==="TRANSFER_IN")       runBalance[key] += (r.qty||0);
    else if(r.tipe==="OUT"||r.tipe==="TRANSFER_OUT") runBalance[key] = runBalance[key] - (r.qty||0); // allow negative (selisih)
    r._runBal = runBalance[key];
  });

  // Sekarang filter & urutkan descending untuk tampil
  let hasil = semua.filter(r => {
    let matchKeyword = keyword===""||
                       (r.sku&&r.sku.toLowerCase().includes(keyword))||
                       (r.nama&&r.nama.toLowerCase().includes(keyword));
    let matchF = !from || r.tanggal >= from;
    let matchT = !to   || r.tanggal <= to;
    let matchW = wh==="All" || (r.warehouse||"").toUpperCase()===wh.toUpperCase();
    let matchType = type==="All" || r.tipe===type;
    return matchKeyword && matchF && matchT && matchW && matchType;
  }).sort((a,b) => {
    let d = b.tanggal.localeCompare(a.tanggal);
    return d!==0 ? d : (Number(b.id)||0)-(Number(a.id)||0);
  });

  // Summary cards
  let totalIn  = stockInLog.filter(r=>wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()).reduce((s,r)=>s+(r.qty||0)*(r.harga||0),0);
  let totalOut = stockOutLog.filter(r=>wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase()).reduce((s,r)=>s+(r.qty||0)*(r.harga||0),0);
  let totalStok = daftarBarang.filter(b=>wh==="All"||(b.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase())
                              .reduce((s,b)=>s+(Number(b.totalPcs)||0)*(Number(b.harga)||0),0);
  document.getElementById("led-total-stok").innerText = rpFormat(totalStok);
  document.getElementById("led-total-in").innerText   = rpFormat(totalIn);
  document.getElementById("led-total-out").innerText  = rpFormat(totalOut);
  document.getElementById("led-total-trx").innerText  = hasil.length;

  if(hasil.length===0){
    tbody.innerHTML=emptyStateRow(11,"📋",t("no_data_ledger"),t("hint_ledger_muncul"));
    return;
  }

  hasil.forEach(function(r,i){
    let uomTrx = hitungUOM(r.qty||0, r.isiKarton||0);
    let sisaPcs = r._runBal !== undefined ? r._runBal : 0;
    let sisaUom = hitungUOM(sisaPcs, r.isiKarton||0);
    let badge, qtyTxt;
    if(r.tipe==="IN"){
      badge   = `<span class='badge badge-in'>📥 IN</span>`;
      qtyTxt  = `<span style='color:#065f46;font-weight:700'>+${r.qty||0} pcs</span>`;
    } else if(r.tipe==="OUT"){
      badge   = `<span class='badge badge-out'>📤 OUT</span>`;
      qtyTxt  = `<span style='color:#991b1b;font-weight:700'>-${r.qty||0} pcs</span>`;
    } else if(r.tipe==="TRANSFER_OUT"){
      badge   = `<span class='badge badge-transfer'>🔄 TRF OUT</span>`;
      qtyTxt  = `<span style='color:#3730a3;font-weight:700'>-${r.qty||0} pcs</span>`;
    } else {
      badge   = `<span class='badge badge-transfer' style='background:#d1fae5;color:#065f46'>🔄 TRF IN</span>`;
      qtyTxt  = `<span style='color:#065f46;font-weight:700'>+${r.qty||0} pcs</span>`;
    }

    tbody.innerHTML += `<tr>
      <td>${i+1}</td>
      <td>${r.tanggal||"-"}</td>
      <td>${badge}</td>
      <td title='${r.sku||"-"}'>${r.sku||"-"}</td>
      <td title='${r.nama||"-"}'>${r.nama||"-"}</td>
      <td><span class='badge badge-gudang'>${r.warehouse||"-"}</span></td>
      <td>${qtyTxt}</td>
      <td><strong>${uomTrx}</strong></td>
      <td><strong style='color:${sisaPcs<0?"#c53030":"#2b6cb0"}'>${sisaPcs<0?"⚠️ ":""}${sisaPcs} pcs${sisaPcs<0?" (selisih)":""}</strong></td>
      <td><strong style='color:${sisaPcs<0?"#c53030":"#2b6cb0"}'>${sisaUom}</strong></td>
      <td title='${r.ref||"-"}'>${(r.ref||"-").substring(0,25)}${(r.ref||"").length>25?"...":""}</td>
    </tr>`;
  });
}

function resetLedgerFilter(){
  ["led-search","led-from","led-to"].forEach(id=>{ let el=document.getElementById(id); if(el) el.value=""; });
  let whEl = document.getElementById("led-wh");
  if(whEl) whEl.value="All";
  let typeEl = document.getElementById("led-type");
  if(typeEl) typeEl.value="All";
  markDirty("ledger");
}

function hapusSemuaLedger(){
  if(!isAdmin()){ alert(t("access_denied_admin")); return; }
  if(!confirm(t("confirm_delete_all"))) return;
  let wh=document.getElementById("led-wh").value;
  let type=document.getElementById("led-type").value;
  let whU=wh.toUpperCase();
  let matchWh=(w)=>wh==="All"||(w||"Bintaro").toUpperCase()===whU;

  // ----- Stock IN -----
  if(type==="All"||type==="IN"){
    let toRevert=stockInLog.filter(r=>matchWh(r.warehouse));
    toRevert.forEach(r=>{
      let item=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
      if(item) item.totalPcs=Number(item.totalPcs)-r.qty; // allow negative
    });
    stockInLog=stockInLog.filter(r=>!matchWh(r.warehouse));
  }

  // ----- Stock OUT -----
  if(type==="All"||type==="OUT"){
    let toRevert=stockOutLog.filter(r=>matchWh(r.warehouse));
    toRevert.forEach(r=>{
      let item=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
      if(item) item.totalPcs=Number(item.totalPcs)+r.qty;
    });
    stockOutLog=stockOutLog.filter(r=>!matchWh(r.warehouse));
  }

  // ----- TRANSFER (handle TRANSFER_OUT / TRANSFER_IN / All) -----
  let removeTrIds=new Set();
  transferLog.forEach(r=>{
    let outMatch=matchWh(r.fromWh);
    let inMatch=matchWh(r.toWh);
    let shouldRemove=false;
    if(type==="All"){
      shouldRemove=outMatch||inMatch;
    } else if(type==="TRANSFER_OUT"){
      shouldRemove=outMatch;
    } else if(type==="TRANSFER_IN"){
      shouldRemove=inMatch;
    }
    if(shouldRemove){
      let fromItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.fromWh.toUpperCase());
      let toItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.toWh.toUpperCase());
      if(fromItem) fromItem.totalPcs=Number(fromItem.totalPcs)+r.qty;
      if(toItem)   toItem.totalPcs=Number(toItem.totalPcs)-r.qty; // allow negative
      removeTrIds.add(r.id);
    }
  });
  transferLog=transferLog.filter(r=>!removeTrIds.has(r.id));

  fbSave("stockInLog", stockInLog);
  fbSave("stockOutLog", stockOutLog);
  fbSave("transferLog", transferLog);
  fbSave("barang", daftarBarang);

  markDirty("ledger","in","out","transfer","monitor","analisis");
}

function exportLedger(){
  let keyword=document.getElementById("led-search").value.toLowerCase();
  let from=document.getElementById("led-from").value;
  let to=document.getElementById("led-to").value;
  let wh=document.getElementById("led-wh").value;
  let type=document.getElementById("led-type").value;
  let inData=stockInLog.map(r=>({...r,tipe:"IN",warehouse:r.warehouse||"Bintaro"}));
  let outData=stockOutLog.map(r=>({...r,tipe:"OUT",warehouse:r.warehouse||"Bintaro"}));
  let trOutData=transferLog.map(r=>({...r,tipe:"TRANSFER_OUT",warehouse:r.fromWh,ref:"Transfer → "+r.toWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let trInData=transferLog.map(r=>({...r,tipe:"TRANSFER_IN",warehouse:r.toWh,ref:"Transfer ← "+r.fromWh+(r.ref&&r.ref!=="-"?" | "+r.ref:"")}));
  let semua=[...inData,...outData,...trOutData,...trInData];
  semua.sort((a,b)=>{ let d=a.tanggal.localeCompare(b.tanggal); return d!==0?d:(Number(a.id)||0)-(Number(b.id)||0); });
  // Hitung running balance
  let runBalance={};
  semua.forEach(r=>{
    let key=(r.sku||"").toUpperCase()+"|||"+(r.warehouse||"").toUpperCase();
    if(!runBalance[key]) runBalance[key]=0;
    if(r.tipe==="IN"||r.tipe==="TRANSFER_IN") runBalance[key]+=(r.qty||0);
    else runBalance[key]=runBalance[key]-(r.qty||0); // allow negative (selisih stok)
    r._runBal=runBalance[key];
  });
  let hasil=semua.filter(r=>{
    let matchK=(r.sku||"").toLowerCase().includes(keyword)||(r.nama||"").toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from; let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||(r.warehouse||"").toUpperCase()===wh.toUpperCase();
    let matchType=type==="All"||r.tipe===type;
    return matchK&&matchF&&matchT&&matchW&&matchType;
  }).sort((a,b)=>{ let d=b.tanggal.localeCompare(a.tanggal); return d!==0?d:(Number(b.id)||0)-(Number(a.id)||0); });
  let rows=[["Tanggal","Tipe","SKU","Nama Barang","Kategori","Gudang","Qty","Konversi","Sisa Stok (pcs)","Sisa Stok (Konversi)","Referensi"]];
  hasil.forEach(r=>{
    let qtySign=(r.tipe==="IN"||r.tipe==="TRANSFER_IN")?"+":"-";
    rows.push([r.tanggal,r.tipe,r.sku,r.nama,r.kategori||"-",r.warehouse,qtySign+(r.qty||0),hitungUOM(r.qty||0,r.isiKarton||0),(r._runBal||0),hitungUOM(r._runBal||0,r.isiKarton||0),r.ref||"-"]);
  });
  let wb=XLSX.utils.book_new(); let ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:14},{wch:30},{wch:35},{wch:20},{wch:12},{wch:10},{wch:12},{wch:16},{wch:18},{wch:35}];
  XLSX.utils.book_append_sheet(wb,ws,"Stock Ledger"); XLSX.writeFile(wb,"Stock_Ledger_Export.xlsx");
}

// =========================================================================
// ANALISIS STOK
// =========================================================================
function getDateNDaysAgo(n){
  let d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0];
}

function hitungAvgOut(sku, warehouse, periodeHari){
  let cutoff = periodeHari>0 ? getDateNDaysAgo(periodeHari) : "0000-00-00";
  let filtered=stockOutLog.filter(r=>{
    let matchSku=r.sku.toUpperCase()===sku.toUpperCase();
    let matchWh=warehouse==="All"||(r.warehouse||"Bintaro").toUpperCase()===warehouse.toUpperCase();
    let matchDate=r.tanggal>=cutoff;
    return matchSku&&matchWh&&matchDate;
  });
  let totalQty=filtered.reduce((s,r)=>s+r.qty,0);
  let hari=periodeHari>0?periodeHari:(() => {
    if(stockOutLog.length===0) return 1;
    let dates=stockOutLog.map(r=>r.tanggal).sort();
    let d1=new Date(dates[0]), d2=new Date();
    let diff=Math.ceil((d2-d1)/(1000*60*60*24));
    return Math.max(diff,1);
  })();
  return {totalQty, avgPerHari: hari>0?totalQty/hari:0, hari};
}

function getMovingCategory(avgPerHariCtn){
  // Threshold berdasarkan ctn per 22 hari kerja (1 bulan kerja)
  let monthly = avgPerHariCtn * 22;
  if(monthly >= 50) return "Fast";
  if(monthly >= 30) return "Medium";
  if(monthly > 0)   return "Slow";
  return "NoData";
}

function durBadge(avgPerHari, stokPcs){
  if(avgPerHari<=0) return "<span style='color:#a0aec0;font-size:11px'>∞</span>";
  let hari=stokPcs/avgPerHari;
  let bln=hari/30;
  let warna=bln>=3?"#38a169":bln>=1?"#d69e2e":"#e53e3e";
  return "<span style='font-weight:700;color:"+warna+"'>"+bln.toFixed(1)+" bln <span style='font-weight:400;font-size:10px;color:#718096'>("+Math.round(hari)+" hr)</span></span>";
}

function getIntransitStok(sku){
  // Returns total pcs yang sudah InTransit (bukan Draft, bukan Complete) untuk suatu SKU
  return intransitLog.filter(r=>r.sku.toUpperCase()===sku.toUpperCase()&&r.status==="InTransit")
                     .reduce((s,r)=>s+Number(r.qty),0);
}

function getDraftStok(sku){
  // Returns total pcs yang masih Draft (planning PO belum confirmed) untuk suatu SKU
  return intransitLog.filter(r=>r.sku.toUpperCase()===sku.toUpperCase()&&r.status==="Draft")
                     .reduce((s,r)=>s+Number(r.qty),0);
}

// ==================== FUNGSI HELPER BARU (TAMBAHKAN) ====================
function hitungKarton(totalPcs, isiKarton) {
    if (!isiKarton || isiKarton <= 0) return 0;
    return totalPcs / isiKarton;
}

function hitungAvgOutKarton(sku, warehouse, periodeHari) {
    let cutoff = periodeHari > 0 ? getDateNDaysAgo(periodeHari) : "0000-00-00";
    let filtered = stockOutLog.filter(r => {
        let matchSku = r.sku.toUpperCase() === sku.toUpperCase();
        let matchWh = warehouse === "All" || (r.warehouse || "Bintaro").toUpperCase() === warehouse.toUpperCase();
        let matchDate = r.tanggal >= cutoff;
        return matchSku && matchWh && matchDate;
    });
    let totalQtyPcs = filtered.reduce((s, r) => s + r.qty, 0);
    // Cari isiKarton dari master data
    let semuaMaster = dapatkanSemuaMasterData();
    let master = semuaMaster.find(m => m.sku.toUpperCase() === sku.toUpperCase());
    let isiKarton = master ? (master.qtyCtn || 1) : 1;
    let totalQtyCtn = totalQtyPcs / isiKarton;
    let hari = periodeHari > 0 ? periodeHari : (() => {
        if (stockOutLog.length === 0) return 1;
        let dates = stockOutLog.map(r => r.tanggal).sort();
        let d1 = new Date(dates[0]), d2 = new Date();
        let diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        return Math.max(diff, 1);
    })();
    return { totalQtyPcs, totalQtyCtn, avgPerHariCtn: hari > 0 ? totalQtyCtn / hari : 0, hari };
}

// ==================== FUNGSI TAMPILKAN ANALISIS (REPLACE) ====================
function tampilkanAnalisis() {
    let katSel = document.getElementById("an-kategori");
    if (katSel.options.length <= 1) {
        let kats = [...new Set(daftarBarang.map(b => b.kategori).filter(Boolean))].sort();
        kats.forEach(k => { let o = document.createElement("option"); o.value = k; o.text = k; katSel.appendChild(o); });
    }
    let keyword = document.getElementById("an-search").value.toLowerCase();
    let kat = document.getElementById("an-kategori").value;
    let movFilter = document.getElementById("an-moving").value;
    let periode = parseInt(document.getElementById("an-periode").value) || 0;
    let seen = {}; let items = [];
    daftarBarang.forEach(b => {
        let key = b.sku.toUpperCase() + "__" + (b.warehouse || "Bintaro").toUpperCase();
        if (!seen[key]) { seen[key] = true; items.push(b); }
    });
    let hasil = items.filter(b => {
        let matchK = b.sku.toLowerCase().includes(keyword) || b.nama.toLowerCase().includes(keyword);
        let matchW = matchWarehouseMulti("an-wh", b.warehouse);
        let matchKat = kat === "All" || b.kategori === kat;
        return matchK && matchW && matchKat;
    });
    
    // Cache untuk perhitungan
    let _cacheAvg = {};
    function cachedAvg(sku, w, p) {
        let k = sku + "||" + w + "||" + p;
        if (!_cacheAvg[k]) _cacheAvg[k] = hitungAvgOutKarton(sku, w, p);
        return _cacheAvg[k];
    }

    // Update summary cards (tetap hitung berdasarkan PCS untuk konsistensi kategori)
    let cF = 0, cM = 0, cS = 0, cN = 0;
    hasil.forEach(b => {
        let avgCtn = cachedAvg(b.sku, b.warehouse || "Bintaro", periode).avgPerHariCtn;
        let cat = getMovingCategory(avgCtn);
        if (cat === "Fast") cF++; else if (cat === "Medium") cM++; else if (cat === "Slow") cS++; else cN++;
    });
    document.getElementById("cnt-fast").innerText = cF;
    document.getElementById("cnt-med").innerText = cM;
    document.getElementById("cnt-slow").innerText = cS;
    document.getElementById("cnt-nd").innerText = cN;

    if (movFilter !== "All") {
        hasil = hasil.filter(b => {
            let avgCtn = cachedAvg(b.sku, b.warehouse || "Bintaro", periode).avgPerHariCtn;
            return getMovingCategory(avgCtn) === movFilter;
        });
    }

    let tbody = document.getElementById("tabelAnalisis");
    if (hasil.length === 0) { tbody.innerHTML = "<tr><td colspan='12' class='kosong'>"+t("tidak_ada_data")+"</td></tr>"; return; }
    
    // Sort berdasarkan avg keluar per hari (dalam KARTON)
    hasil.sort((a, b) => cachedAvg(b.sku, b.warehouse || "Bintaro", periode).avgPerHariCtn - cachedAvg(a.sku, a.warehouse || "Bintaro", periode).avgPerHariCtn);

    let rows = hasil.map(function (b, i) {
        let wh2 = b.warehouse || "Bintaro";
        let { totalQtyPcs, totalQtyCtn, avgPerHariCtn } = cachedAvg(b.sku, wh2, periode);
        let avg1Bln = cachedAvg(b.sku, wh2, 30).avgPerHariCtn;
        let avg3Bln = cachedAvg(b.sku, wh2, 90).avgPerHariCtn;
        let avgPcsPerHari = hitungAvgOut(b.sku, wh2, periode).avgPerHari;
        let cat = getMovingCategory(avgPerHariCtn);
        let badgeHtml = cat === "Fast" ? "<span class='badge-fast'>🚀 "+t("badge_fast")+"</span>" :
                        cat === "Medium" ? "<span class='badge-medium'>🔄 "+t("badge_medium")+"</span>" :
                        cat === "Slow" ? "<span class='badge-slow'>🐢 "+t("badge_slow")+"</span>" :
                        "<span class='badge-nodata'>⚪ "+t("badge_nodata")+"</span>";
        
        let stokAktualPcs = Number(b.totalPcs);
        let isiKarton = Number(b.isiKarton) || 1;
        let stokAktualCtn = stokAktualPcs / isiKarton;
        let stokIT = getIntransitStok(b.sku); // dalam PCS
        let stokITCtn = stokIT / isiKarton;
        let stokDraft = getDraftStok(b.sku);
        let stokDraftCtn = stokDraft / isiKarton;
        let totalStokCtn = stokAktualCtn + stokITCtn;
        
        let uomPcs = hitungUOM(stokAktualPcs, isiKarton);
        let itCell = stokIT > 0 ? "<span style='font-size:10px;color:#92400e;font-weight:600'>+" + stokITCtn.toFixed(1) + " ctn</span>" : "<span style='font-size:10px;color:#a0aec0'>-</span>";
        if (stokDraft > 0) itCell += "<br><span style='font-size:10px;color:#2b6cb0'>📝 " + stokDraftCtn.toFixed(1) + " ctn (draft)</span>";
        
        // Avg per Bulan (30hr) dalam KARTON
        let avg1BlnCtn = avg1Bln > 0 ? "<span style='color:#2b6cb0;font-weight:600'>" + (avg1Bln * 22).toFixed(1) + " ctn</span><br><span style='font-size:10px;color:#718096'>" + avg1Bln.toFixed(2) + " ctn/hari kerja</span>" : "<span style='color:#a0aec0;font-size:10px'>-</span>";
        let avg3BlnCtn = avg3Bln > 0 ? "<span style='color:#553c9a;font-weight:600'>" + (avg3Bln * 22).toFixed(1) + " ctn</span><br><span style='font-size:10px;color:#718096'>" + avg3Bln.toFixed(2) + " ctn/hari kerja</span>" : "<span style='color:#a0aec0;font-size:10px'>-</span>";
        
        // Ketahanan Stok dalam BULAN (berdasarkan KARTON)
        let durasiBulan = "-";
        if (avgPerHariCtn > 0) {
            let hari = totalStokCtn / avgPerHariCtn;
            let bln = hari / 30;
            let warna = bln >= 3 ? "#38a169" : bln >= 1 ? "#d69e2e" : "#e53e3e";
            durasiBulan = "<span style='font-weight:700;color:" + warna + "'>" + bln.toFixed(1) + " bln <span style='font-weight:400;font-size:10px;color:#718096'>(" + Math.round(hari) + " hr)</span></span>";
        } else {
            durasiBulan = "<span style='color:#a0aec0;font-size:11px'>∞</span>";
        }

        // Ketahanan Stok: CTN stok + durasi hari/bulan berdasarkan avg periode dipilih
        let ketahananHtml;
        if (avgPerHariCtn > 0) {
            let hariTahan = totalStokCtn / avgPerHariCtn;
            let blnTahan  = hariTahan / 30;
            let warnaKet  = blnTahan >= 3 ? "#38a169" : blnTahan >= 1 ? "#d69e2e" : "#e53e3e";
            ketahananHtml = "<strong>" + totalStokCtn.toFixed(1) + " ctn</strong>"
                          + "<br><span style='font-weight:700;color:" + warnaKet + "'>" + blnTahan.toFixed(1) + " "+t("dash_bln")+"</span>"
                          + "<span style='font-weight:400;font-size:10px;color:#718096'> (" + Math.round(hariTahan) + " "+t("dash_hr")+")</span>";
        } else {
            ketahananHtml = "<strong>" + totalStokCtn.toFixed(1) + " ctn</strong>"
                          + "<br><span style='color:#a0aec0;font-size:11px'>∞</span>";
        }

        return "<tr>" +
            "<td>" + (i + 1) + "</td>" +
            "<td title='" + b.sku + "' style='font-size:10px'>" + b.sku + "</td>" +
            "<td title='" + b.nama + "'>" + b.nama + "</td>" +
            "<td><span class='badge badge-gudang'>" + wh2 + "</span></td>" +
            "<td><strong>" + stokAktualCtn.toFixed(1) + " ctn</strong><br><span style='font-size:9px;color:#718096'>(" + stokAktualPcs + " pcs)</span></td>" +
            "<td>" + itCell + "</td>" +
            "<td><strong>" + uomPcs + "</strong></td>" +
            "<td><strong>" + totalQtyCtn.toFixed(1) + " ctn</strong><br><span style='font-size:9px;color:#718096'>(" + totalQtyPcs + " pcs)</span></td>" +
            "<td>" + avg1BlnCtn + "</td>" +
            "<td>" + avg3BlnCtn + "</td>" +
            "<td>" + badgeHtml + "</td>" +
            "<td>" + ketahananHtml + "</td>" +
            "</tr>";
    });
    tbody.innerHTML = "";
    tbody.appendChild(buildRows(rows));
}

// ==================== FUNGSI EXPORT ANALISIS (REPLACE) ====================
function exportAnalisis() {
    let periode = parseInt(document.getElementById("an-periode").value) || 0;
    let seen = {}; let items = [];
    daftarBarang.forEach(b => {
        let key = b.sku.toUpperCase() + "__" + (b.warehouse || "Bintaro").toUpperCase();
        if (!seen[key]) { seen[key] = true; items.push(b); }
    });
    let rows = [["SKU", "Nama Barang", "Gudang", "Stok (Karton)", "Stok (Pcs)", "Total Out Periode (Karton)", "Total Out Periode (Pcs)", "Avg Out/Hari (Karton)", "Kategori Moving", "Ketahanan (Bulan)", "Ketahanan (Hari)"]];
    
    items.filter(b => matchWarehouseMulti("an-wh", b.warehouse)).forEach(b => {
        let isiK = Number(b.isiKarton) || 1;
        let { totalQtyPcs, totalQtyCtn, avgPerHariCtn } = hitungAvgOutKarton(b.sku, b.warehouse || "Bintaro", periode);
        let avgPcsPerHari = hitungAvgOut(b.sku, b.warehouse || "Bintaro", periode).avgPerHari;
        let cat = getMovingCategory(avgPcsPerHari);
        let stokCtn = Number(b.totalPcs) / isiK;
        let hari = avgPerHariCtn > 0 ? stokCtn / avgPerHariCtn : Infinity;
        let bln = hari === Infinity ? "-" : (hari / 30).toFixed(1);
        rows.push([b.sku, b.nama, b.warehouse || "Bintaro", stokCtn.toFixed(1), b.totalPcs, totalQtyCtn.toFixed(1), totalQtyPcs, avgPerHariCtn.toFixed(2), cat, bln, hari === Infinity ? "∞" : Math.round(hari)]);
    });
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Analisa Stock (Karton)");
    XLSX.writeFile(wb, "Analisis_StokMoving_Karton.xlsx");
}

// =========================================================================
// ANALISIS STOK - PLANNING PO PANEL (inline)
// =========================================================================
let anPOCurrentItem = null; // {sku, nama, stokPcs, isiKarton, avgPerHari, warehouse}

function bukaAnPOPanel(sku, nama, stokPcs, isiKarton, avgPerHari, whEncoded){
  let wh=decodeURIComponent(whEncoded);
  anPOCurrentItem={sku, nama, stokPcs:Number(stokPcs), isiKarton:Number(isiKarton), avgPerHari:Number(avgPerHari), warehouse:wh};
  document.getElementById("an-po-panel").style.display="block";
  document.getElementById("an-po-nama-label").innerText=nama+" ("+sku+") — "+wh;
  document.getElementById("an-po-stok").value=stokPcs;
  document.getElementById("an-po-avg").value=Number(avgPerHari).toFixed(2);
  document.getElementById("an-po-isi").value=isiKarton;
  document.getElementById("an-po-qty-ctn").value="";
  document.getElementById("an-po-preview").style.display="none";
  // Scroll ke atas agar panel terlihat
  document.getElementById("an-po-panel").scrollIntoView({behavior:"smooth",block:"start"});
}

function tutupAnPOPanel(){
  document.getElementById("an-po-panel").style.display="none";
  document.getElementById("an-po-preview").style.display="none";
  anPOCurrentItem=null;
}

function anHitungPO(){
  if(!anPOCurrentItem) return;
  let qtyCtn=parseInt(document.getElementById("an-po-qty-ctn").value)||0;
  let isiK=anPOCurrentItem.isiKarton||1;
  let qtyPcs=qtyCtn*isiK;
  let stokPcs=anPOCurrentItem.stokPcs;
  let avgOut=anPOCurrentItem.avgPerHari;
  let afterPcs=stokPcs+qtyPcs;

  let preview=document.getElementById("an-po-preview");
  if(qtyCtn<=0){ preview.style.display="none"; return; }
  preview.style.display="grid";

  document.getElementById("an-po-res-pcs").innerText=qtyPcs.toLocaleString("id-ID")+" pcs ("+qtyCtn+" ctn)";
  document.getElementById("an-po-res-after").innerText=afterPcs.toLocaleString("id-ID")+" pcs";

  if(avgOut<=0){
    document.getElementById("an-po-res-dur-now").innerText="∞";
    document.getElementById("an-po-res-dur-after").innerText="∞";
  } else {
    let hNow=stokPcs/avgOut;
    let hAfter=afterPcs/avgOut;
    document.getElementById("an-po-res-dur-now").innerText=(hNow/30).toFixed(1)+" "+t("dash_bln")+" ("+Math.round(hNow)+" "+t("dash_hr")+")";
    document.getElementById("an-po-res-dur-after").innerText=(hAfter/30).toFixed(1)+" "+t("dash_bln")+" ("+Math.round(hAfter)+" "+t("dash_hr")+")";
  }
}

function anSimpanPOKeDraft(){
  if(!anPOCurrentItem){ alert(t("tidak_ada_item_dipilih")); return; }
  let qtyCtn=parseInt(document.getElementById("an-po-qty-ctn").value)||0;
  if(qtyCtn<=0){ alert(t("masukkan_jumlah_ctn")); return; }
  let isiK=anPOCurrentItem.isiKarton||1;
  let qtyPcs=qtyCtn*isiK;
  let today=new Date().toISOString().split("T")[0];
  let semuaMaster=dapatkanSemuaMasterData();
  let m=semuaMaster.find(i=>i.sku.toUpperCase()===anPOCurrentItem.sku.toUpperCase());
  // Tambahkan ke intransitLog sebagai Draft
  let entry={
    id:Date.now()+Math.random(),
    tanggal:today,
    sku:anPOCurrentItem.sku,
    nama:anPOCurrentItem.nama,
    qty:qtyPcs,
    isiKarton:isiK,
    harga:m?m.harga:0,
    keterangan:"Planning PO ("+qtyCtn+" ctn)",
    status:"Draft",
    warehouse:"",
    tglComplete:"",
    fromPlanning:true
  };
  intransitLog.push(entry);
  fbSave("intransitLog", intransitLog);
  markDirty("intransit","analisis");
  tutupAnPOPanel();
  tampilkanAnalisis();
  alert(t("po_disimpan_draft")+"\n\n"+t("po_disimpan_draft_hint"));
}

// =========================================================================
// IN TRANSIT
// =========================================================================
let itSelectedItem = null;

function itSuggestion(){
  let val=document.getElementById("it-sku-input").value.trim().toLowerCase();
  let dd=document.getElementById("it-sku-dd");
  if(val.length<2){ dd.style.display="none"; itSelectedItem=null; return; }
  let semuaMaster=dapatkanSemuaMasterData();
  let matches=semuaMaster.filter(m=>m.sku.toLowerCase().includes(val)||m.bintaro.toLowerCase().includes(val)).slice(0,12);
  if(matches.length===0){ dd.style.display="none"; return; }
  dd.innerHTML="";
  matches.forEach(m=>{
    let d=document.createElement("div");
    d.innerHTML="<strong>"+m.sku+"</strong><small>"+m.bintaro+"</small>";
    d.onclick=()=>{
      itSelectedItem=m;
      document.getElementById("it-sku-input").value=m.sku;
      document.getElementById("it-nama").value=m.bintaro;
      document.getElementById("it-isi-ctn").value=m.qtyCtn;
      // recalc ctn if qty pcs already entered
      let pcsNow=parseInt(document.getElementById("it-qty").value)||0;
      if(pcsNow>0&&m.qtyCtn>0) document.getElementById("it-qty-ctn").value=Math.floor(pcsNow/m.qtyCtn);
      dd.style.display="none";
    };
    dd.appendChild(d);
  });
  dd.style.display="block";
}

function itStatusChange(){
  let status=document.getElementById("it-status").value;
  document.getElementById("it-wh-group").style.display=status==="Complete"?"block":"none";
}

function itHitungQtyPcs(){
  let ctn=parseInt(document.getElementById("it-qty-ctn").value)||0;
  let isi=parseInt(document.getElementById("it-isi-ctn").value)||0;
  if(ctn>0&&isi>0) document.getElementById("it-qty").value=ctn*isi;
}

function itHitungQtyCtn(){
  let pcs=parseInt(document.getElementById("it-qty").value)||0;
  let isi=parseInt(document.getElementById("it-isi-ctn").value)||0;
  if(isi>0) document.getElementById("it-qty-ctn").value=pcs>0?Math.floor(pcs/isi):"";
}

function cekNotifIntransit(){
  let today = new Date().toISOString().split("T")[0];
  let todayItems = intransitLog.filter(r => {
    let st = r.status || "InTransit";
    return (st === "InTransit" || st === "Draft") && r.tanggal === today;
  });
  let banner = document.getElementById("it-notif-banner");
  if(!banner) return;
  if(todayItems.length === 0){ 
    banner.style.display = "none"; 
    return; 
  }
  let totalQty = todayItems.reduce((sum, r) => sum + (r.qty || 0), 0);
  let totalCtn = todayItems.reduce((sum, r) => sum + Math.floor((r.qty || 0) / (r.isiKarton || 1)), 0);
  banner.innerHTML = `🔔 ${today} · ${todayItems.length} item In Transit · ${totalQty.toLocaleString()} pcs (${totalCtn.toLocaleString()} ctn)`;
  banner.style.display = "block";
}

function bukaModalIntransit(id){
  let today=new Date().toISOString().split("T")[0];
  if(id===null){
    // Add new
    document.getElementById("it-modal-title").innerText="🚚 Tambah In Transit";
    document.getElementById("it-edit-id").value="";
    document.getElementById("it-tanggal").value=today;
    document.getElementById("it-sku-input").value="";
    document.getElementById("it-nama").value="";
    document.getElementById("it-isi-ctn").value="";
    document.getElementById("it-qty-ctn").value="";
    document.getElementById("it-qty").value="";
    document.getElementById("it-keterangan").value="";
    document.getElementById("it-status").value="Draft";
    document.getElementById("it-wh-group").style.display="none";
    itSelectedItem=null;
  } else {
    // Edit existing
    let r=intransitLog.find(x=>String(x.id)===String(id));
    if(!r) return;
    document.getElementById("it-modal-title").innerText="✏️ Edit In Transit";
    document.getElementById("it-edit-id").value=r.id;
    document.getElementById("it-tanggal").value=r.tanggal;
    document.getElementById("it-sku-input").value=r.sku;
    document.getElementById("it-nama").value=r.nama;
    document.getElementById("it-isi-ctn").value=r.isiKarton||0;
    document.getElementById("it-qty").value=r.qty;
    let isiCtnE=parseInt(r.isiKarton)||0;
    document.getElementById("it-qty-ctn").value=isiCtnE>0?Math.floor(r.qty/isiCtnE):"";
    document.getElementById("it-keterangan").value=r.keterangan||"";
    document.getElementById("it-status").value=r.status||"InTransit";
    if(r.warehouse) document.getElementById("it-warehouse").value=r.warehouse;
    document.getElementById("it-wh-group").style.display=r.status==="Complete"?"block":"none";
    itSelectedItem={sku:r.sku,bintaro:r.nama,qtyCtn:r.isiKarton||0,harga:0,kategori:""};
  }
  document.getElementById("it-modal-overlay").classList.add("open");
}

function tutupModalIntransit(e){
  if(e&&e.target!==document.getElementById("it-modal-overlay")) return;
  document.getElementById("it-modal-overlay").classList.remove("open");
  document.getElementById("it-sku-dd").style.display="none";
}

function simpanIntransit(){
  let tanggal=document.getElementById("it-tanggal").value;
  let skuInput=document.getElementById("it-sku-input").value.trim();
  let nama=document.getElementById("it-nama").value.trim();
  let isiCtn=parseInt(document.getElementById("it-isi-ctn").value)||0;
  let qty=parseInt(document.getElementById("it-qty").value)||0;
  let keterangan=document.getElementById("it-keterangan").value.trim();
  let status=document.getElementById("it-status").value;
  let warehouse=document.getElementById("it-warehouse").value;
  let editId=document.getElementById("it-edit-id").value;

  if(!tanggal||!skuInput||!nama||qty<=0){ alert(t("alert_fill_all")); return; }

  // If status Complete, move stock to warehouse
  if(status==="Complete"){
    // Find or create the record in daftarBarang and add stock
    let existing=daftarBarang.find(b=>b.sku.toUpperCase()===skuInput.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===warehouse.toUpperCase());
    
    // Check if editing existing Complete → don't double-add
    let wasAlreadyComplete=false;
    if(editId){
      let old=intransitLog.find(r=>String(r.id)===String(editId));
      if(old&&old.status==="Complete"&&old.warehouse===warehouse) wasAlreadyComplete=true;
    }

    if(!wasAlreadyComplete){
      // If editing and previously was intransit/hold, no stock reversal needed (stock not yet added)
      // Add stock to warehouse
      if(existing){ existing.totalPcs=Number(existing.totalPcs)+qty; }
      else {
        let semuaMaster=dapatkanSemuaMasterData();
        let m=semuaMaster.find(i=>i.sku.toUpperCase()===skuInput.toUpperCase());
        daftarBarang.push({sku:skuInput,kategori:m?m.kategori:"General",nama:nama,isiKarton:isiCtn,warehouse,totalPcs:qty,harga:m?m.harga:0});
      }
      // Also log as stock in
      let today2=tanggal;
      let semuaMaster=dapatkanSemuaMasterData();
      let m=semuaMaster.find(i=>i.sku.toUpperCase()===skuInput.toUpperCase());
      stockInLog.push({id:Date.now()+Math.random(),tanggal:today2,sku:skuInput,kategori:m?m.kategori:"General",nama,isiKarton:isiCtn,warehouse,qty,harga:m?m.harga:0,ref:"Intransit Complete"});
      fbSave("stockInLog", stockInLog);
      fbSave("barang", daftarBarang);
      markDirty("monitor","in","ledger","analisis");
    }
  } else if(editId){
    // Was editing: if old status was Complete, reverse the stock addition
    let old=intransitLog.find(r=>String(r.id)===String(editId));
    if(old&&old.status==="Complete"){
      let existing2=daftarBarang.find(b=>b.sku.toUpperCase()===old.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===(old.warehouse||"").toUpperCase());
      if(existing2) existing2.totalPcs=Number(existing2.totalPcs)-old.qty;
      // Remove the matching stockIn log
      stockInLog=stockInLog.filter(r=>!(r.sku.toUpperCase()===old.sku.toUpperCase()&&r.ref==="Intransit Complete"&&r.qty===old.qty));
      fbSave("stockInLog", stockInLog);
      fbSave("barang", daftarBarang);
      markDirty("monitor","in","ledger","analisis");
    }
  }

  let tglComplete=status==="Complete"?tanggal:"";

  if(editId){
    let idx=intransitLog.findIndex(r=>String(r.id)===String(editId));
    if(idx!==-1){
      intransitLog[idx]={...intransitLog[idx],tanggal,sku:skuInput,nama,isiKarton:isiCtn,qty,keterangan,status,warehouse:status==="Complete"?warehouse:"",tglComplete};
    }
  } else {
    intransitLog.push({id:Date.now()+Math.random(),tanggal,sku:skuInput,nama,isiKarton:isiCtn,qty,keterangan,status,warehouse:status==="Complete"?warehouse:"",tglComplete});
  }

  fbSave("intransitLog", intransitLog);
  tutupModalIntransit(null);
  tampilkanIntransit();
  markDirty("analisis");
  alert(t("alert_ok"));
}

function tampilkanIntransit(){
  let tbody=document.getElementById("tabelIntransit");
  let keyword=document.getElementById("it-search").value.toLowerCase();
  let from=document.getElementById("it-filter-from").value;
  let to=document.getElementById("it-filter-to").value;
  let statusF=document.getElementById("it-filter-status").value;

  let hasil=intransitLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from;
    let matchT=!to||r.tanggal<=to;
    let matchS=statusF==="All"||(r.status||"InTransit")===statusF;
    return matchK&&matchF&&matchT&&matchS;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));

  // Update summary cards
  document.getElementById("it-cnt-draft").innerText=intransitLog.filter(r=>r.status==="Draft").length+" item";
  document.getElementById("it-cnt-transit").innerText=intransitLog.filter(r=>r.status==="InTransit").length+" item";
  document.getElementById("it-cnt-done").innerText=intransitLog.filter(r=>r.status==="Complete").length+" item";
  document.getElementById("it-cnt-planning").innerText=intransitLog.filter(r=>r.status==="Draft"&&r.fromPlanning).length+" item";
  cekNotifIntransit();

  if(hasil.length===0){ tbody.innerHTML=emptyStateRow(11,"🚚",t("belum_ada_intransit"),t("hint_intransit_muncul")); return; }
  tbody.innerHTML="";
  hasil.forEach(function(r,i){
    let status=r.status||"InTransit";
    let badgeSt=status==="Draft"?"<span class='badge-hold' style='background:#dbeafe;color:#1e40af'>📝 "+t("badge_draft")+"</span>":
                status==="InTransit"?"<span class='badge-intransit'>🚚 "+t("badge_intransit")+"</span>":
                "<span class='badge-complete'>✅ "+t("badge_complete")+"</span>";
    let uom=hitungUOM(r.qty,r.isiKarton||0);
    let whTxt=status==="Complete"?("<span class='badge badge-gudang'>"+(r.warehouse||"-")+"</span>"):"<span style='color:#a0aec0;font-size:10px'>"+t("belum_dipilih")+"</span>";
    let tglComp=r.tglComplete||"-";
    tbody.innerHTML+="<tr>"+
      "<td>"+(i+1)+"</td>"+
      "<td>"+r.tanggal+"</td>"+
      "<td style='font-size:10px' title='"+r.sku+"'>"+r.sku+"</td>"+
      "<td title='"+r.nama+"'>"+r.nama+"</td>"+
      "<td><span class='badge badge-in'>+"+r.qty+" pcs</span></td>"+
      "<td><strong>"+uom+"</strong></td>"+
      "<td>"+badgeSt+"</td>"+
      "<td title='"+(r.keterangan||"")+"'>"+(r.keterangan||"-").substring(0,20)+((r.keterangan||"").length>20?"...":"")+"</td>"+
      "<td>"+whTxt+"</td>"+
      "<td>"+tglComp+"</td>"+
      "<td style='text-align:center;white-space:nowrap'>"+
        "<button class='btn-action btn-edit' onclick='bukaModalIntransit(\""+r.id+"\")'>"+t("btn_edit")+"</button> "+
        (isAdmin()?"<button class='btn-action btn-hapus' onclick='hapusIntransit(\""+r.id+"\")'>"+t("btn_hapus")+"</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+
      "</td>"+
    "</tr>";
  });
}

function hapusIntransit(id){
  if(!isAdmin()){ alert(t("access_denied_admin")); return; }
  if(!confirm(t("confirm_delete_row"))) return;
  let r=intransitLog.find(x=>String(x.id)===String(id));
  if(r&&r.status==="Complete"){
    // Reverse stock if was complete
    let existing=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===(r.warehouse||"").toUpperCase());
    if(existing) existing.totalPcs=Number(existing.totalPcs)-r.qty;
    stockInLog=stockInLog.filter(x=>!(x.sku.toUpperCase()===r.sku.toUpperCase()&&x.ref==="Intransit Complete"&&x.qty===r.qty));
    fbSave("stockInLog", stockInLog);
    fbSave("barang", daftarBarang);
    markDirty("monitor","in","ledger","analisis");
  }
  intransitLog=intransitLog.filter(x=>String(x.id)!==String(id));
  fbSave("intransitLog", intransitLog);
  tampilkanIntransit();
  markDirty("analisis");
}

function hapusSemuaIntransit(){
  if(!isAdmin()){ alert(t("access_denied_admin")); return; }
  if(!confirm(t("confirm_delete_all"))) return;
  // Reverse all completed
  intransitLog.filter(r=>r.status==="Complete").forEach(r=>{
    let existing=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===(r.warehouse||"").toUpperCase());
    if(existing) existing.totalPcs=Number(existing.totalPcs)-r.qty;
  });
  stockInLog=stockInLog.filter(r=>r.ref!=="Intransit Complete");
  intransitLog=[];
  fbSave("intransitLog", intransitLog);
  fbSave("stockInLog", stockInLog);
  fbSave("barang", daftarBarang);
  tampilkanIntransit();
  markDirty("monitor","in","ledger","analisis");
}

