// =========================================================================
// LAZY RENDERING - hanya render tab yang aktif
// =========================================================================
let activeTab = "monitor";
let dirtyTabs = new Set(); // tab yang perlu di-refresh saat dibuka

function markDirty(...tabs){
  tabs.forEach(t => { if(t !== activeTab) dirtyTabs.add(t); });
  // Langsung render tab yang sedang aktif
  if(tabs.includes(activeTab)) renderTab(activeTab);
}

function renderTab(name){
  dirtyTabs.delete(name);
  if(name==="monitor")   tampilkanTabel();
  else if(name==="in")   tampilkanStockIn();
  else if(name==="out")  tampilkanStockOut();
  else if(name==="transfer") tampilkanTransfer();
  else if(name==="ledger")   tampilkanLedger();
  else if(name==="analisis") tampilkanAnalisis();
  else if(name==="intransit") tampilkanIntransit();
  else if(name==="sales") tampilkanSales();
  else if(name==="dashboard") tampilkanDashboard();
}

// Hanya render tab aktif saat load — Firebase listener akan isi data
// tampilkanTabel(); // tidak perlu, Firebase onValue akan trigger render

// =========================================================================
// NAVIGATION
// =========================================================================
const _tabTitles = {
  monitor:"📊 Monitor Stok", in:"📥 Stock In", out:"📤 Stock Out",
  transfer:"🔄 Transfer Stok", intransit:"🚚 In Transit",
  dashboard:"🏠 Dashboard", ledger:"📋 Stock Ledger", analisis:"📈 Analisa Stock", sales:"🛒 Sales Analytics"
};
function switchTab(name){
  activeTab = name;
  document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll(".page,.page-full").forEach(p=>p.classList.remove("active"));
  let navBtn = document.getElementById("navbtn-"+name);
  if(navBtn) navBtn.classList.add("active");
  let el = document.getElementById("tab-"+name);
  if(el){ el.classList.add("active"); }
  let tt = document.getElementById("topbar-page-name");
  if(tt) tt.textContent = (_tabTitles[name]||name);
  // Render setelah browser paint tab baru (terasa instan)
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ renderTab(name); }); });
}

// =========================================================================
// HELPERS
// =========================================================================
function dapatkanSemuaMasterData(){ return [...BASE_MASTER_DATA, ...customMasterData]; }
function hitungUOM(totalPcs, isiKarton){
  if(!isiKarton||isiKarton<=0) return totalPcs+" pcs";
  let neg=totalPcs<0;
  let abs=Math.abs(totalPcs);
  let karton=Math.floor(abs/isiKarton), sisa=abs%isiKarton;
  let str;
  if(karton===0) str=sisa+" pcs";
  else if(sisa===0) str=karton+" ctn";
  else str=karton+" ctn "+sisa+" pcs";
  return neg?"-"+str:str;
}
function rpFormat(n){ return "Rp "+Number(n).toLocaleString("id-ID"); }

// =========================================================================
// TEMPLATE DOWNLOAD
// =========================================================================
