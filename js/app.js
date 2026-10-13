/* Başlatma, gezinme, şube ve para birimi, dışa aktarma düğmeleri */
(function () {
  const { $, $$ } = LSQ;

  function applyBranch() {
    const b = LSQ.state.branch;
    document.body.dataset.branch = b;
    $$("#branchSeg [data-branch]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.branch === b)));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = b === "premium" ? "#8A6734" : "#0F7C7A";
  }
  function applyCurrency() {
    $$("#curSeg [data-cur]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.cur === LSQ.state.currency)));
  }
  function setView(v) {
    document.body.dataset.view = v;
    $$(".tabbar [data-view]").forEach((b) => (b.dataset.view === v ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
    $$(".topnav [data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    window.scrollTo({ top: 0, behavior: "auto" });
    if (v === "quote") LSQ.renderPreview();
  }

  async function runExport(btn, builder, ext) {
    const label = btn.innerHTML;
    btn.classList.add("busy");
    btn.innerHTML = `${LSQ.icon("arrow-clockwise", 20)} Hazırlanıyor`;
    try {
      const need = ext === ".pdf" ? window.jspdf : window.docx;
      if (!need) throw new Error("Kütüphane yüklenemedi, sayfayı yenile");
      const blob = await builder();
      await LSQ.deliver(blob, LSQ.fileBase() + ext);
      LSQ.toast(ext === ".pdf" ? "PDF hazır" : "Word dosyası hazır");
    } catch (e) {
      console.error(e);
      LSQ.toast("Dosya oluşturulamadı: " + (e && e.message ? e.message : e), true);
    } finally {
      btn.classList.remove("busy");
      btn.innerHTML = label;
    }
  }

  function init() {
    $("#brandTile").innerHTML = LSQ.icon("tooth", 24);
    $$("[data-ic]").forEach((el) => (el.innerHTML = LSQ.icon(el.dataset.ic, 24)));

    LSQ.initQuote();
    LSQ.initManage();
    applyBranch();
    applyCurrency();

    $("#branchSeg").addEventListener("click", (e) => {
      const b = e.target.closest("[data-branch]"); if (!b || b.dataset.branch === LSQ.state.branch) return;
      LSQ.state.branch = b.dataset.branch;
      applyBranch(); LSQ.touch(); LSQ.refreshQuote();
    });

    $("#curSeg").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-cur]"); if (!b || b.dataset.cur === LSQ.state.currency) return;
      const hadOverride = Object.keys(LSQ.state.override).length > 0;
      const hadFixedDiscount = LSQ.state.discount.mode === "amount" && LSQ.state.discount.value > 0;
      LSQ.state.currency = b.dataset.cur;
      if (hadOverride) LSQ.state.override = {};
      if (hadFixedDiscount) LSQ.state.discount.value = 0;
      applyCurrency(); LSQ.touch(); LSQ.refreshQuote();
      if (hadOverride || hadFixedDiscount) LSQ.toast("Para birimi değişti, elle girilen fiyat ve tutarlar sıfırlandı");
    });

    $$(".tabbar [data-view], .topnav [data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $$(".stepbar [data-step]").forEach((b) => b.addEventListener("click", () => LSQ.setStep(b.dataset.step)));
    LSQ.setStep(LSQ.state.step === "sheet" && LSQ.compute().count ? "sheet" : "items", false);

    $("#btnPdf").addEventListener("click", (e) => runExport(e.currentTarget, LSQ.buildPdf, ".pdf"));
    $("#btnDocx").addEventListener("click", (e) => runExport(e.currentTarget, LSQ.buildDocx, ".docx"));

    /* Yeni sürüm fiyat listesi varsa sor */
    if (LSQ.pendingPriceUpdate) {
      LSQ.ask({
        title: "Yeni fiyat listesi var",
        text: "Bu cihazda elle değiştirilmiş bir liste var. Yeni listeyi yüklersen değişikliklerin silinir.",
        actions: [{ label: "Yeni listeyi yükle", value: "new", variant: "primary" }, { label: "Benimkini koru", value: "keep" }]
      }).then((v) => {
        if (v === "new") { LSQ.applyDefaultPrices(); LSQ.renderPrices(); LSQ.refreshQuote(); }
        else LSQ.keepMyPrices();
      });
    }

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
