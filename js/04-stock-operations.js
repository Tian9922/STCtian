// =========================================================================
// MONITOR STOK
// =========================================================================
function tambahBarang(){
  let skuInput=document.getElementById("sku").value.trim();
  let fullSku=document.getElementById("sku").getAttribute("data-full-sku");
  let kategori=document.getElementById("kategori").value.trim();
  let nama=document.getElementById("nama").value.trim();
  let isiKarton=document.getElementById("isiKarton").value;
  let warehouse=document.getElementById("warehouse").value;
  let totalPcs=document.getElementById("totalPcs").value;
  let harga=document.getElementById("harga").value;
  if(!skuInput||!nama||!totalPcs||!isiKarton||!harga){ alert(t("alert_fill_all")); return; }
  let skuFinal=fullSku?fullSku:skuInput.toUpperCase();
  let semuaMaster=dapatkanSemuaMasterData();
  let cekMaster=semuaMaster.find(i=>i.sku.toUpperCase()===skuFinal.toUpperCase());
  if(!cekMaster){
    customMasterData.push({sku:skuFinal,kategori,bintaro:nama,qtyCtn:Number(isiKarton),harga:Number(harga)});
    fbSave("customMasterData", customMasterData);
  }
  if(indexEdit===-1){
    daftarBarang.push({sku:skuFinal,kategori,nama,isiKarton,warehouse,totalPcs,harga:harga||0});
  } else {
    daftarBarang[indexEdit]={sku:skuFinal,kategori,nama,isiKarton,warehouse,totalPcs,harga:harga||0};
    indexEdit=-1;
    document.getElementById("tombolAksi").innerText=t("btn_add_item");
    document.getElementById("tombolBatal").style.display="none";
    document.getElementById("formTitle").innerText=t("add_item_manual");
    document.getElementById("sku").disabled=false;
  }
  fbSave("barang", daftarBarang);
  markDirty("monitor"); resetForm();
}

function editBarang(index){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Hanya Admin yang dapat mengedit data ini."); return; }
  let b=daftarBarang[index];
  document.getElementById("eb-index").value=index;
  document.getElementById("eb-sku").value=b.sku;
  document.getElementById("eb-nama").value=b.nama;
  document.getElementById("eb-isi-ctn").value=b.isiKarton;
  document.getElementById("eb-harga").value=b.harga;
  document.getElementById("eb-warehouse").value=b.warehouse||"Bintaro";
  document.getElementById("eb-total-pcs").value=b.totalPcs;
  document.getElementById("edit-barang-modal").classList.add("open");
}

function simpanEditBarang(){
  if(!isAdmin()){ alert("⛔ Akses ditolak."); return; }
  let index=parseInt(document.getElementById("eb-index").value);
  if(isNaN(index)||index<0||index>=daftarBarang.length) return;
  let b=daftarBarang[index];
  let sku=b.sku.toUpperCase();
  let newIsi=Number(document.getElementById("eb-isi-ctn").value)||0;
  let newHarga=Number(document.getElementById("eb-harga").value)||0;
  let newWh=document.getElementById("eb-warehouse").value;
  let newPcs=Number(document.getElementById("eb-total-pcs").value)||0;

  let hargaBerubah=newHarga!==Number(b.harga);
  let isiBerubah=newIsi!==Number(b.isiKarton);

  // Update entry ini
  b.isiKarton=newIsi;
  b.harga=newHarga;
  b.warehouse=newWh;
  b.totalPcs=newPcs;

  // Jika harga atau isi/ctn berubah → update semua entri dengan SKU yang sama
  if(hargaBerubah||isiBerubah){
    // Update seluruh daftarBarang ber-SKU sama
    daftarBarang.forEach(item=>{
      if(item.sku.toUpperCase()===sku){
        if(hargaBerubah) item.harga=newHarga;
        if(isiBerubah) item.isiKarton=newIsi;
      }
    });
    // Update stockInLog
    stockInLog.forEach(r=>{
      if(r.sku.toUpperCase()===sku){
        if(hargaBerubah) r.harga=newHarga;
        if(isiBerubah) r.isiKarton=newIsi;
      }
    });
    // Update stockOutLog
    stockOutLog.forEach(r=>{
      if(r.sku.toUpperCase()===sku){
        if(hargaBerubah) r.harga=newHarga;
        if(isiBerubah) r.isiKarton=newIsi;
      }
    });
    // Update transferLog
    transferLog.forEach(r=>{
      if(r.sku.toUpperCase()===sku){
        if(hargaBerubah) r.harga=newHarga;
        if(isiBerubah) r.isiKarton=newIsi;
      }
    });
    // Update customMasterData
    let cm=customMasterData.find(m=>m.sku.toUpperCase()===sku);
    if(cm){
      if(hargaBerubah) cm.harga=newHarga;
      if(isiBerubah) cm.qtyCtn=newIsi;
    } else {
      // Belum ada di custom, tambahkan supaya override BASE_MASTER_DATA
      let semuaMaster=dapatkanSemuaMasterData();
      let base=semuaMaster.find(m=>m.sku.toUpperCase()===sku);
      customMasterData.push({
        sku:b.sku, kategori:b.kategori||"General",
        bintaro:b.nama, qtyCtn:newIsi, harga:newHarga
      });
    }
    fbSave("customMasterData", customMasterData);
    fbSave("stockInLog", stockInLog);
    fbSave("stockOutLog", stockOutLog);
    fbSave("transferLog", transferLog);
  }

  fbSave("barang", daftarBarang);
  tutupModalEditBarang(null);
  markDirty("monitor","in","out","transfer","ledger","analisis");
  if(hargaBerubah||isiBerubah){
    let msg="✅ Tersimpan!";
    if(hargaBerubah&&isiBerubah) msg+="\n📢 Harga & Isi/Ctn diupdate ke seluruh data SKU ini.";
    else if(hargaBerubah) msg+="\n📢 Harga diupdate ke seluruh data SKU ini.";
    else msg+="\n📢 Isi/Ctn diupdate ke seluruh data SKU ini.";
    alert(msg);
  }
}

