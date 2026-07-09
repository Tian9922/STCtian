// =========================================================================
// HELPER: Parse tanggal dari Excel (berbagai format) → "YYYY-MM-DD"
// =========================================================================
function parseTanggalExcel(val, fallback){
  if(!val) return fallback;
  // Jika berupa angka serial Excel (misal: 46023)
  if(typeof val === "number"){
    let d = new Date(Math.round((val - 25569)*86400*1000));
    if(!isNaN(d)) return d.toISOString().split("T")[0];
    return fallback;
  }
  let s = val.toString().trim();
  if(!s) return fallback;
  // Already YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  let m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m1){
    let dd=m1[1].padStart(2,"0"), mm=m1[2].padStart(2,"0"), yy=m1[3];
    if(yy.length===2) yy="20"+yy;
    return yy+"-"+mm+"-"+dd;
  }
  // DD-Mon-YY or DD-Mon-YYYY (e.g. 02-Jan-26, 05-Feb-2026)
  let m2 = s.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3})[-\/\s](\d{2,4})$/);
  if(m2){
    let months={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
    let dd=m2[1].padStart(2,"0"), mm=months[m2[2].toLowerCase()]||"01", yy=m2[3];
    if(yy.length===2) yy="20"+yy;
    return yy+"-"+mm+"-"+dd;
  }
  // Try native Date parse as last resort
  let d = new Date(s);
  if(!isNaN(d)) return d.toISOString().split("T")[0];
  return fallback;
}

function downloadTemplateSistem(){
  let headerRow=[["Tanggal","Item Code","Item Group","Item Name","Actual Qty","Harga","Qty/Ctn","Keterangan"]];
  let contoh=["02-Jan-26","ABC JELLY STRAWS - ASSORTED 300G","Import - Kids","ABC JELLY STRAW ASSORTED 300/30",150,12956,30,"PO-001"];
  let contoh2=["05-Jan-26","ABC JELLY STRAWS - ASSORTED 300G","Import - Kids","ABC JELLY STRAW ASSORTED 300/30",50,12956,30,"PO-002"];
  headerRow.push(contoh, contoh2);
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(headerRow);
  ws['!cols']=[{wch:14},{wch:35},{wch:20},{wch:35},{wch:12},{wch:12},{wch:12},{wch:25}];
  XLSX.utils.book_append_sheet(wb,ws,"Template");
  XLSX.writeFile(wb,"Template_Inventory_Tian.xlsx");
}

function downloadTemplateStockOut(){
  let rows=[["Tanggal","Item Code","Qty","Warehouse","Keterangan"],
            ["02-Jan-26","STC00093",50,"Bintaro","Customer ABC"],
            ["05-Jan-26","STC00195",100,"Gunsin","Toko XYZ"]];
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:14},{wch:35},{wch:10},{wch:15},{wch:30}];
  XLSX.utils.book_append_sheet(wb,ws,"Template Stock Out");
  XLSX.writeFile(wb,"Template_StockOut.xlsx");
}

function buatHeaderKuning(ws, jumlahKolom){
  let huruf=["A","B","C","D","E","F","G","H","I","J"];
  for(let i=0;i<jumlahKolom;i++){
    let cellAddr=huruf[i]+"1";
    if(!ws[cellAddr]) continue;
    ws[cellAddr].s={
      fill:{patternType:"solid",fgColor:{rgb:"FFFF00"}},
      font:{bold:true,color:{rgb:"000000"}},
      alignment:{horizontal:"center",vertical:"center"},
      border:{
        top:{style:"thin",color:{rgb:"000000"}},
        bottom:{style:"thin",color:{rgb:"000000"}},
        left:{style:"thin",color:{rgb:"000000"}},
        right:{style:"thin",color:{rgb:"000000"}}
      }
    };
  }
}

