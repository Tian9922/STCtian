// =========================================================================
// AUTH - LOGIN & ROLE SYSTEM
// Password bisa diganti langsung di sini
// =========================================================================
const ACCOUNTS = {
  admin:  { password: "admin123",  role: "admin"  },
  stc:    { password: "stc123",    role: "viewer" },
  gudang: { password: "gudang123", role: "staff"  }
};
// Akun tambahan yang dibuat lewat halaman Settings (di-merge saat load dari Firebase)
window._customAccounts = {};
function _allAccounts(){ return Object.assign({}, ACCOUNTS, window._customAccounts||{}); }

let currentRole = null; // null = belum login

function doLogin(){
  let user = document.getElementById("login-user").value.trim().toLowerCase();
  let pass = document.getElementById("login-pass").value;
  let errEl = document.getElementById("login-error");
  let ACC = _allAccounts();
  if(ACC[user] && ACC[user].password === pass){
    currentRole = ACC[user].role;
    sessionStorage.setItem("icRole", currentRole);
    sessionStorage.setItem("icUser", user);
    document.getElementById("login-overlay").style.display = "none";
    applyRoleUI();
    // Update sidebar user info
    let sbAvatar = document.getElementById("sb-avatar");
    let sbName = document.getElementById("sb-user-name");
    if(sbAvatar) sbAvatar.textContent = user.substring(0,2).toUpperCase();
    if(sbName) sbName.textContent = user.charAt(0).toUpperCase()+user.slice(1);
    // Init Firebase listeners (load & sync data)
    if(window._fbReady){
      initFirebaseListeners();
    } else {
      window._fbInitCallback = initFirebaseListeners;
    }
    applyLang();
    if(typeof recordLoginHistory==="function") recordLoginHistory(user, currentRole);
    if(typeof showToast==="function") showToast("👋 Selamat datang, "+user.charAt(0).toUpperCase()+user.slice(1)+"!","success");
  } else {
    errEl.style.display = "block";
    document.getElementById("login-pass").value = "";
    setTimeout(()=>{ errEl.style.display="none"; }, 3000);
  }
}

function doLogout(){
  if(!confirm("Yakin ingin logout?")) return;
  sessionStorage.removeItem("icRole");
  sessionStorage.removeItem("icUser");
  currentRole = null;
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-overlay").style.display = "flex";
}

function isAdmin(){ return currentRole === "admin"; }
function isStaff(){ return currentRole === "staff"; }
function isViewer(){ return currentRole === "viewer"; }
// Staff gudang & admin boleh input (tambah/upload) data, tapi hapus tetap admin-only
function canInput(){ return currentRole === "admin" || currentRole === "staff"; }
function canDelete(){ return currentRole === "admin"; }
function canManageSettings(){ return currentRole === "admin"; }

function applyRoleUI(){
  let badge = document.getElementById("role-badge");
  let user  = sessionStorage.getItem("icUser") || "";
  if(isAdmin()){
    badge.textContent = "👑 ADMIN";
    badge.className   = "badge-admin";
  } else if(isStaff()){
    badge.textContent = "📦 STAFF GUDANG";
    badge.className   = "badge-staff";
  } else {
    badge.textContent = "👁 VIEWER";
    badge.className   = "badge-viewer";
  }

  // ---- MONITOR STOK ----
  _viewerHide("btn-hapus-semua-monitor");

  // ---- STOCK IN ---- (staff boleh lihat & pakai form input, viewer tidak)
  _viewerHide("panel-stock-in-left", true);
  _viewerHide("btn-in-delete-all");

  // ---- STOCK OUT ----
  _viewerHide("panel-stock-out-left", true);
  _viewerHide("btn-out-delete-all");

  // ---- TRANSFER ----
  _viewerHide("panel-transfer-left", true);
  _viewerHide("btn-transfer-delete-all");

  // ---- INTRANSIT ----
  // Staff & Admin bisa tambah & upload intransit, tapi TIDAK bisa hapus (kecuali admin)
  _viewerHide("btn-intransit-delete-all");
  // Tombol Hapus pada tiap row intransit dikontrol saat render

  // ---- LEDGER ----
  _viewerHide("btn-ledger-delete-all");

  // ---- ANALISIS ----
  // Viewer bisa akses analisis sepenuhnya (termasuk Planning PO)

  // ---- SETTINGS (khusus admin) ----
  let navSettings = document.getElementById("navbtn-settings");
  if(navSettings) navSettings.style.display = canManageSettings() ? "" : "none";
}

// inputAllowedHides = true -> panel ini butuh hak INPUT (staff boleh lihat), bukan cuma admin
function _viewerHide(id, inputAllowedHides){
  let allowed = inputAllowedHides ? canInput() : isAdmin();
  if(allowed) { let el0=document.getElementById(id); if(el0) el0.style.display=""; return; }
  let el = document.getElementById(id);
  if(el) el.style.display = "none";
}

// Cek session saat load (untuk refresh halaman)
(function checkSession(){
  let r = sessionStorage.getItem("icRole");
  if(r){ currentRole = r; }
  // Login overlay tetap tampil, user harus login lagi setelah refresh (keamanan)
  // Kalau mau persist session, uncomment baris berikut:
  // if(r){ document.getElementById("login-overlay").style.display="none"; applyRoleUI(); }
})();