function tutupModalEditBarang(e){
  if(e&&e.target!==document.getElementById("edit-barang-modal")) return;
  document.getElementById("edit-barang-modal").classList.remove("open");
}

function batalEdit(){
  indexEdit=-1;
}

function tambahBarang(){
  // no-op, form removed
}

function resetForm(){
  // no-op, form removed
}

function hapusBarang(index){
  if(!isAdmin()){ alert("⛔ Akses ditolak."); return; }
  if(confirm(t("confirm_delete_row"))){ daftarBarang.splice(index,1); fbSave("barang", daftarBarang); markDirty("monitor"); }
}

function hapusSemuaBarang(){
  if(!isAdmin()){ alert("⛔ Akses ditolak."); return; }
  let sel=document.getElementById("filterWarehouse").value;
  if(confirm(t("confirm_delete_all"))){
    if(sel==="All") daftarBarang=[];
    else daftarBarang=daftarBarang.filter(i=>(i.warehouse||"Bintaro").toUpperCase()!==sel.toUpperCase());
    fbSave("barang", daftarBarang);
    markDirty("monitor");
  }
}

function tampilkanTabel(){
  let tabel=document.getElementById("tabelBarang");
  let keyword=document.getElementById("search").value.toLowerCase();
  let selWH=document.getElementById("filterWarehouse").value;
  tabel.innerHTML="";
  document.getElementById("assetTitle").innerText=selWH==="All"?"💰 Total Nilai Barang (All Warehouse):":"🏢 Total Nilai Barang (Gudang "+selWH+"):";
  let total=0;
  let hasil=daftarBarang.filter(b=>{
    let wh=(b.warehouse||"Bintaro");
    return (selWH==="All"||wh.toUpperCase()===selWH.toUpperCase())&&(b.nama.toLowerCase().includes(keyword)||b.sku.toLowerCase().includes(keyword));
  });
  hasil.forEach(b=>{ total+=Number(b.totalPcs)*Number(b.harga); });
  document.getElementById("assetValue").innerText=rpFormat(total);
  if(hasil.length===0){ tabel.innerHTML=emptyStateRow(10,"📦","Belum ada barang","Tambahkan barang lewat form di sebelah kiri atau upload template Excel."); return; }
  hasil.forEach(function(b,i){
    let idx=daftarBarang.indexOf(b);
    let pcs=Number(b.totalPcs);
    let uom=hitungUOM(pcs,Number(b.isiKarton));
    let nilaiB=pcs*Number(b.harga);
    let isNeg=pcs<0;
    let stokCell=isNeg
      ?"<span style='color:#c53030;font-weight:700;background:#fff5f5;padding:2px 6px;border-radius:4px;border:1px solid #fc8181'>⚠️ "+pcs+" pcs (selisih)</span>"
      :pcs+" pcs";
    let rowStyle=isNeg?"background:#fff5f5":"";
    tabel.innerHTML+="<tr style='"+rowStyle+"'>"+
      "<td>"+(i+1)+"</td><td title='"+b.sku+"'>"+b.sku+"</td><td title='"+b.nama+"'>"+b.nama+"</td>"+
      "<td title='"+b.kategori+"'>"+b.kategori+"</td>"+
      "<td><span class='badge badge-gudang'>"+(b.warehouse||"Bintaro")+"</span></td>"+
      "<td>"+stokCell+"</td><td><strong>"+uom+"</strong></td>"+
      "<td>"+rpFormat(b.harga)+"</td><td><strong>"+rpFormat(nilaiB)+"</strong></td>"+
      "<td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editBarang("+idx+")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusBarang("+idx+")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td>"+
    "</tr>";
  });
}

