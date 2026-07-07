// =========================================================================
// 07 - UX ENHANCEMENTS + SETTINGS PAGE
// Toast notifications, skeleton loading, empty states, dark mode, dan
// halaman Settings (profil perusahaan, role staff gudang, riwayat login).
// =========================================================================

// -------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// Mengganti alert() bawaan browser dengan toast kecil di pojok layar.
// window.alert() di-override supaya SEMUA pemanggilan alert(...) di file lain
// (03/04/05/06) otomatis jadi toast tanpa perlu ubah satu-satu.
// -------------------------------------------------------------------------
function _toastIcon(type){
  if(type==="success") return "✅";
  if(type==="error")   return "⛔";
  if(type==="warning") return "⚠️";
  return "ℹ️";
}
function showToast(message, type, duration){
  type = type || "info";
  duration = duration || 4200;
  let container = document.getElementById("toast-container");
  if(!container){
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  let el = document.createElement("div");
  el.className = "toast toast-"+type;
  el.innerHTML = "<span class='toast-icon'>"+_toastIcon(type)+"</span><span class='toast-msg'></span><span class='toast-close'>✕</span>";
  el.querySelector(".toast-msg").textContent = message;
  el.querySelector(".toast-close").onclick = () => _removeToast(el);
  container.appendChild(el);
  setTimeout(()=>_removeToast(el), duration);
}
function _removeToast(el){
  if(!el || !el.parentNode) return;
  el.classList.add("toast-out");
  setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 220);
}

// Auto-deteksi tipe toast dari emoji yang sudah ada di teks alert() lama
(function overrideAlert(){
  const _nativeAlert = window.alert;
  window.alert = function(msg){
    let text = String(msg);
    let type = "info";
    if(text.indexOf("✅")!==-1) type = "success";
    else if(text.indexOf("⛔")!==-1) type = "error";
    else if(text.indexOf("⚠️")!==-1) type = "warning";
    showToast(text, type);
  };
  window._nativeAlert = _nativeAlert; // simpan siapa tau perlu balik ke alert asli
})();

// -------------------------------------------------------------------------
// SKELETON LOADING
// -------------------------------------------------------------------------
function renderSkeletonRows(tbodyId, colspan, rows){
  rows = rows || 5;
  let tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  let widths = ["sk-full","sk-med","sk-full","sk-short","sk-med"];
  let html = "";
  for(let i=0;i<rows;i++){
    html += "<tr class='skeleton-row'><td colspan='"+colspan+"'><div class='skeleton-line "+widths[i%widths.length]+"'></div></td></tr>";
  }
  tbody.innerHTML = html;
}
// Data belum siap sampai listener Firebase pertama kali selesai
window._icDataReady = false;

// -------------------------------------------------------------------------
// EMPTY STATE
// -------------------------------------------------------------------------
function emptyStateRow(colspan, icon, title, sub){
  return "<tr><td colspan='"+colspan+"'><div class='empty-state'>"+
    "<div class='empty-state-icon'>"+icon+"</div>"+
    "<div class='empty-state-title'>"+title+"</div>"+
    (sub ? "<div class='empty-state-sub'>"+sub+"</div>" : "")+
    "</div></td></tr>";
}

// -------------------------------------------------------------------------
// DARK MODE
// -------------------------------------------------------------------------
function toggleDarkMode(){
  let on = document.body.classList.toggle("dark-mode");
  localStorage.setItem("icDarkMode", on ? "1" : "0");
  let btn = document.getElementById("dm-switch-btn");
  if(btn) btn.classList.toggle("on", on);
}
(function initDarkMode(){
  let on = localStorage.getItem("icDarkMode") === "1";
  if(on) document.body.classList.add("dark-mode");
  let btn = document.getElementById("dm-switch-btn");
  if(btn) btn.classList.toggle("on", on);
})();

// -------------------------------------------------------------------------
// SETTINGS — Profil Perusahaan (nama & logo)
// -------------------------------------------------------------------------
function applyCompanyBranding(){
  let s = window._appSettings || {};
  let titleEl = document.getElementById("sb-brand-title");
  let subEl   = document.getElementById("sb-brand-sub");
  let iconEl  = document.getElementById("sb-brand-icon");
  if(s.companyName && titleEl) titleEl.textContent = s.companyName;
  if(s.companySub && subEl) subEl.textContent = s.companySub;
  if(iconEl){
    if(s.logoBase64){
      iconEl.innerHTML = "<img src='"+s.logoBase64+"' style='width:100%;height:100%;object-fit:cover;border-radius:8px'>";
    } else if(s.companyName){
      iconEl.textContent = s.companyName.substring(0,2).toUpperCase();
    }
  }
  document.title = (s.companyName || "Inventory IC") + " - Online";
}