function downloadTemplateTransfer(){
  let headers=[["Tanggal","Item Code","Nama Barang","Item Group","Actual Qty","Isi/Ctn","Harga","Keterangan"]];
  let contoh=["02-Jan-26","STC00093","BUL RAMEN STIR-FRIED CARBONARA 135GR","Dry - 면류(Noodle)",100,40,11338,"Transfer ke Gunsin"];
  let contoh2=["05-Jan-26","STC00200","SAMYANG HOT CHICKEN 140GR","Dry - 면류(Noodle)",50,40,9500,"Transfer ke Gunsin"];
  headers.push(contoh, contoh2);
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(headers);
  ws['!cols']=[{wch:14},{wch:30},{wch:38},{wch:25},{wch:12},{wch:10},{wch:12},{wch:30}];
  buatHeaderKuning(ws,8);
  XLSX.utils.book_append_sheet(wb,ws,"Template Transfer");
  XLSX.writeFile(wb,"Template_Transfer_Stok.xlsx",{cellStyles:true});
}

function downloadTemplateIntransit(){
  let headers=[["Tanggal","Item Code","Nama Barang","Item Group","Actual Qty","Isi/Ctn","Harga","Keterangan"]];
  let contoh=["02-Jan-26","STC00093","BUL RAMEN STIR-FRIED CARBONARA 135GR","Dry - 면류(Noodle)",100,40,11338,"Pengiriman dari Bintaro"];
  let contoh2=["05-Jan-26","STC00200","SAMYANG HOT CHICKEN 140GR","Dry - 면류(Noodle)",50,40,9500,"Pengiriman dari Bintaro"];
  headers.push(contoh, contoh2);
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(headers);
  ws['!cols']=[{wch:14},{wch:30},{wch:38},{wch:25},{wch:12},{wch:10},{wch:12},{wch:30}];
  buatHeaderKuning(ws,8);
  XLSX.utils.book_append_sheet(wb,ws,"Template InTransit");
  XLSX.writeFile(wb,"Template_InTransit.xlsx",{cellStyles:true});
}

