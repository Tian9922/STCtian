/**
 * ==========================================
 * PATCH: Real-time Stock Calculation Fix
 * ==========================================
 * Problem: Monitor Stok tidak tersync dengan transaksi
 * Solution: Hitung stok real-time dari semua transaksi
 * 
 * Usage: Masukkan script ini SEBELUM function tampilkanTabel()
 * di dalam file index.html dalam tag <script></script>
 */

// ===== FUNGSI UTAMA: HITUNG STOK AKHIR DARI SEMUA TRANSAKSI =====
function hitungStokAkhir(sku, warehouse) {
  let stokAwal = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;
  let transferMasuk = 0;
  let transferKeluar = 0;

  try {
    // 1. Ambil stok initial dari master barang
    const barangList = JSON.parse(localStorage.getItem('barang') || '[]');
    const barang = barangList.find(b => b.sku === sku && b.warehouse === warehouse);
    if (barang) {
      stokAwal = parseInt(barang.totalPcs) || 0;
    }

    // 2. Hitung total Stock In (masuk ke warehouse)
    const stockInList = JSON.parse(localStorage.getItem('stockIn') || '[]');
    const masuk = stockInList.filter(x => x.sku === sku && x.warehouse === warehouse);
    totalMasuk = masuk.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);

    // 3. Hitung total Stock Out (keluar dari warehouse)
    const stockOutList = JSON.parse(localStorage.getItem('stockOut') || '[]');
    const keluar = stockOutList.filter(x => x.sku === sku && x.warehouse === warehouse);
    totalKeluar = keluar.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);

    // 4. Hitung transfer masuk ke warehouse ini
    const transferList = JSON.parse(localStorage.getItem('transfer') || '[]');
    const trMasuk = transferList.filter(x => x.sku === sku && x.toWh === warehouse);
    transferMasuk = trMasuk.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);

    // 5. Hitung transfer keluar dari warehouse ini
    const trKeluar = transferList.filter(x => x.sku === sku && x.fromWh === warehouse);
    transferKeluar = trKeluar.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);

    // ===== FORMULA AKHIR =====
    // Stok Akhir = Stok Awal + Masuk + Transfer Masuk - Keluar - Transfer Keluar
    const stokAkhir = stokAwal + totalMasuk + transferMasuk - totalKeluar - transferKeluar;
    
    // Jangan sampai negatif
    return Math.max(0, stokAkhir);
  } catch (err) {
    console.error(`Error menghitung stok untuk ${sku} ${warehouse}:`, err);
    return 0;
  }
}