// =========================================================================
// EXPORT MONITOR STOK & INTRANSIT
// =========================================================================
function exportMonitorStok(){
  let keyword=document.getElementById("search").value.toLowerCase();
  let selWH=document.getElementById("filterWarehouse").value;
  let hasil=daftarBarang.filter(b=>{
    let wh=b.warehouse||"Bintaro";
    return (selWH==="All"||wh.toUpperCase()===selWH.toUpperCase())&&
           (b.nama.toLowerCase().includes(keyword)||b.sku.toLowerCase().includes(keyword));
  });
  if(hasil.length===0){ alert("⚠️ Tidak ada data untuk di-export!"); return; }
  let rows=[["SKU","Nama Barang","Kategori","Gudang","Qty (pcs)","Konversi","Harga Satuan","Total Nilai"]];
  hasil.forEach(b=>{
    let uom=hitungUOM(Number(b.totalPcs),Number(b.isiKarton));
    let nilai=Number(b.totalPcs)*Number(b.harga);
    rows.push([b.sku,b.nama,b.kategori||"-",b.warehouse||"Bintaro",b.totalPcs,uom,b.harga,nilai]);
  });
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:30},{wch:38},{wch:22},{wch:12},{wch:10},{wch:14},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb,ws,"Monitor Stok");
  XLSX.writeFile(wb,"Monitor_Stok_Export.xlsx");
}

function exportIntransit(){
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
  if(hasil.length===0){ alert("⚠️ Tidak ada data untuk di-export!"); return; }
  let rows=[["Tgl. Masuk","SKU","Nama Barang","Qty (pcs)","Konversi","Status","Keterangan","Gudang Tujuan","Tgl. Complete"]];
  hasil.forEach(r=>{
    let uom=hitungUOM(r.qty,r.isiKarton||0);
    rows.push([r.tanggal,r.sku,r.nama,r.qty,uom,r.status||"InTransit",r.keterangan||"-",r.warehouse||"-",r.tglComplete||"-"]);
  });
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:12},{wch:30},{wch:38},{wch:10},{wch:14},{wch:12},{wch:30},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,"InTransit");
  XLSX.writeFile(wb,"InTransit_Export.xlsx");
}