// =========================================================================
// UPLOAD EXCEL - MONITOR (STOCK IN)
// =========================================================================
function prosesUploadExcel(element){
  if(!canInput()){ alert(t("access_denied_staff")); return; }
  let file=element.files[0]; if(!file) return;
  let targetWarehouse=document.getElementById("uploadWarehouse").value;
  let uploadTgl=document.getElementById("uploadTanggal").value;
  if(!uploadTgl){ alert(t("pilih_tanggal_upload")); element.value=""; return; }
  let reader=new FileReader();
  reader.onload=function(e){
    let data=new Uint8Array(e.target.result);
    let workbook=XLSX.read(data,{type:"array"});
    let sheet=workbook.Sheets[workbook.SheetNames[0]];
    let dataJson=XLSX.utils.sheet_to_json(sheet);
    if(dataJson.length===0){ alert(t("file_kosong")); return; }
    let cMB=0,cMU=0,cS=0;
    dataJson.forEach(function(row){
      let rawSku=row["Item Code"], rawKat=row["Item Group"]||"General", rawNama=row["Item Name"];
      let rawQty=row["Actual Qty"]||0, rawHarga=row["Harga"]||0, rawQtyCtn=row["Qty/Ctn"]||0;
      let rawTgl=row["Tanggal"], rawKet=row["Keterangan"]||"";
      if(!rawSku||!rawNama) return;
      // Gunakan tanggal dari kolom, fallback ke uploadTgl jika kosong
      let tglBaris=parseTanggalExcel(rawTgl, uploadTgl);
      let skuF=rawSku.toString().trim();
      let skuU=skuF.toUpperCase();
      let namaF=rawNama.toString().trim();
      let katF=rawKat.toString().trim();
      let qtyF=Math.max(0,parseInt(rawQty)||0);
      let hargaF=Math.max(0,parseFloat(rawHarga)||0);
      let qtyCtnF=Math.max(0,parseInt(rawQtyCtn)||0);

      // Cek/update master data
      let semuaMaster=dapatkanSemuaMasterData();
      let existingMaster=semuaMaster.find(i=>i.sku.toUpperCase()===skuU);
      let cm=customMasterData.find(i=>i.sku.toUpperCase()===skuU);

      if(!existingMaster){
        // SKU baru — daftarkan ke customMaster
        let newMaster={sku:skuF,kategori:katF,bintaro:namaF,qtyCtn:qtyCtnF,harga:hargaF};
        customMasterData.push(newMaster);
        existingMaster=newMaster; cMB++;
      } else {
        // SKU sudah ada — update master jika ada nilai baru
        if(!cm){
          cm={sku:existingMaster.sku,kategori:existingMaster.kategori,bintaro:existingMaster.bintaro,qtyCtn:existingMaster.qtyCtn,harga:existingMaster.harga};
          customMasterData.push(cm);
        }
        let changed=false;
        if(hargaF>0 && cm.harga!==hargaF){ cm.harga=hargaF; existingMaster.harga=hargaF; changed=true; }
        if(qtyCtnF>0 && cm.qtyCtn!==qtyCtnF){ cm.qtyCtn=qtyCtnF; existingMaster.qtyCtn=qtyCtnF; changed=true; }
        if(changed){
          // Propagate ke seluruh data yang ada dengan SKU ini
          daftarBarang.forEach(b=>{ if(b.sku.toUpperCase()===skuU){ if(hargaF>0) b.harga=cm.harga; if(qtyCtnF>0) b.isiKarton=cm.qtyCtn; }});
          stockInLog.forEach(r=>{ if(r.sku.toUpperCase()===skuU){ if(hargaF>0) r.harga=cm.harga; if(qtyCtnF>0) r.isiKarton=cm.qtyCtn; }});
          stockOutLog.forEach(r=>{ if(r.sku.toUpperCase()===skuU){ if(hargaF>0) r.harga=cm.harga; if(qtyCtnF>0) r.isiKarton=cm.qtyCtn; }});
          transferLog.forEach(r=>{ if(r.sku.toUpperCase()===skuU){ if(hargaF>0) r.harga=cm.harga; if(qtyCtnF>0) r.isiKarton=cm.qtyCtn; }});
          cMU++;
        }
      }

      // Tambahkan stok
      if(qtyF>0){
        // Gunakan nilai final dari master (sudah di-update)
        let finalHarga=existingMaster.harga||hargaF||0;
        let finalIsi=existingMaster.qtyCtn||qtyCtnF||0;
        // Cek apakah sudah ada di daftarBarang untuk gudang ini
        let existing=daftarBarang.find(b=>b.sku.toUpperCase()===skuU&&(b.warehouse||"Bintaro").toUpperCase()===targetWarehouse.toUpperCase());
        if(existing){ existing.totalPcs=Number(existing.totalPcs)+qtyF; existing.harga=finalHarga; existing.isiKarton=finalIsi; }
        else { daftarBarang.push({sku:existingMaster.sku||skuF,kategori:existingMaster.kategori||katF,nama:existingMaster.bintaro||namaF,isiKarton:finalIsi,warehouse:targetWarehouse,totalPcs:qtyF,harga:finalHarga}); }
        let today=tglBaris;
        stockInLog.push({id:Date.now()+Math.random(),tanggal:today,sku:existingMaster.sku||skuF,kategori:existingMaster.kategori||katF,nama:existingMaster.bintaro||namaF,isiKarton:finalIsi,warehouse:targetWarehouse,qty:qtyF,harga:finalHarga,ref:"Upload Excel",keterangan:rawKet.toString().trim()||"-"});
        cS++;
      }
    });
    fbSave("customMasterData", customMasterData);
    fbSave("barang", daftarBarang);
    fbSave("stockInLog", stockInLog);
    fbSave("stockOutLog", stockOutLog);
    fbSave("transferLog", transferLog);
    markDirty("monitor","in","ledger","analisis");
    element.value="";
    alert(t("proses_selesai")+"\n- "+cS+" "+t("item_masuk_gudang")+" "+targetWarehouse+".\n- "+cMB+" "+t("sku_baru_terdaftar")+"\n- "+cMU+" "+t("data_master_diperbarui"));
  };
  reader.readAsArrayBuffer(file);
}

