/* PDF teklifi (A4). jsPDF + Geist fontları. */
(function () {
  const FONT_FILES = {
    Geist: ["fonts/Geist_400Regular.ttf", "normal"],
    GeistMd: ["fonts/Geist_500Medium.ttf", "normal"],
    GeistSb: ["fonts/Geist_600SemiBold.ttf", "normal"],
    GeistBd: ["fonts/Geist_700Bold.ttf", "normal"]
  };
  const fontB64 = {};

  async function loadFont(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("font " + url);
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  async function registerFonts(doc) {
    for (const [name, [url, style]] of Object.entries(FONT_FILES)) {
      if (!fontB64[name]) fontB64[name] = await loadFont(url);
      const file = name + ".ttf";
      doc.addFileToVFS(file, fontB64[name]);
      doc.addFont(file, name, style);
    }
  }

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (rgb, t, base = [255, 255, 255]) => rgb.map((v, i) => Math.round(base[i] + (v - base[i]) * t));

  LSQ.buildPdf = async function () {
    const { jsPDF } = window.jspdf;
    const q = LSQ.compute();
    const cur = LSQ.state.currency;
    const cfg = LSQ.cfg();
    const branch = LSQ.branch();
    const premium = LSQ.state.branch === "premium";
    const ACC = hex(premium ? "#8A6734" : "#0F7C7A");
    const INK = hex("#13212B"), MUTED = hex("#5C6E79"), LINE = hex("#E1E8EB"), TINT = mix(ACC, 0.1);
    const money = (n) => LSQ.money(n, cur);

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    await registerFonts(doc);
    const logo = await LSQ.logoData(LSQ.state.branch);
    const groupLogo = await LSQ.logoData("group");

    const W = 210, H = 297, M = 16, R = W - M;
    const FOOT_H = 26;               // alt bilgi alanı
    const BOTTOM = H - FOOT_H - 6;   // içerik alt sınırı
    const qNo = LSQ.quoteNo();
    const font = (f, size, color = INK) => { doc.setFont(f, "normal"); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]); };
    const hline = (y, color = LINE, w = 0.25, x1 = M, x2 = R) => { doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(w); doc.line(x1, y, x2, y); };
    const text = (s, x, y, o) => doc.text(Array.isArray(s) ? s.map(String) : String(s), x, y, o);
    const wrap = (s, w) => doc.splitTextToSize(String(s), w);

    /* ---- Marka bloğu ---- */
    function brand(x, y, small) {
      if (logo) {
        const maxW = small ? 30 : 54, maxH = small ? 9 : 19;
        const k = Math.min(maxW / logo.w, maxH / logo.h);
        doc.addImage(logo.dataUrl, logo.type, x, y, logo.w * k, logo.h * k, undefined, "FAST");
        return logo.h * k;
      }
      font("GeistBd", small ? 12 : 21);
      text("Lara Smile", x, y + (small ? 5 : 8));
      let yy = y + (small ? 5 : 8);
      if (premium) { font("GeistSb", small ? 6 : 7.5); doc.setTextColor(ACC[0], ACC[1], ACC[2]); doc.setCharSpace(small ? 0.8 : 1.2); text("PREMIUM", x + 0.2, yy + (small ? 3.3 : 4.5)); doc.setCharSpace(0); yy += small ? 3.3 : 4.5; }
      if (!small) { font("Geist", 8.5, MUTED); text(cfg.tagline, x, yy + 5); yy += 5; }
      return yy - y;
    }

    function pageHeader(first) {
      if (first) {
        const bh = brand(M, 13, false);
        font("GeistSb", 7.5, ACC); doc.setCharSpace(1.1); text("TREATMENT QUOTE", R, 16, { align: "right" }); doc.setCharSpace(0);
        font("GeistBd", 15); text(qNo, R, 23.5, { align: "right" });
        font("Geist", 9, MUTED); text(LSQ.fmtDate(new Date(LSQ.state.createdAt)), R, 29, { align: "right" });
        const ly = Math.max(13 + bh, 31) + 5;
        hline(ly, LINE, 0.3);
        return ly;
      }
      brand(M, 10, true);
      font("Geist", 8.5, MUTED); text(`Quote ${qNo} (continued)`, R, 14.5, { align: "right" });
      hline(21, LINE, 0.3);
      return 21;
    }

    /* ---- Tablo sütunları ---- */
    const COL = { name: M, nameW: 94, qty: 124, unit: 158, total: R };
    function tableHeader(y) {
      font("GeistSb", 8, ACC);
      text("Treatment", COL.name, y);
      text("Qty", COL.qty, y, { align: "center" });
      text("Unit", COL.unit, y, { align: "right" });
      text("Total", COL.total, y, { align: "right" });
      hline(y + 2.4, ACC, 0.5);
      return y + 2.4;
    }

    /* ---- Sayfa 1 ---- */
    let y = pageHeader(true) + 8;

    // Bilgi alanı
    const patient = LSQ.state.patient.trim() || "Patient";
    const infoCols = [
      { x: M, w: 78, label: "Prepared for", val: patient },
      { x: 100, w: 44, label: "Valid until", val: LSQ.fmtDate(LSQ.validUntil()) },
      { x: 148, w: R - 148, label: "Coordinator", val: LSQ.coordinatorName() }
    ].filter((c) => c.val);
    let infoH = 0;
    infoCols.forEach((c) => {
      font("Geist", 8, MUTED); text(c.label, c.x, y);
      font("GeistSb", 11); const ls = wrap(c.val, c.w); text(ls.slice(0, 2), c.x, y + 5.2);
      infoH = Math.max(infoH, 5.2 + Math.min(ls.length, 2) * 4.7);
    });
    y += infoH + 7;

    y = tableHeader(y);

    const rowFont = { name: 10, note: 8.5 };
    const drawRow = (l) => {
      font("GeistMd", rowFont.name);
      const nameLines = wrap(l.name, COL.nameW);
      font("Geist", rowFont.note);
      const noteLines = l.note ? wrap(l.note, COL.nameW) : [];
      const h = 3.8 + nameLines.length * 4.5 + (noteLines.length ? noteLines.length * 3.8 + 0.8 : 0) + 3.4;
      if (y + h > BOTTOM) {
        doc.addPage();
        y = pageHeader(false) + 9;
        y = tableHeader(y);
      }
      const ty = y + 3.8 + 3.2;
      font("GeistMd", rowFont.name); text(nameLines, COL.name, ty, { lineHeightFactor: 1.28 });
      if (noteLines.length) { font("Geist", rowFont.note, MUTED); text(noteLines, COL.name, ty + nameLines.length * 4.5 + 0.3, { lineHeightFactor: 1.28 }); }
      font("Geist", 10); text(String(l.qty), COL.qty, ty, { align: "center" });
      text(money(l.unit), COL.unit, ty, { align: "right" });
      font("GeistSb", 10); text(money(l.total), COL.total, ty, { align: "right" });
      y += h;
      hline(y, LINE, 0.25);
    };
    q.lines.forEach(drawRow);

    /* ---- Toplamlar ---- */
    const sumX = 112;
    const sumNeed = (q.discount > 0 ? 15 : 0) + 14;
    if (y + 6 + sumNeed > BOTTOM) { doc.addPage(); y = pageHeader(false) + 4; } else y += 6;
    if (q.discount > 0) {
      font("Geist", 10, MUTED); text("Subtotal", sumX, y + 3); text(money(q.subtotal), R, y + 3, { align: "right" });
      y += 7;
      const dl = `${q.discountLabel}${q.discountText ? " (" + q.discountText + ")" : ""}`;
      font("Geist", 10, MUTED); text(wrap(dl, 52)[0], sumX, y + 3);
      font("GeistSb", 10, hex("#17794A")); text("-" + money(q.discount), R, y + 3, { align: "right" });
      y += 8;
    }
    doc.setFillColor(TINT[0], TINT[1], TINT[2]);
    doc.roundedRect(sumX - 4, y, R - sumX + 8, 14, 2.5, 2.5, "F");
    font("GeistMd", 10.5); text("Total", sumX, y + 8.7);
    font("GeistBd", 17, ACC); text(money(q.total), R - 2, y + 9.4, { align: "right" });
    y += 14 + 8;

    /* ---- Not ve şartlar ---- */
    const block = (title, body, size, color, lh) => {
      font("Geist", size, color);
      const ls = wrap(body, W - 2 * M);
      const h = 5 + ls.length * lh + 3;
      if (y + h > BOTTOM) { doc.addPage(); y = pageHeader(false) + 9; }
      font("GeistSb", 8, MUTED); text(title, M, y);
      font("Geist", size, color); text(ls, M, y + 5, { lineHeightFactor: 1.35 });
      y += h;
    };
    if (LSQ.state.note.trim()) block("Note", LSQ.state.note.trim(), 9.5, INK, 4.4);
    if (cfg.terms) block("Terms", cfg.terms, 8.2, MUTED, 3.9);

    /* ---- Hasta onayı ---- */
    const signH = 40;
    if (y + signH + 4 > BOTTOM) { doc.addPage(); y = pageHeader(false) + 9; } else y += 3;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, W - 2 * M, signH, 2.5, 2.5, "S");
    font("GeistSb", 9.5); text("Patient acceptance", M + 6, y + 8);
    font("Geist", 8.5, MUTED); text("I have reviewed this quote and I would like to proceed with the treatments listed above.", M + 6, y + 13.4);
    const ly = y + 31;
    const sig = (x, w, label) => { hline(ly, hex("#9FB0B9"), 0.3, x, x + w); font("Geist", 8, MUTED); text(label, x, ly + 4.2); };
    sig(M + 6, 40, "Patient name");
    sig(M + 52, 48, "Signature");
    sig(M + 106, 26, "Date");
    doc.setFillColor(0, 0, 0);
    font("Geist", 8.5, INK); if (LSQ.coordinatorName()) text(LSQ.coordinatorName(), M + 138, ly - 2);
    hline(ly, hex("#9FB0B9"), 0.3, M + 138, R - 6);
    font("Geist", 8, MUTED); text("Clinic representative", M + 138, ly + 4.2);
    y += signH;

    /* ---- Alt bilgi ve sayfa numaraları ---- */
    const pages = doc.getNumberOfPages();
    const contact = LSQ.contactParts().join("   |   ");
    const groupText = `${cfg.groupLabel}: ${cfg.groupCompanies.join(", ")}`;
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      const fy = H - FOOT_H;
      hline(fy, LINE, 0.3);
      let cy = fy + 6;
      if (contact) { font("Geist", 8, INK); text(wrap(contact, 140)[0], M, cy); cy += 5; }
      if (groupLogo) {
        const k = Math.min(110 / groupLogo.w, 8 / groupLogo.h);
        doc.addImage(groupLogo.dataUrl, groupLogo.type, M, cy - 2.5, groupLogo.w * k, groupLogo.h * k, undefined, "FAST");
      } else { font("Geist", 7.6, MUTED); text(wrap(groupText, 150), M, cy + 0.5, { lineHeightFactor: 1.3 }); }
      font("Geist", 8, MUTED); text(`Page ${p} of ${pages}`, R, fy + 6, { align: "right" });
      font("Geist", 7.5, MUTED); text(qNo, R, fy + 11, { align: "right" });
    }

    doc.setProperties({ title: `${branch.name} Treatment Quote ${qNo}`, subject: patient, author: branch.name, creator: branch.name });
    return doc.output("blob");
  };
})();
