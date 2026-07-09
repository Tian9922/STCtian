// =========================================================================
// MULTI-WAREHOUSE FILTER — dropdown centang untuk pilih beberapa gudang
// Dipakai di tab Analisa Stok (an-wh) & Sales Analytics (sa-wh)
// =========================================================================

const DAFTAR_GUDANG = ["Bintaro","Gunsin","MAJ","Bosco","K-Mart","Happy Wonder","Hero Supermarket","Consignment","K-Seafood","Event","Sample"];

// Simpan state pilihan tiap dropdown: { containerId: Set(["All"]) atau Set(["Bintaro","Gunsin"]) }
window._whFilterState = window._whFilterState || {};

function buildMultiWhDropdown(containerId, onChangeCallback){
  let container = document.getElementById(containerId);
  if(!container) return;

  window._whFilterState[containerId] = new Set(["All"]);

  container.classList.add("multi-wh");
  container.innerHTML = `
    <button type="button" class="multi-wh-btn" id="${containerId}-btn">${t("multi_all_warehouse")} ▾</button>
    <div class="multi-wh-panel" id="${containerId}-panel" style="display:none">
      <label class="multi-wh-item multi-wh-all">
        <input type="checkbox" value="All" checked> <strong>${t("multi_all_warehouse")}</strong>
      </label>
      <div class="multi-wh-sep"></div>
      ${DAFTAR_GUDANG.map(g => `<label class="multi-wh-item"><input type="checkbox" value="${g}"> ${g}</label>`).join("")}
    </div>
  `;

  let btn = document.getElementById(`${containerId}-btn`);
  let panel = document.getElementById(`${containerId}-panel`);

  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    // Tutup panel dropdown lain yang mungkin terbuka
    document.querySelectorAll(".multi-wh-panel").forEach(p => { if(p !== panel) p.style.display = "none"; });
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  panel.querySelectorAll("input[type=checkbox]").forEach(chk => {
    chk.addEventListener("change", ()=>{
      let state = window._whFilterState[containerId];
      if(chk.value === "All"){
        if(chk.checked){
          state.clear(); state.add("All");
          panel.querySelectorAll("input[type=checkbox]").forEach(c => { if(c.value !== "All") c.checked = false; });
        } else {
          // Jangan biarkan "All" tak tercentang tanpa pilihan lain
          chk.checked = true;
        }
      } else {
        let allChk = panel.querySelector('input[value="All"]');
        if(chk.checked){
          state.delete("All"); allChk.checked = false;
          state.add(chk.value);
        } else {
          state.delete(chk.value);
        }
        if(state.size === 0){
          state.add("All"); allChk.checked = true;
        }
      }
      updateMultiWhButtonLabel(containerId);
      if(typeof onChangeCallback === "function") onChangeCallback();
    });
  });

  // Klik di luar panel -> tutup
  document.addEventListener("click", (e)=>{
    if(!container.contains(e.target)) panel.style.display = "none";
  });
}

function updateMultiWhButtonLabel(containerId){
  let btn = document.getElementById(`${containerId}-btn`);
  let state = window._whFilterState[containerId];
  if(!btn || !state) return;
  if(state.has("All")){
    btn.textContent = t("multi_all_warehouse")+" ▾";
  } else if(state.size === 1){
    btn.textContent = [...state][0] + " ▾";
  } else {
    btn.textContent = state.size + " " + t("gudang_dipilih") + " ▾";
  }
}

// Dipanggil dari fungsi filter (tampilkanAnalisis, tampilkanSales, dst)
// Return array: ["All"] atau daftar nama gudang terpilih
function getMultiWhSelected(containerId){
  let state = window._whFilterState[containerId];
  if(!state) return ["All"];
  return [...state];
}

// Helper pencocokan — pakai ini menggantikan (wh === "All" || warehouse.toUpperCase()===wh.toUpperCase())
function matchWarehouseMulti(containerId, warehouseValue){
  let selected = getMultiWhSelected(containerId);
  if(selected.includes("All")) return true;
  let w = (warehouseValue || "Bintaro").toUpperCase();
  return selected.some(s => s.toUpperCase() === w);
}

// Inisialisasi kedua dropdown setelah halaman siap
document.addEventListener("DOMContentLoaded", ()=>{
  buildMultiWhDropdown("an-wh", ()=>{ if(typeof tampilkanAnalisis==="function") tampilkanAnalisis(); });
  buildMultiWhDropdown("sa-wh", ()=>{ if(typeof tampilkanSales==="function") tampilkanSales(); });
});