// =========================================================================
// UPLOAD EXCEL - STOCK OUT TEMPLATE
// Header: Item Code, Qty, Warehouse, Keterangan
// =========================================================================
function prosesUploadStockOut(element){
  if(!canInput()){ alert(t("access_denied_staff")); return; }
  let file=element.files[0]; if(!file) return;
  let uploadTgl=document.getElementById("out-upload-tanggal").value;
  if(!uploadTgl){ alert(t("pilih_tanggal_upload_out")); element.value=""; return; }
  let reader=new FileReader();
  reader.onload=function(e){
    let data=new Uint8Array(e.target.result);
    let workbook=XLSX.read(data,{type:"array"});
    let sheet=workbook.Sheets[workbook.SheetNames[0]];
    let dataJson=XLSX.utils.sheet_to_json(sheet);
    if(dataJson.length===0){ alert(t("file_kosong")); return; }
    let today=uploadTgl;
    let cOK=0, cSkip=0, cWarn=[];
    let semuaMaster=dapatkanSemuaMasterData();
    dataJson.forEach(function(row){
      let rawSku=row["Item Code"], rawQty=row["Qty"], rawWh=row["Warehouse"]||"Bintaro", rawKet=row["Keterangan"]||"-";
      let rawTgl=row["Tanggal"];
      if(!rawSku||!rawQty) return;
      let tglBaris=parseTanggalExcel(rawTgl, today);
      let skuF=rawSku.toString().trim().toUpperCase();
      let qtyF=Math.max(0,parseInt(rawQty)||0);
      let whF=rawWh.toString().trim();
      if(qtyF<=0){ cSkip++; return; }
      // Find in master
      let match=semuaMaster.find(i=>i.sku.toUpperCase()===skuF);
      if(!match){ cWarn.push(skuF+" (SKU tidak ditemukan)"); cSkip++; return; }
      // Check & reduce stock
      let existing=daftarBarang.find(b=>b.sku.toUpperCase()===skuF&&(b.warehouse||"Bintaro").toUpperCase()===whF.toUpperCase());
      let stokSaat=existing?Number(existing.totalPcs):0;
      if(stokSaat<qtyF){
        cWarn.push(match.bintaro+" @ "+whF+": stok "+stokSaat+", request "+qtyF);
      }
      let entry={id:Date.now()+Math.random(),tanggal:tglBaris,sku:match.sku,kategori:match.kategori,nama:match.bintaro,isiKarton:match.qtyCtn,warehouse:whF,qty:qtyF,harga:match.harga||0,ref:rawKet.toString().trim()||"-"};
      stockOutLog.push(entry);
      if(existing){ existing.totalPcs=Number(existing.totalPcs)-qtyF; }
      cOK++;
    });
    fbSave("stockOutLog", stockOutLog);
    fbSave("barang", daftarBarang);
    markDirty("out","monitor","ledger","analisis");
    element.value="";
    let msg=t("upload_stockout_selesai")+"\n- "+cOK+" "+t("item_berhasil_diproses")+"\n- "+cSkip+" "+t("item_dilewati");
    if(cWarn.length>0) msg+="\n\n"+t("peringatan_stok")+"\n"+cWarn.slice(0,10).join("\n");
    alert(msg);
  };
  reader.readAsArrayBuffer(file);
}

