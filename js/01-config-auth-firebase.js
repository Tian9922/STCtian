// =========================================================================
// AUTH - LOGIN & ROLE SYSTEM (Firebase Authentication)
// Password TIDAK lagi disimpan di kode. Setiap user punya akun Firebase Auth
// asli (email/password), dan role-nya disimpan di Realtime Database node
// "users/{uid}". Username ditulis apa adanya (mis. "admin"), lalu diubah
// jadi pseudo-email "admin@inventoryic.local" di belakang layar supaya
// Firebase Auth (yang mewajibkan format email) tetap bisa dipakai.
// =========================================================================
let currentRole = null; // null = belum login
window._currentUsername = "";

function _pseudoEmail(username){ return username.toLowerCase().trim()+"@inventoryic.local"; }

function doLogin(){
  let user = document.getElementById("login-user").value.trim().toLowerCase();
  let pass = document.getElementById("login-pass").value;
  let errEl = document.getElementById("login-error");
  if(!user || !pass){
    errEl.style.display = "block";
    return;
  }
  firebase.auth().signInWithEmailAndPassword(_pseudoEmail(user), pass).catch(function(){
    errEl.style.display = "block";
    document.getElementById("login-pass").value = "";
    setTimeout(()=>{ errEl.style.display="none"; }, 3000);
  });
  // Kalau berhasil, onAuthStateChanged (di bawah) yang akan lanjutin proses masuknya
}