// ===== FUNGSI OVERRIDE: TAMPILKAN TABEL DENGAN STOK REAL-TIME =====
function tampilkanTabelFixed() {
  const search = document.getElementById('search')?.value.toLowerCase() || '';
  const filterWarehouse = document.getElementById('filterWarehouse')?.value || 'All';
  
  let barangList = JSON.parse(localStorage.getItem('barang') || '[]');
  let tbody = document.getElementById('tabelBarang');
  
  if (!tbody) return; // Safety check
  
  tbody.innerHTML = '';
  
  // Filter barang berdasarkan search & warehouse
  let filtered = barangList.filter(brg => {
    const matchSearch = !search || 
                       brg.sku?.toLowerCase().includes(search) || 
                       brg.nama?.toLowerCase().includes(search);
    const matchWarehouse = filterWarehouse === 'All' || brg.warehouse === filterWarehouse;
    return matchSearch && matchWarehouse;
  });
  
  let totalNilai = 0;
  
  // Render setiap barang dengan stok yang dihitung real-time
  filtered.forEach((brg, idx) => {
    // ★ KUNCI FIX: Gunakan fungsi hitungStokAkhir()
    const stokSebenarnya = hitungStokAkhir(brg.sku, brg.warehouse);
    const harga = parseInt(brg.harga) || 0;
    const nilaiBarang = stokSebenarnya * harga;
    const isiKarton = parseInt(brg.isiKarton) || 1;
    const konversi = Math.floor(stokSebenarnya / isiKarton);
    
    totalNilai += nilaiBarang;
    
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>${brg.sku}</td>
      <td>${brg.nama}</td>
      <td>${brg.kategori}</td>
      <td>${brg.warehouse}</td>
      <td><strong style="color: #2b6cb0">${stokSebenarnya}</strong></td>
      <td>${konversi} (${brg.isiKarton || '-'})</td>
      <td>Rp ${harga.toLocaleString('id-ID')}</td>
      <td>Rp ${nilaiBarang.toLocaleString('id-ID')}</td>
      <td style="text-align:center;width:90px">
        <button class="btn-action btn-edit" onclick="editBarang('${brg.sku}', '${brg.warehouse}')" title="Edit">✏️</button>
        <button class="btn-action btn-hapus" onclick="hapusBarang('${brg.sku}', '${brg.warehouse}')" title="Hapus">🗑️</button>
      </td>
    `;
  });
  
  // Update total nilai asset
  const assetValue = document.getElementById('assetValue');
  if (assetValue) {
    assetValue.textContent = `Rp ${totalNilai.toLocaleString('id-ID')}`;
  }
}

// ===== OVERRIDE ORIGINAL tampilkanTabel() =====
// Ganti nama original function jadi tampilkanTabelOld, kemudian gunakan yang baru
const tampilkanTabelOriginal = window.tampilkanTabel;
window.tampilkanTabel = function() {
  tampilkanTabelFixed();
};

// ===== HELPER: Debug untuk melihat perhitungan stok =====
function debugStok(sku, warehouse) {
  console.group(`🔍 DEBUG STOK: ${sku} - ${warehouse}`);
  
  const barangList = JSON.parse(localStorage.getItem('barang') || '[]');
  const barang = barangList.find(b => b.sku === sku && b.warehouse === warehouse);
  const stokAwal = barang ? parseInt(barang.totalPcs) || 0 : 0;
  
  const stockInList = JSON.parse(localStorage.getItem('stockIn') || '[]');
  const masuk = stockInList.filter(x => x.sku === sku && x.warehouse === warehouse);
  const totalMasuk = masuk.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);
  
  const stockOutList = JSON.parse(localStorage.getItem('stockOut') || '[]');
  const keluar = stockOutList.filter(x => x.sku === sku && x.warehouse === warehouse);
  const totalKeluar = keluar.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);
  
  const transferList = JSON.parse(localStorage.getItem('transfer') || '[]');
  const trMasuk = transferList.filter(x => x.sku === sku && x.toWh === warehouse);
  const transferMasukQty = trMasuk.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);
  
  const trKeluar = transferList.filter(x => x.sku === sku && x.fromWh === warehouse);
  const transferKeluarQty = trKeluar.reduce((sum, x) => sum + (parseInt(x.qty) || 0), 0);
  
  const stokAkhir = stokAwal + totalMasuk + transferMasukQty - totalKeluar - transferKeluarQty;
  
  console.log(`Stok Awal (Master)      : ${stokAwal} pcs`);
  console.log(`Total Stock In          : +${totalMasuk} pcs`);
  console.log(`Total Stock Out         : -${totalKeluar} pcs`);
  console.log(`Transfer Masuk          : +${transferMasukQty} pcs`);
  console.log(`Transfer Keluar         : -${transferKeluarQty} pcs`);
  console.log(`─────────────────────────────────`);
  console.log(`Stok Akhir (Real-time)  : ${Math.max(0, stokAkhir)} pcs ✅`);
  console.log(`\nFormula: ${stokAwal} + ${totalMasuk} + ${transferMasukQty} - ${totalKeluar} - ${transferKeluarQty} = ${stokAkhir}`);
  console.groupEnd();
  
  return stokAkhir;
}

// ===== AUTO-SYNC KETIKA ADA TRANSAKSI =====
// Panggil tampilkanTabel otomatis setelah simpan transaksi
const originalSimpanStockIn = window.simpanStockIn;
const originalSimpanStockOut = window.simpanStockOut;
const originalSimpanTransfer = window.simpanTransfer;

if (originalSimpanStockIn) {
  window.simpanStockIn = function() {
    originalSimpanStockIn.apply(this, arguments);
    setTimeout(() => tampilkanTabel(), 200); // Refresh setelah 200ms
  };
}

if (originalSimpanStockOut) {
  window.simpanStockOut = function() {
    originalSimpanStockOut.apply(this, arguments);
    setTimeout(() => tampilkanTabel(), 200);
  };
}

if (originalSimpanTransfer) {
  window.simpanTransfer = function() {
    originalSimpanTransfer.apply(this, arguments);
    setTimeout(() => tampilkanTabel(), 200);
  };
}

console.log("✅ Stok Sync Fix loaded - Real-time stock calculation enabled!");