// =========================================================================
// I18N - MULTI LANGUAGE
// =========================================================================
const LANG = {
  id: {
    tab_monitor:"Monitor Stok",tab_in:"Stock In",tab_out:"Stock Out",tab_transfer:"Transfer Stok",tab_ledger:"Stock Ledger",tab_analisis:"Analisa Stock",tab_planning:"Planning PO",tab_intransit:"In Transit",
    btn_template:"Template",fast_inbound:"Fast Inbound / Upload",upload:"Upload",add_item_manual:"Tambah Barang Manual",
    label_sku:"Kode SKU:",label_nama:"Nama Barang:",label_kategori:"Kategori:",label_isi_ctn:"Isi/Ctn:",label_harga:"Harga (Rp):",label_warehouse:"Warehouse:",label_total_pcs:"Total Stok (pcs):",
    label_tanggal:"Tanggal:",label_qty_masuk:"Qty Masuk (pcs):",label_qty_keluar:"Qty Keluar (pcs):",label_keterangan:"Keterangan:",label_ref:"No. Referensi / Keterangan:",
    label_dari_gudang:"Dari Gudang:",label_ke_gudang:"Ke Gudang:",label_stok_tersedia:"Stok Tersedia (pcs):",label_qty_transfer:"Qty Transfer (pcs):",
    btn_add_item:"Tambah Barang",btn_cancel:"Batal",btn_save_in:"✅ Simpan Stock In",btn_save_out:"✅ Simpan Stock Out",btn_save_transfer:"✅ Simpan Transfer",btn_delete_all:"Hapus Semua",
    upload_stockout_template:"Upload Template Stock Out",upload_stockout_hint:"Header: Item Code, Qty, Warehouse, Keterangan",download_template:"Download Template",upload_file:"Upload File",
    form_stock_in:"Form Stock In",form_stock_out:"Form Stock Out",form_transfer:"Form Transfer Stok",
    th_sku:"SKU",th_nama:"Nama Barang",th_kategori:"Kategori",th_gudang:"Gudang",th_qty_pcs:"Qty Pcs",th_konversi:"Konversi",th_harga:"Harga",th_total_nilai:"Total Nilai",th_aksi:"Aksi",
    th_tanggal:"Tanggal",th_qty_masuk:"Qty Masuk",th_qty_keluar:"Qty Keluar",th_ref:"Referensi",th_keterangan:"Keterangan",
    th_dari_gudang:"Dari",th_ke_gudang:"Ke",th_qty_transfer:"Qty Transfer",th_isi_ctn:"Isi",
    dari_tanggal:"Dari Tanggal",sampai_tanggal:"Sampai Tanggal",
    led_total_stok:"Total Nilai Stok",led_total_in:"Total Nilai Stock In",led_total_out:"Total Nilai Stock Out",led_total_trx:"Total Transaksi",
    cari_sku:"Cari SKU / Nama",tipe_transaksi:"Tipe Transaksi",semua_tipe:"Semua Tipe",transfer_keluar:"Transfer Keluar",transfer_masuk:"Transfer Masuk",
    semua_kategori:"Semua Kategori",semua:"Semua",semua_data:"Semua data",periode_analisis:"Periode Analisis (hari)",
    stok_saat_ini:"Stok Saat Ini",total_out_periode:"Total Out (periode)",avg_out:"Avg Out/Hari",kategori_moving:"Kategori Moving",ketahanan_stok:"Ketahanan Stok",
    hitung_planning_po:"Hitung Planning PO",isi_karton_pcs:"Isi/Karton (pcs):",periode_avg_out:"Periode hitung avg out (hari):",qty_po_karton:"Qty PO (karton):",qty_po_pcs:"= Qty PO dalam pcs:",
    btn_tambah_po:"➕ Tambah ke Daftar PO",analisis_stok_skrg:"Analisa Stock Saat Ini",ketahanan_stok_skrg:"Ketahanan Stok Saat Ini",stok_pcs:"Stok (pcs)",stok_karton:"Stok (karton)",
    hasil_kalkulasi_po:"Hasil Kalkulasi PO",po_karton:"PO Qty (karton)",po_pcs:"PO Qty (pcs)",stok_setelah_po:"Stok Setelah PO Masuk (pcs)",ketahanan_setelah_po:"Ketahanan Stok Setelah PO",
    progress_ketahanan:"Progress ketahanan stok:",daftar_planning_po:"Daftar Planning PO",dur_skrg:"Dur.Skrg",dur_setelah:"Dur.+PO",
    alert_ok:"✅ Berhasil disimpan!",alert_transfer_ok:"✅ Transfer berhasil disimpan!",alert_fill_all:"Lengkapi semua field!",alert_qty_zero:"Qty harus > 0!",
    confirm_delete_all:"Hapus semua data? Tidak bisa dibatalkan.",confirm_delete_row:"Hapus data ini?",
    no_data_out:"Tidak ada data Stock Out",no_data_in:"Tidak ada data Stock In",no_data_transfer:"Belum ada data Transfer",no_data_ledger:"Tidak ada transaksi",
    insufficient_stock:"⚠️ Stok tidak mencukupi! Stok tersedia: ",confirm_insufficient:"pcs. Tetap lanjut?",
    same_warehouse_error:"Gudang asal dan tujuan tidak boleh sama!",
  },
  en: {
    tab_monitor:"Stock Monitor",tab_in:"Stock In",tab_out:"Stock Out",tab_transfer:"Stock Transfer",tab_ledger:"Stock Ledger",tab_analisis:"Stock Analysis",tab_planning:"PO Planning",tab_intransit:"In Transit",
    btn_template:"Template",fast_inbound:"Fast Inbound / Upload",upload:"Upload",add_item_manual:"Add Item Manually",
    label_sku:"SKU Code:",label_nama:"Item Name:",label_kategori:"Category:",label_isi_ctn:"Qty/Ctn:",label_harga:"Price (Rp):",label_warehouse:"Warehouse:",label_total_pcs:"Total Stock (pcs):",
    label_tanggal:"Date:",label_qty_masuk:"Qty In (pcs):",label_qty_keluar:"Qty Out (pcs):",label_keterangan:"Notes:",label_ref:"Reference / Notes:",
    label_dari_gudang:"From Warehouse:",label_ke_gudang:"To Warehouse:",label_stok_tersedia:"Available Stock (pcs):",label_qty_transfer:"Transfer Qty (pcs):",
    btn_add_item:"Add Item",btn_cancel:"Cancel",btn_save_in:"✅ Save Stock In",btn_save_out:"✅ Save Stock Out",btn_save_transfer:"✅ Save Transfer",btn_delete_all:"Delete All",
    upload_stockout_template:"Upload Stock Out Template",upload_stockout_hint:"Headers: Item Code, Qty, Warehouse, Notes",download_template:"Download Template",upload_file:"Upload File",
    form_stock_in:"Stock In Form",form_stock_out:"Stock Out Form",form_transfer:"Stock Transfer Form",
    th_sku:"SKU",th_nama:"Item Name",th_kategori:"Category",th_gudang:"Warehouse",th_qty_pcs:"Qty Pcs",th_konversi:"Conversion",th_harga:"Price",th_total_nilai:"Total Value",th_aksi:"Action",
    th_tanggal:"Date",th_qty_masuk:"Qty In",th_qty_keluar:"Qty Out",th_ref:"Reference",th_keterangan:"Notes",
    th_dari_gudang:"From",th_ke_gudang:"To",th_qty_transfer:"Transfer Qty",th_isi_ctn:"Qty/Ctn",
    dari_tanggal:"From Date",sampai_tanggal:"To Date",
    led_total_stok:"Total Stock Value",led_total_in:"Total Stock In Value",led_total_out:"Total Stock Out Value",led_total_trx:"Total Transactions",
    cari_sku:"Search SKU / Name",tipe_transaksi:"Transaction Type",semua_tipe:"All Types",transfer_keluar:"Transfer Out",transfer_masuk:"Transfer In",
    semua_kategori:"All Categories",semua:"All",semua_data:"All data",periode_analisis:"Analysis Period (days)",
    stok_saat_ini:"Current Stock",total_out_periode:"Total Out (period)",avg_out:"Avg Out/Day",kategori_moving:"Moving Category",ketahanan_stok:"Stock Duration",
    hitung_planning_po:"Calculate PO Planning",isi_karton_pcs:"Qty/Carton (pcs):",periode_avg_out:"Avg out period (days):",qty_po_karton:"PO Qty (carton):",qty_po_pcs:"= PO Qty in pcs:",
    btn_tambah_po:"➕ Add to PO List",analisis_stok_skrg:"Current Stock Analysis",ketahanan_stok_skrg:"Current Stock Duration",stok_pcs:"Stock (pcs)",stok_karton:"Stock (carton)",
    hasil_kalkulasi_po:"PO Calculation Result",po_karton:"PO Qty (carton)",po_pcs:"PO Qty (pcs)",stok_setelah_po:"Stock After PO (pcs)",ketahanan_setelah_po:"Stock Duration After PO",
    progress_ketahanan:"Stock duration progress:",daftar_planning_po:"PO Planning List",dur_skrg:"Dur.Now",dur_setelah:"Dur.+PO",
    alert_ok:"✅ Saved successfully!",alert_transfer_ok:"✅ Transfer saved!",alert_fill_all:"Please fill all fields!",alert_qty_zero:"Qty must be > 0!",
    confirm_delete_all:"Delete all data? This cannot be undone.",confirm_delete_row:"Delete this record?",
    no_data_out:"No Stock Out data",no_data_in:"No Stock In data",no_data_transfer:"No Transfer data",no_data_ledger:"No transactions found",
    insufficient_stock:"⚠️ Insufficient stock! Available: ",confirm_insufficient:"pcs. Continue anyway?",
    same_warehouse_error:"Source and destination warehouse cannot be the same!",
  },
  ko: {
    tab_monitor:"재고 모니터",tab_in:"입고",tab_out:"출고",tab_transfer:"재고 이동",tab_ledger:"재고 원장",tab_analisis:"재고 분석",tab_planning:"PO 계획",tab_intransit:"운송중",
    btn_template:"템플릿",fast_inbound:"빠른 입고 / 업로드",upload:"업로드",add_item_manual:"수동 품목 추가",
    label_sku:"SKU 코드:",label_nama:"품목명:",label_kategori:"카테고리:",label_isi_ctn:"박스당 수량:",label_harga:"단가 (Rp):",label_warehouse:"창고:",label_total_pcs:"총 재고 (pcs):",
    label_tanggal:"날짜:",label_qty_masuk:"입고 수량 (pcs):",label_qty_keluar:"출고 수량 (pcs):",label_keterangan:"비고:",label_ref:"참조 / 비고:",
    label_dari_gudang:"출발 창고:",label_ke_gudang:"도착 창고:",label_stok_tersedia:"가용 재고 (pcs):",label_qty_transfer:"이동 수량 (pcs):",
    btn_add_item:"품목 추가",btn_cancel:"취소",btn_save_in:"✅ 입고 저장",btn_save_out:"✅ 출고 저장",btn_save_transfer:"✅ 이동 저장",btn_delete_all:"전체 삭제",
    upload_stockout_template:"출고 템플릿 업로드",upload_stockout_hint:"헤더: Item Code, Qty, Warehouse, Keterangan",download_template:"템플릿 다운로드",upload_file:"파일 업로드",
    form_stock_in:"입고 양식",form_stock_out:"출고 양식",form_transfer:"재고 이동 양식",
    th_sku:"SKU",th_nama:"품목명",th_kategori:"카테고리",th_gudang:"창고",th_qty_pcs:"수량(pcs)",th_konversi:"환산",th_harga:"단가",th_total_nilai:"총 금액",th_aksi:"작업",
    th_tanggal:"날짜",th_qty_masuk:"입고량",th_qty_keluar:"출고량",th_ref:"참조",th_keterangan:"비고",
    th_dari_gudang:"출발",th_ke_gudang:"도착",th_qty_transfer:"이동량",th_isi_ctn:"박스당",
    dari_tanggal:"시작 날짜",sampai_tanggal:"종료 날짜",
    led_total_stok:"총 재고 금액",led_total_in:"총 입고 금액",led_total_out:"총 출고 금액",led_total_trx:"총 거래",
    cari_sku:"SKU / 품목명 검색",tipe_transaksi:"거래 유형",semua_tipe:"전체",transfer_keluar:"이동 출고",transfer_masuk:"이동 입고",
    semua_kategori:"전체 카테고리",semua:"전체",semua_data:"전체 데이터",periode_analisis:"분석 기간 (일)",
    stok_saat_ini:"현재 재고",total_out_periode:"출고 합계 (기간)",avg_out:"일 평균 출고",kategori_moving:"회전 분류",ketahanan_stok:"재고 지속 기간",
    hitung_planning_po:"PO 계획 계산",isi_karton_pcs:"박스당 수량 (pcs):",periode_avg_out:"평균 출고 계산 기간:",qty_po_karton:"PO 수량 (박스):",qty_po_pcs:"= PO 수량 (pcs):",
    btn_tambah_po:"➕ PO 목록에 추가",analisis_stok_skrg:"현재 재고 분석",ketahanan_stok_skrg:"현재 재고 지속 기간",stok_pcs:"재고 (pcs)",stok_karton:"재고 (박스)",
    hasil_kalkulasi_po:"PO 계산 결과",po_karton:"PO 수량 (박스)",po_pcs:"PO 수량 (pcs)",stok_setelah_po:"PO 후 재고 (pcs)",ketahanan_setelah_po:"PO 후 지속 기간",
    progress_ketahanan:"재고 지속 기간 진행:",daftar_planning_po:"PO 계획 목록",dur_skrg:"현재기간",dur_setelah:"PO후기간",
    alert_ok:"✅ 저장되었습니다!",alert_transfer_ok:"✅ 이동이 저장되었습니다!",alert_fill_all:"모든 항목을 입력하세요!",alert_qty_zero:"수량은 0보다 커야 합니다!",
    confirm_delete_all:"모든 데이터를 삭제하시겠습니까? 되돌릴 수 없습니다.",confirm_delete_row:"이 기록을 삭제하시겠습니까?",
    no_data_out:"출고 데이터 없음",no_data_in:"입고 데이터 없음",no_data_transfer:"이동 데이터 없음",no_data_ledger:"거래 없음",
    insufficient_stock:"⚠️ 재고 부족! 가용 재고: ",confirm_insufficient:"pcs. 계속하시겠습니까?",
    same_warehouse_error:"출발 창고와 도착 창고가 동일합니다!",
  }
};

