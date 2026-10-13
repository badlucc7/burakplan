/* Teklif ekranı: tedavi listesi, form, indirim, önizleme */
(function () {
  const { $, $$, esc, icon, norm, money } = LSQ;
  const ui = { q: "", cat: "all", selOnly: false };

  /* ---------- Adım (mobil) ---------- */
  LSQ.setStep = (step, scroll = true) => {
    document.body.dataset.step = step;
    $$(".stepbar [data-step]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.step === step)));
    LSQ.state.step = step;
    LSQ.touch();
    if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
  };

  /* ---------- Kategori çipleri ---------- */
  function renderChips() {
    const n = LSQ.compute().count;
    const chips = [{ id: "all", label: "Tümü" }].concat(window.PRICE_CATS);
    $("#chips").innerHTML =
      chips.map((c) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${!ui.selOnly && ui.cat === c.id}">${esc(c.label)}</button>`).join("") +
      `<button type="button" class="chip sel" data-sel="1" aria-pressed="${ui.selOnly}">Seçilenler (${n})</button>`;
  }

  /* ---------- Liste ---------- */
  function visibleItems() {
    const q = norm(ui.q).trim();
    return LSQ.prices.items.filter((it) => {
      if (ui.selOnly && !(+LSQ.state.qty[it.id] > 0)) return false;
      if (!ui.selOnly && ui.cat !== "all" && it.cat !== ui.cat) return false;
      if (q && !norm(it.name).includes(q)) return false;
      return true;
    });
  }

  function ctlHTML(it, qty) {
    if (!(qty > 0)) return `<button type="button" class="add" data-act="add" aria-label="Ekle: ${esc(it.name)}">${icon("plus", 22)}</button>`;
    return `<div class="stepper" role="group" aria-label="Adet: ${esc(it.name)}">
      <button type="button" data-act="dec" aria-label="Azalt">${icon("minus", 18)}</button>
      <input data-act="qty" type="number" inputmode="numeric" min="0" max="99" value="${qty}" aria-label="Adet">
      <button type="button" data-act="inc" aria-label="Artır">${icon("plus", 18)}</button>
    </div>`;
  }

  function priceLine(it) {
    const cur = LSQ.state.currency;
    const o = LSQ.state.override[it.id];
    const modified = o != null && o !== "" && !isNaN(o) && +o !== LSQ.listPrice(it);
    const unit = LSQ.unitPrice(it);
    return `<span class="${modified ? "mod" : ""}">${money(unit, cur)}</span> / adet${modified ? ` <span class="mod">(liste: ${money(LSQ.listPrice(it), cur)})</span>` : ""}`;
  }

  function itemHTML(it) {
    const qty = +LSQ.state.qty[it.id] || 0;
    const cur = LSQ.state.currency;
    const o = LSQ.state.override[it.id];
    return `<li class="item${qty > 0 ? " on" : ""}" data-id="${esc(it.id)}">
      <div class="item-main">
        <div class="item-name">${esc(it.name)}</div>
        <div class="item-price">${priceLine(it)}</div>
      </div>
      <div class="ctl">${ctlHTML(it, qty)}</div>
      <div class="item-extra">
        <label class="field"><span>Diş no / not</span>
          <input class="input" data-act="note" type="text" value="${esc(LSQ.state.notes[it.id] || "")}" placeholder="Örn. 11, 12, 21" autocomplete="off"></label>
        <label class="field"><span>Birim fiyat (${LSQ.sym(cur)})</span>
          <input class="input num" data-act="price" type="number" inputmode="decimal" min="0" step="any" value="${o != null && o !== "" ? esc(o) : ""}" placeholder="${LSQ.listPrice(it)}"></label>
      </div>
      <div class="item-line">
        <button type="button" class="reset-price" data-act="reset-price" ${o != null && o !== "" ? "" : "hidden"}>Liste fiyatına dön</button>
        <span>Toplam <strong data-role="line">${money(LSQ.unitPrice(it) * qty, cur)}</strong></span>
      </div>
    </li>`;
  }

  function renderItems() {
    renderChips();
    const list = visibleItems();
    const host = $("#itemsHost");
    const empty = $("#itemsEmpty");
    if (!list.length) {
      host.innerHTML = "";
      empty.hidden = false;
      $("#emptyText").textContent = ui.selOnly ? "Henüz tedavi seçmedin." : "Eşleşen tedavi bulunamadı.";
      $("#emptyReset").hidden = !(ui.q || ui.cat !== "all" || ui.selOnly);
      return;
    }
    empty.hidden = true;
    if (ui.cat === "all" && !ui.selOnly && !ui.q) {
      host.innerHTML = window.PRICE_CATS.map((c) => {
        const rows = list.filter((i) => i.cat === c.id);
        return rows.length ? `<h3 class="group-title">${esc(c.label)}</h3><ul class="group-list">${rows.map(itemHTML).join("")}</ul>` : "";
      }).join("") + (() => {
        const known = new Set(window.PRICE_CATS.map((c) => c.id));
        const rest = list.filter((i) => !known.has(i.cat));
        return rest.length ? `<h3 class="group-title">Diğer</h3><ul class="group-list">${rest.map(itemHTML).join("")}</ul>` : "";
      })();
    } else {
      host.innerHTML = `<ul class="group-list" style="margin-top:6px">${list.map(itemHTML).join("")}</ul>`;
    }
  }

  function syncRow(id) {
    const li = $(`.item[data-id="${CSS.escape(id)}"]`);
    if (!li) return;
    const it = LSQ.itemById(id);
    const qty = +LSQ.state.qty[id] || 0;
    const wasOn = li.classList.contains("on");
    li.classList.toggle("on", qty > 0);
    const ctl = $(".ctl", li);
    const focusedQty = document.activeElement && document.activeElement.matches('[data-act="qty"]') && li.contains(document.activeElement);
    if (!focusedQty || !(qty > 0) || !wasOn) ctl.innerHTML = ctlHTML(it, qty);
    else $('[data-act="qty"]', li).value = qty;
    $('[data-role="line"]', li).textContent = money(LSQ.unitPrice(it) * qty, LSQ.state.currency);
    $(".item-price", li).innerHTML = priceLine(it);
    const o = LSQ.state.override[id];
    $('[data-act="reset-price"]', li).hidden = !(o != null && o !== "");
    if (!qty && ui.selOnly) { /* satır listede kalır, yeniden çizimde kaybolur */ }
  }

  function setQty(id, n, opts = {}) {
    n = Math.max(0, Math.min(99, Math.floor(+n || 0)));
    const s = LSQ.state;
    if (n > 0) s.qty[id] = n;
    else { delete s.qty[id]; delete s.notes[id]; delete s.override[id]; const li = $(`.item[data-id="${CSS.escape(id)}"]`); if (li) { $('[data-act="note"]', li).value = ""; $('[data-act="price"]', li).value = ""; } }
    syncRow(id);
    afterChange();
    if (opts.focusQty && n > 0) { const li = $(`.item[data-id="${CSS.escape(id)}"] [data-act="qty"]`); if (li) li.select(); }
  }

  /* ---------- Özet çubuğu ---------- */
  function updateSummary() {
    const c = LSQ.compute();
    $("#dockCount").textContent = c.count ? `${c.count} kalem, ${c.units} adet` : "Henüz tedavi seçilmedi";
    LSQ.tween($("#dockTotal"), c.total, (v) => money(v));
    $("#dockNext").disabled = !c.count;
    const sc = $("#stepCount");
    sc.textContent = c.count;
    sc.dataset.zero = String(!c.count);
    const sel = $('.chip.sel');
    if (sel) sel.textContent = `Seçilenler (${c.count})`;
    $("#btnPdf").disabled = !c.count;
    $("#btnDocx").disabled = !c.count;
  }

  let raf = 0;
  function afterChange() {
    LSQ.touch();
    updateSummary();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(renderPreview);
  }

  /* ---------- Önizleme ---------- */
  LSQ.wordmarkHTML = () => {
    const src = LSQ.logoSrc(LSQ.state.branch);
    if (src) return `<img class="paper-logo" src="${esc(src)}" alt="${esc(LSQ.branch().name)}">`;
    return `<div class="wm"><b>Lara Smile</b>${LSQ.state.branch === "premium" ? "<i>PREMIUM</i>" : ""}<small>${esc(LSQ.cfg().tagline)}</small></div>`;
  };

  LSQ.contactParts = () => {
    const c = LSQ.cfg();
    return [c.phone, c.email, c.website, c.address].filter((x) => x && String(x).trim());
  };

  function renderPreview() {
    const c = LSQ.compute();
    const cur = LSQ.state.currency;
    const cfg = LSQ.cfg();
    const host = $("#preview");
    if (!c.count) {
      host.innerHTML = `<article class="paper"><div class="paper-head">${LSQ.wordmarkHTML()}<div class="paper-meta"><div class="t">TREATMENT QUOTE</div><div class="n">${esc(LSQ.quoteNo())}</div></div></div>
        <div class="paper-empty">Teklifte görünmesi için önce tedavi seç.<br><br><button type="button" class="btn small" id="goItems">Tedavilere dön</button></div></article>`;
      const g = $("#goItems"); if (g) g.onclick = () => LSQ.setStep("items");
      return;
    }
    const rows = c.lines.map((l) => `<tr><td>${esc(l.name)}${l.note ? `<span class="tn">${esc(l.note)}</span>` : ""}</td><td>${l.qty}</td><td>${money(l.unit, cur)}</td><td class="tot">${money(l.total, cur)}</td></tr>`).join("");
    const groupBlock = LSQ.logoSrc("group")
      ? `<img src="${esc(LSQ.logoSrc("group"))}" alt="${esc(cfg.groupLabel)}">`
      : `<div>${esc(cfg.groupLabel)}: ${esc(cfg.groupCompanies.join(", "))}</div>`;
    const contact = LSQ.contactParts();
    host.innerHTML = `<article class="paper">
      <div class="paper-head">
        ${LSQ.wordmarkHTML()}
        <div class="paper-meta"><div class="t">TREATMENT QUOTE</div><div class="n">${esc(LSQ.quoteNo())}</div><div class="d">${esc(LSQ.fmtDate(new Date(LSQ.state.createdAt)))}</div></div>
      </div>
      <dl class="paper-info">
        <div><dt>Prepared for</dt><dd>${esc(LSQ.state.patient || "Patient")}</dd></div>
        <div><dt>Valid until</dt><dd>${esc(LSQ.fmtDate(LSQ.validUntil()))}</dd></div>
        ${LSQ.coordinatorName() ? `<div><dt>Coordinator</dt><dd>${esc(LSQ.coordinatorName())}</dd></div>` : ""}
      </dl>
      <table class="paper-table"><thead><tr><th>Treatment</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="paper-sum">
        ${c.discount > 0 ? `<div><span>Subtotal</span><span>${money(c.subtotal, cur)}</span></div><div class="disc"><span>${esc(c.discountLabel)}${c.discountText ? " (" + c.discountText + ")" : ""}</span><span>-${money(c.discount, cur)}</span></div>` : ""}
        <div class="grand"><span>Total</span><b>${money(c.total, cur)}</b></div>
      </div>
      ${LSQ.state.note.trim() ? `<div class="paper-note"><h4>Note</h4>${esc(LSQ.state.note.trim())}</div>` : ""}
      ${cfg.terms ? `<div class="paper-terms"><h4>Terms</h4>${esc(cfg.terms)}</div>` : ""}
      <div class="paper-sign"><b>Patient acceptance</b>Name, signature and date lines appear at the end of the PDF and Word file.</div>
      <div class="paper-foot">${contact.length ? `<div>${contact.map(esc).join("  |  ")}</div>` : ""}${groupBlock}</div>
    </article>`;
  }
  LSQ.renderPreview = renderPreview;

  /* ---------- İndirim paneli ---------- */
  function renderDiscount() {
    const d = LSQ.state.discount;
    $$("#discMode [data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === d.mode)));
    const pct = d.mode === "percent";
    $("#discValLabel").textContent = pct ? "İndirim yüzdesi" : `İndirim tutarı (${LSQ.sym(LSQ.state.currency)})`;
    $("#discAffix").classList.toggle("pre", !pct);
    $("#discUnit").textContent = pct ? "%" : LSQ.sym(LSQ.state.currency);
    $("#discValue").value = d.value ? d.value : "";
    $("#discDesc").value = d.desc || "";
    $("#discDesc").placeholder = window.CLINIC_CONFIG.defaultDiscountText;
    $("#presets").hidden = !pct;
    $("#presets").innerHTML = [5, 10, 15].map((p) => `<button type="button" class="chip" data-preset="${p}" aria-pressed="${pct && +d.value === p}">%${p}</button>`).join("") +
      `<button type="button" class="chip" data-preset="0" aria-pressed="false">İndirimsiz</button>`;
  }

  function renderValid() {
    $("#validUntil").textContent = LSQ.fmtDate(LSQ.validUntil());
    $("#quoteNoLabel").textContent = "Teklif no: " + LSQ.quoteNo();
  }

  function fillForm() {
    const f = $("#sheetForm");
    f.patient.value = LSQ.state.patient || "";
    f.coordinator.value = LSQ.state.coordinator || "";
    f.coordinator.placeholder = LSQ.settings.coordinator || "Ad Soyad";
    f.validDays.value = LSQ.state.validDays || "";
    f.validDays.placeholder = LSQ.settings.validDays || 30;
    $("#patientNote").value = LSQ.state.note || "";
    renderDiscount();
    renderValid();
  }

  /* ---------- Bağlantılar ---------- */
  function bind() {
    $("#searchIcon").innerHTML = icon("magnifying-glass", 20);
    $("#qClear").innerHTML = icon("x", 18);
    $("#emptyIcon").innerHTML = icon("tooth", 36);
    $("#dockArrow").innerHTML = icon("arrow-right", 18);
    $("#newIcon").innerHTML = icon("arrow-counter-clockwise", 16);
    $("#pdfIcon").innerHTML = icon("file-pdf", 22);
    $("#docxIcon").innerHTML = icon("file-doc", 22);

    $("#q").addEventListener("input", (e) => { ui.q = e.target.value; $("#qClear").hidden = !ui.q; renderItems(); });
    $("#qClear").addEventListener("click", () => { ui.q = ""; $("#q").value = ""; $("#qClear").hidden = true; renderItems(); $("#q").focus(); });
    $("#emptyReset").addEventListener("click", () => { ui.q = ""; ui.cat = "all"; ui.selOnly = false; $("#q").value = ""; $("#qClear").hidden = true; renderItems(); });

    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      if (b.dataset.sel) { ui.selOnly = !ui.selOnly; } else { ui.cat = b.dataset.cat; ui.selOnly = false; }
      renderItems();
    });

    const host = $("#itemsHost");
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const li = b.closest(".item"); const id = li.dataset.id; const act = b.dataset.act;
      const cur = +LSQ.state.qty[id] || 0;
      if (act === "add") setQty(id, 1);
      else if (act === "inc") setQty(id, cur + 1);
      else if (act === "dec") setQty(id, cur - 1);
      else if (act === "reset-price") { delete LSQ.state.override[id]; const pi = $('[data-act="price"]', li); pi.value = ""; syncRow(id); afterChange(); }
    });
    host.addEventListener("input", (e) => {
      const t = e.target; const li = t.closest(".item"); if (!li) return; const id = li.dataset.id;
      if (t.dataset.act === "note") { LSQ.state.notes[id] = t.value; afterChange(); }
      else if (t.dataset.act === "price") {
        if (t.value === "" || isNaN(t.value)) delete LSQ.state.override[id]; else LSQ.state.override[id] = +t.value;
        const it = LSQ.itemById(id);
        $('[data-role="line"]', li).textContent = money(LSQ.unitPrice(it) * (+LSQ.state.qty[id] || 0), LSQ.state.currency);
        $(".item-price", li).innerHTML = priceLine(it);
        $('[data-act="reset-price"]', li).hidden = !(t.value !== "" && !isNaN(t.value));
        afterChange();
      } else if (t.dataset.act === "qty") {
        const v = Math.floor(+t.value);
        if (v > 0) { LSQ.state.qty[id] = Math.min(99, v); $('[data-role="line"]', li).textContent = money(LSQ.unitPrice(LSQ.itemById(id)) * LSQ.state.qty[id], LSQ.state.currency); afterChange(); }
      }
    });
    host.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.act === "qty") { const li = t.closest(".item"); setQty(li.dataset.id, t.value); }
    });
    host.addEventListener("focusin", (e) => { if (e.target.matches('[data-act="qty"]')) e.target.select(); });

    $("#dockNext").addEventListener("click", () => LSQ.setStep("sheet"));

    /* Form */
    const f = $("#sheetForm");
    f.addEventListener("input", (e) => {
      const n = e.target.name;
      if (n === "patient") LSQ.state.patient = e.target.value;
      else if (n === "coordinator") LSQ.state.coordinator = e.target.value;
      else if (n === "validDays") { LSQ.state.validDays = Math.max(0, Math.min(365, Math.floor(+e.target.value) || 0)); renderValid(); }
      afterChange();
    });
    $("#patientNote").addEventListener("input", (e) => { LSQ.state.note = e.target.value; afterChange(); });

    /* İndirim */
    $("#discMode").addEventListener("click", (e) => {
      const b = e.target.closest("[data-mode]"); if (!b) return;
      LSQ.state.discount.mode = b.dataset.mode; LSQ.state.discount.value = 0;
      renderDiscount(); afterChange();
    });
    $("#presets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-preset]"); if (!b) return;
      const p = +b.dataset.preset;
      LSQ.state.discount.value = p;
      if (p && !LSQ.state.discount.desc) LSQ.state.discount.desc = "";
      renderDiscount(); afterChange();
    });
    $("#discValue").addEventListener("input", (e) => {
      const v = Math.max(0, +e.target.value || 0);
      LSQ.state.discount.value = LSQ.state.discount.mode === "percent" ? Math.min(100, v) : v;
      $$("#presets .chip").forEach((b) => b.setAttribute("aria-pressed", String(LSQ.state.discount.mode === "percent" && +b.dataset.preset === LSQ.state.discount.value && +b.dataset.preset !== 0)));
      afterChange();
    });
    $("#discDesc").addEventListener("input", (e) => { LSQ.state.discount.desc = e.target.value; afterChange(); });

    $("#newQuote").addEventListener("click", async () => {
      const ok = await LSQ.ask({ title: "Yeni teklif başlatılsın mı?", text: "Seçtiğin tedaviler, hasta adı ve notlar temizlenir.", actions: [{ label: "Yeni teklif", value: true, variant: "primary" }, { label: "Vazgeç", value: false }] });
      if (ok) { LSQ.newQuote(); LSQ.toast("Yeni teklif hazır"); }
    });
  }

  LSQ.refreshQuote = () => { renderItems(); fillForm(); updateSummary(); renderPreview(); };
  LSQ.on("reset", () => { ui.q = ""; ui.cat = "all"; ui.selOnly = false; $("#q").value = ""; $("#qClear").hidden = true; LSQ.refreshQuote(); LSQ.setStep("items"); });
  LSQ.on("prices", () => { if ($("#view-quote")) LSQ.refreshQuote(); });

  LSQ.initQuote = () => { bind(); LSQ.refreshQuote(); };
  LSQ.quoteUI = { renderDiscount, renderValid, fillForm, renderItems, updateSummary };
})();