// =========================================================================
// UPLOAD EXCEL - TRANSFER TEMPLATE
// Header: Item Code, Nama Barang, Item Group, Actual Qty, Isi/Ctn, Harga, Keterangan
// =========================================================================
function prosesUploadTransfer(element){
  if(!canInput()){ alert(t("access_denied_staff")); return; }
  let file=element.files[0]; if(!file) return;
  let fromWh=document.getElementById("tr-upload-from-wh").value;
  let toWh=document.getElementById("tr-upload-to-wh").value;
  let uploadTgl=document.getElementById("tr-upload-tanggal").value;
  if(!uploadTgl){ alert(t("pilih_tanggal_transfer")); element.value=""; return; }
  if(!fromWh){ alert(t("pilih_gudang_asal")); element.value=""; return; }
  if(!toWh){ alert(t("pilih_gudang_tujuan")); element.value=""; return; }
  if(fromWh===toWh){ alert(t("gudang_sama_error")); element.value=""; return; }
  let reader=new FileReader();
  reader.onload=function(e){
    let data=new Uint8Array(e.target.result);
    let workbook=XLSX.read(data,{type:"array"});
    let sheet=workbook.Sheets[workbook.SheetNames[0]];
    let dataJson=XLSX.utils.sheet_to_json(sheet);
    if(dataJson.length===0){ alert(t("file_kosong")); return; }
    let today=uploadTgl;
    let cOK=0, cSkip=0, cWarn=[], cMasterUpdate=0;
    let semuaMaster=dapatkanSemuaMasterData();
    dataJson.forEach(function(row){
      let rawSku=row["Item Code"], rawNama=row["Nama Barang"], rawKat=row["Item Group"]||"General";
      let rawQty=row["Actual Qty"], rawIsi=row["Isi/Ctn"]||0, rawHarga=row["Harga"]||0, rawKet=row["Keterangan"]||"-";
      let rawTgl=row["Tanggal"];
      if(!rawSku||!rawQty) return;
      let tglBaris=parseTanggalExcel(rawTgl, today);
      let skuF=rawSku.toString().trim().toUpperCase();
      let qtyF=Math.max(0,parseInt(rawQty)||0);
      let isiF=Math.max(0,parseInt(rawIsi)||0);
      let hargaF=Math.max(0,parseFloat(rawHarga)||0);
      let katF=rawKat.toString().trim();
      if(qtyF<=0){ cSkip++; return; }
      // Cek master, daftarkan jika baru
      let match=semuaMaster.find(i=>i.sku.toUpperCase()===skuF);
      if(!match){
        // SKU baru: daftar ke customMaster
        let namaF=(rawNama||skuF).toString().trim();
        let newMaster={sku:rawSku.toString().trim(),kategori:katF,bintaro:namaF,qtyCtn:isiF,harga:hargaF};
        customMasterData.push(newMaster); match=newMaster;
      } else {
        // Update master jika ada nilai baru
        let cm=customMasterData.find(i=>i.sku.toUpperCase()===skuF);
        if(!cm){ cm={sku:match.sku,kategori:match.kategori,bintaro:match.bintaro,qtyCtn:match.qtyCtn,harga:match.harga}; customMasterData.push(cm); }
        let changed=false;
        if(hargaF>0&&cm.harga!==hargaF){ cm.harga=hargaF; match.harga=hargaF; changed=true; }
        if(isiF>0&&cm.qtyCtn!==isiF){ cm.qtyCtn=isiF; match.qtyCtn=isiF; changed=true; }
        if(katF&&katF!=="General"&&cm.kategori!==katF){ cm.kategori=katF; match.kategori=katF; changed=true; }
        if(changed){
          daftarBarang.forEach(b=>{ if(b.sku.toUpperCase()===skuF){ if(hargaF>0) b.harga=hargaF; if(isiF>0) b.isiKarton=isiF; }});
          stockInLog.forEach(r=>{ if(r.sku.toUpperCase()===skuF){ if(hargaF>0) r.harga=hargaF; }});
          cMasterUpdate++;
        }
      }
      // Cek stok di gudang asal
      let srcItem=daftarBarang.find(b=>b.sku.toUpperCase()===skuF&&(b.warehouse||"Bintaro").toUpperCase()===fromWh.toUpperCase());
      let stokSaat=srcItem?Number(srcItem.totalPcs):0;
      if(stokSaat<qtyF) cWarn.push(match.bintaro+" @ "+fromWh+": stok "+stokSaat+", request "+qtyF);
      // Transfer: kurangi dari asal, tambahkan ke tujuan
      let entry={id:Date.now()+Math.random(),tanggal:tglBaris,sku:match.sku,kategori:match.kategori,nama:match.bintaro,isiKarton:match.qtyCtn,harga:match.harga||0,fromWh:fromWh,toWh:toWh,qty:qtyF,ref:rawKet.toString().trim()||"-"};
      transferLog.push(entry);
      if(srcItem){ srcItem.totalPcs=Number(srcItem.totalPcs)-qtyF; }
      let dstItem=daftarBarang.find(b=>b.sku.toUpperCase()===skuF&&(b.warehouse||"Bintaro").toUpperCase()===toWh.toUpperCase());
      if(dstItem){ dstItem.totalPcs=Number(dstItem.totalPcs)+qtyF; }
      else{ daftarBarang.push({sku:match.sku,kategori:match.kategori,nama:match.bintaro,isiKarton:match.qtyCtn,warehouse:toWh,totalPcs:qtyF,harga:match.harga||0}); }
      cOK++;
    });
    fbSave("customMasterData", customMasterData);
    fbSave("transferLog", transferLog);
    fbSave("barang", daftarBarang);
    markDirty("transfer","monitor","ledger","analisis");
    element.value="";
    let msg=t("upload_transfer_selesai")+"\n- "+cOK+" "+t("item_ditransfer_dari")+" "+fromWh+" → "+toWh+".\n- "+cSkip+" "+t("item_dilewati");
    if(cMasterUpdate>0) msg+="\n- "+cMasterUpdate+" "+t("data_master_diperbarui");
    if(cWarn.length>0) msg+="\n\n"+t("peringatan_stok_kurang")+"\n"+cWarn.slice(0,10).join("\n");
    alert(msg);
  };
  reader.readAsArrayBuffer(file);
}