function doLogout(){
  if(!confirm(t("confirm_logout"))) return;
  firebase.auth().signOut();
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

// Dipanggil begitu Firebase Auth berhasil (baik dari doLogin() maupun sesi yang
// otomatis dipulihkan Firebase saat halaman di-refresh).
function _afterAuthSuccess(fbUser){
  window._db.ref("users/"+fbUser.uid).once("value").then(function(snap){
    let data = snap.val();
    if(!data || !data.role){
      // Akun Firebase valid tapi belum diberi role oleh admin -> tolak akses
      firebase.auth().signOut();
      alert(t("akun_belum_diberi_akses"));
      return;
    }
    currentRole = data.role;
    window._currentUsername = data.username || fbUser.email.split("@")[0];
    document.getElementById("login-overlay").style.display = "none";
    applyRoleUI();
    let sbAvatar = document.getElementById("sb-avatar");
    let sbName = document.getElementById("sb-user-name");
    let disp = window._currentUsername;
    if(sbAvatar) sbAvatar.textContent = disp.substring(0,2).toUpperCase();
    if(sbName) sbName.textContent = disp.charAt(0).toUpperCase()+disp.slice(1);
    if(window._fbReady){
      initFirebaseListeners();
    } else {
      window._fbInitCallback = initFirebaseListeners;
    }
    applyLang();
    if(typeof recordLoginHistory==="function") recordLoginHistory(disp, currentRole);
    if(typeof showToast==="function") showToast(t("welcome_msg").replace("{name}", disp.charAt(0).toUpperCase()+disp.slice(1)),"success");
  });
}

firebase.auth().onAuthStateChanged(function(fbUser){
  if(fbUser){
    _afterAuthSuccess(fbUser);
  } else {
    currentRole = null;
    window._currentUsername = "";
    let overlay = document.getElementById("login-overlay");
    if(overlay) overlay.style.display = "flex";
    let uEl = document.getElementById("login-user");
    let pEl = document.getElementById("login-pass");
    if(uEl) uEl.value = "";
    if(pEl) pEl.value = "";
  }
});

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
    tab_dashboard:"Dashboard",tab_sales:"Sales Analytics",tab_reorder:"Rekomendasi Reorder",tab_settings:"Pengaturan",
    sb_section_dashboard:"Dashboard",sb_section_operasional:"Operasional",sb_section_laporan:"Laporan",sb_section_admin:"Admin",
    dark_mode:"Dark Mode",logout:"Logout",
    placeholder_search_monitor:"🔍 Cari nama / SKU...",all_warehouse:"🏢 Semua Gudang",btn_export:"Export",
    asset_title_all:"💰 Total Nilai Barang (Semua Gudang):",asset_title_wh:"🏢 Total Nilai Barang (Gudang {wh}):",
    label_stok_per_tanggal:"📅 Stok per Tanggal:",btn_lihat_live:"🔴 Live",snapshot_badge:"Snapshot per {tgl}",info_snapshot_mode:"ℹ️ Menampilkan posisi stok historis per tanggal {tgl}. Data hanya untuk dilihat, tidak bisa diedit/dihapus. Klik \"Live\" untuk kembali ke stok terkini.",
    asset_title_snapshot_all:"📅 Nilai Stok per {tgl} (Semua Gudang):",asset_title_snapshot_wh:"📅 Nilai Stok per {tgl} (Gudang {wh}):",
    monitor_total_keseluruhan:"🧮 Total Keseluruhan ({n} baris — {wh}):",monitor_semua_gudang:"Semua Gudang",monitor_gudang:"Gudang {wh}",
    tidak_ada_data:"Tidak ada data",
    dash_kpi_nilai_stok:"Nilai Stok",dash_kpi_sku_aktif:"SKU Aktif",dash_kpi_out_bulan:"Out Bulan Ini",dash_kpi_in_bulan:"In Bulan Ini",dash_kpi_moving:"Fast / Med / Slow",
    dash_kpi_pcs_terjual:"pcs terjual",dash_kpi_item_no_data:"item tanpa data",
    dash_chart_out7_title:"Stock Out — 7 Hari Terakhir",dash_badge_carton:"CARTON",
    dash_top_sku_title:"Top 15 SKU Terlaris",bulan_ini:"Bulan Ini",dash_no_data_month:"Belum ada data stock out bulan ini",
    dash_moving_title:"Kategori Moving",dash_moving_center_label:"SKU",dash_low_stock_title:"Stok Kritis — Ketahanan < 1 Bulan",dash_badge_avg30:"AVG 30 HARI",
    dash_th_sku:"SKU",dash_th_nama:"Nama Barang",dash_th_gudang:"Gudang",dash_th_stok_ctn:"Stok (Ctn)",dash_th_avg_bln:"Avg/Bln (22hk)",dash_th_ketahanan:"Ketahanan",dash_th_status:"Status",
    dash_low_stock_ok:"✅ Semua stok aman (ketahanan ≥ 1 bulan)",dash_status_kritis:"🔴 Kritis",dash_status_rendah:"🟡 Rendah",
    dash_bestseller3m_title:"Best Seller — 3 Bulan Terakhir",dash_badge_90hari:"90 HARI",
    dash_deadstock_title:"Dead Stock — Tidak Terjual",dash_badge_60hari:"≥ 60 HARI",dash_th_terakhir_terjual:"Terakhir Terjual",dash_th_umur:"Umur",
    dash_deadstock_ok:"✅ Tidak ada dead stock (semua item pernah terjual dlm 60 hari terakhir)",dash_belum_pernah_terjual:"Belum pernah terjual",
    dash_overstock_title:"Overstock / Slow Moving — SOH Terlama",dash_badge_aging:"AGING STOCK",dash_th_terakhir_stockin:"Terakhir Stock In",dash_th_umur_soh:"Umur SOH",dash_th_kategori:"Kategori",
    dash_overstock_ok:"✅ Tidak ada overstock/slow moving saat ini",dash_tidak_ada_stockin:"Tidak ada data stock in",
    dash_hari:"hari",dash_bln:"bln",dash_hr:"hr",
    access_denied_admin:"⛔ Akses ditolak. Fitur ini hanya untuk Admin.",access_denied_staff:"⛔ Akses ditolak. Fitur ini hanya untuk Admin/Staff Gudang.",
    access_denied:"⛔ Akses ditolak.",access_denied_edit_admin:"⛔ Akses ditolak. Hanya Admin yang dapat mengedit data ini.",
    gagal_menyimpan:"⛔ Gagal menyimpan: ",gagal_menghapus:"⛔ Gagal menghapus: ",firebase_belum_siap:"⚠️ Firebase belum siap.",file_kosong:"⚠️ File kosong!",
    no_data_export:"⚠️ Tidak ada data untuk di-export!",no_data_ledger_export:"⚠️ Tidak ada data ledger untuk di-export!",
    no_data_analisis_export:"⚠️ Tidak ada data analisis untuk di-export!",no_data_sales_export:"⚠️ Tidak ada data sales untuk di-export!",
    no_data_reorder_export:"⚠️ Tidak ada rekomendasi reorder untuk di-export!",
    pilih_tanggal_upload:"⚠️ Silakan pilih Tanggal Upload terlebih dahulu!",pilih_tanggal_upload_out:"⚠️ Silakan pilih Tanggal Upload Stock Out terlebih dahulu!",
    pilih_tanggal_transfer:"⚠️ Silakan pilih Tanggal Transfer terlebih dahulu!",pilih_tanggal_intransit:"⚠️ Silakan pilih Tanggal Intransit terlebih dahulu!",
    pilih_gudang_asal:"⚠️ Pilih Gudang Asal (Dari Gudang) terlebih dahulu!",pilih_gudang_tujuan:"⚠️ Pilih Gudang Tujuan (Ke Gudang) terlebih dahulu!",
    gudang_sama_error:"⚠️ Gudang asal dan tujuan tidak boleh sama!",lengkapi_username_password:"⚠️ Lengkapi username & password!",
    username_sudah_dipakai:"⚠️ Username ini sudah dipakai sebagai akun bawaan sistem!",isi_bot_token:"⚠️ Isi Bot Token & Chat ID terlebih dahulu!",
    pdf_library_belum_siap:"⛔ Library PDF belum siap. Pastikan koneksi internet aktif lalu coba lagi.",gagal_kirim:"⛔ Gagal kirim: ",
    gagal_kirim_notif:"⛔ Gagal kirim notifikasi: ",cek_koneksi_bot:"\n(Cek koneksi internet / Bot Token / Chat ID)",periksa_bot_token:"periksa Bot Token & Chat ID",
    proses_selesai:"✅ Proses Selesai!",item_masuk_gudang:"item stok masuk ke gudang",sku_baru_terdaftar:"SKU baru terdaftar.",
    data_master_diperbarui:"data master diperbarui (harga/isi propagated).",item_baru_ditambahkan:"item baru ditambahkan.",
    item_existing_diperbarui:"item existing diperbarui.",item_dilewati:"item dilewati.",
    upload_selesai:"✅ Upload Selesai!",upload_stockout_selesai:"✅ Upload Stock Out Selesai!",upload_transfer_selesai:"✅ Upload Transfer Selesai!",upload_intransit_selesai:"✅ Upload InTransit Selesai!",
    po_disimpan_draft:"✅ PO berhasil disimpan ke InTransit sebagai Draft!",po_disimpan_draft_hint:"Ubah status ke 'InTransit' agar masuk ke analisis stok aktual,\natau ke 'Complete' agar masuk ke stok gudang.",
    tersimpan:"✅ Tersimpan!",harga_isi_diupdate:"📢 Harga & Isi/Ctn diupdate ke seluruh data SKU ini.",harga_diupdate:"📢 Harga diupdate ke seluruh data SKU ini.",isi_diupdate:"📢 Isi/Ctn diupdate ke seluruh data SKU ini.",
    profil_disimpan:"✅ Profil perusahaan berhasil disimpan!",preferensi_disimpan:"✅ Preferensi disimpan!",
    user_ditambahkan:"✅ User '{u}' berhasil ditambahkan sebagai {role}!",user_dihapus:"✅ User '{u}' dihapus.",konfirmasi_hapus_user:"Hapus user '{u}'?",
    telegram_config_disimpan:"✅ Konfigurasi Telegram disimpan!",notif_test_berhasil:"✅ Notifikasi test berhasil dikirim ke Telegram!",
    lengkapi_harga_qty:"💡 Lengkapi Harga / Qty Ctn.",sku_baru_terdeteksi:"✨ SKU Baru Terdeteksi!",sku_tidak_ditemukan:"⚠️ SKU tidak ditemukan di master.",
    btn_edit:"Edit",btn_hapus:"Hapus",btn_simpan_edit:"💾 Simpan Edit",
    belum_ada_barang:"Belum ada barang",hint_tambah_barang:"Tambahkan barang lewat form di sebelah kiri atau upload template Excel.",
    hint_stock_in_muncul:"Transaksi Stock In yang kamu simpan akan muncul di sini.",hint_stock_out_muncul:"Transaksi Stock Out yang kamu simpan akan muncul di sini.",
    hint_transfer_muncul:"Transfer stok antar gudang akan muncul di sini.",hint_ledger_muncul:"Semua histori transaksi stok akan tercatat di sini.",
    belum_ada_intransit:"Belum ada data In Transit",hint_intransit_muncul:"PO yang sedang dalam pengiriman akan muncul di sini.",
    badge_expired:"Expired",badge_damage:"Damage",badge_stockout:"Stock Out",badge_fast:"Fast",badge_medium:"Medium",badge_slow:"Slow",badge_nodata:"No Data",
    badge_draft:"Draft",badge_intransit:"InTransit",badge_complete:"Complete",
    status_kritis_reorder:"🔴 Kritis",status_segera:"🟠 Segera",status_perhatian:"🟡 Perhatian",
    semua_stok_aman:"Semua stok aman",hint_reorder_aman:"Tidak ada barang dengan ketahanan di bawah {n} hari.",belum_dipilih:"Belum",
    tidak_ada_item_dipilih:"Tidak ada item yang dipilih!",masukkan_jumlah_ctn:"Masukkan jumlah karton PO!",
    stok_minus_confirm:"⚠️ Stok sudah minus {n} pcs! Akan ada selisih {s} pcs yang tercatat sebagai hutang stok. Tetap lanjut?",
    stok_tidak_cukup_confirm:"⚠️ Stok tidak mencukupi! Stok tersedia: {n} pcs. Akan ada selisih {s} pcs yang tercatat sebagai hutang stok. Tetap lanjut?",
    akses_khusus_admin:"Halaman ini khusus Admin",belum_ada_user_tambahan:"Belum ada user tambahan",belum_ada_riwayat_login:"Belum ada riwayat login",
    belum_ada_aktivitas:"Belum ada aktivitas tercatat",terakhir_terkirim:"Terakhir terkirim: ",belum_pernah_terkirim:"Belum pernah terkirim otomatis.",
    gudang_dipilih:"Gudang Dipilih",multi_all_warehouse:"All Warehouse",
    role_admin:"👑 Admin",role_staff:"📦 Staff Gudang",role_viewer:"👁 Viewer",
    logo_siap:"🖼️ Logo siap, klik 'Simpan Profil Perusahaan' untuk menerapkan.",panel_po_dibuka:"📋 Panel Planning PO dibuka dengan rekomendasi {n} ctn.",
    notif_terkirim_telegram:"🔔 Notifikasi stok kritis otomatis terkirim ke Telegram ({n} item).",pdf_berhasil_dibuat:"📄 PDF berhasil dibuat: ",
    item_berhasil_diproses:"item berhasil diproses.",item_ditransfer_dari:"item ditransfer dari",peringatan_stok:"⚠️ Peringatan Stok:",peringatan_stok_kurang:"⚠️ Peringatan Stok Kurang:",
    confirm_logout:"Yakin ingin logout?",
    tg_card_title:"Peringatan Stok Kritis",tg_card_subtitle:"{n} barang dengan stok menipis",tg_card_more:"+{n} barang lainnya, cek dashboard untuk detail lengkap",tg_card_footer:"Dibuat otomatis oleh {company}",tg_card_none:"Saat ini tidak ada stok kritis (ketahanan < {n} hari).",tg_saran_po:"Saran PO",tg_sisa:"Sisa",
    bawaan_sistem:"Bawaan Sistem",tidak_bisa_dihapus:"Tidak bisa dihapus",custom_label:"Custom",
    sa_th_total_transaksi:"Total Transaksi",sa_th_qty_ctn:"Qty Keluar (Karton)",sa_th_qty_pcs:"Qty Keluar (Pcs)",sa_th_total_qty_ctn:"Total Qty Keluar (Karton)",sa_th_total_qty_pcs:"Total Qty Keluar (Pcs)",sa_th_harga_satuan:"Harga Satuan",sa_th_tgl_pertama:"Tgl Pertama",sa_th_tgl_terakhir:"Tgl Terakhir",tidak_ada_data_penjualan:"Tidak ada data penjualan",belum_ada_stockout_3bln:"Belum ada data stock out 3 bulan terakhir",
    welcome_msg:"👋 Selamat datang, {name}!",
    akun_belum_diberi_akses:"⛔ Akun ditemukan tapi belum diberi akses/role oleh admin. Hubungi admin untuk mengaktifkan akun ini.",username_taken_auth:"⚠️ Username ini sudah dipakai.",weak_password:"⚠️ Password terlalu pendek, minimal 6 karakter.",
    btn_save_expired:"✅ Simpan Expired",btn_save_damage:"✅ Simpan Damage",
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
    tab_dashboard:"Dashboard",tab_sales:"Sales Analytics",tab_reorder:"Reorder Recommendation",tab_settings:"Settings",
    sb_section_dashboard:"Dashboard",sb_section_operasional:"Operations",sb_section_laporan:"Reports",sb_section_admin:"Admin",
    dark_mode:"Dark Mode",logout:"Logout",
    placeholder_search_monitor:"🔍 Search name / SKU...",all_warehouse:"🏢 All Warehouse",btn_export:"Export",
    asset_title_all:"💰 Total Stock Value (All Warehouse):",asset_title_wh:"🏢 Total Stock Value (Warehouse {wh}):",
    label_stok_per_tanggal:"📅 Stock as of Date:",btn_lihat_live:"🔴 Live",snapshot_badge:"Snapshot as of {tgl}",info_snapshot_mode:"ℹ️ Showing historical stock position as of {tgl}. View only, cannot be edited/deleted. Click \"Live\" to return to current stock.",
    asset_title_snapshot_all:"📅 Stock Value as of {tgl} (All Warehouse):",asset_title_snapshot_wh:"📅 Stock Value as of {tgl} (Warehouse {wh}):",
    monitor_total_keseluruhan:"🧮 Grand Total ({n} rows — {wh}):",monitor_semua_gudang:"All Warehouses",monitor_gudang:"Warehouse {wh}",
    tidak_ada_data:"No data",
    dash_kpi_nilai_stok:"Stock Value",dash_kpi_sku_aktif:"Active SKU",dash_kpi_out_bulan:"Out This Month",dash_kpi_in_bulan:"In This Month",dash_kpi_moving:"Fast / Med / Slow",
    dash_kpi_pcs_terjual:"pcs sold",dash_kpi_item_no_data:"items with no data",
    dash_chart_out7_title:"Stock Out — Last 7 Days",dash_badge_carton:"CARTON",
    dash_top_sku_title:"Top 15 Best-Selling SKU",bulan_ini:"This Month",dash_no_data_month:"No stock out data for this month yet",
    dash_moving_title:"Moving Category",dash_moving_center_label:"SKU",dash_low_stock_title:"Critical Stock — Duration < 1 Month",dash_badge_avg30:"AVG 30 DAYS",
    dash_th_sku:"SKU",dash_th_nama:"Item Name",dash_th_gudang:"Warehouse",dash_th_stok_ctn:"Stock (Ctn)",dash_th_avg_bln:"Avg/Month (22wd)",dash_th_ketahanan:"Duration",dash_th_status:"Status",
    dash_low_stock_ok:"✅ All stock is safe (duration ≥ 1 month)",dash_status_kritis:"🔴 Critical",dash_status_rendah:"🟡 Low",
    dash_bestseller3m_title:"Best Seller — Last 3 Months",dash_badge_90hari:"90 DAYS",
    dash_deadstock_title:"Dead Stock — Not Sold",dash_badge_60hari:"≥ 60 DAYS",dash_th_terakhir_terjual:"Last Sold",dash_th_umur:"Age",
    dash_deadstock_ok:"✅ No dead stock (every item sold within the last 60 days)",dash_belum_pernah_terjual:"Never sold",
    dash_overstock_title:"Overstock / Slow Moving — Oldest On Hand",dash_badge_aging:"AGING STOCK",dash_th_terakhir_stockin:"Last Stock In",dash_th_umur_soh:"Aging",dash_th_kategori:"Category",
    dash_overstock_ok:"✅ No overstock/slow-moving items right now",dash_tidak_ada_stockin:"No stock-in data",
    dash_hari:"days",dash_bln:"mo",dash_hr:"d",
    access_denied_admin:"⛔ Access denied. This feature is Admin only.",access_denied_staff:"⛔ Access denied. This feature is for Admin/Staff Gudang only.",
    access_denied:"⛔ Access denied.",access_denied_edit_admin:"⛔ Access denied. Only Admin can edit this data.",
    gagal_menyimpan:"⛔ Failed to save: ",gagal_menghapus:"⛔ Failed to delete: ",firebase_belum_siap:"⚠️ Firebase is not ready yet.",file_kosong:"⚠️ File is empty!",
    no_data_export:"⚠️ No data to export!",no_data_ledger_export:"⚠️ No ledger data to export!",
    no_data_analisis_export:"⚠️ No analysis data to export!",no_data_sales_export:"⚠️ No sales data to export!",
    no_data_reorder_export:"⚠️ No reorder recommendations to export!",
    pilih_tanggal_upload:"⚠️ Please select an Upload Date first!",pilih_tanggal_upload_out:"⚠️ Please select a Stock Out Upload Date first!",
    pilih_tanggal_transfer:"⚠️ Please select a Transfer Date first!",pilih_tanggal_intransit:"⚠️ Please select an Intransit Date first!",
    pilih_gudang_asal:"⚠️ Please select a Source Warehouse first!",pilih_gudang_tujuan:"⚠️ Please select a Destination Warehouse first!",
    gudang_sama_error:"⚠️ Source and destination warehouse cannot be the same!",lengkapi_username_password:"⚠️ Please fill in username & password!",
    username_sudah_dipakai:"⚠️ This username is already used by a default system account!",isi_bot_token:"⚠️ Please fill in the Bot Token & Chat ID first!",
    pdf_library_belum_siap:"⛔ PDF library isn't ready yet. Make sure you're connected to the internet and try again.",gagal_kirim:"⛔ Failed to send: ",
    gagal_kirim_notif:"⛔ Failed to send notification: ",cek_koneksi_bot:"\n(Check internet connection / Bot Token / Chat ID)",periksa_bot_token:"check Bot Token & Chat ID",
    proses_selesai:"✅ Process Complete!",item_masuk_gudang:"items added to warehouse",sku_baru_terdaftar:"new SKU registered.",
    data_master_diperbarui:"master data updated (price/qty propagated).",item_baru_ditambahkan:"new items added.",
    item_existing_diperbarui:"existing items updated.",item_dilewati:"items skipped.",
    upload_selesai:"✅ Upload Complete!",upload_stockout_selesai:"✅ Stock Out Upload Complete!",upload_transfer_selesai:"✅ Transfer Upload Complete!",upload_intransit_selesai:"✅ InTransit Upload Complete!",
    po_disimpan_draft:"✅ PO saved to InTransit as Draft!",po_disimpan_draft_hint:"Change the status to 'InTransit' so it's included in stock analysis,\nor to 'Complete' so it's added to warehouse stock.",
    tersimpan:"✅ Saved!",harga_isi_diupdate:"📢 Price & Qty/Ctn updated across all data for this SKU.",harga_diupdate:"📢 Price updated across all data for this SKU.",isi_diupdate:"📢 Qty/Ctn updated across all data for this SKU.",
    profil_disimpan:"✅ Company profile saved successfully!",preferensi_disimpan:"✅ Preferences saved!",
    user_ditambahkan:"✅ User '{u}' added successfully as {role}!",user_dihapus:"✅ User '{u}' deleted.",konfirmasi_hapus_user:"Delete user '{u}'?",
    telegram_config_disimpan:"✅ Telegram configuration saved!",notif_test_berhasil:"✅ Test notification sent to Telegram successfully!",
    lengkapi_harga_qty:"💡 Fill in Price / Qty Ctn.",sku_baru_terdeteksi:"✨ New SKU Detected!",sku_tidak_ditemukan:"⚠️ SKU not found in master data.",
    btn_edit:"Edit",btn_hapus:"Delete",btn_simpan_edit:"💾 Save Edit",
    belum_ada_barang:"No items yet",hint_tambah_barang:"Add items via the form on the left or upload the Excel template.",
    hint_stock_in_muncul:"Stock In transactions you save will appear here.",hint_stock_out_muncul:"Stock Out transactions you save will appear here.",
    hint_transfer_muncul:"Stock transfers between warehouses will appear here.",hint_ledger_muncul:"All stock transaction history will be recorded here.",
    belum_ada_intransit:"No In Transit data yet",hint_intransit_muncul:"POs currently in transit will appear here.",
    badge_expired:"Expired",badge_damage:"Damage",badge_stockout:"Stock Out",badge_fast:"Fast",badge_medium:"Medium",badge_slow:"Slow",badge_nodata:"No Data",
    badge_draft:"Draft",badge_intransit:"InTransit",badge_complete:"Complete",
    status_kritis_reorder:"🔴 Critical",status_segera:"🟠 Urgent",status_perhatian:"🟡 Attention",
    semua_stok_aman:"All stock is safe",hint_reorder_aman:"No items with duration below {n} days.",belum_dipilih:"Not yet",
    tidak_ada_item_dipilih:"No item selected!",masukkan_jumlah_ctn:"Enter the number of PO cartons!",
    stok_minus_confirm:"⚠️ Stock is already at -{n} pcs! There will be a {s} pcs gap recorded as a stock deficit. Continue anyway?",
    stok_tidak_cukup_confirm:"⚠️ Insufficient stock! Available: {n} pcs. There will be a {s} pcs gap recorded as a stock deficit. Continue anyway?",
    akses_khusus_admin:"This page is Admin only",belum_ada_user_tambahan:"No additional users yet",belum_ada_riwayat_login:"No login history yet",
    belum_ada_aktivitas:"No activity recorded yet",terakhir_terkirim:"Last sent: ",belum_pernah_terkirim:"Never sent automatically yet.",
    gudang_dipilih:"Warehouses Selected",multi_all_warehouse:"All Warehouse",
    role_admin:"👑 Admin",role_staff:"📦 Staff Gudang",role_viewer:"👁 Viewer",
    logo_siap:"🖼️ Logo ready, click 'Save Company Profile' to apply.",panel_po_dibuka:"📋 PO Planning panel opened with a recommendation of {n} ctn.",
    notif_terkirim_telegram:"🔔 Critical stock notification automatically sent to Telegram ({n} items).",pdf_berhasil_dibuat:"📄 PDF created successfully: ",
    item_berhasil_diproses:"items processed successfully.",item_ditransfer_dari:"items transferred from",peringatan_stok:"⚠️ Stock Warning:",peringatan_stok_kurang:"⚠️ Insufficient Stock Warning:",
    bawaan_sistem:"System Default",tidak_bisa_dihapus:"Cannot be deleted",custom_label:"Custom",
    confirm_logout:"Are you sure you want to log out?",
    tg_card_title:"Critical Stock Alert",tg_card_subtitle:"{n} items running low",tg_card_more:"+{n} more items, check the dashboard for full details",tg_card_footer:"Generated automatically by {company}",tg_card_none:"No critical stock right now (duration < {n} days).",tg_saran_po:"Suggested PO",tg_sisa:"Left",
    sa_th_total_transaksi:"Total Transactions",sa_th_qty_ctn:"Qty Out (Carton)",sa_th_qty_pcs:"Qty Out (Pcs)",sa_th_total_qty_ctn:"Total Qty Out (Carton)",sa_th_total_qty_pcs:"Total Qty Out (Pcs)",sa_th_harga_satuan:"Unit Price",sa_th_tgl_pertama:"First Date",sa_th_tgl_terakhir:"Last Date",tidak_ada_data_penjualan:"No sales data",belum_ada_stockout_3bln:"No stock out data for the last 3 months yet",
    welcome_msg:"👋 Welcome, {name}!",
    akun_belum_diberi_akses:"⛔ Account found but has not been given access/role by the admin. Contact the admin to activate this account.",username_taken_auth:"⚠️ This username is already taken.",weak_password:"⚠️ Password is too short, minimum 6 characters.",
    btn_save_expired:"✅ Save Expired",btn_save_damage:"✅ Save Damage",
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
    tab_dashboard:"대시보드",tab_sales:"판매 분석",tab_reorder:"재주문 추천",tab_settings:"설정",
    sb_section_dashboard:"대시보드",sb_section_operasional:"운영",sb_section_laporan:"보고서",sb_section_admin:"관리자",
    dark_mode:"다크 모드",logout:"로그아웃",
    placeholder_search_monitor:"🔍 이름 / SKU 검색...",all_warehouse:"🏢 전체 창고",btn_export:"내보내기",
    asset_title_all:"💰 총 재고 금액 (전체 창고):",asset_title_wh:"🏢 총 재고 금액 (창고 {wh}):",
    label_stok_per_tanggal:"📅 기준일 재고:",btn_lihat_live:"🔴 실시간",snapshot_badge:"{tgl} 기준 스냅샷",info_snapshot_mode:"ℹ️ {tgl} 기준 재고 현황입니다. 조회 전용이며 수정/삭제할 수 없습니다. 현재 재고로 돌아가려면 \"실시간\"을 클릭하세요.",
    asset_title_snapshot_all:"📅 {tgl} 기준 재고 금액 (전체 창고):",asset_title_snapshot_wh:"📅 {tgl} 기준 재고 금액 (창고 {wh}):",
    monitor_total_keseluruhan:"🧮 총 합계 ({n}건 — {wh}):",monitor_semua_gudang:"전체 창고",monitor_gudang:"창고 {wh}",
    tidak_ada_data:"데이터 없음",
    dash_kpi_nilai_stok:"재고 금액",dash_kpi_sku_aktif:"활성 SKU",dash_kpi_out_bulan:"이번 달 출고",dash_kpi_in_bulan:"이번 달 입고",dash_kpi_moving:"Fast / Med / Slow",
    dash_kpi_pcs_terjual:"pcs 판매됨",dash_kpi_item_no_data:"데이터 없는 품목",
    dash_chart_out7_title:"출고 — 최근 7일",dash_badge_carton:"박스",
    dash_top_sku_title:"베스트셀러 TOP 15",bulan_ini:"이번 달",dash_no_data_month:"이번 달 출고 데이터가 아직 없습니다",
    dash_moving_title:"회전 분류",dash_moving_center_label:"SKU",dash_low_stock_title:"위험 재고 — 지속 기간 < 1개월",dash_badge_avg30:"평균 30일",
    dash_th_sku:"SKU",dash_th_nama:"품목명",dash_th_gudang:"창고",dash_th_stok_ctn:"재고 (박스)",dash_th_avg_bln:"월평균 (22근무일)",dash_th_ketahanan:"지속 기간",dash_th_status:"상태",
    dash_low_stock_ok:"✅ 모든 재고가 안전합니다 (지속 기간 ≥ 1개월)",dash_status_kritis:"🔴 위험",dash_status_rendah:"🟡 낮음",
    dash_bestseller3m_title:"베스트셀러 — 최근 3개월",dash_badge_90hari:"90일",
    dash_deadstock_title:"데드스톡 — 미판매",dash_badge_60hari:"≥ 60일",dash_th_terakhir_terjual:"마지막 판매일",dash_th_umur:"경과일",
    dash_deadstock_ok:"✅ 데드스톡 없음 (모든 품목이 최근 60일 내 판매됨)",dash_belum_pernah_terjual:"판매 이력 없음",
    dash_overstock_title:"과잉재고 / 저회전 — 최장 보유 재고",dash_badge_aging:"에이징 재고",dash_th_terakhir_stockin:"마지막 입고일",dash_th_umur_soh:"보유 기간",dash_th_kategori:"분류",
    dash_overstock_ok:"✅ 현재 과잉재고/저회전 품목 없음",dash_tidak_ada_stockin:"입고 데이터 없음",
    dash_hari:"일",dash_bln:"개월",dash_hr:"일",
    access_denied_admin:"⛔ 접근이 거부되었습니다. 관리자 전용 기능입니다.",access_denied_staff:"⛔ 접근이 거부되었습니다. 관리자/창고 직원 전용 기능입니다.",
    access_denied:"⛔ 접근이 거부되었습니다.",access_denied_edit_admin:"⛔ 접근이 거부되었습니다. 관리자만 이 데이터를 수정할 수 있습니다.",
    gagal_menyimpan:"⛔ 저장 실패: ",gagal_menghapus:"⛔ 삭제 실패: ",firebase_belum_siap:"⚠️ Firebase가 아직 준비되지 않았습니다.",file_kosong:"⚠️ 파일이 비어 있습니다!",
    no_data_export:"⚠️ 내보낼 데이터가 없습니다!",no_data_ledger_export:"⚠️ 내보낼 원장 데이터가 없습니다!",
    no_data_analisis_export:"⚠️ 내보낼 분석 데이터가 없습니다!",no_data_sales_export:"⚠️ 내보낼 판매 데이터가 없습니다!",
    no_data_reorder_export:"⚠️ 내보낼 재주문 추천 데이터가 없습니다!",
    pilih_tanggal_upload:"⚠️ 먼저 업로드 날짜를 선택하세요!",pilih_tanggal_upload_out:"⚠️ 먼저 출고 업로드 날짜를 선택하세요!",
    pilih_tanggal_transfer:"⚠️ 먼저 이동 날짜를 선택하세요!",pilih_tanggal_intransit:"⚠️ 먼저 운송중 날짜를 선택하세요!",
    pilih_gudang_asal:"⚠️ 먼저 출발 창고를 선택하세요!",pilih_gudang_tujuan:"⚠️ 먼저 도착 창고를 선택하세요!",
    gudang_sama_error:"⚠️ 출발 창고와 도착 창고가 동일할 수 없습니다!",lengkapi_username_password:"⚠️ 사용자명과 비밀번호를 입력하세요!",
    username_sudah_dipakai:"⚠️ 이 사용자명은 이미 기본 시스템 계정에서 사용 중입니다!",isi_bot_token:"⚠️ 먼저 Bot Token과 Chat ID를 입력하세요!",
    pdf_library_belum_siap:"⛔ PDF 라이브러리가 아직 준비되지 않았습니다. 인터넷 연결을 확인하고 다시 시도하세요.",gagal_kirim:"⛔ 전송 실패: ",
    gagal_kirim_notif:"⛔ 알림 전송 실패: ",cek_koneksi_bot:"\n(인터넷 연결 / Bot Token / Chat ID를 확인하세요)",periksa_bot_token:"Bot Token 및 Chat ID 확인",
    proses_selesai:"✅ 처리 완료!",item_masuk_gudang:"개 품목이 창고에 입고됨",sku_baru_terdaftar:"개 신규 SKU 등록됨.",
    data_master_diperbarui:"개 마스터 데이터 업데이트됨 (단가/박스당 수량 반영).",item_baru_ditambahkan:"개 신규 품목 추가됨.",
    item_existing_diperbarui:"개 기존 품목 업데이트됨.",item_dilewati:"개 품목 건너뜀.",
    upload_selesai:"✅ 업로드 완료!",upload_stockout_selesai:"✅ 출고 업로드 완료!",upload_transfer_selesai:"✅ 이동 업로드 완료!",upload_intransit_selesai:"✅ 운송중 업로드 완료!",
    po_disimpan_draft:"✅ PO가 운송중(임시)으로 저장되었습니다!",po_disimpan_draft_hint:"상태를 '운송중'으로 변경하면 실제 재고 분석에 반영되고,\n'완료'로 변경하면 창고 재고에 반영됩니다.",
    tersimpan:"✅ 저장되었습니다!",harga_isi_diupdate:"📢 이 SKU의 모든 데이터에 단가 및 박스당 수량이 업데이트되었습니다.",harga_diupdate:"📢 이 SKU의 모든 데이터에 단가가 업데이트되었습니다.",isi_diupdate:"📢 이 SKU의 모든 데이터에 박스당 수량이 업데이트되었습니다.",
    profil_disimpan:"✅ 회사 프로필이 저장되었습니다!",preferensi_disimpan:"✅ 환경설정이 저장되었습니다!",
    user_ditambahkan:"✅ 사용자 '{u}'이(가) {role}(으)로 추가되었습니다!",user_dihapus:"✅ 사용자 '{u}'이(가) 삭제되었습니다.",konfirmasi_hapus_user:"사용자 '{u}'을(를) 삭제하시겠습니까?",
    telegram_config_disimpan:"✅ 텔레그램 설정이 저장되었습니다!",notif_test_berhasil:"✅ 테스트 알림이 텔레그램으로 전송되었습니다!",
    lengkapi_harga_qty:"💡 단가 / 박스당 수량을 입력하세요.",sku_baru_terdeteksi:"✨ 신규 SKU 감지됨!",sku_tidak_ditemukan:"⚠️ 마스터 데이터에서 SKU를 찾을 수 없습니다.",
    btn_edit:"수정",btn_hapus:"삭제",btn_simpan_edit:"💾 수정 저장",
    belum_ada_barang:"아직 품목이 없습니다",hint_tambah_barang:"왼쪽 양식으로 품목을 추가하거나 엑셀 템플릿을 업로드하세요.",
    hint_stock_in_muncul:"저장한 입고 거래가 여기에 표시됩니다.",hint_stock_out_muncul:"저장한 출고 거래가 여기에 표시됩니다.",
    hint_transfer_muncul:"창고 간 재고 이동이 여기에 표시됩니다.",hint_ledger_muncul:"모든 재고 거래 내역이 여기에 기록됩니다.",
    belum_ada_intransit:"아직 운송중 데이터가 없습니다",hint_intransit_muncul:"운송 중인 PO가 여기에 표시됩니다.",
    badge_expired:"유통기한 만료",badge_damage:"파손",badge_stockout:"출고",badge_fast:"빠름",badge_medium:"보통",badge_slow:"느림",badge_nodata:"데이터 없음",
    badge_draft:"임시",badge_intransit:"운송중",badge_complete:"완료",
    status_kritis_reorder:"🔴 위험",status_segera:"🟠 긴급",status_perhatian:"🟡 주의",
    semua_stok_aman:"모든 재고가 안전합니다",hint_reorder_aman:"지속 기간이 {n}일 미만인 품목이 없습니다.",belum_dipilih:"미지정",
    tidak_ada_item_dipilih:"선택된 품목이 없습니다!",masukkan_jumlah_ctn:"PO 박스 수량을 입력하세요!",
    stok_minus_confirm:"⚠️ 재고가 이미 {n} pcs 마이너스입니다! {s} pcs 차이가 재고 부채로 기록됩니다. 계속하시겠습니까?",
    stok_tidak_cukup_confirm:"⚠️ 재고가 부족합니다! 가용 재고: {n} pcs. {s} pcs 차이가 재고 부채로 기록됩니다. 계속하시겠습니까?",
    akses_khusus_admin:"이 페이지는 관리자 전용입니다",belum_ada_user_tambahan:"추가 사용자가 없습니다",belum_ada_riwayat_login:"로그인 기록이 없습니다",
    belum_ada_aktivitas:"기록된 활동이 없습니다",terakhir_terkirim:"마지막 전송: ",belum_pernah_terkirim:"자동 전송된 적이 없습니다.",
    gudang_dipilih:"개 창고 선택됨",multi_all_warehouse:"전체 창고",
    role_admin:"👑 관리자",role_staff:"📦 창고 직원",role_viewer:"👁 열람자",
    logo_siap:"🖼️ 로고 준비 완료, '회사 프로필 저장'을 클릭해 적용하세요.",panel_po_dibuka:"📋 추천 {n} ctn으로 PO 계획 패널이 열렸습니다.",
    notif_terkirim_telegram:"🔔 위험 재고 알림이 텔레그램으로 자동 전송되었습니다 ({n}건).",pdf_berhasil_dibuat:"📄 PDF가 생성되었습니다: ",
    bawaan_sistem:"기본 시스템",tidak_bisa_dihapus:"삭제 불가",custom_label:"커스텀",
    item_berhasil_diproses:"개 품목 처리 완료.",item_ditransfer_dari:"개 품목 이동 완료, 출발:",peringatan_stok:"⚠️ 재고 경고:",peringatan_stok_kurang:"⚠️ 재고 부족 경고:",
    confirm_logout:"로그아웃 하시겠습니까?",
    tg_card_title:"위험 재고 알림",tg_card_subtitle:"재고 부족 품목 {n}건",tg_card_more:"+{n}건 더 있음, 대시보드에서 전체 내용을 확인하세요",tg_card_footer:"{company}에서 자동 생성됨",tg_card_none:"현재 위험 재고가 없습니다 (지속 기간 < {n}일).",tg_saran_po:"추천 PO",tg_sisa:"잔여",
    sa_th_total_transaksi:"총 거래",sa_th_qty_ctn:"출고 수량 (박스)",sa_th_qty_pcs:"출고 수량 (pcs)",sa_th_total_qty_ctn:"총 출고 수량 (박스)",sa_th_total_qty_pcs:"총 출고 수량 (pcs)",sa_th_harga_satuan:"단가",sa_th_tgl_pertama:"첫 거래일",sa_th_tgl_terakhir:"마지막 거래일",tidak_ada_data_penjualan:"판매 데이터가 없습니다",belum_ada_stockout_3bln:"최근 3개월간 출고 데이터가 없습니다",
    welcome_msg:"👋 환영합니다, {name}님!",
    akun_belum_diberi_akses:"⛔ 계정은 있지만 관리자가 아직 역할을 부여하지 않았습니다. 관리자에게 계정 활성화를 요청하세요.",username_taken_auth:"⚠️ 이미 사용 중인 사용자명입니다.",weak_password:"⚠️ 비밀번호가 너무 짧습니다 (최소 6자).",
    btn_save_expired:"✅ 만료 저장",btn_save_damage:"✅ 파손 저장",
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
  // Re-render topbar title + tab yang sedang aktif supaya konten yang dibangun lewat JS
  // (tabel, kartu KPI, badge, dsb) ikut berganti bahasa, bukan cuma elemen statis.
  let tt = document.getElementById('topbar-page-name');
  if(tt && typeof tabTitle === 'function') tt.textContent = tabTitle(activeTab);
  if(typeof renderTab === 'function') renderTab(activeTab);
  if(typeof updateMultiWhButtonLabel === 'function'){
    ['an-wh','sa-wh'].forEach(id=>{ if(document.getElementById(id+'-btn')) updateMultiWhButtonLabel(id); });
  }
}

