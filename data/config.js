/*
 * Lara Smile — klinik bilgileri (varsayılanlar)
 * Bu bilgiler teklifin alt kısmında görünür.
 * Uygulamadaki "Ayarlar" sekmesinden cihaz bazında da değiştirilebilir.
 *
 * Her şubenin logosu ve renkleri aşağıda. Logoyu değiştirmek için
 * assets/logos/ klasöründeki PNG dosyasını aynı adla değiştirmeniz yeterli.
 */
window.CLINIC_CONFIG = {
  branches: {
    standard: {
      name: "Lara Smile",
      logo: "assets/logos/lara-smile.png",
      primary: "#163377",   // lacivert (logodaki "Lara")
      accent: "#11AFAC",    // turkuaz (logodaki "Smile" ve gülüş)
      accentText: "#0B8C89",
      tint: "#EEF7F7",
      prefix: "LS"
    },
    premium: {
      name: "Lara Smile Premium",
      logo: "assets/logos/lara-smile-premium.png",
      primary: "#164C63",   // petrol mavisi
      accent: "#C99A4B",    // altın
      accentText: "#A67A33",
      tint: "#FAF5EC",
      prefix: "LSP"
    }
  },
  // Alt bilgideki grup şirketleri logoları
  groupLogo: "assets/logos/group.jpg",
  tagline: "Dental Clinic, Antalya, Türkiye",
  phone: "",
  email: "",
  website: "",
  address: "",
  coordinator: "",
  validDays: 30,
  currency: "GBP",
  terms:
    "Prices are per unit. Your final treatment plan is confirmed " +
    "after a clinical examination and X-ray at the clinic, so quantities may change. " +
    "This quote is valid until the date shown above."
};