let currentLang = localStorage.getItem('lang') || 'id';

function t(key){ return (LANG[currentLang]||LANG.id)[key] || key; }

function setLang(lang){
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b=>{
    b.classList.remove('active');
    if(b.textContent.includes(lang.toUpperCase())) b.classList.add('active');
  });
  applyLang();
}

function applyLang(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

// =========================================================================
// MASTER DATA
// =========================================================================
const BASE_MASTER_DATA=[
  {"sku":"ABC JELLY STRAWS - ASSORTED 300G","kategori":"Import - Kids(유아용품)","bintaro":"ABC JELLY STRAW ASSORTED 300/30","qtyCtn":30,"harga":12956.44},
  {"sku":"ABC JELLY STRAWS - ASSORTED 800G","kategori":"Import - Kids(유아용품)","bintaro":"ABC JELLY STRAW 800/6","qtyCtn":6,"harga":0},
  {"sku":"ABC POKET JELLY - ASSORTED 240G (12pcs)","kategori":"Import - Kids(유아용품)","bintaro":"ABC POCKET JELLY  ASSORTED 240/30","qtyCtn":30,"harga":11606.81},
  {"sku":"G003767","kategori":"장류 (Paste, sauce)","bintaro":"BORYEONG ANCHOVY SAUSE 10KG","qtyCtn":1,"harga":356128.45},
  {"sku":"STC00093","kategori":"Dry - 면류(Noodle)","bintaro":"BUL RAMEN STIR-FRIED RAMEN CARBONARA 135GR","qtyCtn":40,"harga":11338.71},
  {"sku":"STC00092","kategori":"Dry - 면류(Noodle)","bintaro":"BUL RAMEN STIR-FRIED RAMEN HOT SPICY CHICKEN 135GR","qtyCtn":40,"harga":10746.35},
  {"sku":"STC00144","kategori":"B2B/Reddog","bintaro":"CHEONGWOO CAPSAICINE POWDER 400G","qtyCtn":12,"harga":57308.02},
  {"sku":"G002375E","kategori":"음료 (Drink)","bintaro":"ROASTED BARLEY TEA 2.26KG/6","qtyCtn":6,"harga":92288.84},
  {"sku":"G001750E","kategori":"음료 (Drink)","bintaro":"ROASTED BARLEY TEA 907/12","qtyCtn":12,"harga":36082.57},
  {"sku":"G002399E","kategori":"청, 즙 (Extract, tea)","bintaro":"CHORIPDONG HONEY CITRON TEA 2KG","qtyCtn":6,"harga":129824.49},
  {"sku":"G013625E","kategori":"청, 즙 (Extract, tea)","bintaro":"CHORIPDONG HONEY CITRON TEA 580G","qtyCtn":15,"harga":50126.29},
  {"sku":"G001063E","kategori":"물엿 (Corn syrup)","bintaro":"CHORIPDONG CORN SYRUP 1.2KG","qtyCtn":12,"harga":21062.53},
  {"sku":"G045578","kategori":"물엿 (Corn syrup)","bintaro":"CHORIPDONG CORN SYRUP 10KG","qtyCtn":2,"harga":142632.3},
  {"sku":"G001699E","kategori":"물엿 (Corn syrup)","bintaro":"CHORIPDONG CORN SYRUP 3KG","qtyCtn":5,"harga":53101.6},
  {"sku":"G001693E","kategori":"음료 (Drink)","bintaro":"CHORIPDONG CORN TEA 907GR","qtyCtn":12,"harga":27603.71},
  {"sku":"G004640E","kategori":"가루 (Powder)","bintaro":"CHORIPDONG FRYING MIX POWDER 1KG","qtyCtn":10,"harga":27996.04},
  {"sku":"G002229E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG HOT PEPPER PASTE 1 KG","qtyCtn":12,"harga":33944.01},
  {"sku":"G001881E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG GOCHUJANG HOT PEPPER PASTE 3KG","qtyCtn":4,"harga":71845.27},
  {"sku":"G041373E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG HOT PEPPER PASTE 500GR","qtyCtn":16,"harga":21638.65},
  {"sku":"G004639","kategori":"가루 (Powder)","bintaro":"CHORIPDONG PANCAKE MIX POWDER 1KG","qtyCtn":10,"harga":28548.77},
  {"sku":"G034601","kategori":"Seaweed","bintaro":"CHORIPDONG ROASTED SEAWAED GRAPE SEED OIL 10/5GR","qtyCtn":120,"harga":2856.49},
  {"sku":"G034599","kategori":"Seaweed","bintaro":"CHORIPDONG ROASTED SEAWAED OLIVE OIL 10/5GR","qtyCtn":120,"harga":3239.84},
  {"sku":"G013705E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG SOYBEAN PASTE 12/1KG","qtyCtn":12,"harga":25972.51},
  {"sku":"G013969E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG SOYBEAN PASTE 4/3KG","qtyCtn":4,"harga":67895.88},
  {"sku":"G041375E","kategori":"장류 (Paste, sauce)","bintaro":"CHORIPDONG SOYBEAN PASTE 16/500GR","qtyCtn":16,"harga":15943.08},
  {"sku":"STC00245","kategori":"Local-CJ","bintaro":"BIBIGO SUP KALDU TULANG SAPI 500/18","qtyCtn":18,"harga":21901},
  {"sku":"STC00298","kategori":"Local-CJ","bintaro":"CJ MI KERING CHOPPED NOODLES 900GR","qtyCtn":15,"harga":37054},
  {"sku":"STC00222","kategori":"CJ FOOD","bintaro":"CJ CHEILJEDANG ANCHOVY SOUP STOK DASHIDA 1KG","qtyCtn":10,"harga":155420},
  {"sku":"STC00203","kategori":"CJ FOOD","bintaro":"CJ BEKSUL MIXED SEASONING 2.5 1KG","qtyCtn":20,"harga":86600},
  {"sku":"STC00177","kategori":"CJ FOOD","bintaro":"CJ BEKSUL CORN SYRUP 5KG","qtyCtn":3,"harga":140863},
  {"sku":"STC00190","kategori":"CJ FOOD","bintaro":"CJ BEKSUL CORN SYRUP 2.45KG","qtyCtn":6,"harga":71804},
  {"sku":"S1020003","kategori":"장류 (Paste, sauce)","bintaro":"CJ FRESHWAY SOY SAUCE 14L","qtyCtn":1,"harga":226101.39},
  {"sku":"STC00195","kategori":"Local - CJ","bintaro":"CJ BEKSUL MIE KERING GANDUNG 900/15","qtyCtn":15,"harga":61059},
  {"sku":"STC00434","kategori":"Local - CJ","bintaro":"CJ BEKSUL MIE KERING GANDUNG 3KG","qtyCtn":4,"harga":132129},
  {"sku":"STC00206","kategori":"Local - CJ","bintaro":"CJ BEKSUL WHEAT FLOUR FOR FRY 1KG/10","qtyCtn":10,"harga":33130},
  {"sku":"STC00241","kategori":"Local - CJ","bintaro":"CJ BEKSUL WHEAT FLOUR FOR VEGETABLE PANCAKE 1KG","qtyCtn":10,"harga":36666},
  {"sku":"STC00196","kategori":"Local - CJ","bintaro":"CJ BEKSUL CUKA LEMON VINEGAR 500/24","qtyCtn":24,"harga":36123},
  {"sku":"STC00207","kategori":"Local - CJ","bintaro":"CJ BEKSUL APPLE VINEGAR 500/24","qtyCtn":24,"harga":35618},
  {"sku":"STC00452","kategori":"Local - CJ","bintaro":"CJ BEKSUL PERILLA OIL 320ML","qtyCtn":12,"harga":88921.23},
  {"sku":"STC00202","kategori":"Local - CJ","bintaro":"CJ BEKSUL AIMI 1KG","qtyCtn":12,"harga":66609.76},
  {"sku":"STC00321","kategori":"Local - CJ","bintaro":"CJ SESAME OIL 1.5L","qtyCtn":10,"harga":252547},
  {"sku":"STC00355","kategori":"Local - CJ","bintaro":"CJ BEKSUL MINYAK KEDELAI 1.8L","qtyCtn":10,"harga":76285},
  {"sku":"STC00302","kategori":"Local - CJ","bintaro":"CJ MINYAK JAGUNG 1.8L","qtyCtn":10,"harga":123159},
  {"sku":"STC00164","kategori":"Local - CJ","bintaro":"CJ BEKSUL COOKING SYRUP 2.45L","qtyCtn":6,"harga":57538},
  {"sku":"STC00201","kategori":"Local - CJ","bintaro":"MIPONG 25 KG","qtyCtn":1,"harga":716577},
  {"sku":"STC00236","kategori":"Local - CJ","bintaro":"MIPONG 250 GR","qtyCtn":48,"harga":6112},
  {"sku":"STC00205","kategori":"Local - CJ","bintaro":"CJ HAECHANDLE GOCHUJANG HOT PEPPER PASTE 3KG","qtyCtn":4,"harga":173145},
  {"sku":"STC00476","kategori":"장류 (Paste, sauce)","bintaro":"CJ HAECHANDLE GOCHUJANG GADEUKHAN 14KG","qtyCtn":1,"harga":100099.1},
  {"sku":"STC00224","kategori":"Local - CJ","bintaro":"CJ HASUNJUNG ANCHOVY SAUCE 2.5KG","qtyCtn":6,"harga":98819},
  {"sku":"STC00221","kategori":"CJ FOOD","bintaro":"CJ GLASS NOODLE HALAL 14KG","qtyCtn":1,"harga":562503},
  {"sku":"STC00253","kategori":"장류 (Paste, sauce)","bintaro":"MONGGO ANCHOVY 9KG","qtyCtn":1,"harga":131617.65},
  {"sku":"STC00153","kategori":"장류 (Paste, sauce)","bintaro":"MONGGO FISH SAUCE 580ML","qtyCtn":12,"harga":64652.94},
  {"sku":"STC00151","kategori":"Dry - 면류(Noodle)","bintaro":"MONGGO GUPO NOODLE REGULER ROUND 1.4KG","qtyCtn":10,"harga":43484.05},
  {"sku":"STC00152","kategori":"Dry - 면류(Noodle)","bintaro":"MONGGO GUPO NOODLE REGULER ROUND 3KG","qtyCtn":6,"harga":86701.51},
  {"sku":"STC00148","kategori":"Dry - 면류(Noodle)","bintaro":"MONGGO GUPO NOODLE THIN ROUND 900GR","qtyCtn":15,"harga":29933.75},
  {"sku":"S1020010E","kategori":"장류 (Paste, sauce)","bintaro":"MONGGO SOY SAUCE JIN 1.8L","qtyCtn":6,"harga":53214.75},
  {"sku":"S1020008E","kategori":"장류 (Paste, sauce)","bintaro":"MONGGO SOY SAUCE JIN 900ML","qtyCtn":12,"harga":28609.33},
  {"sku":"G022230E","kategori":"Dry - 면류(Noodle)","bintaro":"NONGSHIM-MIGA GLASS NOODLE 1KG","qtyCtn":10,"harga":38183.03},
  {"sku":"G047108E","kategori":"Dry - 면류(Noodle)","bintaro":"NONGSHIM-MIGA GLASS NOODLE 2.27KG","qtyCtn":6,"harga":83197.3},
  {"sku":"G022232E","kategori":"Dry - 면류(Noodle)","bintaro":"NONGSHIM-MIGA GLASS NOODLE 500","qtyCtn":20,"harga":21803.56},
  {"sku":"STC00504","kategori":"Import - Dry - 면류(Noodle)","bintaro":"OTTOGI PLAIN INSTANT NOODLE 110G","qtyCtn":48,"harga":93517.67},
  {"sku":"STC00345","kategori":"Local - Food","bintaro":"PINKFONG BABY SHARK VITA TOKTOK 15G","qtyCtn":12,"harga":232830.75},
  {"sku":"STC00549","kategori":"Local - Food","bintaro":"PINKFONG TOKBOKKI 230G","qtyCtn":15,"harga":65520.88},
  {"sku":"STC00001","kategori":"장류 (Paste, sauce)","bintaro":"LOTTE COOKING WINE MIRIM 1.8L","qtyCtn":6,"harga":73324.38},
  {"sku":"STC00003","kategori":"장류 (Paste, sauce)","bintaro":"LOTTE COOKING WINE MIRIM 18L","qtyCtn":1,"harga":572644.02},
  {"sku":"STC00002","kategori":"장류 (Paste, sauce)","bintaro":"LOTTE COOKING WINE MIRIM 900ML","qtyCtn":12,"harga":38419.91},
  {"sku":"STC00157","kategori":"음료 (Drink)","bintaro":"NAMYANG FRENCH CAFÉ COFFE MIX ARABICA 100T","qtyCtn":8,"harga":134273.51},
  {"sku":"STC00156","kategori":"음료 (Drink)","bintaro":"NAMYANG FRENCH CAFÉ COFFE MIX ARABICA 20T","qtyCtn":24,"harga":31734.58},
  {"sku":"STC00042","kategori":"Seaweed","bintaro":"HAENONG ROASTED LAVER KIMBAB 230G","qtyCtn":20,"harga":205500},
  {"sku":"STC00346","kategori":"Import - Dry - Seaweed","bintaro":"HAENONG MINI LAVER 1.8G","qtyCtn":24,"harga":27248.5},
  {"sku":"STC00039","kategori":"음료 (Drink)","bintaro":"SFC SPARKLING CALAMANSI 350ML","qtyCtn":24,"harga":7426.19},
  {"sku":"STC00041","kategori":"음료 (Drink)","bintaro":"SFC SPARKLING MANGGO 350ML","qtyCtn":24,"harga":7125.72},
  {"sku":"STC00097","kategori":"음료 (Drink)","bintaro":"SFC SPARKLING MELON 350ML","qtyCtn":24,"harga":7486.43},
  {"sku":"STC00040","kategori":"음료 (Drink)","bintaro":"SFC SPARKLING PLUM 350ML","qtyCtn":24,"harga":6871.23},
  {"sku":"STC00096","kategori":"음료 (Drink)","bintaro":"SFC SPARKLING WATERMELON 350ML","qtyCtn":24,"harga":7435.91},
  {"sku":"STC00030","kategori":"NON-FOOD","bintaro":"PAIK'S FRYING PAN 28CM","qtyCtn":1,"harga":221190.6},
  {"sku":"STC00031","kategori":"NON-FOOD","bintaro":"PAIK'S WOK PAN 28CM","qtyCtn":1,"harga":217652.21},
  {"sku":"STC00556","kategori":"Import - Chiller - KIMCHI","bintaro":"CABBAGE KIMCHI 2.5KG","qtyCtn":4,"harga":67567.57},
  {"sku":"G001103E","kategori":"Import - Frozen - Dumpling","bintaro":"CHORIPDONG FROZEN DUMPLING KIMCHI 540GR","qtyCtn":10,"harga":27761.55},
  {"sku":"G000452E","kategori":"Import - Frozen - Dumpling","bintaro":"CHORIPDONG FROZEN DUMPLING LEEK 540GR","qtyCtn":10,"harga":25711.84},
  {"sku":"G001305E","kategori":"Import - Frozen - Fish cake","bintaro":"FROZEN FRIED FISH CAKE ASSORTED 900GR","qtyCtn":12,"harga":40732.55},
  {"sku":"G000841E","kategori":"Import - Frozen - Fish cake","bintaro":"FROZEN FRIED FISH CAKE BUSAN 420GR","qtyCtn":25,"harga":20483.59},
  {"sku":"STC00227","kategori":"Local - CJ","bintaro":"CJ BIBIGO MANDU CHICKEN 1KG","qtyCtn":8,"harga":71648},
  {"sku":"STC00228","kategori":"Local - CJ","bintaro":"CJ BIBIGO KOREAN SPICY CHICKEN MANDU 1KG","qtyCtn":8,"harga":64565},
  {"sku":"STC00199","kategori":"Local - CJ","bintaro":"BIBIGO MANDU VEGETABLE 420","qtyCtn":16,"harga":51814},
  {"sku":"STC00219","kategori":"Local - CJ","bintaro":"CJ GIMARI 1KG/10","qtyCtn":8,"harga":70840},
  {"sku":"G031285E","kategori":"Import - Chiller - Rice cake","bintaro":"HANSANG RICE CAKE FOR TTEOBOKKI 1KG","qtyCtn":12,"harga":24012.07},
  {"sku":"G031284E","kategori":"Import - Chiller - Rice cake","bintaro":"HANSANG RICE CAKE FOR TTEOBOKKI 500GR","qtyCtn":20,"harga":14180.57},
  {"sku":"STC00265","kategori":"Import - Frozen - Topoki","bintaro":"COOK TOK TTEOBOKI HOME KIT 570GR","qtyCtn":16,"harga":55648.62},
  {"sku":"S1050004","kategori":"Import - Chiller - Danmuji","bintaro":"SINGRAM DAN MU JI HALF CUT 3KG","qtyCtn":4,"harga":94027.33},
  {"sku":"S1050002","kategori":"Import - Chiller - Danmuji","bintaro":"SINGRAM DAN MU JI FOR SUSHI 3KG","qtyCtn":4,"harga":95122.86},
  {"sku":"STC00335","kategori":"Import - Dry - Powder","bintaro":"HAE DREAM RED CREAM FINE 1KG","qtyCtn":10,"harga":63194.13},
  {"sku":"STC00334","kategori":"Import - Dry - Powder","bintaro":"HAE DREAM RED PEPPER POWDER COARSE 1KG","qtyCtn":10,"harga":64082.91},
  {"sku":"STC00425","kategori":"Local - Fish Cake","bintaro":"DASONI HOTBAR 65 SEAFOOD","qtyCtn":80,"harga":4712.38},
  {"sku":"STC00423","kategori":"Local - Fish Cake","bintaro":"DASONI HOTBAR 65 SPICY","qtyCtn":80,"harga":3921.33},
  {"sku":"STC00420","kategori":"Local - Fish Cake","bintaro":"DASONI BUSAN EOUMUK 1KG ORIGINAL","qtyCtn":6,"harga":37486.67},
  {"sku":"STC00415","kategori":"Local - Fish Cake","bintaro":"DASONI BUSAN EOUMUK EKONOMI 1KG","qtyCtn":18,"harga":28186.16},
  {"sku":"STC00507","kategori":"Import - Dry - Snack","bintaro":"LA CENA MOZARELA CHEESE BALL 270G","qtyCtn":16,"harga":29488},
  {"sku":"STC00533","kategori":"Import - Dry - Snack","bintaro":"LA CENA CREAM CHEESE BALL 270GR","qtyCtn":16,"harga":31823.76},
  {"sku":"STC00448","kategori":"B2B","bintaro":"MIMIF INJOELMI FOR BINGSU 2KG","qtyCtn":6,"harga":410960},
  {"sku":"STC00231","kategori":"Local - CJ","bintaro":"CJ BEKSUL BUCKWHEAT NOODLE 400/24","qtyCtn":24,"harga":50500},
  {"sku":"STC00454","kategori":"Local - CJ","bintaro":"HETBAHN COOKED WHITE RICE 210G","qtyCtn":36,"harga":44402.11},
  {"sku":"STC00270","kategori":"Local - CJ","bintaro":"CJ BULGOGI SAUCE 1KG","qtyCtn":12,"harga":58400},
  {"sku":"STC00336","kategori":"Local - 장류","bintaro":"CHUNG JUNG ONE RICE MALT SYRUP 1.2KG","qtyCtn":12,"harga":54099.1},
  {"sku":"JIN Red Pepper Flake 1kg","kategori":"JIN Red Pepper","bintaro":"JIN RED PEPPER FLAKE 1KG","qtyCtn":10,"harga":85000},
  {"sku":"STC00438","kategori":"Local - 장류","bintaro":"SUNCANG HOT PEPPER PASTE 14KG","qtyCtn":1,"harga":68740.48},
  {"sku":"STC00243","kategori":"Local - CJ","bintaro":"CJ BEKSUL SPICY CHICKEN SAUCE BRAISED 490/12","qtyCtn":12,"harga":45668},
  {"sku":"STC00318","kategori":"Local - CJ","bintaro":"CJ BEKSUL SAUS MARINASI PORK RIBS 500G","qtyCtn":12,"harga":37000}
];

let customMasterData = [];
let daftarBarang     = [];
let stockInLog       = [];
let stockOutLog      = [];
let transferLog      = [];
let intransitLog     = [];
let indexEdit = -1;
let editingInId = null;
let editingOutId = null;
let editingTrId = null;

// =========================================================================
// FIREBASE — SAVE & REALTIME SYNC
// =========================================================================
const FB_KEYS = ["customMasterData","barang","stockInLog","stockOutLog","transferLog","intransitLog"];

// Simpan satu key ke Firebase
function fbSave(key, data){
  if(!window._db) return;
  window._db.ref("inventory/"+key).set(data).catch(e=>console.error("Firebase save error:",e));
}

// Shortcut — dipanggil menggantikan banyak localStorage.setItem
function fbSaveAll(){
  fbSave("customMasterData", customMasterData);
  fbSave("barang",           daftarBarang);
  fbSave("stockInLog",       stockInLog);
  fbSave("stockOutLog",      stockOutLog);
  fbSave("transferLog",      transferLog);
  fbSave("intransitLog",     intransitLog);
}

// Loading overlay
function showLoader(msg){
  let el=document.getElementById("fb-loader");
  if(el){ el.querySelector("span").textContent=msg||"Memuat data..."; el.style.display="flex"; }
}
function hideLoader(){
  let el=document.getElementById("fb-loader");
  if(el) el.style.display="none";
}

// Init realtime listeners — dipanggil setelah login berhasil
const _TBODY_BY_TAB = { monitor:["tabelBarang",9], in:["tabelStockIn",11], out:["tabelStockOut",12], transfer:["tabelTransfer",11], ledger:["tabelLedger",11], intransit:["tabelIntransit",11] };

function initFirebaseListeners(){
  if(!window._db){ console.warn("Firebase belum siap"); return; }
  const db = window._db;
  showLoader("Menghubungkan ke database...");
  window._icDataReady = false;
  // Tampilkan skeleton di tabel tab yang sedang aktif (bukan tabel kosong tiba-tiba)
  let sk = _TBODY_BY_TAB[activeTab];
  if(sk && typeof renderSkeletonRows==="function") renderSkeletonRows(sk[0], sk[1], 6);
  let loadedCount = 0;
  const total = FB_KEYS.length;

  function onLoaded(){
    loadedCount++;
    if(loadedCount >= total){
      hideLoader();
      window._icDataReady = true;
      let ss = document.getElementById("sync-status");
      if(ss){ ss.style.display="inline-block"; ss.textContent="🟢 Tersync"; ss.style.background="#d1fae5"; ss.style.color="#065f46"; }
      markDirty("monitor","in","out","transfer","intransit","ledger","analisis");
      renderTab(activeTab);
    }
  }

  db.ref("inventory/customMasterData").on("value", snap => {
    customMasterData = snap.val() || []; onLoaded();
    markDirty("monitor","in","out","transfer","intransit","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/barang").on("value", snap => {
    daftarBarang = snap.val() || []; onLoaded();
    markDirty("monitor","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/stockInLog").on("value", snap => {
    stockInLog = snap.val() || []; onLoaded();
    markDirty("in","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/stockOutLog").on("value", snap => {
    stockOutLog = snap.val() || []; onLoaded();
    markDirty("out","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/transferLog").on("value", snap => {
    transferLog = snap.val() || []; onLoaded();
    markDirty("transfer","ledger"); renderTab(activeTab);
  });
  db.ref("inventory/intransitLog").on("value", snap => {
    intransitLog = snap.val() || []; onLoaded();
    markDirty("intransit","analisis"); renderTab(activeTab);
  });

  // ---- SETTINGS: profil perusahaan, akun tambahan, riwayat login ----
  db.ref("appSettings").on("value", snap => {
    let s = snap.val() || {};
    window._appSettings = s;
    window._customAccounts = s.customAccounts || {};
    window._loginHistory = s.loginHistory || [];
    if(typeof applyCompanyBranding==="function") applyCompanyBranding();
    if(activeTab==="settings" && typeof renderSettingsPage==="function") renderSettingsPage();
  });
}

// Dipanggil setelah login sukses (dari doLogin)
window._fbInitCallback = function(){
  if(currentRole) initFirebaseListeners();
};

// Set default date
(function initDates(){
  let today = new Date().toISOString().split("T")[0];
  ["in-tanggal","out-tanggal","tr-tanggal","uploadTanggal","out-upload-tanggal","tr-upload-tanggal","it-upload-tanggal"].forEach(id=>{ let el=document.getElementById(id); if(el) el.value=today; });
})();

// Init lang buttons
document.querySelectorAll('.lang-btn').forEach(b=>{
  if(b.textContent.trim().includes(currentLang.toUpperCase().slice(0,2))||
     (currentLang==='id'&&b.textContent.includes('ID'))||
     (currentLang==='en'&&b.textContent.includes('EN'))||
     (currentLang==='ko'&&b.textContent.includes('KO'))){
    b.classList.add('active');
  } else {
    b.classList.remove('active');
  }
});
applyLang();

