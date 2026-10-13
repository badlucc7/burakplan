/* Fiyatlar ve Ayarlar ekranları */
(function () {
  const { $, $$, esc, icon } = LSQ;

  /* =====================================================================
     FİYATLAR
     ===================================================================== */
  const saveSoon = LSQ.debounce(() => { LSQ.savePrices(); statusLine(); }, 500);

  function statusLine() {
    const el = $("#priceStatus");
    const mod = LSQ.prices.customized;
    el.classList.toggle("mod", mod);
    el.innerHTML = `${icon(mod ? "pencil-simple" : "database", 18)}<span>${mod ? "Bu cihazdaki liste değiştirilmiş." : "Varsayılan liste kullanılıyor."} Sürüm: ${esc(LSQ.prices.baseVersion)}. ${LSQ.prices.items.length} tedavi.</span>`;
  }

  function rowHTML(it) {
    return `<li class="price-row" data-id="${esc(it.id)}">
      <label class="field name"><span>Tedavi adı</span><input class="input" data-f="name" value="${esc(it.name)}" autocomplete="off"></label>
      <label class="field"><span>£ GBP</span><input class="input num" data-f="gbp" type="number" inputmode="decimal" min="0" step="any" value="${it.gbp}"></label>
      <label class="field"><span>€ EUR</span><input class="input num" data-f="eur" type="number" inputmode="decimal" min="0" step="any" value="${it.eur}"></label>
      <label class="field cat"><span>Kategori</span><select class="select" data-f="cat">${window.PRICE_CATS.map((c) => `<option value="${c.id}" ${c.id === it.cat ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>
      <button type="button" class="btn icon danger del" data-del aria-label="Sil: ${esc(it.name)}">${icon("trash", 20)}</button>
    </li>`;
  }

  function renderPrices() {
    statusLine();
    $("#priceHost").innerHTML = window.PRICE_CATS.map((c) => {
      const rows = LSQ.prices.items.filter((i) => i.cat === c.id);
      return rows.length ? `<h3 class="price-group-title">${esc(c.label)}</h3><ul class="price-list">${rows.map(rowHTML).join("")}</ul>` : "";
    }).join("");
  }

  async function addItemDialog() {
    const dlg = $("#dlg"), body = $("#dlgBody");
    body.innerHTML = `<h3>Tedavi ekle</h3>
      <label class="field"><span>Tedavi adı (İngilizce)</span><input class="input" id="nName" autocomplete="off"></label>
      <div class="row2">
        <label class="field"><span>£ GBP</span><input class="input num" id="nGbp" type="number" inputmode="decimal" min="0" step="any"></label>
        <label class="field"><span>€ EUR</span><input class="input num" id="nEur" type="number" inputmode="decimal" min="0" step="any"></label>
      </div>
      <label class="field"><span>Kategori</span><select class="select" id="nCat">${window.PRICE_CATS.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}</select></label>
      <div class="btns"><button type="button" class="btn primary" id="nOk">Ekle</button><button type="button" class="btn" id="nNo">Vazgeç</button></div>`;
    dlg.oncancel = null;
    dlg.showModal();
    $("#nName").focus();
    $("#nNo").onclick = () => dlg.close();
    $("#nOk").onclick = () => {
      const name = $("#nName").value.trim();
      if (!name) { $("#nName").setAttribute("aria-invalid", "true"); $("#nName").focus(); return; }
      LSQ.prices.items.push({ id: LSQ.uid(), cat: $("#nCat").value, name, gbp: +$("#nGbp").value || 0, eur: +$("#nEur").value || 0 });
      LSQ.savePrices(); renderPrices(); dlg.close(); LSQ.toast("Tedavi eklendi");
    };
  }

  function guessCat(name) {
    const n = LSQ.norm(name);
    if (/implant|abutment/.test(n) && !/extraction|removal/.test(n)) return "implants";
    if (/graft|sinus|membrane|extraction|gum|surgical|removal/.test(n)) return "surgery";
    if (/crown|veneer|zirconi|emax|e-max|bonding|inlay|onlay|post|core|denture|laminate/.test(n)) return "crowns";
    return "general";
  }
  const toNum = (v) => { if (typeof v === "number") return v; const m = String(v).replace(/\s/g, "").replace(/[^\d.,-]/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, ""); const n = parseFloat(m); return isNaN(n) ? 0 : n; };

  function parseWorkbook(wb) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    let nameCol = -1, gbpCol = -1, eurCol = -1, catCol = -1, start = 0;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r].map((c) => String(c).toLowerCase());
      const g = row.findIndex((c) => /gbp|£|pound|sterlin/.test(c));
      const e = row.findIndex((c) => /eur|€|euro/.test(c));
      if (g > -1 || e > -1) {
        gbpCol = g; eurCol = e;
        nameCol = row.findIndex((c, i) => i !== g && i !== e && /treat|tedavi|name|isim|ad[iı]?$|service|procedure|item|description/.test(c));
        catCol = row.findIndex((c) => /categor|kategori/.test(c));
        if (nameCol < 0) nameCol = row.findIndex((c, i) => i !== g && i !== e && i !== catCol && c);
        start = r + 1;
        break;
      }
    }
    const out = []; let missing = 0;
    for (let r = start; r < rows.length; r++) {
      const row = rows[r];
      let name = "", gbp = 0, eur = 0;
      if (nameCol >= 0) name = String(row[nameCol] || "").trim();
      else { const c = row.find((x) => typeof x === "string" && x.trim().length > 2); name = c ? c.trim() : ""; }
      if (gbpCol >= 0 || eurCol >= 0) { gbp = gbpCol >= 0 ? toNum(row[gbpCol]) : 0; eur = eurCol >= 0 ? toNum(row[eurCol]) : 0; }
      else { const nums = row.filter((x) => typeof x === "number" && x > 0); gbp = nums[0] || 0; eur = nums[1] || 0; }
      if (!name || (!gbp && !eur)) continue;
      if (!gbp || !eur) missing++;
      const cat = catCol >= 0 && row[catCol] ? ((window.PRICE_CATS.find((c) => LSQ.norm(c.label) === LSQ.norm(row[catCol])) || {}).id || guessCat(name)) : guessCat(name);
      out.push({ id: LSQ.uid(), cat, name, gbp, eur });
    }
    return { items: out, missing };
  }

  async function importFile(file) {
    if (!window.XLSX) { LSQ.toast("Excel kütüphanesi yüklenemedi, sayfayı yenile", true); return; }
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const { items, missing } = parseWorkbook(wb);
      if (!items.length) { LSQ.toast("Dosyada fiyat satırı bulunamadı", true); return; }
      const choice = await LSQ.ask({
        title: `${items.length} tedavi bulundu`,
        text: missing ? `${missing} satırda GBP ya da EUR fiyatı eksik, 0 olarak eklendi. İçe aktardıktan sonra Fiyatlar ekranından tamamlayabilirsin.` : "Mevcut listeyi bu dosyayla değiştirebilir ya da yeni kalemleri sona ekleyebilirsin.",
        actions: [{ label: "Listeyi değiştir", value: "replace", variant: "primary" }, { label: "Mevcutlara ekle", value: "append" }, { label: "Vazgeç", value: null }]
      });
      if (!choice) return;
      if (choice === "replace") { LSQ.prices.items = items; LSQ.state.qty = {}; LSQ.state.notes = {}; LSQ.state.override = {}; LSQ.touch(); }
      else LSQ.prices.items = LSQ.prices.items.concat(items);
      LSQ.savePrices(); renderPrices(); LSQ.toast("Fiyat listesi güncellendi");
    } catch (e) { LSQ.toast("Dosya okunamadı", true); }
  }

  function exportXlsx() {
    if (!window.XLSX) { LSQ.toast("Excel kütüphanesi yüklenemedi", true); return; }
    const rows = [["Treatment", "Category", "GBP", "EUR"]].concat(LSQ.prices.items.map((i) => [i.name, LSQ.catLabel(i.cat), i.gbp, i.eur]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 56 }, { wch: 18 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Prices");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    LSQ.deliver(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "LaraSmile_Fiyat_Listesi.xlsx");
  }

  function exportJs() {
    const d = new Date();
    const ver = `${d.getFullYear()}-${LSQ.pad(d.getMonth() + 1)}-${LSQ.pad(d.getDate())}`;
    const lines = LSQ.prices.items.map((i) => `    { id: ${JSON.stringify(i.id)}, cat: ${JSON.stringify(i.cat)}, name: ${JSON.stringify(i.name)}, gbp: ${i.gbp}, eur: ${i.eur} }`).join(",\n");
    const cats = window.PRICE_CATS.map((c) => `  { id: ${JSON.stringify(c.id)}, label: ${JSON.stringify(c.label)} }`).join(",\n");
    const txt = `/* Lara Smile fiyat listesi. Bu dosya uygulamadan üretildi (${ver}).\n   GitHub'daki data/prices.js ile değiştirirsen tüm cihazlar yeni listeyi açılışta alır. */\nwindow.PRICE_CATS = [\n${cats}\n];\n\nwindow.PRICE_LIST = {\n  version: "${ver}",\n  items: [\n${lines}\n  ]\n};\n`;
    LSQ.deliver(new Blob([txt], { type: "text/javascript" }), "prices.js");
  }

  function bindPrices() {
    $("#addItem").innerHTML = `${icon("plus", 18)} Tedavi ekle`;
    $("#importLabel").insertAdjacentHTML("afterbegin", `${icon("upload-simple", 18)} Excel'den yükle`);
    $("#exportXlsx").innerHTML = `${icon("file-xls", 18)} Excel indir`;
    $("#exportJs").innerHTML = `${icon("download-simple", 18)} prices.js indir`;
    $("#resetPrices").innerHTML = `${icon("arrow-counter-clockwise", 18)} Varsayılana dön`;

    $("#addItem").onclick = addItemDialog;
    $("#importXlsx").onchange = (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importFile(f); };
    $("#exportXlsx").onclick = exportXlsx;
    $("#exportJs").onclick = exportJs;
    $("#resetPrices").onclick = async () => {
      const ok = await LSQ.ask({ title: "Varsayılan listeye dönülsün mü?", text: "Bu cihazda yaptığın fiyat değişiklikleri silinir.", actions: [{ label: "Varsayılana dön", value: true, variant: "danger" }, { label: "Vazgeç", value: false }] });
      if (ok) { LSQ.applyDefaultPrices(); renderPrices(); LSQ.toast("Varsayılan liste yüklendi"); }
    };

    const host = $("#priceHost");
    host.addEventListener("input", (e) => {
      const f = e.target.dataset.f; if (!f) return;
      const it = LSQ.itemById(e.target.closest(".price-row").dataset.id); if (!it) return;
      if (f === "name") it.name = e.target.value;
      else if (f === "gbp" || f === "eur") it[f] = Math.max(0, +e.target.value || 0);
      saveSoon();
    });
    host.addEventListener("change", (e) => {
      if (e.target.dataset.f === "cat") { const it = LSQ.itemById(e.target.closest(".price-row").dataset.id); it.cat = e.target.value; LSQ.savePrices(); renderPrices(); }
    });
    host.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      const id = b.closest(".price-row").dataset.id; const it = LSQ.itemById(id);
      const ok = await LSQ.ask({ title: "Tedavi silinsin mi?", text: it.name, actions: [{ label: "Sil", value: true, variant: "danger" }, { label: "Vazgeç", value: false }] });
      if (!ok) return;
      LSQ.prices.items = LSQ.prices.items.filter((x) => x.id !== id);
      delete LSQ.state.qty[id]; delete LSQ.state.notes[id]; delete LSQ.state.override[id]; LSQ.touch();
      LSQ.savePrices(); renderPrices();
    });
  }

  /* =====================================================================
     AYARLAR
     ===================================================================== */
  const LOGO_SLOTS = [
    { id: "standard", label: "Lara Smile logosu" },
    { id: "premium", label: "Lara Smile Premium logosu" },
    { id: "group", label: "Grup şirketleri şeridi" }
  ];

  function renderLogos() {
    $("#logoSlots").innerHTML = LOGO_SLOTS.map((s) => {
      const src = LSQ.logoSrc(s.id);
      return `<div class="logo-slot" data-slot="${s.id}">
        <div class="logo-prev">${src ? `<img src="${esc(src)}" alt="">` : "Logo yok"}</div>
        <div class="logo-btns"><span class="lbl">${esc(s.label)}</span>
          <label class="btn small file-btn">${icon("upload-simple", 16)} Yükle<input type="file" accept="image/png,image/jpeg" data-logo="${s.id}"></label>
          ${LSQ.settings.logos[s.id] ? `<button type="button" class="btn small ghost" data-rm="${s.id}">Kaldır</button>` : ""}
        </div></div>`;
    }).join("");
  }

  function fileToLogo(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const im = new Image();
        im.onerror = reject;
        im.onload = () => {
          const max = 800;
          const k = Math.min(1, max / im.naturalWidth);
          const c = document.createElement("canvas");
          c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/png"));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  let noteT;
  function savedNote() {
    const n = $("#savedNote"); n.textContent = "Kaydedildi";
    clearTimeout(noteT); noteT = setTimeout(() => (n.textContent = ""), 1800);
  }

  function bindSettings() {
    const f = $("#settingsForm");
    ["coordinator", "phone", "email", "website", "address", "validDays", "terms"].forEach((k) => { f[k].value = LSQ.settings[k] == null ? "" : LSQ.settings[k]; });
    const commit = LSQ.debounce(() => { LSQ.saveSettings(); savedNote(); LSQ.renderPreview(); }, 350);
    f.addEventListener("input", (e) => {
      const n = e.target.name; if (!n) return;
      LSQ.settings[n] = n === "validDays" ? Math.max(1, Math.min(365, Math.floor(+e.target.value) || 30)) : e.target.value;
      commit();
    });
    renderLogos();
    f.addEventListener("change", async (e) => {
      const slot = e.target.dataset.logo; if (!slot) return;
      const file = e.target.files[0]; e.target.value = ""; if (!file) return;
      try {
        LSQ.settings.logos[slot] = await fileToLogo(file);
        if (!LSQ.saveSettings()) { LSQ.toast("Logo kaydedilemedi, daha küçük bir dosya dene", true); return; }
        renderLogos(); savedNote(); LSQ.renderPreview();
      } catch (err) { LSQ.toast("Logo okunamadı", true); }
    });
    f.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rm]"); if (!rm) return;
      LSQ.settings.logos[rm.dataset.rm] = ""; LSQ.saveSettings(); renderLogos(); savedNote(); LSQ.renderPreview();
    });
  }

  LSQ.initManage = () => { bindPrices(); renderPrices(); bindSettings(); };
  LSQ.renderPrices = renderPrices;
})();