// =========================================================================
// UPLOAD EXCEL - INTRANSIT TEMPLATE
// Header: Item Code, Nama Barang, Item Group, Actual Qty, Isi/Ctn, Harga, Keterangan
// =========================================================================
function prosesUploadIntransit(element){
  let file=element.files[0]; if(!file) return;
  if(!canInput()){ alert(t("access_denied_staff")); element.value=""; return; }
  let uploadTgl=document.getElementById("it-upload-tanggal").value;
  if(!uploadTgl){ alert(t("pilih_tanggal_intransit")); element.value=""; return; }
  let reader=new FileReader();
  reader.onload=function(e){
    let data=new Uint8Array(e.target.result);
    let workbook=XLSX.read(data,{type:"array"});
    let sheet=workbook.Sheets[workbook.SheetNames[0]];
    let dataJson=XLSX.utils.sheet_to_json(sheet);
    if(dataJson.length===0){ alert(t("file_kosong")); return; }
    let today=uploadTgl;
    let cOK=0, cSkip=0, cUpdate=0, cMasterUpdate=0;
    let semuaMaster=dapatkanSemuaMasterData();
    dataJson.forEach(function(row){
      let rawSku=row["Item Code"], rawNama=row["Nama Barang"], rawKat=row["Item Group"]||"General";
      let rawQty=row["Actual Qty"], rawIsi=row["Isi/Ctn"]||0, rawHarga=row["Harga"]||0, rawKet=row["Keterangan"]||"-";
      let rawTgl=row["Tanggal"];
      if(!rawSku) return;
      let tglBaris=parseTanggalExcel(rawTgl, today);
      let skuF=rawSku.toString().trim().toUpperCase();
      let qtyF=Math.max(0,parseInt(rawQty)||0);
      let isiF=Math.max(0,parseInt(rawIsi)||0);
      let hargaF=Math.max(0,parseFloat(rawHarga)||0);
      let katF=rawKat.toString().trim();
      let ketF=rawKet.toString().trim()||"-";
      // Cek/update master
      let match=semuaMaster.find(i=>i.sku.toUpperCase()===skuF);
      if(!match){
        let namaF=(rawNama||skuF).toString().trim();
        let newMaster={sku:rawSku.toString().trim(),kategori:katF,bintaro:namaF,qtyCtn:isiF,harga:hargaF};
        customMasterData.push(newMaster); match=newMaster;
      } else {
        let cm=customMasterData.find(i=>i.sku.toUpperCase()===skuF);
        if(!cm){ cm={sku:match.sku,kategori:match.kategori,bintaro:match.bintaro,qtyCtn:match.qtyCtn,harga:match.harga}; customMasterData.push(cm); }
        let changed=false;
        if(hargaF>0&&cm.harga!==hargaF){ cm.harga=hargaF; match.harga=hargaF; changed=true; }
        if(isiF>0&&cm.qtyCtn!==isiF){ cm.qtyCtn=isiF; match.qtyCtn=isiF; changed=true; }
        if(katF&&katF!=="General"&&cm.kategori!==katF){ cm.kategori=katF; match.kategori=katF; changed=true; }
        if(changed){
          daftarBarang.forEach(b=>{ if(b.sku.toUpperCase()===skuF){ if(hargaF>0) b.harga=hargaF; if(isiF>0) b.isiKarton=isiF; }});
          cMasterUpdate++;
        }
      }
      // Cek apakah ada intransit existing dengan SKU sama yang masih InTransit → update keterangan/qty
      let existing=intransitLog.find(r=>r.sku.toUpperCase()===skuF&&(r.status==="InTransit"||!r.status));
      if(existing&&qtyF>0){
        existing.qty=qtyF; existing.keterangan=ketF; existing.isiKarton=match.qtyCtn; existing.harga=match.harga;
        cUpdate++; return;
      }
      // Tambah record baru jika qty > 0
      if(qtyF<=0){ cSkip++; return; }
      let entry={id:Date.now()+Math.random(),tanggal:tglBaris,sku:match.sku,nama:match.bintaro,qty:qtyF,isiKarton:match.qtyCtn,harga:match.harga||0,keterangan:ketF,status:"InTransit",warehouse:"",tglComplete:""};
      intransitLog.push(entry); cOK++;
    });
    fbSave("customMasterData", customMasterData);
    fbSave("intransitLog", intransitLog);
    markDirty("intransit","analisis");
    element.value="";
    let msg=t("upload_intransit_selesai")+"\n- "+cOK+" "+t("item_baru_ditambahkan")+"\n- "+cUpdate+" "+t("item_existing_diperbarui")+"\n- "+cSkip+" "+t("item_dilewati");
    if(cMasterUpdate>0) msg+="\n- "+cMasterUpdate+" "+t("data_master_diperbarui");
    alert(msg);
  };
  reader.readAsArrayBuffer(file);
}