function applyLang(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    el.title = t(el.getAttribute('data-i18n-title'));
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
const _auditPrevLen = {};
const _AUDIT_LABEL = { barang:"Monitor Stok", stockInLog:"Stock In", stockOutLog:"Stock Out", transferLog:"Transfer Stok", intransitLog:"In Transit" };
function fbSave(key, data){
  if(!window._db) return;
  _trackAudit(key, data);
  window._db.ref("inventory/"+key).set(data).catch(e=>console.error("Firebase save error:",e));
}
// Deteksi otomatis jenis perubahan (tambah/hapus/edit) berdasar perubahan panjang array,
// lalu catat ke Firebase "auditLog" — dipakai di halaman Settings > Riwayat Aktivitas.
function _trackAudit(key, data){
  let label = _AUDIT_LABEL[key];
  if(!label || !currentRole) return;
  let newLen = Array.isArray(data) ? data.length : 0;
  let prevLen = _auditPrevLen[key];
  let action = "✏️ Edit data";
  if(prevLen!==undefined){
    if(newLen > prevLen) action = "➕ Tambah data";
    else if(newLen < prevLen) action = "🗑️ Hapus data";
  }
  _auditPrevLen[key] = newLen;
  logAudit(label, action, newLen+" baris total");
}
// Dipanggil generic dari mana saja (mutasi stok otomatis, atau aksi Settings manual)
function logAudit(module, action, detail){
  if(!window._db) return;
  let user = window._currentUsername || "system";
  let entry = { time:new Date().toISOString(), user, role:currentRole||"-", module, action, detail:detail||"" };
  let log = (window._auditLog || []).slice(-49); // simpan maksimal 50 entri terakhir
  log.push(entry);
  window._auditLog = log;
  window._db.ref("auditLog").set(log).catch(()=>{});
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
    _auditPrevLen["barang"] = daftarBarang.length;
    markDirty("monitor","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/stockInLog").on("value", snap => {
    stockInLog = snap.val() || []; onLoaded();
    _auditPrevLen["stockInLog"] = stockInLog.length;
    markDirty("in","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/stockOutLog").on("value", snap => {
    stockOutLog = snap.val() || []; onLoaded();
    _auditPrevLen["stockOutLog"] = stockOutLog.length;
    markDirty("out","ledger","analisis","dashboard"); renderTab(activeTab);
  });
  db.ref("inventory/transferLog").on("value", snap => {
    transferLog = snap.val() || []; onLoaded();
    _auditPrevLen["transferLog"] = transferLog.length;
    markDirty("transfer","ledger"); renderTab(activeTab);
  });
  db.ref("inventory/intransitLog").on("value", snap => {
    intransitLog = snap.val() || []; onLoaded();
    _auditPrevLen["intransitLog"] = intransitLog.length;
    markDirty("intransit","analisis"); renderTab(activeTab);
  });

  // ---- SETTINGS: profil perusahaan, akun tambahan, riwayat login ----
  db.ref("appSettings").on("value", snap => {
    let s = snap.val() || {};
    window._appSettings = s;
    window._loginHistory = s.loginHistory || [];
    if(typeof applyCompanyBranding==="function") applyCompanyBranding();
    if(activeTab==="settings" && typeof renderSettingsPage==="function") renderSettingsPage();
    // Auto-send saat web dibuka DIMATIKAN (2026-07-10) — notifikasi jam 19:00 sudah dihandle terpisah
    // oleh Cloudflare Worker (inventory-ic-telegram-alert-worker.js) via cron trigger.
    // if(typeof maybeAutoSendTelegramAlert==="function") maybeAutoSendTelegramAlert();
  });

  // ---- AUDIT LOG (riwayat aktivitas) ----
  db.ref("auditLog").on("value", snap => {
    window._auditLog = snap.val() || [];
    if(activeTab==="settings" && typeof renderAuditLogTable==="function") renderAuditLogTable();
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
