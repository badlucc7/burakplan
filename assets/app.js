/* Lara Smile — quote builder app */
(function () {
  "use strict";

  const X = window.QuoteExport;
  const CFG = window.CLINIC_CONFIG;
  const DEFAULTS = window.PRICE_LIST;
  const KEY = { prices: "ls.prices.v1", settings: "ls.settings.v1", draft: "ls.draft.v1" };
  const CATS = [
    ["crowns", "Kron & veneer"],
    ["implants", "İmplant"],
    ["surgery", "Cerrahi"],
    ["general", "Genel"]
  ];
  const CAT_LABEL = Object.fromEntries(CATS);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- storage ---------------- */
  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("Kaydedilemedi: cihaz depolaması dolu olabilir"); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------------- state ---------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let prices = store.get(KEY.prices, null);
  let pendingUpdate = false;
  if (!prices) {
    prices = { baseVersion: DEFAULTS.version, edited: false, items: clone(DEFAULTS.items) };
  } else if (prices.baseVersion !== DEFAULTS.version) {
    if (prices.edited) pendingUpdate = true;
    else prices = { baseVersion: DEFAULTS.version, edited: false, items: clone(DEFAULTS.items) };
  }

  const settings = Object.assign({
    coordinator: CFG.coordinator, phone: CFG.phone, email: CFG.email, website: CFG.website,
    address: CFG.address, validDays: CFG.validDays, terms: CFG.terms
  }, store.get(KEY.settings, {}));

  function freshDraft(keepCurrency, keepBranch) {
    return {
      qty: {}, notes: {}, over: {}, currency: keepCurrency || CFG.currency, patient: "", branch: keepBranch || "standard",
      coordinator: settings.coordinator || "", validDays: Number(settings.validDays) || 30,
      discType: "pct", discount: "", note: "", created: Date.now()
    };
  }
  let draft = Object.assign(freshDraft(), store.get(KEY.draft, {}));
  if (!draft.over) draft.over = {};
  let view = "quote", filter = "all", search = "", priceSearch = "";

  const saveDraft = () => store.set(KEY.draft, draft);
  const savePrices = () => store.set(KEY.prices, prices);
  const saveSettings = () => store.set(KEY.settings, settings);

  /* ---------------- helpers ---------------- */
  const cur = () => draft.currency;
  const listPrice = (it) => Number(cur() === "GBP" ? it.gbp : it.eur) || 0;
  const overOf = (id) => { const o = draft.over[id]; return o && o[cur()] != null ? o[cur()] : null; };
  const priceOf = (it) => { const o = overOf(it.id); return o != null ? o : listPrice(it); };
  const fmt = (n) => X.money(n, cur());
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function quoteNo() {
    const d = new Date(draft.created);
    const b = CFG.branches[draft.branch] || CFG.branches.standard;
    return `${b.prefix}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }
  function clampQty(v) { v = parseInt(v, 10); return isNaN(v) ? 0 : Math.max(0, Math.min(99, v)); }

  function buildQuote() {
    const items = prices.items
      .filter((it) => draft.qty[it.id] > 0)
      .map((it) => ({ name: it.name, qty: draft.qty[it.id], unit: priceOf(it), note: (draft.notes[it.id] || "").trim() }));
    return {
      no: quoteNo(), date: isoDate(draft.created), validDays: Number(draft.validDays) || 30,
      patient: draft.patient.trim(), branch: draft.branch, currency: cur(), coordinator: (draft.coordinator || "").trim(),
      items, discount: { type: draft.discType, value: Number(draft.discount) || 0 },
      note: draft.note.trim(), terms: (settings.terms || "").trim(), tagline: CFG.tagline,
      contacts: { phone: settings.phone, email: settings.email, website: settings.website, address: settings.address }
    };
  }

  /* ---------------- logo ---------------- */
  const getLogo = (branch) => X.getLogo(branch || draft.branch);

  /* ---------------- brand / currency UI ---------------- */
  function applyBranch() {
    document.documentElement.dataset.branch = draft.branch;
    $$("[data-branch]").forEach((b) => { if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", String(b.dataset.branch === draft.branch)); });
  }
  async function applyBrandMark() {
    const logo = await getLogo();
    const el = $("#brandMark");
    const name = (CFG.branches[draft.branch] || CFG.branches.standard).name;
    el.innerHTML = logo ? `<img src="${logo.src}" alt="${esc(name)}">` : esc(name);
  }
  function applyCurrency() {
    $$(".cur button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === cur())));
    $("#discAmtBtn").textContent = X.SYMBOL[cur()];
  }

  /* ---------------- quote builder ---------------- */
  function selectedCount() { return prices.items.filter((it) => draft.qty[it.id] > 0).length; }

  function renderChips() {
    const n = selectedCount();
    if (filter === "selected" && !n) filter = "all";
    const chips = [["all", "Tümü"]];
    if (n) chips.push(["selected", `Seçilenler <span class="n">${n}</span>`]);
    CATS.forEach(([k, l]) => { if (prices.items.some((it) => it.cat === k)) chips.push([k, l]); });
    $("#chips").innerHTML = chips.map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${k === filter}">${l}</button>`).join("");
  }

  function rowPriceHTML(it) {
    const q = draft.qty[it.id] || 0;
    const custom = overOf(it.id) != null && overOf(it.id) !== listPrice(it);
    const unit = custom ? `<s>${fmt(listPrice(it))}</s> ${fmt(priceOf(it))}` : fmt(priceOf(it));
    return q > 0 ? `${unit} × ${q} = <b>${fmt(priceOf(it) * q)}</b>${custom ? ` <em class="tag">özel fiyat</em>` : ""}` : unit;
  }
  function extraHTML(it) {
    return `<div class="tr-extra">
        <input class="tr-note" type="text" placeholder="Diş no / not" value="${esc(draft.notes[it.id] || "")}" aria-label="Not: ${esc(it.name)}">
        <div class="money tr-unit" data-sym="${X.SYMBOL[cur()]}"><input class="tr-unitp" type="number" inputmode="decimal" min="0" step="any" value="${priceOf(it)}" aria-label="Bu teklif için birim fiyat: ${esc(it.name)}"></div>
      </div>`;
  }
  function rowHTML(it) {
    const q = draft.qty[it.id] || 0;
    return `<li class="tr${q ? " on" : ""}" data-id="${esc(it.id)}">
      <div class="tr-main">
        <span class="tr-name">${esc(it.name)}</span>
        <span class="tr-price">${rowPriceHTML(it)}</span>
      </div>
      <div class="stepper">
        <button type="button" data-step="-1" aria-label="Azalt" ${q ? "" : "disabled"}>−</button>
        <input type="number" inputmode="numeric" min="0" max="99" value="${q || ""}" placeholder="0" aria-label="Adet: ${esc(it.name)}">
        <button type="button" data-step="1" aria-label="Arttır">+</button>
      </div>
      ${q ? extraHTML(it) : ""}
    </li>`;
  }

  function renderList() {
    const term = search.trim().toLocaleLowerCase("tr");
    let list = prices.items;
    if (term) list = list.filter((it) => it.name.toLocaleLowerCase("tr").includes(term));
    else if (filter === "selected") list = list.filter((it) => draft.qty[it.id] > 0);
    else if (filter !== "all") list = list.filter((it) => it.cat === filter);

    let html = "";
    if (!term && filter === "all") {
      CATS.forEach(([k, l]) => {
        const group = list.filter((it) => it.cat === k);
        if (group.length) html += `<li class="cat-title">${l}</li>` + group.map(rowHTML).join("");
      });
      const other = list.filter((it) => !CAT_LABEL[it.cat]);
      if (other.length) html += `<li class="cat-title">Diğer</li>` + other.map(rowHTML).join("");
    } else html = list.map(rowHTML).join("");

    $("#treatments").innerHTML = html;
    $("#emptyList").hidden = list.length > 0;
  }

  function updateRow(id) {
    const li = $(`.tr[data-id="${CSS.escape(id)}"]`);
    const it = prices.items.find((x) => x.id === id);
    if (!li || !it) return;
    const q = draft.qty[id] || 0;
    li.classList.toggle("on", q > 0);
    $(".tr-price", li).innerHTML = rowPriceHTML(it);
    $('[data-step="-1"]', li).disabled = !q;
    const inp = $(".stepper input", li);
    if (document.activeElement !== inp) inp.value = q || "";
    const extra = $(".tr-extra", li);
    if (q && !extra) li.insertAdjacentHTML("beforeend", extraHTML(it));
    else if (!q && extra) extra.remove();
  }

  function renderTotals() {
    const q = buildQuote();
    const t = X.totals(q);
    const units = q.items.reduce((s, it) => s + it.qty, 0);
    $("#tbCount").textContent = q.items.length ? `${q.items.length} tedavi, ${units} adet` : "Tedavi seçilmedi";
    $("#tbTotal").innerHTML = fmt(t.total) + (t.disc ? `<s>${fmt(t.sub)}</s>` : "");
    $("#openSheet").disabled = !q.items.length;
  }

  function setQty(id, v) {
    const before = selectedCount();
    const n = clampQty(v);
    if (n) draft.qty[id] = n; else { delete draft.qty[id]; delete draft.over[id]; }
    saveDraft();
    updateRow(id);
    renderTotals();
    if ((before === 0) !== (selectedCount() === 0) || filter === "selected") renderChips();
    else { const c = $('#chips [data-filter="selected"] .n'); if (c) c.textContent = selectedCount(); }
  }

  /* ---------------- views ---------------- */
  function setView(v) {
    view = v;
    $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    ["quote", "prices", "settings"].forEach((k) => ($(`#view-${k}`).hidden = k !== v));
    $("#totalbar").hidden = v !== "quote";
    if (v === "prices") renderPriceRows();
    if (v === "settings") fillSettings();
    if (v === "quote") { renderChips(); renderList(); renderTotals(); }
    window.scrollTo(0, 0);
  }

  /* ---------------- price editor ---------------- */
  function renderPriceRows() {
    const opts = (sel) => CATS.map(([k, l]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${l}</option>`).join("") +
      (CAT_LABEL[sel] ? "" : `<option value="${esc(sel)}" selected>Diğer</option>`);
    const term = priceSearch.trim().toLocaleLowerCase("tr");
    const list = term ? prices.items.filter((it) => it.name.toLocaleLowerCase("tr").includes(term)) : prices.items;
    $("#priceRows").innerHTML = list.map((it) => `
      <li class="pr" data-id="${esc(it.id)}">
        <input class="pr-name" data-f="name" value="${esc(it.name)}" autocapitalize="words" aria-label="Tedavi adı">
        <select data-f="cat" aria-label="Kategori">${opts(it.cat)}</select>
        <div class="money" data-sym="£"><input data-f="gbp" type="number" inputmode="decimal" min="0" step="any" value="${it.gbp ?? ""}" aria-label="Sterlin fiyatı"></div>
        <div class="money" data-sym="€"><input data-f="eur" type="number" inputmode="decimal" min="0" step="any" value="${it.eur ?? ""}" aria-label="Euro fiyatı"></div>
        <button type="button" class="del" aria-label="Sil: ${esc(it.name)}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
        </button>
      </li>`).join("") || `<li class="empty">Eşleşen tedavi yok.</li>`;
  }
  function markEdited() { prices.edited = true; savePrices(); }

  function guessCat(name) {
    const n = name.toLowerCase();
    if (/implant/.test(n)) return "implants";
    if (/crown|veneer|laminate|e-?max|zircon|bonding|inlay|onlay|post|core|denture|bridge/.test(n)) return "crowns";
    if (/sinus|graft|membrane|extraction|gum|surgical|surgery/.test(n)) return "surgery";
    return "general";
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item"; }

  async function importSheet(file) {
    try {
      await loadXlsx();
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      const hi = rows.findIndex((r) => r.some((c) => /treat|tedavi|işlem|name/i.test(String(c))));
      if (hi < 0) throw new Error("Başlık satırı bulunamadı (Treatment / Pound / Euro)");
      const h = rows[hi].map((c) => String(c).toLowerCase());
      const ci = (re) => h.findIndex((c) => re.test(c));
      const cName = ci(/treat|tedavi|işlem|name/), cG = ci(/pound|gbp|£|sterlin/), cE = ci(/euro|eur|€/), cC = ci(/categ|kategori/);
      if (cName < 0 || (cG < 0 && cE < 0)) throw new Error("Sütunlar bulunamadı: Treatment, Pound, Euro");
      const byName = Object.fromEntries(prices.items.map((it) => [it.name.toLowerCase(), it]));
      const catFromLabel = (v) => { v = String(v).toLowerCase(); const hit = CATS.find(([k, l]) => v === k || v === l.toLowerCase()); return hit && hit[0]; };
      const used = new Set();
      const items = [];
      rows.slice(hi + 1).forEach((r) => {
        const name = String(r[cName] || "").trim().replace(/\s+/g, " ");
        if (!name) return;
        const prev = byName[name.toLowerCase()];
        let id = prev ? prev.id : slug(name);
        while (used.has(id)) id += "-2";
        used.add(id);
        const num = (v) => { const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", ".")); return isNaN(n) ? null : n; };
        items.push({
          id, name,
          cat: (cC >= 0 && catFromLabel(r[cC])) || (prev && prev.cat) || guessCat(name),
          gbp: cG >= 0 ? num(r[cG]) : prev ? prev.gbp : null,
          eur: cE >= 0 ? num(r[cE]) : prev ? prev.eur : null
        });
      });
      if (!items.length) throw new Error("Dosyada tedavi satırı yok");
      prices.items = items; markEdited();
      const ids = new Set(items.map((i) => i.id));
      Object.keys(draft.qty).forEach((k) => { if (!ids.has(k)) delete draft.qty[k]; });
      saveDraft(); renderPriceRows();
      toast(`${items.length} tedavi içe aktarıldı`);
    } catch (e) { toast(e.message || "Dosya okunamadı"); }
  }
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "vendor/xlsx.full.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Excel modülü yüklenemedi")); document.head.appendChild(s);
    });
  }
  async function exportSheet() {
    try {
      await loadXlsx();
      const data = [["Treatment", "Category", "Pound", "Euro"], ...prices.items.map((it) => [it.name, CAT_LABEL[it.cat] || it.cat, it.gbp, it.eur])];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{ wch: 52 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Fiyatlar");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      X.download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Lara_Smile_Fiyat_Listesi_${isoDate(Date.now())}.xlsx`);
    } catch (e) { toast(e.message); }
  }
  function exportJs() {
    const today = isoDate(Date.now());
    const lines = prices.items.map((it) => `    ${JSON.stringify({ id: it.id, cat: it.cat, name: it.name, gbp: it.gbp, eur: it.eur }).replace(/,"/g, ', "').replace(/":/g, '": ')}`);
    const js = `/*\n * Lara Smile — varsayılan fiyat listesi\n * Uygulamadan ${today} tarihinde dışa aktarıldı.\n * Tüm cihazları güncellemek için bu dosyayı GitHub'da data/prices.js ile değiştirin.\n * cat: crowns | implants | surgery | general\n */\nwindow.PRICE_LIST = {\n  version: "${today}-${Date.now().toString(36)}",\n  items: [\n${lines.join(",\n")}\n  ]\n};\n`;
    X.download(new Blob([js], { type: "text/javascript" }), "prices.js");
  }

  /* ---------------- settings ---------------- */
  function fillSettings() {
    const f = $("#settingsForm");
    ["coordinator", "phone", "email", "website", "address", "validDays", "terms"].forEach((k) => { f.elements[k].value = settings[k] ?? ""; });
  }

  /* ---------------- quote sheet ---------------- */
  function openSheet() {
    const f = $("#quoteForm");
    f.elements.patient.value = draft.patient;
    f.elements.coordinator.value = draft.coordinator;
    f.elements.validDays.value = draft.validDays;
    f.elements.discount.value = draft.discount;
    f.elements.note.value = draft.note;
    $$("#discSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.disc === draft.discType)));
    applyBranch(); applyCurrency();
    renderPreview();
    const s = $("#sheet");
    s.classList.add("open"); s.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // warm up exporters so share works within the tap gesture
    X.preparePdf().catch(() => {}); X.getGroupLogo();
  }
  function closeSheet() {
    const s = $("#sheet");
    s.classList.remove("open"); s.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    renderTotals(); renderList();
  }
  let previewTimer;
  function renderPreview() {
    clearTimeout(previewTimer);
    const q = buildQuote(), t = X.totals(q);
    $("#sheetTotal").textContent = fmt(t.total);
    previewTimer = setTimeout(async () => { $("#preview").innerHTML = X.renderHTML(q, await getLogo(), await X.getGroupLogo()); }, 60);
  }

  async function output(kind, btn) {
    const q = buildQuote();
    if (!q.items.length) return toast("Önce en az bir tedavi seçin");
    if (!q.patient) { toast("Hasta adını yazın"); $("#quoteForm").elements.patient.focus(); return; }
    btn.classList.add("busy");
    try {
      if (kind === "pdf") {
        const blob = await X.buildPdf(q, await getLogo(), await X.getGroupLogo());
        const r = await X.deliver(blob, X.fileName(q, "pdf"), "application/pdf");
        if (r === "downloaded") toast("PDF indirildi");
      } else if (kind === "docx") {
        const blob = await X.buildDocx(q, await getLogo(), await X.getGroupLogo());
        const r = await X.deliver(blob, X.fileName(q, "docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (r === "downloaded") toast("Word dosyası indirildi");
      }
    } catch (e) {
      console.error(e);
      toast("Çıktı oluşturulamadı: " + (e.message || "bilinmeyen hata"));
    } finally { btn.classList.remove("busy"); }
  }
  /* ---------------- events ---------------- */
  function bind() {
    $$(".tabs button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $$(".cur button").forEach((b) => b.addEventListener("click", () => {
      draft.currency = b.dataset.cur; saveDraft(); applyCurrency();
      if (view === "quote") { renderList(); renderTotals(); }
      if ($("#sheet").classList.contains("open")) renderPreview();
    }));

    $("#search").addEventListener("input", (e) => { search = e.target.value; renderList(); });
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      filter = b.dataset.filter; search = ""; $("#search").value = "";
      renderChips(); renderList();
    });

    const list = $("#treatments");
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step]"); if (!b) return;
      const id = b.closest(".tr").dataset.id;
      setQty(id, (draft.qty[id] || 0) + Number(b.dataset.step));
    });
    list.addEventListener("input", (e) => {
      const li = e.target.closest(".tr"); if (!li) return;
      const id = li.dataset.id;
      if (e.target.classList.contains("tr-note")) { draft.notes[id] = e.target.value; saveDraft(); }
      else if (e.target.classList.contains("tr-unitp")) {
        const it = prices.items.find((x) => x.id === id);
        const n = parseFloat(e.target.value);
        draft.over[id] = draft.over[id] || {};
        if (isNaN(n) || n === listPrice(it)) delete draft.over[id][cur()]; else draft.over[id][cur()] = Math.max(0, n);
        saveDraft(); updateRow(id); renderTotals();
      }
      else if (e.target.type === "number") setQty(id, e.target.value);
    });
    list.addEventListener("focusin", (e) => { if (e.target.type === "number") e.target.select(); });
    list.addEventListener("focusout", (e) => {
      if (e.target.classList.contains("tr-unitp")) { const it = prices.items.find((x) => x.id === e.target.closest(".tr").dataset.id); e.target.value = priceOf(it); return; }
      if (e.target.type === "number") { const id = e.target.closest(".tr").dataset.id; e.target.value = draft.qty[id] || ""; }
    });

    // price editor
    const pr = $("#priceRows");
    pr.addEventListener("input", (e) => {
      const li = e.target.closest(".pr"); const f = e.target.dataset.f; if (!li || !f) return;
      const it = prices.items.find((x) => x.id === li.dataset.id); if (!it) return;
      if (f === "gbp" || f === "eur") { const n = parseFloat(e.target.value); it[f] = isNaN(n) ? null : n; }
      else it[f] = e.target.value;
      markEdited();
    });
    pr.addEventListener("change", (e) => { if (e.target.dataset.f === "name") { const it = prices.items.find((x) => x.id === e.target.closest(".pr").dataset.id); it.name = it.name.trim() || "Adsız tedavi"; e.target.value = it.name; markEdited(); } });
    pr.addEventListener("click", (e) => {
      const d = e.target.closest(".del"); if (!d) return;
      const li = d.closest(".pr"); const it = prices.items.find((x) => x.id === li.dataset.id);
      if (!confirm(`“${it.name}” silinsin mi?`)) return;
      prices.items = prices.items.filter((x) => x !== it);
      delete draft.qty[it.id]; delete draft.notes[it.id]; saveDraft();
      markEdited(); renderPriceRows(); toast("Tedavi silindi");
    });
    $("#addItem").addEventListener("click", () => {
      const id = "c-" + Date.now().toString(36);
      prices.items.unshift({ id, cat: "general", name: "Yeni tedavi", gbp: null, eur: null });
      priceSearch = ""; $("#priceSearch").value = "";
      markEdited(); renderPriceRows();
      const inp = $(`.pr[data-id="${id}"] [data-f="name"]`); inp.focus(); inp.select();
    });
    $("#priceSearch").addEventListener("input", (e) => { priceSearch = e.target.value; renderPriceRows(); });
    $("#importXlsx").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importSheet(f); e.target.value = ""; });
    $("#exportXlsx").addEventListener("click", exportSheet);
    $("#exportJs").addEventListener("click", exportJs);
    $("#resetPrices").addEventListener("click", () => {
      if (!confirm("Bu cihazdaki tüm fiyat değişiklikleri silinip varsayılan listeye dönülsün mü?")) return;
      prices = { baseVersion: DEFAULTS.version, edited: false, items: clone(DEFAULTS.items) };
      savePrices(); renderPriceRows(); toast("Varsayılan fiyatlar yüklendi");
    });
    $("#acceptUpdate").addEventListener("click", () => {
      prices = { baseVersion: DEFAULTS.version, edited: false, items: clone(DEFAULTS.items) };
      savePrices(); $("#updateBanner").hidden = true; setView(view); toast("Yeni fiyat listesi yüklendi");
    });
    $("#keepLocal").addEventListener("click", () => { prices.baseVersion = DEFAULTS.version; savePrices(); $("#updateBanner").hidden = true; });

    // settings
    $("#settingsForm").addEventListener("input", (e) => {
      const k = e.target.name; if (!k) return;
      settings[k] = k === "validDays" ? Number(e.target.value) || "" : e.target.value;
      saveSettings();
    });
    $("#settingsForm").addEventListener("submit", (e) => e.preventDefault());
    // sheet
    $("#openSheet").addEventListener("click", openSheet);
    $("#closeSheet").addEventListener("click", closeSheet);
    $("#newQuote").addEventListener("click", () => {
      if (!confirm("Seçimler ve hasta bilgileri temizlensin mi?")) return;
      draft = freshDraft(draft.currency, draft.branch); saveDraft();
      closeSheet(); applyBranch(); applyBrandMark(); filter = "all"; renderChips(); renderList(); renderTotals();
      toast("Yeni teklif başlatıldı");
    });
    $("#quoteForm").addEventListener("input", (e) => {
      const k = e.target.name; if (!k) return;
      draft[k] = e.target.value; saveDraft(); renderPreview();
    });
    $("#quoteForm").addEventListener("submit", (e) => e.preventDefault());
    $$("#branchSeg, #branchTop").forEach((seg) => seg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      draft.branch = b.dataset.branch; saveDraft(); applyBranch(); applyBrandMark(); renderPreview();
    }));
    $("#discSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      draft.discType = b.dataset.disc; saveDraft();
      $$("#discSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderPreview();
    });
    $$(".out").forEach((b) => b.addEventListener("click", () => output(b.dataset.out, b)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#sheet").classList.contains("open")) closeSheet(); });
  }

  /* ---------------- init ---------------- */
  bind();
  applyBranch(); applyCurrency(); applyBrandMark();
  if (pendingUpdate) $("#updateBanner").hidden = false;
  else savePrices();
  setView("quote");
})();