// =========================================================================
// AUTOCOMPLETE SKU
// =========================================================================
function buatSkuDropdown(inputId, ddId, onSelect){
  let el=document.getElementById(inputId);
  let dd=document.getElementById(ddId);
  if(!el||!dd) return;
  let val=el.value.trim().toLowerCase();
  if(val.length<2){ dd.style.display="none"; return; }
  let semuaMaster=dapatkanSemuaMasterData();
  let matches=semuaMaster.filter(m=>m.sku.toLowerCase().includes(val)||m.bintaro.toLowerCase().includes(val)).slice(0,12);
  if(matches.length===0){ dd.style.display="none"; return; }
  dd.innerHTML="";
  matches.forEach(m=>{
    let d=document.createElement("div");
    d.innerHTML="<strong>"+m.sku+"</strong><small>"+m.bintaro+"</small>";
    d.onclick=()=>{ onSelect(m); dd.style.display="none"; };
    dd.appendChild(d);
  });
  dd.style.display="block";
}

function cariSertaIsiOtomatis(){
  let inputSku=document.getElementById("sku").value.trim();
  let alertBox=document.getElementById("skuAlert");
  let semuaMaster=dapatkanSemuaMasterData();
  buatSkuDropdown("sku","sku-dd",(m)=>{
    document.getElementById("sku").value=m.sku;
    document.getElementById("sku").setAttribute("data-full-sku",m.sku);
    document.getElementById("kategori").value=m.kategori;
    document.getElementById("nama").value=m.bintaro;
    document.getElementById("isiKarton").value=m.qtyCtn;
    document.getElementById("harga").value=m.harga;
    alertBox.style.display="none";
    kunciFields(Number(m.harga)!==0&&Number(m.qtyCtn)!==0);
  });
  if(inputSku===""){kosongkanAutoFields();kunciFields(true);alertBox.style.display="none";return;}
  let match=semuaMaster.find(i=>i.sku.toUpperCase()===inputSku.toUpperCase());
  if(!match) match=semuaMaster.find(i=>i.sku.toLowerCase().includes(inputSku.toLowerCase()));
  if(match){
    document.getElementById("kategori").value=match.kategori;
    document.getElementById("nama").value=match.bintaro;
    document.getElementById("isiKarton").value=match.qtyCtn;
    document.getElementById("harga").value=match.harga;
    document.getElementById("sku").setAttribute("data-full-sku",match.sku);
    if(Number(match.harga)===0||Number(match.qtyCtn)===0){
      alertBox.innerHTML=t("lengkapi_harga_qty");alertBox.style.color="#3182ce";alertBox.style.display="block";kunciFields(false);
    } else { alertBox.style.display="none"; kunciFields(true); }
  } else {
    kosongkanAutoFields(); kunciFields(false);
    alertBox.innerHTML=t("sku_baru_terdeteksi");alertBox.style.color="#e67e22";alertBox.style.display="block";
    document.getElementById("sku").removeAttribute("data-full-sku");
  }
}

