/* Çekirdek: durum, kayıt, hesaplama, yardımcılar */
(function () {
  const LSQ = (window.LSQ = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  LSQ.$ = $; LSQ.$$ = $$;

  /* ---------- Küçük olay sistemi ---------- */
  const bus = {};
  LSQ.on = (e, fn) => ((bus[e] = bus[e] || []).push(fn));
  LSQ.emit = (e, d) => (bus[e] || []).forEach((fn) => fn(d));

  /* ---------- Yardımcılar ---------- */
  LSQ.icon = (name, size = 20) =>
    `<svg class="ic" viewBox="0 0 256 256" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${(window.ICONS || {})[name] || ""}</svg>`;
  LSQ.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  LSQ.norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").toLowerCase();
  LSQ.clone = (o) => JSON.parse(JSON.stringify(o));
  LSQ.uid = () => "x" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  LSQ.store = store;

  LSQ.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  LSQ.toast = (msg, err) => {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!err);
    t.classList.add("show");
    clearTimeout(LSQ._tt);
    LSQ._tt = setTimeout(() => t.classList.remove("show"), err ? 4200 : 2400);
  };

  /* Basit onay penceresi. actions: [{label, value, variant}] */
  LSQ.ask = ({ title, text, actions }) =>
    new Promise((resolve) => {
      const dlg = $("#dlg");
      const body = $("#dlgBody");
      body.innerHTML = `<h3>${LSQ.esc(title)}</h3>${text ? `<p>${LSQ.esc(text)}</p>` : ""}<div class="btns">${actions
        .map((a, i) => `<button type="button" class="btn ${a.variant || ""}" data-i="${i}">${LSQ.esc(a.label)}</button>`)
        .join("")}</div>`;
      const done = (v) => { dlg.close(); resolve(v); };
      body.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) done(actions[+b.dataset.i].value); };
      dlg.oncancel = () => resolve(null);
      dlg.showModal();
    });

  /* ---------- Para birimi ve biçimler ---------- */
  const SYM = { GBP: "£", EUR: "€" };
  LSQ.sym = (c) => SYM[c] || "";
  LSQ.money = (n, cur) => {
    n = Math.round((n + Number.EPSILON) * 100) / 100;
    const frac = n % 1 !== 0;
    return (n < 0 ? "-" : "") + SYM[cur || LSQ.state.currency] + Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 });
  };
  LSQ.fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  LSQ.pad = (n, l = 2) => String(n).padStart(l, "0");

  /* ---------- Ayarlar ---------- */
  const defaultSettings = () => ({
    coordinator: window.CLINIC_CONFIG.coordinator,
    phone: window.CLINIC_CONFIG.phone,
    email: window.CLINIC_CONFIG.email,
    website: window.CLINIC_CONFIG.website,
    address: window.CLINIC_CONFIG.address,
    validDays: window.CLINIC_CONFIG.validDays,
    terms: window.CLINIC_CONFIG.terms,
    logos: { standard: "", premium: "", group: "" }
  });
  LSQ.settings = Object.assign(defaultSettings(), store.get("lsq.settings", {}));
  LSQ.settings.logos = Object.assign({ standard: "", premium: "", group: "" }, LSQ.settings.logos || {});
  LSQ.saveSettings = () => store.set("lsq.settings", LSQ.settings);

  LSQ.cfg = () => Object.assign({}, window.CLINIC_CONFIG, LSQ.settings);
  LSQ.branch = () => window.CLINIC_CONFIG.branches[LSQ.state.branch];

  /* Logo kaynağı: önce cihazda yüklenen, sonra config yolu */
  LSQ.logoSrc = (kind) => LSQ.settings.logos[kind] || window.CLINIC_CONFIG.logos[kind] || "";

  const logoCache = {};
  LSQ.logoData = async (kind) => {
    const src = LSQ.logoSrc(kind);
    if (!src) return null;
    if (logoCache[src]) return logoCache[src];
    try {
      let dataUrl = src;
      if (!src.startsWith("data:")) {
        const r = await fetch(src);
        if (!r.ok) return null;
        const b = await r.blob();
        dataUrl = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      }
      const dim = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = rej; im.src = dataUrl; });
      const type = /^data:image\/png/.test(dataUrl) ? "PNG" : "JPEG";
      return (logoCache[src] = { dataUrl, type, w: dim.w, h: dim.h });
    } catch (e) { return null; }
  };

  /* ---------- Fiyat listesi ---------- */
  const basePrices = () => ({ baseVersion: window.PRICE_LIST.version, customized: false, items: LSQ.clone(window.PRICE_LIST.items) });
  let pr = store.get("lsq.prices", null);
  LSQ.pendingPriceUpdate = false;
  if (!pr || !Array.isArray(pr.items)) pr = basePrices();
  else if (pr.baseVersion !== window.PRICE_LIST.version) {
    if (pr.customized) LSQ.pendingPriceUpdate = true;
    else pr = basePrices();
  }
  LSQ.prices = pr;
  LSQ.savePrices = () => { LSQ.prices.customized = true; store.set("lsq.prices", LSQ.prices); LSQ.emit("prices"); };
  LSQ.applyDefaultPrices = () => { LSQ.prices = basePrices(); store.set("lsq.prices", LSQ.prices); LSQ.pendingPriceUpdate = false; LSQ.emit("prices"); };
  LSQ.keepMyPrices = () => { LSQ.prices.baseVersion = window.PRICE_LIST.version; store.set("lsq.prices", LSQ.prices); LSQ.pendingPriceUpdate = false; };
  LSQ.itemById = (id) => LSQ.prices.items.find((i) => i.id === id);
  LSQ.catLabel = (id) => (window.PRICE_CATS.find((c) => c.id === id) || { label: "Diğer" }).label;

  /* ---------- Teklif durumu ---------- */
  const freshState = () => ({
    branch: "standard",
    currency: window.CLINIC_CONFIG.currency || "GBP",
    step: "items",
    seq: 1,
    createdAt: new Date().toISOString(),
    qty: {}, notes: {}, override: {},
    patient: "",
    coordinator: "",
    validDays: 0,
    discount: { mode: "percent", value: 0, desc: "" },
    note: ""
  });
  LSQ.freshState = freshState;
  LSQ.state = Object.assign(freshState(), store.get("lsq.state", {}));
  LSQ.state.discount = Object.assign({ mode: "percent", value: 0, desc: "" }, LSQ.state.discount || {});
  const persist = LSQ.debounce(() => store.set("lsq.state", LSQ.state), 200);
  LSQ.touch = () => { persist(); LSQ.emit("state"); };

  LSQ.newQuote = () => {
    const keep = { branch: LSQ.state.branch, currency: LSQ.state.currency };
    const nextSeq = nextSeqFor(new Date());
    LSQ.state = Object.assign(freshState(), keep, { seq: nextSeq });
    store.set("lsq.state", LSQ.state);
    LSQ.emit("reset");
  };
  function nextSeqFor(d) {
    const key = "lsq.seq." + d.getFullYear() + LSQ.pad(d.getMonth() + 1) + LSQ.pad(d.getDate());
    const n = (store.get(key, 0) || 0) + 1;
    store.set(key, n);
    return n;
  }
  /* İlk açılışta bugünün sırasını al */
  if (!store.get("lsq.state", null)) { LSQ.state.seq = nextSeqFor(new Date()); store.set("lsq.state", LSQ.state); }

  LSQ.quoteNo = () => {
    const d = new Date(LSQ.state.createdAt);
    return `${LSQ.branch().prefix}-${d.getFullYear()}${LSQ.pad(d.getMonth() + 1)}${LSQ.pad(d.getDate())}-${LSQ.pad(LSQ.state.seq, 3)}`;
  };

  LSQ.unitPrice = (item) => {
    const o = LSQ.state.override[item.id];
    if (o != null && o !== "" && !isNaN(o)) return +o;
    return +item[LSQ.state.currency.toLowerCase()] || 0;
  };
  LSQ.listPrice = (item) => +item[LSQ.state.currency.toLowerCase()] || 0;

  LSQ.validDays = () => +LSQ.state.validDays || +LSQ.settings.validDays || 30;
  LSQ.validUntil = () => { const d = new Date(LSQ.state.createdAt); d.setDate(d.getDate() + LSQ.validDays()); return d; };
  LSQ.coordinatorName = () => LSQ.state.coordinator || LSQ.settings.coordinator || "";

  LSQ.compute = () => {
    const s = LSQ.state;
    const lines = [];
    LSQ.prices.items.forEach((it) => {
      const q = +s.qty[it.id] || 0;
      if (q > 0) {
        const unit = LSQ.unitPrice(it);
        lines.push({ id: it.id, name: it.name, qty: q, unit, total: unit * q, note: (s.notes[it.id] || "").trim() });
      }
    });
    const subtotal = lines.reduce((a, l) => a + l.total, 0);
    const dv = Math.max(0, +s.discount.value || 0);
    let discount = s.discount.mode === "percent" ? subtotal * Math.min(dv, 100) / 100 : Math.min(dv, subtotal);
    discount = Math.round(discount * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    return {
      lines, subtotal, discount, total, count: lines.length,
      units: lines.reduce((a, l) => a + l.qty, 0),
      discountLabel: s.discount.desc || window.CLINIC_CONFIG.defaultDiscountText,
      discountText: s.discount.mode === "percent" ? `${dv}%` : ""
    };
  };

  /* ---------- Dosya adı ve paylaşım ---------- */
  LSQ.fileBase = () => {
    const name = (LSQ.state.patient || "Patient").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Patient";
    return `${LSQ.branch().name.replace(/\s+/g, "")}_Quote_${name}_${LSQ.quoteNo()}`;
  };
  LSQ.deliver = async (blob, filename) => {
    const coarse = window.matchMedia && matchMedia("(pointer:coarse)").matches;
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  /* Sayı animasyonu: toplam değiştiğinde yumuşak geçiş */
  LSQ.tween = (el, to, fmt) => {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) { el.textContent = fmt(to); return; }
    cancelAnimationFrame(el._raf);
    const t0 = performance.now(), dur = 380;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    el._raf = requestAnimationFrame(step);
  };
})();
