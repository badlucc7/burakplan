/* Word teklifi (.docx), düzenlenebilir. docx kütüphanesi. */
(function () {
  const dataUrlToBytes = (u) => { const b = atob(u.split(",")[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };

  LSQ.buildDocx = async function () {
    const D = window.docx;
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, ImageRun, Footer, PageNumber, TabStopType, VerticalAlign, TableLayoutType, HeightRule } = D;

    const q = LSQ.compute();
    const cur = LSQ.state.currency;
    const cfg = LSQ.cfg();
    const branch = LSQ.branch();
    const premium = LSQ.state.branch === "premium";
    const ACC = premium ? "8A6734" : "0F7C7A";
    const TINT = premium ? "F1EBE1" : "E3F1F0";
    const INK = "13212B", MUTED = "5C6E79", LINE = "E1E8EB";
    const FONT = "Calibri";
    const money = (n) => LSQ.money(n, cur);
    const qNo = LSQ.quoteNo();
    const patient = LSQ.state.patient.trim() || "Patient";
    const logo = await LSQ.logoData(LSQ.state.branch);
    const groupLogo = await LSQ.logoData("group");

    const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
    const hair = (color = LINE, size = 4) => ({ style: BorderStyle.SINGLE, size, color });

    const R = (t, o = {}) => new TextRun({ text: String(t), font: FONT, size: (o.size || 10) * 2, bold: !!o.bold, color: o.color || INK, characterSpacing: o.spacing, break: o.br });
    const P = (runs, o = {}) => new Paragraph({ children: [].concat(runs), alignment: o.align, spacing: { before: o.before || 0, after: o.after || 0, line: o.line }, border: o.border, keepNext: o.keepNext, tabStops: o.tabStops });
    const cell = (children, w, o = {}) => new TableCell({
      children: [].concat(children), width: { size: w, type: WidthType.DXA }, verticalAlign: o.v || VerticalAlign.TOP,
      borders: o.borders || noBorders, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
      margins: { top: o.mt == null ? 60 : o.mt, bottom: o.mb == null ? 60 : o.mb, left: o.ml == null ? 0 : o.ml, right: o.mr == null ? 0 : o.mr }, columnSpan: o.span
    });
    const table = (rows, widths) => new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: { ...noBorders, insideHorizontal: NB, insideVertical: NB } });

    const CW = 9638; // içerik genişliği (A4, 2 cm kenar boşluğu)

    /* ---- Marka ---- */
    let brandChildren;
    if (logo) {
      const k = Math.min(190 / logo.w, 62 / logo.h);
      brandChildren = [new Paragraph({ children: [new ImageRun({ type: logo.type === "PNG" ? "png" : "jpg", data: dataUrlToBytes(logo.dataUrl), transformation: { width: Math.round(logo.w * k), height: Math.round(logo.h * k) } })] })];
    } else {
      brandChildren = [P(R("Lara Smile", { size: 22, bold: true }))];
      if (premium) brandChildren.push(P(R("PREMIUM", { size: 8, bold: true, color: ACC, spacing: 40 }), { before: 10 }));
      brandChildren.push(P(R(cfg.tagline, { size: 9, color: MUTED }), { before: 40 }));
    }
    const head = table([new TableRow({ children: [
      cell(brandChildren, 5200),
      cell([
        P(R("TREATMENT QUOTE", { size: 8, bold: true, color: ACC, spacing: 30 }), { align: AlignmentType.RIGHT }),
        P(R(qNo, { size: 15, bold: true }), { align: AlignmentType.RIGHT, before: 30 }),
        P(R(LSQ.fmtDate(new Date(LSQ.state.createdAt)), { size: 9.5, color: MUTED }), { align: AlignmentType.RIGHT, before: 20 })
      ], CW - 5200)
    ] })], [5200, CW - 5200]);

    const rule = new Paragraph({ children: [], spacing: { before: 120, after: 160 }, border: { bottom: hair(LINE, 6) } });

    /* ---- Bilgi ---- */
    const infoItems = [["Prepared for", patient], ["Valid until", LSQ.fmtDate(LSQ.validUntil())], LSQ.coordinatorName() ? ["Coordinator", LSQ.coordinatorName()] : null].filter(Boolean);
    const iw = infoItems.length === 3 ? [4300, 2400, 2938] : [6300, 3338];
    const info = table([new TableRow({ children: infoItems.map((it, i) => cell([P(R(it[0], { size: 8.5, color: MUTED })), P(R(it[1], { size: 11.5, bold: true }), { before: 20 })], iw[i])) })], iw);

    /* ---- Kalemler ---- */
    const CWS = [4900, 800, 1850, 2088];
    const th = (t, w, align) => cell(P(R(t, { size: 8.5, bold: true, color: ACC }), { align }), w, { borders: { ...noBorders, bottom: hair(ACC, 10) }, mt: 100, mb: 80 });
    const rows = [new TableRow({ tableHeader: true, cantSplit: true, children: [th("Treatment", CWS[0]), th("Qty", CWS[1], AlignmentType.CENTER), th("Unit", CWS[2], AlignmentType.RIGHT), th("Total", CWS[3], AlignmentType.RIGHT)] })];
    q.lines.forEach((l) => {
      const b = { ...noBorders, bottom: hair(LINE, 4) };
      const nm = [P(R(l.name, { size: 10.5, bold: false }))];
      if (l.note) nm.push(P(R(l.note, { size: 9, color: MUTED }), { before: 20 }));
      rows.push(new TableRow({ cantSplit: true, children: [
        cell(nm, CWS[0], { borders: b, mt: 110, mb: 110, mr: 120 }),
        cell(P(R(l.qty, { size: 10.5 }), { align: AlignmentType.CENTER }), CWS[1], { borders: b, mt: 110, mb: 110 }),
        cell(P(R(money(l.unit), { size: 10.5 }), { align: AlignmentType.RIGHT }), CWS[2], { borders: b, mt: 110, mb: 110 }),
        cell(P(R(money(l.total), { size: 10.5, bold: true }), { align: AlignmentType.RIGHT }), CWS[3], { borders: b, mt: 110, mb: 110 })
      ] }));
    });
    const items = table(rows, CWS);

    /* ---- Toplam ---- */
    const SW = [4700, 2900, 2038];
    const srows = [];
    if (q.discount > 0) {
      srows.push(new TableRow({ children: [cell([], SW[0]), cell(P(R("Subtotal", { size: 10.5, color: MUTED })), SW[1]), cell(P(R(money(q.subtotal), { size: 10.5, color: MUTED }), { align: AlignmentType.RIGHT }), SW[2])] }));
      srows.push(new TableRow({ children: [cell([], SW[0]), cell(P(R(`${q.discountLabel}${q.discountText ? " (" + q.discountText + ")" : ""}`, { size: 10.5, color: MUTED })), SW[1]), cell(P(R("-" + money(q.discount), { size: 10.5, bold: true, color: "17794A" }), { align: AlignmentType.RIGHT }), SW[2])] }));
    }
    srows.push(new TableRow({ children: [cell([], SW[0], { mt: 120 }),
      cell(P(R("Total", { size: 11.5, bold: true })), SW[1], { fill: TINT, v: VerticalAlign.CENTER, mt: 150, mb: 150, ml: 160 }),
      cell(P(R(money(q.total), { size: 17, bold: true, color: ACC }), { align: AlignmentType.RIGHT }), SW[2], { fill: TINT, v: VerticalAlign.CENTER, mt: 110, mb: 110, mr: 160 })] }));
    const sums = table(srows, SW);

    /* ---- Not, şartlar ---- */
    const blocks = [];
    if (LSQ.state.note.trim()) {
      blocks.push(P(R("Note", { size: 8.5, bold: true, color: MUTED }), { before: 280, keepNext: true }));
      LSQ.state.note.trim().split(/\n/).forEach((ln) => blocks.push(P(R(ln, { size: 10.5 }), { before: 30 })));
    }
    if (cfg.terms) {
      blocks.push(P(R("Terms", { size: 8.5, bold: true, color: MUTED }), { before: 240, keepNext: true }));
      blocks.push(P(R(cfg.terms, { size: 9, color: MUTED }), { before: 30 }));
    }

    /* ---- Onay ---- */
    const box = { top: hair("C9D4DA", 6), bottom: hair("C9D4DA", 6), left: hair("C9D4DA", 6), right: hair("C9D4DA", 6) };
    const sigLine = { ...noBorders, bottom: hair("9FB0B9", 6) };
    const sw = [2500, 200, 2900, 200, 1500, 200, 2138];
    const lbl = (t) => P(R(t, { size: 8.5, color: MUTED }), { before: 40 });
    const sigTable = table([
      new TableRow({ height: { value: 700, rule: HeightRule.EXACT }, cantSplit: true, children: [
        cell([], sw[0], { borders: sigLine }), cell([], sw[1]), cell([], sw[2], { borders: sigLine }), cell([], sw[3]), cell([], sw[4], { borders: sigLine }), cell([], sw[5]),
        cell(P(R(LSQ.coordinatorName(), { size: 10 })), sw[6], { borders: sigLine, v: VerticalAlign.BOTTOM })
      ] }),
      new TableRow({ cantSplit: true, children: [cell(lbl("Patient name"), sw[0]), cell([], sw[1]), cell(lbl("Signature"), sw[2]), cell([], sw[3]), cell(lbl("Date"), sw[4]), cell([], sw[5]), cell(lbl("Clinic representative"), sw[6])] })
    ], sw);
    const accept = new Table({
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        children: [
          P(R("Patient acceptance", { size: 10.5, bold: true }), { keepNext: true }),
          P(R("I have reviewed this quote and I would like to proceed with the treatments listed above.", { size: 9.5, color: MUTED }), { before: 40, after: 100, keepNext: true }),
          sigTable
        ],
        width: { size: CW, type: WidthType.DXA }, borders: box, margins: { top: 200, bottom: 160, left: 240, right: 240 }
      })] })],
      width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], layout: TableLayoutType.FIXED
    });

    /* ---- Alt bilgi ---- */
    const contact = LSQ.contactParts().join("   |   ");
    const footChildren = [];
    footChildren.push(new Paragraph({ border: { top: hair(LINE, 6) }, spacing: { before: 0, after: 40 }, tabStops: [{ type: TabStopType.RIGHT, position: CW }], children: [
      R(contact || " ", { size: 8.5 }), new TextRun({ text: "\t", font: FONT, size: 17 }),
      new TextRun({ text: "Page ", font: FONT, size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }), new TextRun({ text: " of ", font: FONT, size: 16, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })
    ] }));
    if (groupLogo) {
      const k = Math.min(300 / groupLogo.w, 26 / groupLogo.h);
      footChildren.push(new Paragraph({ children: [new ImageRun({ type: groupLogo.type === "PNG" ? "png" : "jpg", data: dataUrlToBytes(groupLogo.dataUrl), transformation: { width: Math.round(groupLogo.w * k), height: Math.round(groupLogo.h * k) } })] }));
    } else footChildren.push(P(R(`${cfg.groupLabel}: ${cfg.groupCompanies.join(", ")}`, { size: 8, color: MUTED })));

    const doc = new Document({
      creator: branch.name, title: `${branch.name} Treatment Quote ${qNo}`, description: patient,
      styles: { default: { document: { run: { font: FONT, size: 21, color: INK } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 1500, left: 1134, right: 1134, footer: 500 } } },
        footers: { default: new Footer({ children: footChildren }) },
        children: [head, rule, info, new Paragraph({ children: [], spacing: { before: 200 } }), items, new Paragraph({ children: [], spacing: { before: 80 } }), sums, ...blocks, new Paragraph({ children: [], spacing: { before: 280 } }), accept]
      }]
    });
    return Packer.toBlob(doc);
  };
})();