function cariSKUForTransaction(type){
  let sku=document.getElementById(type+"-sku").value.trim();
  let alertBox=document.getElementById(type+"-skuAlert");
  let semuaMaster=dapatkanSemuaMasterData();
  buatSkuDropdown(type+"-sku", type+"-sku-dd",(m)=>{
    document.getElementById(type+"-sku").value=m.sku;
    document.getElementById(type+"-sku").setAttribute("data-full-sku",m.sku);
    document.getElementById(type+"-nama").value=m.bintaro;
    document.getElementById(type+"-kategori").value=m.kategori;
    document.getElementById(type+"-isiKarton").value=m.qtyCtn;
    document.getElementById(type+"-harga").value=m.harga;
    alertBox.style.display="none";
    if(type==="tr") updateTrStok();
  });
  if(sku===""){
    ["nama","kategori","isiKarton","harga"].forEach(f=>{ document.getElementById(type+"-"+f).value=""; });
    alertBox.style.display="none"; return;
  }
  let match=semuaMaster.find(i=>i.sku.toUpperCase()===sku.toUpperCase());
  if(!match) match=semuaMaster.find(i=>i.sku.toLowerCase().includes(sku.toLowerCase()));
  if(match){
    document.getElementById(type+"-nama").value=match.bintaro;
    document.getElementById(type+"-kategori").value=match.kategori;
    document.getElementById(type+"-isiKarton").value=match.qtyCtn;
    document.getElementById(type+"-harga").value=match.harga;
    document.getElementById(type+"-sku").setAttribute("data-full-sku",match.sku);
    alertBox.style.display="none";
    if(type==="tr") updateTrStok();
  } else {
    alertBox.innerHTML=t("sku_tidak_ditemukan");alertBox.style.color="#e53e3e";alertBox.style.display="block";
    document.getElementById(type+"-sku").removeAttribute("data-full-sku");
  }
}

function updateTrStok(){
  let skuFull=document.getElementById("tr-sku").getAttribute("data-full-sku");
  if(!skuFull) return;
  let wh=document.getElementById("tr-from-wh").value;
  let item=daftarBarang.find(b=>b.sku.toUpperCase()===skuFull.toUpperCase()&&(b.warehouse||"Bintaro").toUpperCase()===wh.toUpperCase());
  document.getElementById("tr-stok-info").value=item?Number(item.totalPcs):0;
}

function kosongkanAutoFields(){
  ["kategori","nama","isiKarton","harga"].forEach(f=>{ document.getElementById(f).value=""; });
}
function kunciFields(status){
  ["kategori","nama","isiKarton","harga"].forEach(f=>{ document.getElementById(f).readOnly=status; });
}