// =========================================================================
// STOCK IN
// =========================================================================
function simpanStockIn(){
  if(!canInput()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin/Staff Gudang."); return; }
  let tanggal=document.getElementById("in-tanggal").value;
  let skuRaw=document.getElementById("in-sku").value.trim();
  let fullSku=document.getElementById("in-sku").getAttribute("data-full-sku");
  let nama=document.getElementById("in-nama").value.trim();
  let kategori=document.getElementById("in-kategori").value.trim();
  let isiKarton=document.getElementById("in-isiKarton").value;
  let harga=document.getElementById("in-harga").value;
  let warehouse=document.getElementById("in-warehouse").value;
  let qty=document.getElementById("in-qty").value;
  let ref=document.getElementById("in-ref").value.trim();
  let keterangan=document.getElementById("in-keterangan").value.trim();
  if(!tanggal||!skuRaw||!nama||!qty||Number(qty)<=0){ alert(t("alert_fill_all")); return; }
  let skuFinal=fullSku||skuRaw.toUpperCase();

  if(editingInId!==null){
    let oldIdx=stockInLog.findIndex(r=>r.id==editingInId);
    if(oldIdx!==-1){
      let old=stockInLog[oldIdx];
      let oldItem=daftarBarang.find(b=>b.sku.toUpperCase()===old.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===old.warehouse.toUpperCase());
      if(oldItem) oldItem.totalPcs=Number(oldItem.totalPcs)-old.qty;
      stockInLog.splice(oldIdx,1);
    }
    editingInId=null;
    document.getElementById("in-tombol-aksi").innerHTML="✅ "+t("btn_save_in").replace("✅ ","");
    document.getElementById("in-tombol-batal").style.display="none";
  }

  let entry={id:Date.now()+Math.random(),tanggal,sku:skuFinal,kategori,nama,isiKarton:Number(isiKarton)||0,warehouse,qty:Number(qty),harga:Number(harga)||0,ref:ref||"-",keterangan:keterangan||"-"};
  stockInLog.push(entry);
  let existing=daftarBarang.find(b=>b.sku.toUpperCase()===skuFinal.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===warehouse.toUpperCase());
  if(existing){ existing.totalPcs=Number(existing.totalPcs)+Number(qty); }
  else { daftarBarang.push({sku:skuFinal,kategori,nama,isiKarton:Number(isiKarton)||0,warehouse,totalPcs:Number(qty),harga:Number(harga)||0}); }
  fbSave("stockInLog", stockInLog);
  fbSave("barang", daftarBarang);
  markDirty("in","monitor","ledger","analisis");
  document.getElementById("in-sku").value="";
  document.getElementById("in-sku").removeAttribute("data-full-sku");
  ["in-nama","in-kategori","in-isiKarton","in-harga","in-qty","in-ref","in-keterangan"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("in-skuAlert").style.display="none";
  alert(t("alert_ok"));
}

function editStockIn(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let r=stockInLog.find(x=>x.id==id); if(!r) return;
  editingInId=id;
  document.getElementById("in-tanggal").value=r.tanggal;
  document.getElementById("in-sku").value=r.sku;
  document.getElementById("in-sku").setAttribute("data-full-sku",r.sku);
  document.getElementById("in-nama").value=r.nama;
  document.getElementById("in-kategori").value=r.kategori;
  document.getElementById("in-isiKarton").value=r.isiKarton;
  document.getElementById("in-harga").value=r.harga;
  document.getElementById("in-warehouse").value=r.warehouse;
  document.getElementById("in-qty").value=r.qty;
  document.getElementById("in-ref").value=r.ref||"-";
  document.getElementById("in-keterangan").value=r.keterangan||"";
  document.getElementById("in-tombol-aksi").innerText="💾 Simpan Edit";
  document.getElementById("in-tombol-batal").style.display="inline-block";
  document.getElementById("tab-in").scrollIntoView();
}

function batalEditIn(){
  editingInId=null;
  document.getElementById("in-tombol-aksi").innerText="✅ Simpan Stock In";
  document.getElementById("in-tombol-batal").style.display="none";
  ["in-sku","in-nama","in-kategori","in-isiKarton","in-harga","in-qty","in-ref","in-keterangan"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("in-sku").removeAttribute("data-full-sku");
}

function tampilkanStockIn(){
  let tbody=document.getElementById("tabelStockIn");
  let keyword=document.getElementById("in-search").value.toLowerCase();
  let from=document.getElementById("in-filter-from").value;
  let to=document.getElementById("in-filter-to").value;
  let wh=document.getElementById("in-filter-wh").value;
  tbody.innerHTML="";
  let hasil=stockInLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.keterangan||"").toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from;
    let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase();
    return matchK&&matchF&&matchT&&matchW;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML=emptyStateRow(11,"📥",t("no_data_in"),"Transaksi Stock In yang kamu simpan akan muncul di sini."); return; }
  hasil.forEach(function(r,i){
    let uom=hitungUOM(r.qty,r.isiKarton);
    let nilai=r.qty*r.harga;
    tbody.innerHTML+="<tr>"+
      "<td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td>"+
      "<td><span class='badge badge-gudang'>"+r.warehouse+"</span></td>"+
      "<td><span class='badge badge-in'>+"+r.qty+" pcs</span></td>"+
      "<td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td>"+
      "<td title='"+(r.keterangan||"-")+"'>"+(r.keterangan||"-")+"</td>"+
      "<td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockIn(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusStockIn(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td>"+
    "</tr>";
  });
}

function hapusStockIn(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  if(!confirm(t("confirm_delete_row"))) return;
  let idx=stockInLog.findIndex(r=>r.id==id);
  if(idx!==-1){
    let r=stockInLog[idx];
    let existing=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
    if(existing){ existing.totalPcs=Number(existing.totalPcs)-r.qty; }
    stockInLog.splice(idx,1);
    fbSave("stockInLog", stockInLog);
    fbSave("barang", daftarBarang);
    markDirty("in","monitor","ledger","analisis");
  }
}

function hapusSemuaStockIn(){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let wh=document.getElementById("in-filter-wh").value;
  if(!confirm(t("confirm_delete_all"))) return;
  let toRevert = wh==="All"?stockInLog:stockInLog.filter(r=>(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase());
  toRevert.forEach(r=>{
    let item=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
    if(item) item.totalPcs=Number(item.totalPcs)-r.qty;
  });
  if(wh==="All") stockInLog=[];
  else stockInLog=stockInLog.filter(r=>(r.warehouse||"Bintaro").toUpperCase()!==wh.toUpperCase());
  fbSave("stockInLog", stockInLog);
  fbSave("barang", daftarBarang);
  markDirty("in","monitor","ledger","analisis");
}

function exportStockIn(){
  let from=document.getElementById("in-filter-from").value;
  let to=document.getElementById("in-filter-to").value;
  let wh=document.getElementById("in-filter-wh").value;
  let keyword=document.getElementById("in-search").value.toLowerCase();
  let hasil=stockInLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from; let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase();
    return matchK&&matchF&&matchT&&matchW;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  let rows=[["Tanggal","SKU","Nama Barang","Kategori","Gudang","Qty Masuk","Harga Satuan","Total Nilai","Keterangan"]];
  hasil.forEach(r=>rows.push([r.tanggal,r.sku,r.nama,r.kategori,r.warehouse,r.qty,r.harga,r.qty*r.harga,r.keterangan||"-"]));
  let wb=XLSX.utils.book_new(); let ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,"Stock In"); XLSX.writeFile(wb,"Stock_In_Export.xlsx");
}

// =========================================================================
// STOCK OUT
// =========================================================================
function updateOutTipe(){
  let tipe=document.getElementById("out-tipe").value;
  let btn=document.getElementById("out-tombol-aksi");
  if(tipe==="Expired"){
    btn.className="btn btn-orange"; btn.innerHTML="✅ Simpan Expired";
  } else if(tipe==="Damage"){
    btn.className="btn"; btn.style.cssText="background:#6b21a8;color:white;width:100%;margin-top:6px";
    btn.innerHTML="✅ Simpan Damage";
  } else {
    btn.className="btn btn-red"; btn.style.cssText=""; btn.innerHTML="✅ Simpan Stock Out";
  }
}

function simpanStockOut(){
  if(!canInput()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin/Staff Gudang."); return; }
  let tanggal=document.getElementById("out-tanggal").value;
  let tipe=document.getElementById("out-tipe").value;
  let skuRaw=document.getElementById("out-sku").value.trim();
  let fullSku=document.getElementById("out-sku").getAttribute("data-full-sku");
  let nama=document.getElementById("out-nama").value.trim();
  let kategori=document.getElementById("out-kategori").value.trim();
  let isiKarton=document.getElementById("out-isiKarton").value;
  let harga=document.getElementById("out-harga").value;
  let warehouse=document.getElementById("out-warehouse").value;
  let qty=document.getElementById("out-qty").value;
  let ref=document.getElementById("out-ref").value.trim();
  if(!tanggal||!skuRaw||!nama||!qty||Number(qty)<=0){ alert(t("alert_fill_all")); return; }
  let skuFinal=fullSku||skuRaw.toUpperCase();

  if(editingOutId!==null){
    let oldIdx=stockOutLog.findIndex(r=>r.id==editingOutId);
    if(oldIdx!==-1){
      let old=stockOutLog[oldIdx];
      let oldItem=daftarBarang.find(b=>b.sku.toUpperCase()===old.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===old.warehouse.toUpperCase());
      if(oldItem) oldItem.totalPcs=Number(oldItem.totalPcs)+old.qty; // restore old qty
      stockOutLog.splice(oldIdx,1);
    }
    editingOutId=null;
    updateOutTipe();
    document.getElementById("out-tombol-batal").style.display="none";
  }

  let existing=daftarBarang.find(b=>b.sku.toUpperCase()===skuFinal.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===warehouse.toUpperCase());
  let stokSaat=existing?Number(existing.totalPcs):0;
  if(stokSaat<Number(qty)){
    let selisih=Number(qty)-stokSaat;
    if(!confirm((stokSaat<0?"⚠️ Stok sudah minus "+Math.abs(stokSaat)+" pcs! ":"⚠️ Stok tidak mencukupi! Stok tersedia: "+stokSaat+" pcs. ")+"Akan ada selisih "+selisih+" pcs yang tercatat sebagai hutang stok. Tetap lanjut?")){ return; }
  }
  let entry={id:Date.now()+Math.random(),tanggal,tipe:tipe||"Stock Out",sku:skuFinal,kategori,nama,isiKarton:Number(isiKarton)||0,warehouse,qty:Number(qty),harga:Number(harga)||0,ref:ref||"-"};
  stockOutLog.push(entry);
  if(existing){ existing.totalPcs=Number(existing.totalPcs)-Number(qty); }
  // Note: totalPcs CAN go negative (selisih/hutang stok) - intentional by design
  fbSave("stockOutLog", stockOutLog);
  fbSave("barang", daftarBarang);
  markDirty("out","monitor","ledger","analisis");
  document.getElementById("out-sku").value="";
  document.getElementById("out-sku").removeAttribute("data-full-sku");
  document.getElementById("out-tipe").value="Stock Out";
  updateOutTipe();
  ["out-nama","out-kategori","out-isiKarton","out-harga","out-qty","out-ref"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("out-skuAlert").style.display="none";
  alert(t("alert_ok"));
}

function editStockOut(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let r=stockOutLog.find(x=>x.id==id); if(!r) return;
  editingOutId=id;
  document.getElementById("out-tanggal").value=r.tanggal;
  document.getElementById("out-tipe").value=r.tipe||"Stock Out";
  updateOutTipe();
  document.getElementById("out-sku").value=r.sku;
  document.getElementById("out-sku").setAttribute("data-full-sku",r.sku);
  document.getElementById("out-nama").value=r.nama;
  document.getElementById("out-kategori").value=r.kategori;
  document.getElementById("out-isiKarton").value=r.isiKarton;
  document.getElementById("out-harga").value=r.harga;
  document.getElementById("out-warehouse").value=r.warehouse;
  document.getElementById("out-qty").value=r.qty;
  document.getElementById("out-ref").value=r.ref;
  document.getElementById("out-tombol-aksi").innerText="💾 Simpan Edit";
  document.getElementById("out-tombol-batal").style.display="inline-block";
}

function batalEditOut(){
  editingOutId=null;
  document.getElementById("out-tipe").value="Stock Out";
  updateOutTipe();
  document.getElementById("out-tombol-batal").style.display="none";
  ["out-sku","out-nama","out-kategori","out-isiKarton","out-harga","out-qty","out-ref"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("out-sku").removeAttribute("data-full-sku");
}

function hapusStockOut(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  if(!confirm(t("confirm_delete_row"))) return;
  let idx=stockOutLog.findIndex(r=>r.id==id);
  if(idx!==-1){
    let r=stockOutLog[idx];
    let existing=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
    if(existing){ existing.totalPcs=Number(existing.totalPcs)+r.qty; } // restore, may stay negative if other deficits exist
    stockOutLog.splice(idx,1);
    fbSave("stockOutLog", stockOutLog);
    fbSave("barang", daftarBarang);
    markDirty("out","monitor","ledger","analisis");
  }
}

function hapusSemuaStockOut(){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let wh=document.getElementById("out-filter-wh").value;
  if(!confirm(t("confirm_delete_all"))) return;
  let toRevert = wh==="All"?stockOutLog:stockOutLog.filter(r=>(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase());
  toRevert.forEach(r=>{
    let item=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.warehouse.toUpperCase());
    if(item) item.totalPcs=Number(item.totalPcs)+r.qty;
  });
  if(wh==="All") stockOutLog=[];
  else stockOutLog=stockOutLog.filter(r=>(r.warehouse||"Bintaro").toUpperCase()!==wh.toUpperCase());
  fbSave("stockOutLog", stockOutLog);
  fbSave("barang", daftarBarang);
  markDirty("out","monitor","ledger","analisis");
}

function tampilkanStockOut(){
  let tbody=document.getElementById("tabelStockOut");
  let keyword=document.getElementById("out-search").value.toLowerCase();
  let from=document.getElementById("out-filter-from").value;
  let to=document.getElementById("out-filter-to").value;
  let wh=document.getElementById("out-filter-wh").value;
  let tipeF=document.getElementById("out-filter-tipe").value;
  tbody.innerHTML="";
  let hasil=stockOutLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.ref||"").toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from;
    let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase();
    let matchTipe=tipeF==="All"||(r.tipe||"Stock Out")===tipeF;
    return matchK&&matchF&&matchT&&matchW&&matchTipe;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML=emptyStateRow(12,"📤",t("no_data_out"),"Transaksi Stock Out yang kamu simpan akan muncul di sini."); return; }
  hasil.forEach(function(r,i){
    let uom=hitungUOM(r.qty,r.isiKarton);
    let nilai=r.qty*r.harga;
    let tipe=r.tipe||"Stock Out";
    let tipeBadge = tipe==="Expired"
      ? "<span class='badge' style='background:#fef3c7;color:#92400e'>⚠️ Expired</span>"
      : tipe==="Damage"
      ? "<span class='badge' style='background:#f3e8ff;color:#6b21a8'>💥 Damage</span>"
      : "<span class='badge badge-out'>📤 Stock Out</span>";
    tbody.innerHTML+="<tr>"+
      "<td>"+(i+1)+"</td><td>"+r.tanggal+"</td>"+
      "<td>"+tipeBadge+"</td>"+
      "<td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td>"+
      "<td><span class='badge badge-gudang'>"+r.warehouse+"</span></td>"+
      "<td><span class='badge badge-out'>-"+r.qty+" pcs</span></td>"+
      "<td><strong>"+uom+"</strong></td><td>"+rpFormat(r.harga)+"</td><td><strong>"+rpFormat(nilai)+"</strong></td>"+
      "<td title='"+r.ref+"'>"+r.ref+"</td>"+
      "<td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editStockOut(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusStockOut(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td>"+
    "</tr>";
  });
}

function exportStockOut(){
  let from=document.getElementById("out-filter-from").value;
  let to=document.getElementById("out-filter-to").value;
  let wh=document.getElementById("out-filter-wh").value;
  let keyword=document.getElementById("out-search").value.toLowerCase();
  let hasil=stockOutLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from; let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||(r.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase();
    return matchK&&matchF&&matchT&&matchW;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  let rows=[["Tanggal","SKU","Nama Barang","Kategori","Gudang","Qty Keluar","Harga Satuan","Total Nilai","Keterangan"]];
  hasil.forEach(r=>rows.push([r.tanggal,r.sku,r.nama,r.kategori,r.warehouse,r.qty,r.harga,r.qty*r.harga,r.ref]));
  let wb=XLSX.utils.book_new(); let ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,"Stock Out"); XLSX.writeFile(wb,"Stock_Out_Export.xlsx");
}

// =========================================================================
// TRANSFER STOK
// =========================================================================
function simpanTransfer(){
  if(!canInput()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin/Staff Gudang."); return; }
  let tanggal=document.getElementById("tr-tanggal").value;
  let skuRaw=document.getElementById("tr-sku").value.trim();
  let fullSku=document.getElementById("tr-sku").getAttribute("data-full-sku");
  let nama=document.getElementById("tr-nama").value.trim();
  let kategori=document.getElementById("tr-kategori").value.trim();
  let isiKarton=document.getElementById("tr-isiKarton").value;
  let harga=document.getElementById("tr-harga").value;
  let fromWh=document.getElementById("tr-from-wh").value;
  let toWh=document.getElementById("tr-to-wh").value;
  let qty=document.getElementById("tr-qty").value;
  let ref=document.getElementById("tr-ref").value.trim();
  if(!tanggal||!skuRaw||!nama||!qty||Number(qty)<=0){ alert(t("alert_fill_all")); return; }
  if(fromWh===toWh){ alert(t("same_warehouse_error")); return; }
  let skuFinal=fullSku||skuRaw.toUpperCase();

  if(editingTrId!==null){
    let oldIdx=transferLog.findIndex(r=>r.id==editingTrId);
    if(oldIdx!==-1){
      let old=transferLog[oldIdx];
      // Reverse old transfer
      let srcItem=daftarBarang.find(b=>b.sku.toUpperCase()===old.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===old.fromWh.toUpperCase());
      let dstItem=daftarBarang.find(b=>b.sku.toUpperCase()===old.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===old.toWh.toUpperCase());
      if(srcItem) srcItem.totalPcs=Number(srcItem.totalPcs)+old.qty;
      if(dstItem) dstItem.totalPcs=Number(dstItem.totalPcs)-old.qty; // may go negative
      transferLog.splice(oldIdx,1);
    }
    editingTrId=null;
    document.getElementById("tr-tombol-aksi").innerHTML="✅ "+t("btn_save_transfer").replace("✅ ","");
    document.getElementById("tr-tombol-batal").style.display="none";
  }

  let srcItem=daftarBarang.find(b=>b.sku.toUpperCase()===skuFinal.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===fromWh.toUpperCase());
  let stokSaat=srcItem?Number(srcItem.totalPcs):0;
  if(stokSaat<Number(qty)){
    let selisih=Number(qty)-stokSaat;
    if(!confirm((stokSaat<0?"⚠️ Stok sudah minus "+Math.abs(stokSaat)+" pcs! ":"⚠️ Stok tidak mencukupi! Stok tersedia: "+stokSaat+" pcs. ")+"Akan ada selisih "+selisih+" pcs yang tercatat sebagai hutang stok. Tetap lanjut?")){ return; }
  }

  let entry={id:Date.now()+Math.random(),tanggal,sku:skuFinal,kategori,nama,isiKarton:Number(isiKarton)||0,harga:Number(harga)||0,fromWh,toWh,qty:Number(qty),ref:ref||"-"};
  transferLog.push(entry);
  // Reduce from source (allow negative - selisih stok)
  if(srcItem){ srcItem.totalPcs=Number(srcItem.totalPcs)-Number(qty); }
  // Add to destination
  let dstItem=daftarBarang.find(b=>b.sku.toUpperCase()===skuFinal.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===toWh.toUpperCase());
  if(dstItem){ dstItem.totalPcs=Number(dstItem.totalPcs)+Number(qty); }
  else { daftarBarang.push({sku:skuFinal,kategori,nama,isiKarton:Number(isiKarton)||0,warehouse:toWh,totalPcs:Number(qty),harga:Number(harga)||0}); }
  fbSave("transferLog", transferLog);
  fbSave("barang", daftarBarang);
  markDirty("transfer","monitor","ledger","analisis");
  // Reset
  document.getElementById("tr-sku").value="";
  document.getElementById("tr-sku").removeAttribute("data-full-sku");
  ["tr-nama","tr-kategori","tr-isiKarton","tr-harga","tr-qty","tr-ref","tr-stok-info"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("tr-skuAlert").style.display="none";
  alert(t("alert_transfer_ok"));
}

function editTransfer(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let r=transferLog.find(x=>x.id==id); if(!r) return;
  editingTrId=id;
  document.getElementById("tr-tanggal").value=r.tanggal;
  document.getElementById("tr-sku").value=r.sku;
  document.getElementById("tr-sku").setAttribute("data-full-sku",r.sku);
  document.getElementById("tr-nama").value=r.nama;
  document.getElementById("tr-kategori").value=r.kategori;
  document.getElementById("tr-isiKarton").value=r.isiKarton;
  document.getElementById("tr-harga").value=r.harga;
  document.getElementById("tr-from-wh").value=r.fromWh;
  document.getElementById("tr-to-wh").value=r.toWh;
  document.getElementById("tr-qty").value=r.qty;
  document.getElementById("tr-ref").value=r.ref;
  updateTrStok();
  document.getElementById("tr-tombol-aksi").innerText="💾 Simpan Edit";
  document.getElementById("tr-tombol-batal").style.display="inline-block";
}

function batalEditTransfer(){
  editingTrId=null;
  document.getElementById("tr-tombol-aksi").innerText="✅ Simpan Transfer";
  document.getElementById("tr-tombol-batal").style.display="none";
  ["tr-sku","tr-nama","tr-kategori","tr-isiKarton","tr-harga","tr-qty","tr-ref","tr-stok-info"].forEach(id=>{ document.getElementById(id).value=""; });
  document.getElementById("tr-sku").removeAttribute("data-full-sku");
}

function hapusTransfer(id){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  if(!confirm(t("confirm_delete_row"))) return;
  let idx=transferLog.findIndex(r=>r.id==id);
  if(idx!==-1){
    let r=transferLog[idx];
    // Reverse the transfer
    let srcItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.fromWh.toUpperCase());
    let dstItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.toWh.toUpperCase());
    if(srcItem) srcItem.totalPcs=Number(srcItem.totalPcs)+r.qty;
    if(dstItem) dstItem.totalPcs=Number(dstItem.totalPcs)-r.qty; // may go negative
    transferLog.splice(idx,1);
    fbSave("transferLog", transferLog);
    fbSave("barang", daftarBarang);
    markDirty("transfer","monitor","ledger","analisis");
  }
}

function hapusSemuaTransfer(){
  if(!isAdmin()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  if(!confirm(t("confirm_delete_all"))) return;
  let wh=document.getElementById("tr-filter-wh").value;
  let toRevert=wh==="All"?transferLog:transferLog.filter(r=>r.fromWh.toUpperCase()===wh.toUpperCase()||r.toWh.toUpperCase()===wh.toUpperCase());
  toRevert.forEach(r=>{
    let srcItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.fromWh.toUpperCase());
    let dstItem=daftarBarang.find(b=>b.sku.toUpperCase()===r.sku.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===r.toWh.toUpperCase());
    if(srcItem) srcItem.totalPcs=Number(srcItem.totalPcs)+r.qty;
    if(dstItem) dstItem.totalPcs=Number(dstItem.totalPcs)-r.qty; // may go negative
  });
  if(wh==="All") transferLog=[];
  else transferLog=transferLog.filter(r=>r.fromWh.toUpperCase()!==wh.toUpperCase()&&r.toWh.toUpperCase()!==wh.toUpperCase());
  fbSave("transferLog", transferLog);
  fbSave("barang", daftarBarang);
  markDirty("transfer","monitor","ledger","analisis");
}

function tampilkanTransfer(){
  let tbody=document.getElementById("tabelTransfer");
  let keyword=document.getElementById("tr-search").value.toLowerCase();
  let from=document.getElementById("tr-filter-from").value;
  let to=document.getElementById("tr-filter-to").value;
  let wh=document.getElementById("tr-filter-wh").value;
  tbody.innerHTML="";
  let hasil=transferLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword)||(r.ref||"").toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from;
    let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||r.fromWh.toUpperCase()===wh.toUpperCase()||r.toWh.toUpperCase()===wh.toUpperCase();
    return matchK&&matchF&&matchT&&matchW;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  if(hasil.length===0){ tbody.innerHTML=emptyStateRow(11,"🔄",t("no_data_transfer"),"Transfer stok antar gudang akan muncul di sini."); return; }
  hasil.forEach(function(r,i){
    let uom=hitungUOM(r.qty,r.isiKarton);
    tbody.innerHTML+="<tr>"+
      "<td>"+(i+1)+"</td><td>"+r.tanggal+"</td><td title='"+r.sku+"'>"+r.sku+"</td><td title='"+r.nama+"'>"+r.nama+"</td>"+
      "<td><span class='badge badge-gudang'>"+r.fromWh+"</span></td>"+
      "<td style='text-align:center;color:#7c3aed;font-weight:700'>→</span></td>"+
      "<td><span class='badge badge-gudang' style='background:#553c9a'>"+r.toWh+"</span></td>"+
      "<td><span class='badge badge-transfer'>"+r.qty+" pcs</span></td>"+
      "<td><strong>"+uom+"</strong></td>"+
      "<td title='"+r.ref+"'>"+r.ref+"</td>"+
      "<td style='text-align:center'>"+(isAdmin()?"<button class='btn-action btn-edit' onclick='editTransfer(\""+r.id+"\")'>Edit</button> <button class='btn-action btn-hapus' onclick='hapusTransfer(\""+r.id+"\")'>Hapus</button>":"<span style='color:#a0aec0;font-size:10px'>-</span>")+"</td>"+
    "</tr>";
  });
}

function exportTransfer(){
  let from=document.getElementById("tr-filter-from").value;
  let to=document.getElementById("tr-filter-to").value;
  let wh=document.getElementById("tr-filter-wh").value;
  let keyword=document.getElementById("tr-search").value.toLowerCase();
  let hasil=transferLog.filter(r=>{
    let matchK=r.sku.toLowerCase().includes(keyword)||r.nama.toLowerCase().includes(keyword);
    let matchF=!from||r.tanggal>=from; let matchT=!to||r.tanggal<=to;
    let matchW=wh==="All"||r.fromWh.toUpperCase()===wh.toUpperCase()||r.toWh.toUpperCase()===wh.toUpperCase();
    return matchK&&matchF&&matchT&&matchW;
  }).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  let rows=[["Tanggal","SKU","Nama Barang","Kategori","Dari Gudang","Ke Gudang","Qty Transfer","Harga","Keterangan"]];
  hasil.forEach(r=>rows.push([r.tanggal,r.sku,r.nama,r.kategori,r.fromWh,r.toWh,r.qty,r.harga,r.ref]));
  let wb=XLSX.utils.book_new(); let ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,"Transfer Stok"); XLSX.writeFile(wb,"Transfer_Stok_Export.xlsx");
}

