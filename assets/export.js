/* Lara Smile — quote rendering & export (HTML, PDF, Word, share link) */
(function () {
  "use strict";

  const CFG = window.CLINIC_CONFIG;
  const INK = "#1D2B36", MUTED = "#6B7780";
  const SYMBOL = { GBP: "£", EUR: "€" };

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function money(n, cur) {
    const whole = Math.abs(n - Math.round(n)) < 0.005;
    return (n < 0 ? "−" : "") + SYMBOL[cur] + Math.abs(n).toLocaleString("en-GB", {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2
    });
  }
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function fmtShort(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function addDays(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + (Number(days) || 0));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  function branchOf(q) { return CFG.branches[q.branch] || CFG.branches.standard; }

  function totals(q) {
    const sub = q.items.reduce((s, it) => s + it.qty * it.unit, 0);
    let disc = 0;
    const v = Number(q.discount && q.discount.value) || 0;
    if (v > 0) disc = q.discount.type === "pct" ? Math.round(sub * Math.min(v, 100) / 100) : Math.min(v, sub);
    return { sub, disc, total: Math.max(0, sub - disc) };
  }

  function contactsList(q) {
    const c = q.contacts || {};
    return [c.phone, c.email, c.website, c.address].filter((x) => x && String(x).trim());
  }

  function fileName(q, ext) {
    const who = (q.patient || "Patient").trim().replace(/ı/g, "i").replace(/İ/g, "I").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Patient";
    return `${branchOf(q).name.replace(/\s+/g, "-")}_Quote_${who}_${q.no}.${ext}`;
  }

  /* ---------------- logos ---------------- */
  const imgCache = {};
  function getImage(path) {
    if (!path) return Promise.resolve(null);
    if (!imgCache[path]) {
      imgCache[path] = fetch(path)
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => blob && new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }))
        .then((src) => src && new Promise((res) => {
          const im = new Image();
          im.onload = () => res({ src, w: im.naturalWidth, h: im.naturalHeight, type: /^data:image\/png/.test(src) ? "PNG" : "JPEG" });
          im.onerror = () => res(null);
          im.src = src;
        }))
        .catch(() => null);
      imgCache[path].then((v) => { if (!v) delete imgCache[path]; });
    }
    return imgCache[path];
  }
  const getLogo = (branch) => getImage((CFG.branches[branch] || CFG.branches.standard).logo);
  const getGroupLogo = () => getImage(CFG.groupLogo);

  /* ---------------- web / preview document ---------------- */
  function discLabel(q) {
    return q.discount && q.discount.type === "pct" ? `Discount (${Number(q.discount.value)}%)` : "Discount";
  }
  function renderHTML(q, logo, group) {
    const b = branchOf(q);
    const t = totals(q);
    const brand = logo ? `<img src="${logo.src}" alt="${esc(b.name)}">` : `<span class="doc-wordmark">${esc(b.name)}</span>`;
    const rows = q.items.map((it) => `
      <tr>
        <td class="tname">${esc(it.name)}${it.note ? `<span class="note">${esc(it.note)}</span>` : ""}</td>
        <td class="qty">${it.qty}</td>
        <td class="unit">${money(it.unit, q.currency)}</td>
        <td class="amt">${money(it.qty * it.unit, q.currency)}</td>
      </tr>`).join("");
    const contacts = contactsList(q);
    return `
    <article class="doc${q.branch === "premium" ? " premium" : ""}" style="--p:${b.primary};--a:${b.accent};--at:${b.accentText};--t:${b.tint}">
      <div class="doc-bar"></div>
      <header class="doc-head">
        <div class="doc-logo">${brand}</div>
        <div class="doc-title">
          <h1>Treatment Quote</h1>
          <div>Quote no. ${esc(q.no)}</div>
          <div>Issued ${fmtDate(q.date)}</div>
        </div>
      </header>
      <section class="doc-card">
        <div class="doc-who"><span>Prepared for</span><strong>${esc(q.patient || "—")}</strong></div>
        <div class="doc-facts">
          <div><span>Valid until</span><b>${fmtShort(addDays(q.date, q.validDays))}</b></div>
          <div><span>Coordinator</span><b>${esc(q.coordinator || "—")}</b></div>
          <div><span>Currency</span><b>${q.currency === "GBP" ? "GBP (£)" : "EUR (€)"}</b></div>
        </div>
      </section>
      <table class="doc-table">
        <thead><tr><th>Treatment</th><th class="qty">Qty</th><th class="unit">Unit price</th><th class="amt">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <section class="doc-sum">
        ${q.note ? `<div class="doc-note"><h3>A note for you</h3><p>${esc(q.note)}</p></div>` : `<div></div>`}
        <div class="doc-totals">
          ${t.disc ? `<div class="line"><span>Subtotal</span><b>${money(t.sub, q.currency)}</b></div>
          <div class="line save"><span>${discLabel(q)}</span><b>${money(-t.disc, q.currency)}</b></div>` : ""}
          <div class="doc-grand"><span>Total</span><strong>${money(t.total, q.currency)}</strong></div>
        </div>
      </section>
      ${q.terms ? `<section class="doc-terms"><h3>Good to know</h3><p>${esc(q.terms)}</p></section>` : ""}
      <section class="doc-sign">
        <h3>Acceptance</h3>
        <p>By signing below, I confirm that I have read and accept this treatment quote.</p>
        <div class="sign-grid">
          <div><i></i><b>${esc(q.patient || "Patient")}</b><span>Patient signature</span></div>
          <div class="sign-date"><i></i><b>&nbsp;</b><span>Date</span></div>
          <div><i></i><b>${esc(q.coordinator || b.name)}</b><span>On behalf of ${esc(b.name)}</span></div>
        </div>
      </section>
      <footer class="doc-foot">
        ${group ? `<span class="group-label">Our group of companies</span><img src="${group.src}" alt="Group companies">` : ""}
        <div class="doc-contacts">${(contacts.length ? contacts : [b.name, q.tagline || CFG.tagline]).map((c) => `<span>${esc(c)}</span>`).join("")}</div>
      </footer>
    </article>`;
  }

  /* ---------------- lazy loading ---------------- */
  const scriptCache = {};
  function loadScript(src) {
    if (!scriptCache[src]) {
      scriptCache[src] = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = src; s.onload = res;
        s.onerror = () => { delete scriptCache[src]; rej(new Error("Dosya yüklenemedi: " + src)); };
        document.head.appendChild(s);
      });
    }
    return scriptCache[src];
  }

  const FONT_FILES = {
    "IS-Regular.ttf": ["IS", "normal"],
    "IS-SemiBold.ttf": ["IS", "bold"],
    "SP-Regular.ttf": ["SP", "normal"],
    "SP-SemiBold.ttf": ["SP", "bold"],
    "SP-Italic.ttf": ["SP", "italic"]
  };
  const FONT_SRC = {
    "IS-Regular.ttf": "fonts/InstrumentSans-Regular.ttf",
    "IS-SemiBold.ttf": "fonts/InstrumentSans-SemiBold.ttf",
    "SP-Regular.ttf": "fonts/Spectral-Regular.ttf",
    "SP-SemiBold.ttf": "fonts/Spectral-SemiBold.ttf",
    "SP-Italic.ttf": "fonts/Spectral-Italic.ttf"
  };
  let fontData = null;
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf); let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  async function loadFonts() {
    if (fontData !== null) return fontData;
    try {
      const entries = await Promise.all(Object.entries(FONT_SRC).map(async ([k, url]) => {
        const r = await fetch(url); if (!r.ok) throw new Error(url);
        return [k, bufToB64(await r.arrayBuffer())];
      }));
      fontData = Object.fromEntries(entries);
    } catch (e) { fontData = false; }
    return fontData;
  }

  function preparePdf() { return Promise.all([loadScript("vendor/jspdf.umd.min.js"), loadFonts()]); }
  function prepareDocx() { return loadScript("vendor/docx.iife.js"); }

  /* ---------------- PDF ---------------- */
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (hex, pct) => rgb(hex).map((c) => Math.round(c * pct + 255 * (1 - pct)));
  const hexOf = (arr) => arr.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();

  async function buildPdf(q, logo, group) {
    await preparePdf();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const fonts = fontData;
    let SANS = "helvetica", SERIF = "times";
    if (fonts) {
      for (const [file, [fam, style]] of Object.entries(FONT_FILES)) {
        doc.addFileToVFS(file, fonts[file]); doc.addFont(file, fam, style);
      }
      SANS = "IS"; SERIF = "SP";
    }
    const safe = (s) => fonts ? String(s ?? "") : String(s ?? "")
      .replace(/ş/g, "s").replace(/Ş/g, "S").replace(/ğ/g, "g").replace(/Ğ/g, "G").replace(/ı/g, "i").replace(/İ/g, "I").replace(/−/g, "-");

    const b = branchOf(q);
    const P = b.primary, A = b.accent, AT = b.accentText, T = b.tint;
    const ZEBRA = "#" + hexOf(mix(P, 0.035));
    const t = totals(q);
    const W = 210, H = 297, M = 16, R = W - M, BOTTOM = group ? 255 : 268;
    const col = { qty: 134, unit: 163, amt: R - 4 };
    const nameW = 100;

    const font = (fam, style, size, color) => { doc.setFont(fam, style); doc.setFontSize(size); doc.setTextColor(...rgb(color || INK)); };
    const text = (s, x, y, opt) => doc.text(safe(s), x, y, opt);
    const fill = (hex) => doc.setFillColor(...rgb(hex));

    const topBars = () => { fill(P); doc.rect(0, 0, W, 2.4, "F"); fill(A); doc.rect(0, 2.4, W, 0.9, "F"); };
    topBars();

    // header
    if (logo) {
      const h = q.branch === "premium" ? 23 : 16.5;
      const w = h * logo.w / logo.h;
      doc.addImage(logo.src, logo.type, M - 1.5, 10, w, h, undefined, "FAST");
    } else {
      font(SERIF, "bold", 22, P); text(b.name, M, 24);
    }
    font(SERIF, "bold", 21, P); text("Treatment Quote", R, 20, { align: "right" });
    font(SANS, "normal", 8.5, MUTED);
    text("Quote no. " + q.no, R, 26.5, { align: "right" });
    text("Issued " + fmtDate(q.date), R, 31, { align: "right" });

    // patient card
    let y = 40;
    const cardH = 24;
    fill(T); doc.roundedRect(M, y, R - M, cardH, 2.2, 2.2, "F");
    fill(A); doc.rect(M, y + 4, 1.1, cardH - 8, "F");
    font(SANS, "normal", 7.5, MUTED); text("Prepared for", M + 7, y + 8.5);
    font(SERIF, "bold", 15, P);
    const who = doc.splitTextToSize(safe(q.patient || "—"), 72);
    doc.text(who[0], M + 7, y + 17);
    const facts = [["Valid until", fmtShort(addDays(q.date, q.validDays))], ["Coordinator", q.coordinator || "—"], ["Currency", q.currency === "GBP" ? "GBP (£)" : "EUR (€)"]];
    const fx = 104, fw = (R - 5 - fx) / 3;
    facts.forEach(([lab, val], i) => {
      const x = fx + i * fw;
      if (i) { doc.setDrawColor(...mix(P, 0.14)); doc.setLineWidth(0.2); doc.line(x - 3, y + 5.5, x - 3, y + cardH - 5.5); }
      font(SANS, "normal", 7.5, MUTED); text(lab, x, y + 8.5);
      font(SANS, "bold", 9.2, INK);
      const lines = doc.splitTextToSize(safe(val), fw - 5).slice(0, 2);
      doc.text(lines, x, y + 14.5, { lineHeightFactor: 1.25 });
    });
    y += cardH + 9;

    // table
    const tableHead = () => {
      fill(P); doc.roundedRect(M, y, R - M, 9, 1.4, 1.4, "F");
      font(SANS, "bold", 8, "#FFFFFF");
      text("Treatment", M + 4, y + 5.9);
      text("Qty", col.qty, y + 5.9, { align: "center" });
      text("Unit price", col.unit, y + 5.9, { align: "right" });
      text("Total", col.amt, y + 5.9, { align: "right" });
      y += 9;
    };
    const newPage = () => { doc.addPage(); topBars(); y = 14; };
    tableHead();

    q.items.forEach((it, i) => {
      font(SANS, "normal", 9.5);
      const nameLines = doc.splitTextToSize(safe(it.name), nameW);
      font(SERIF, "italic", 8.5);
      const noteLines = it.note ? doc.splitTextToSize(safe(it.note), nameW) : [];
      const rowH = 6.2 + (nameLines.length - 1) * 4.3 + noteLines.length * 3.9 + 3.6;
      if (y + rowH > BOTTOM) { newPage(); tableHead(); }
      if (i % 2 === 1) { fill(ZEBRA); doc.rect(M, y, R - M, rowH, "F"); }
      const base = y + 6.2;
      font(SANS, "normal", 9.5, INK);
      doc.text(nameLines, M + 4, base, { lineHeightFactor: 1.28 });
      text(String(it.qty), col.qty, base, { align: "center" });
      font(SANS, "normal", 9.5, MUTED); text(money(it.unit, q.currency), col.unit, base, { align: "right" });
      font(SANS, "bold", 9.5, INK); text(money(it.qty * it.unit, q.currency), col.amt, base, { align: "right" });
      if (noteLines.length) {
        font(SERIF, "italic", 8.5, AT);
        doc.text(noteLines, M + 4, base + (nameLines.length - 1) * 4.3 + 4.0, { lineHeightFactor: 1.3 });
      }
      y += rowH;
    });
    doc.setDrawColor(...rgb(P)); doc.setLineWidth(0.45); doc.line(M, y, R, y);
    y += 8;

    // note (left) + totals (right)
    const tx = 118;
    const totH = (t.disc ? 12 : 0) + 20;
    font(SANS, "normal", 9);
    const noteLines = q.note ? doc.splitTextToSize(safe(q.note), 84) : [];
    const noteH = noteLines.length ? 13 + noteLines.length * 4.4 : 0;
    if (y + Math.max(totH, noteH) > BOTTOM) newPage();
    const startY = y;
    if (noteLines.length) {
      fill(T); doc.roundedRect(M, y, 94, noteH, 2, 2, "F");
      fill(A); doc.rect(M, y + 3.5, 1.1, noteH - 7, "F");
      font(SERIF, "bold", 10.5, P); text("A note for you", M + 6, y + 7.5);
      font(SANS, "normal", 9, INK); doc.text(noteLines, M + 6, y + 13.2, { lineHeightFactor: 1.4 });
    }
    if (t.disc) {
      font(SANS, "normal", 9, MUTED); text("Subtotal", tx, y + 3);
      font(SANS, "normal", 9, INK); text(money(t.sub, q.currency), R - 4, y + 3, { align: "right" });
      font(SANS, "normal", 9, AT); text(discLabel(q), tx, y + 9);
      font(SANS, "bold", 9, AT); text(money(-t.disc, q.currency), R - 4, y + 9, { align: "right" });
      y += 13;
    }
    fill(A); doc.roundedRect(tx - 4, y, R - tx + 4, 19, 2, 2, "F");
    fill(P); doc.roundedRect(tx - 4, y, R - tx + 4, 18, 2, 2, "F"); doc.rect(tx - 4, y + 10, R - tx + 4, 7, "F");
    font(SANS, "normal", 9, "#FFFFFF"); text("Total", tx + 1, y + 11.5);
    font(SERIF, "bold", 22, "#FFFFFF"); text(money(t.total, q.currency), R - 5, y + 12.8, { align: "right" });
    y = Math.max(y + 19, startY + noteH) + 12;

    // terms
    if (q.terms) {
      font(SANS, "normal", 8, MUTED);
      const lines = doc.splitTextToSize(safe(q.terms), R - M);
      if (y + 7 + lines.length * 3.8 > BOTTOM + 6) newPage();
      font(SERIF, "bold", 10, P); text("Good to know", M, y);
      font(SANS, "normal", 8, MUTED); doc.text(lines, M, y + 5.5, { lineHeightFactor: 1.5 });
    }

    // signature block
    {
      const sigH = 38;
      y += q.terms ? 20 : 4;
      if (y + sigH > BOTTOM) newPage();
      font(SERIF, "bold", 10, P); text("Acceptance", M, y);
      font(SANS, "normal", 8, MUTED); text("By signing below, I confirm that I have read and accept this treatment quote.", M, y + 5.5);
      const ly = y + 24;
      const cols = [
        { x: M, w: 68, name: q.patient || "Patient", label: "Patient signature" },
        { x: M + 76, w: 30, name: "", label: "Date" },
        { x: R - 68, w: 68, name: q.coordinator || b.name, label: "On behalf of " + b.name }
      ];
      doc.setDrawColor(...rgb(INK)); doc.setLineWidth(0.3);
      cols.forEach((c) => {
        doc.line(c.x, ly, c.x + c.w, ly);
        if (c.name) { font(SANS, "bold", 8.5, INK); text(doc.splitTextToSize(safe(c.name), c.w)[0], c.x, ly + 4.8); }
        font(SANS, "normal", 7.5, MUTED); text(c.label, c.x, ly + (c.name ? 9 : 4.8));
      });
      y = ly + 12;
    }

    // footer on every page
    const pages = doc.getNumberOfPages();
    const contacts = contactsList(q);
    const foot = contacts.length ? contacts.join("   |   ") : `${b.name}   |   ${q.tagline || CFG.tagline}`;
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      if (group) {
        const gw = 150, gh = gw * group.h / group.w;
        const top = H - 9 - gh - 6;
        doc.setDrawColor(...mix(P, 0.18)); doc.setLineWidth(0.25); doc.line(M, top - 2, R, top - 2);
        font(SANS, "normal", 6.8, MUTED); text("Our group of companies", W / 2, top + 1.8, { align: "center" });
        doc.addImage(group.src, group.type, (W - gw) / 2, top + 3.6, gw, gh, "grouplogos", "FAST");
      }
      fill(A); doc.rect(0, H - 9.6, W, 0.6, "F");
      fill(P); doc.rect(0, H - 9, W, 9, "F");
      font(SANS, "normal", 7.5, "#FFFFFF");
      doc.text(doc.splitTextToSize(safe(foot), 150)[0], M, H - 3.6);
      doc.setTextColor(...mix(P, 0.35));
      if (pages > 1) text(`Page ${p} of ${pages}`, R, H - 3.6, { align: "right" });
    }
    doc.setProperties({ title: `${b.name} Treatment Quote ${q.no}`, author: b.name, subject: "Treatment quote" });
    return doc.output("blob");
  }

  /* ---------------- Word (.docx) ---------------- */
  async function buildDocx(q, logo, group) {
    await prepareDocx();
    const D = window.docx;
    const b = branchOf(q);
    const P = b.primary.slice(1), A = b.accent.slice(1), AT = b.accentText.slice(1), T = b.tint.slice(1);
    const ZEBRA = hexOf(mix(b.primary, 0.035));
    const t = totals(q);
    const SERIF = "Georgia", SANS = "Arial";
    const ink = INK.slice(1), muted = MUTED.slice(1);
    const CONTENT = 10106; // A4 minus 900 twip margins

    const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
    const run = (text, o = {}) => new D.TextRun({ text: String(text), font: o.serif ? SERIF : SANS, size: o.size || 19, bold: !!o.bold, italics: !!o.italic, color: o.color || ink });
    const para = (children, o = {}) => new D.Paragraph({ children: Array.isArray(children) ? children : [children], alignment: o.align, spacing: o.line === false ? { before: 0, after: 0 } : { before: o.before || 0, after: o.after || 0, line: o.line || 264 }, keepNext: o.keepNext, border: o.border });
    const cell = (children, o = {}) => new D.TableCell({
      children: Array.isArray(children) ? children : [children],
      width: { size: o.w, type: D.WidthType.DXA },
      columnSpan: o.span,
      borders: o.borders || { top: NONE, left: o.left || NONE, right: NONE, bottom: o.bottom || NONE },
      shading: o.fill ? { fill: o.fill, type: D.ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: o.pt ?? 100, bottom: o.pb ?? 100, left: o.pl ?? 0, right: o.pr ?? 0 },
      verticalAlign: o.valign || D.VerticalAlign.TOP
    });
    const R = D.AlignmentType.RIGHT, C = D.AlignmentType.CENTER;
    const spacer = (after) => para(run(""), { after });

    // header: logo + title
    let brandPara;
    if (logo) {
      const h = q.branch === "premium" ? 84 : 62;
      const w = Math.round(h * logo.w / logo.h);
      const bytes = Uint8Array.from(atob(logo.src.split(",")[1]), (c) => c.charCodeAt(0));
      brandPara = para(new D.ImageRun({ type: logo.type === "PNG" ? "png" : "jpg", data: bytes, transformation: { width: w, height: h } }), { line: false });
    } else brandPara = para(run(b.name, { serif: true, bold: true, size: 44, color: P }));
    const head = new D.Table({
      width: { size: CONTENT, type: D.WidthType.DXA }, columnWidths: [5106, 5000], borders: noBorders,
      rows: [new D.TableRow({ children: [
        cell(brandPara, { w: 5106, valign: D.VerticalAlign.CENTER }),
        cell([
          para(run("Treatment Quote", { serif: true, bold: true, size: 40, color: P }), { align: R }),
          para(run("Quote no. " + q.no, { size: 17, color: muted }), { align: R, before: 80 }),
          para(run("Issued " + fmtDate(q.date), { size: 17, color: muted }), { align: R })
        ], { w: 5000, valign: D.VerticalAlign.CENTER })
      ] })]
    });

    // patient card
    const accentBar = { style: D.BorderStyle.SINGLE, size: 18, color: A };
    const fw = 1700;
    const whoW = CONTENT - 3 * fw;
    const fact = (lab, val) => cell([para(run(lab, { size: 15, color: muted }), { after: 60 }), para(run(val, { size: 18, bold: true }))], { w: fw, fill: T, pt: 200, pb: 200, pl: 120, pr: 80 });
    const card = new D.Table({
      width: { size: CONTENT, type: D.WidthType.DXA }, columnWidths: [whoW, fw, fw, fw], borders: noBorders,
      rows: [new D.TableRow({ children: [
        cell([para(run("Prepared for", { size: 15, color: muted }), { after: 60 }), para(run(q.patient || "—", { serif: true, bold: true, size: 30, color: P }))],
          { w: whoW, fill: T, pt: 200, pb: 200, pl: 240, left: accentBar }),
        fact("Valid until", fmtShort(addDays(q.date, q.validDays))),
        fact("Coordinator", q.coordinator || "—"),
        fact("Currency", q.currency === "GBP" ? "GBP (£)" : "EUR (€)")
      ] })]
    });

    // items
    const cw = [6106, 1000, 1500, 1500];
    const th = (s, i) => cell(para(run(s, { size: 16, bold: true, color: "FFFFFF" }), { align: i === 1 ? C : i ? R : undefined }),
      { w: cw[i], fill: P, pt: 130, pb: 130, pl: i ? 80 : 160, pr: i === 3 ? 160 : 0 });
    const rows = [new D.TableRow({ tableHeader: true, children: ["Treatment", "Qty", "Unit price", "Total"].map(th) })];
    q.items.forEach((it, i) => {
      const z = i % 2 ? ZEBRA : undefined;
      const nameParas = [para(run(it.name, { size: 19 }))];
      if (it.note) nameParas.push(para(run(it.note, { serif: true, italic: true, size: 17, color: AT }), { before: 30 }));
      const o = { fill: z, pt: 130, pb: 130 };
      rows.push(new D.TableRow({ cantSplit: true, children: [
        cell(nameParas, { ...o, w: cw[0], pl: 160 }),
        cell(para(run(it.qty, { size: 19 }), { align: C }), { ...o, w: cw[1], pl: 80 }),
        cell(para(run(money(it.unit, q.currency), { size: 19, color: muted }), { align: R }), { ...o, w: cw[2], pl: 80 }),
        cell(para(run(money(it.qty * it.unit, q.currency), { size: 19, bold: true }), { align: R }), { ...o, w: cw[3], pl: 80, pr: 160 })
      ] }));
    });
    const items = new D.Table({
      width: { size: CONTENT, type: D.WidthType.DXA }, columnWidths: cw,
      borders: { ...noBorders, bottom: { style: D.BorderStyle.SINGLE, size: 8, color: P } }, rows
    });

    // totals
    const tw = [2400, 2400];
    const totRows = [];
    if (t.disc) {
      totRows.push(new D.TableRow({ children: [
        cell(para(run("Subtotal", { size: 18, color: muted })), { w: tw[0], pt: 50, pb: 50, pl: 200 }),
        cell(para(run(money(t.sub, q.currency), { size: 18 }), { align: R }), { w: tw[1], pt: 50, pb: 50, pr: 200 })
      ] }));
      totRows.push(new D.TableRow({ children: [
        cell(para(run(discLabel(q), { size: 18, color: AT })), { w: tw[0], pt: 50, pb: 120, pl: 200 }),
        cell(para(run(money(-t.disc, q.currency), { size: 18, bold: true, color: AT }), { align: R }), { w: tw[1], pt: 50, pb: 120, pr: 200 })
      ] }));
    }
    const goldLine = { style: D.BorderStyle.SINGLE, size: 12, color: A };
    totRows.push(new D.TableRow({ children: [
      cell(para(run("Total", { size: 18, color: "FFFFFF" })), { w: tw[0], fill: P, pt: 220, pb: 220, pl: 240, valign: D.VerticalAlign.CENTER, bottom: goldLine }),
      cell(para(run(money(t.total, q.currency), { serif: true, bold: true, size: 44, color: "FFFFFF" }), { align: R }), { w: tw[1], fill: P, pt: 180, pb: 180, pr: 240, valign: D.VerticalAlign.CENTER, bottom: goldLine })
    ] }));
    const totTable = new D.Table({ width: { size: 4800, type: D.WidthType.DXA }, columnWidths: tw, alignment: R, borders: noBorders, rows: totRows });

    const body = [head, spacer(240), card, spacer(280), items, spacer(240), totTable];
    if (q.note) {
      const noteCell = cell([
        para(run("A note for you", { serif: true, bold: true, size: 21, color: P }), { after: 80 }),
        ...q.note.split(/\n/).map((l) => para(run(l, { size: 18 }), { line: 300 }))
      ], { w: CONTENT, fill: T, pt: 200, pb: 200, pl: 240, pr: 240, left: accentBar });
      body.push(spacer(300), new D.Table({ width: { size: CONTENT, type: D.WidthType.DXA }, columnWidths: [CONTENT], borders: noBorders, rows: [new D.TableRow({ cantSplit: true, children: [noteCell] })] }));
    }
    if (q.terms) {
      body.push(para(run("Good to know", { serif: true, bold: true, size: 20, color: P }), { before: 400, after: 80, keepNext: true }));
      body.push(para(run(q.terms, { size: 16, color: muted }), { line: 300 }));
    }

    // signature
    const sigW = [3900, 400, 1800, 400, 3606];
    const sigLine = { style: D.BorderStyle.SINGLE, size: 6, color: ink };
    const sigCell = (name, label, w) => cell([
      para(run(name || " ", { size: 17, bold: true }), { before: 60 }),
      para(run(label, { size: 15, color: muted }))
    ], { w, pt: 0, pb: 0, borders: { top: sigLine, bottom: NONE, left: NONE, right: NONE } });
    const gap = (w) => cell(para(run("")), { w, pt: 0, pb: 0 });
    body.push(
      para(run("Acceptance", { serif: true, bold: true, size: 20, color: P }), { before: 420, after: 60, keepNext: true }),
      para(run("By signing below, I confirm that I have read and accept this treatment quote.", { size: 16, color: muted }), { after: 900, keepNext: true }),
      new D.Table({
        width: { size: CONTENT, type: D.WidthType.DXA }, columnWidths: sigW, borders: noBorders,
        rows: [new D.TableRow({ cantSplit: true, children: [
          sigCell(q.patient || "Patient", "Patient signature", sigW[0]), gap(sigW[1]),
          sigCell("", "Date", sigW[2]), gap(sigW[3]),
          sigCell(q.coordinator || b.name, "On behalf of " + b.name, sigW[4])
        ] })]
      })
    );

    const contacts = contactsList(q);
    const footText = contacts.length ? contacts.join("   |   ") : `${b.name}   |   ${q.tagline || CFG.tagline}`;
    const footKids = [];
    if (group) {
      const gw = 560, gh = Math.round(gw * group.h / group.w);
      const gbytes = Uint8Array.from(atob(group.src.split(",")[1]), (c) => c.charCodeAt(0));
      footKids.push(
        new D.Paragraph({ alignment: C, border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: hexOf(mix(b.primary, 0.18)), space: 6 } }, spacing: { after: 40 }, children: [run("Our group of companies", { size: 13, color: muted })] }),
        new D.Paragraph({ alignment: C, spacing: { after: 100 }, children: [new D.ImageRun({ type: group.type === "PNG" ? "png" : "jpg", data: gbytes, transformation: { width: gw, height: gh } })] })
      );
    }
    const footer = new D.Footer({ children: [...footKids, new D.Paragraph({
      shading: { type: D.ShadingType.CLEAR, fill: P, color: "auto" },
      border: { top: { style: D.BorderStyle.SINGLE, size: 12, color: A, space: 0 } },
      spacing: { before: 0, after: 0, line: 360 },
      tabStops: [{ type: D.TabStopType.RIGHT, position: CONTENT - 100 }],
      indent: { left: 100, right: 100 },
      children: [
        run(" " + footText, { size: 16, color: "FFFFFF" }),
        new D.TextRun({ children: ["\tPage ", D.PageNumber.CURRENT, " of ", D.PageNumber.TOTAL_PAGES, " "], font: SANS, size: 16, color: "FFFFFF" })
      ]
    })] });
    const header = new D.Header({ children: [new D.Paragraph({ border: { top: { style: D.BorderStyle.SINGLE, size: 30, color: P, space: 0 }, bottom: { style: D.BorderStyle.SINGLE, size: 8, color: A, space: 0 } }, spacing: { line: 20 }, children: [] })] });

    const docx = new D.Document({
      creator: b.name, title: `${b.name} Treatment Quote ${q.no}`,
      styles: { default: { document: { run: { font: SANS, size: 19, color: ink } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: group ? 2300 : 1000, left: 900, right: 900, header: 250, footer: 300 } } },
        headers: { default: header }, footers: { default: footer }, children: body
      }]
    });
    return D.Packer.toBlob(docx);
  }

  /* ---------------- share link encoding ---------------- */
  const b64url = (bytes) => { let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64url = (str) => Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

  async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
  }
  function pack(q) {
    return {
      v: 1, n: q.no, d: q.date, vd: q.validDays, p: q.patient, b: q.branch, c: q.currency, co: q.coordinator,
      i: q.items.map((it) => [it.name, it.qty, it.unit, it.note || ""]),
      ds: q.discount && Number(q.discount.value) ? [q.discount.type, Number(q.discount.value)] : 0,
      no: q.note, t: q.terms, k: q.contacts, tg: q.tagline
    };
  }
  function unpack(o) {
    return {
      no: o.n, date: o.d, validDays: o.vd, patient: o.p, branch: o.b, currency: o.c, coordinator: o.co,
      items: (o.i || []).map(([name, qty, unit, note]) => ({ name, qty, unit, note })),
      discount: o.ds ? { type: o.ds[0], value: o.ds[1] } : { type: "pct", value: 0 },
      note: o.no, terms: o.t, contacts: o.k || {}, tagline: o.tg
    };
  }
  async function encode(q) {
    const bytes = new TextEncoder().encode(JSON.stringify(pack(q)));
    if (window.CompressionStream) {
      try { return "z" + b64url(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ }
    }
    return "j" + b64url(bytes);
  }
  async function decode(str) {
    const kind = str[0], bytes = unb64url(str.slice(1));
    const raw = kind === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
    return unpack(JSON.parse(new TextDecoder().decode(raw)));
  }

  /* ---------------- delivery ---------------- */
  const isTouch = () => matchMedia("(pointer: coarse)").matches;
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function deliver(blob, name, mime) {
    if (isTouch() && navigator.canShare) {
      const file = new File([blob], name, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return "shared"; }
        catch (e) { if (e.name === "AbortError") return "cancelled"; }
      }
    }
    download(blob, name);
    return "downloaded";
  }

  window.QuoteExport = {
    money, fmtDate, addDays, totals, renderHTML, fileName,
    preparePdf, prepareDocx, buildPdf, buildDocx,
    deliver, download, SYMBOL, getLogo, getGroupLogo
  };
})();