function handleLogoUpload(e){
  let file = e.target.files[0];
  if(!file) return;
  if(!canManageSettings()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); e.target.value=""; return; }
  let reader = new FileReader();
  reader.onload = function(ev){
    let img = new Image();
    img.onload = function(){
      // Resize ke maks 128x128 supaya hemat storage Firebase
      let size = 128;
      let canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      let ctx = canvas.getContext("2d");
      // crop tengah (cover)
      let side = Math.min(img.width, img.height);
      let sx = (img.width - side)/2, sy = (img.height - side)/2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      let base64 = canvas.toDataURL("image/jpeg", 0.85);
      let preview = document.getElementById("settings-logo-preview");
      if(preview) preview.innerHTML = "<img src='"+base64+"'>";
      window._pendingLogoBase64 = base64;
      showToast("🖼️ Logo siap, klik 'Simpan Profil Perusahaan' untuk menerapkan.", "info");
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function saveCompanyProfile(){
  if(!canManageSettings()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let name = document.getElementById("settings-company-name").value.trim();
  let sub  = document.getElementById("settings-company-sub").value.trim();
  if(!window._db){ alert("⚠️ Firebase belum siap."); return; }
  let updates = {};
  if(name) updates.companyName = name;
  if(sub)  updates.companySub  = sub;
  if(window._pendingLogoBase64) updates.logoBase64 = window._pendingLogoBase64;
  window._db.ref("appSettings").update(updates).then(()=>{
    alert("✅ Profil perusahaan berhasil disimpan!");
    window._pendingLogoBase64 = null;
  }).catch(e=>{ alert("⛔ Gagal menyimpan: "+e.message); });
}

function savePreferences(){
  if(!canManageSettings()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let wh = document.getElementById("settings-default-warehouse").value;
  let tab = document.getElementById("settings-default-tab").value;
  if(!window._db){ alert("⚠️ Firebase belum siap."); return; }
  window._db.ref("appSettings").update({ defaultWarehouse: wh, defaultTab: tab }).then(()=>{
    alert("✅ Preferensi disimpan!");
  }).catch(e=>{ alert("⛔ Gagal menyimpan: "+e.message); });
}

// -------------------------------------------------------------------------
// SETTINGS — Manajemen User & Role
// -------------------------------------------------------------------------
function addNewUser(){
  if(!canManageSettings()){ alert("⛔ Akses ditolak. Fitur ini hanya untuk Admin."); return; }
  let username = document.getElementById("nu-username").value.trim().toLowerCase();
  let password = document.getElementById("nu-password").value;
  let role = document.getElementById("nu-role").value;
  if(!username || !password){ alert("⚠️ Lengkapi username & password!"); return; }
  if(ACCOUNTS[username]){ alert("⚠️ Username ini sudah dipakai sebagai akun bawaan sistem!"); return; }
  if(!window._db){ alert("⚠️ Firebase belum siap."); return; }
  let custom = Object.assign({}, window._customAccounts || {});
  custom[username] = { password, role };
  window._db.ref("appSettings/customAccounts").set(custom).then(()=>{
    alert("✅ User '"+username+"' berhasil ditambahkan sebagai "+role+"!");
    document.getElementById("nu-username").value = "";
    document.getElementById("nu-password").value = "";
  }).catch(e=>{ alert("⛔ Gagal menyimpan: "+e.message); });
}

function deleteCustomUser(username){
  if(!canManageSettings()){ alert("⛔ Akses ditolak."); return; }
  if(!confirm("Hapus user '"+username+"'?")) return;
  let custom = Object.assign({}, window._customAccounts || {});
  delete custom[username];
  window._db.ref("appSettings/customAccounts").set(custom).then(()=>{
    alert("✅ User '"+username+"' dihapus.");
  }).catch(e=>{ alert("⛔ Gagal menghapus: "+e.message); });
}

function _roleLabel(role){
  if(role==="admin") return "<span class='role-pill admin'>👑 Admin</span>";
  if(role==="staff") return "<span class='role-pill staff'>📦 Staff Gudang</span>";
  return "<span class='role-pill viewer'>👁 Viewer</span>";
}

function renderUserManagementTable(){
  let tbody = document.getElementById("user-mgmt-tbody");
  if(!tbody) return;
  let rows = "";
  Object.keys(ACCOUNTS).forEach(u=>{
    rows += "<tr><td><b>"+u+"</b></td><td>"+_roleLabel(ACCOUNTS[u].role)+"</td>"+
      "<td><span style='color:#a0aec0;font-size:10px'>Bawaan Sistem</span></td>"+
      "<td style='text-align:right'><span style='color:#cbd5e0;font-size:11px'>Tidak bisa dihapus</span></td></tr>";
  });
  let custom = window._customAccounts || {};
  Object.keys(custom).forEach(u=>{
    rows += "<tr><td><b>"+u+"</b></td><td>"+_roleLabel(custom[u].role)+"</td>"+
      "<td><span style='color:#0d9488;font-size:10px'>Custom</span></td>"+
      "<td style='text-align:right'><button class='btn btn-red' style='margin-top:0' onclick=\"deleteCustomUser('"+u+"')\">🗑️ Hapus</button></td></tr>";
  });
  tbody.innerHTML = rows || emptyStateRow(4,"👥","Belum ada user tambahan");
}

// -------------------------------------------------------------------------
// LOGIN HISTORY
// -------------------------------------------------------------------------
function _detectDevice(){
  let ua = navigator.userAgent;
  let device = /Mobi|Android/i.test(ua) ? "📱 Mobile" : "💻 Desktop";
  let browser = "Browser";
  if(ua.indexOf("Edg")!==-1) browser="Edge";
  else if(ua.indexOf("Chrome")!==-1) browser="Chrome";
  else if(ua.indexOf("Firefox")!==-1) browser="Firefox";
  else if(ua.indexOf("Safari")!==-1) browser="Safari";
  return device+" · "+browser;
}
function recordLoginHistory(username, role){
  if(!window._db) return;
  let entry = { username, role, device: _detectDevice(), time: new Date().toISOString() };
  let history = (window._loginHistory || []).slice(-19); // simpan maksimal 20 entri
  history.push(entry);
  window._db.ref("appSettings/loginHistory").set(history).catch(()=>{});
}
function renderLoginHistoryTable(){
  let tbody = document.getElementById("login-history-tbody");
  if(!tbody) return;
  let history = (window._loginHistory || []).slice().reverse();
  if(history.length===0){ tbody.innerHTML = emptyStateRow(4,"🕒","Belum ada riwayat login"); return; }
  tbody.innerHTML = history.map(h=>{
    let d = new Date(h.time);
    let waktu = isNaN(d) ? h.time : d.toLocaleString("id-ID");
    return "<tr><td>"+waktu+"</td><td><b>"+h.username+"</b></td><td>"+_roleLabel(h.role)+"</td><td>"+h.device+"</td></tr>";
  }).join("");
}

// -------------------------------------------------------------------------
// RENDER SETTINGS PAGE (dipanggil dari renderTab saat tab 'settings' dibuka)
// -------------------------------------------------------------------------
function renderSettingsPage(){
  if(!canManageSettings()){
    let el = document.getElementById("tab-settings");
    if(el) el.innerHTML = "<div class='empty-state' style='margin:auto'><div class='empty-state-icon'>🔒</div><div class='empty-state-title'>Halaman ini khusus Admin</div></div>";
    return;
  }
  let s = window._appSettings || {};
  let nameEl = document.getElementById("settings-company-name");
  let subEl  = document.getElementById("settings-company-sub");
  let whEl   = document.getElementById("settings-default-warehouse");
  let tabEl  = document.getElementById("settings-default-tab");
  let preview = document.getElementById("settings-logo-preview");
  if(nameEl) nameEl.value = s.companyName || "";
  if(subEl)  subEl.value  = s.companySub || "";
  if(whEl)   whEl.value   = s.defaultWarehouse || "";
  if(tabEl)  tabEl.value  = s.defaultTab || "dashboard";
  if(preview) preview.innerHTML = s.logoBase64 ? "<img src='"+s.logoBase64+"'>" : "IC";
  // Telegram config
  let tgToken = document.getElementById("tg-bot-token");
  let tgChat  = document.getElementById("tg-chat-id");
  let tgThresh= document.getElementById("tg-threshold-days");
  let tgSwitch= document.getElementById("tg-enable-switch");
  let tgLast  = document.getElementById("tg-last-sent");
  if(tgToken) tgToken.value = s.telegramBotToken || "";
  if(tgChat)  tgChat.value  = s.telegramChatId || "";
  if(tgThresh) tgThresh.value = s.telegramThresholdDays || 7;
  if(tgSwitch){
    let on = !!s.telegramEnabled;
    tgSwitch.classList.toggle("on", on);
    tgSwitch.style.background = on ? "" : "#cbd5e0";
  }
  if(tgLast) tgLast.textContent = s.lastTelegramAlertTime ? "Terakhir terkirim: "+new Date(s.lastTelegramAlertTime).toLocaleString("id-ID") : "Belum pernah terkirim otomatis.";
  renderUserManagementTable();
  renderLoginHistoryTable();
  if(typeof renderAuditLogTable==="function") renderAuditLogTable();
}
