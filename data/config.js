/*
 * Klinik bilgileri (varsayılanlar)
 *
 * Bu bilgiler teklif çıktısının alt kısmında görünür. Uygulamadaki
 * "Ayarlar" sekmesinden cihaz bazında da değiştirilebilir.
 *
 * Logo eklemek için dosyayı assets/logos/ klasörüne koyup yolunu aşağıya yaz.
 * Örnek: standard: "assets/logos/lara-smile.png"
 * Logo yoksa yazı logosu kullanılır.
 */
window.CLINIC_CONFIG = {
  branches: {
    standard: { name: "Lara Smile",         short: "Lara Smile", prefix: "LS"  },
    premium:  { name: "Lara Smile Premium", short: "Premium",    prefix: "LSP" }
  },
  logos: {
    standard: "",
    premium: "",
    group: ""
  },
  tagline: "Dental Clinic, Antalya, Türkiye",
  groupLabel: "Part of the Lara Smile group",
  groupCompanies: ["Medworld", "Cosmos Clinic", "MTT Medical Tourism Turkey", "Renua Clinic"],
  phone: "",
  email: "",
  website: "",
  address: "",
  coordinator: "",
  validDays: 30,
  currency: "GBP",
  defaultDiscountText: "Special discount",
  terms:
    "Prices are per unit. Your final treatment plan is confirmed after a clinical " +
    "examination and X-ray at the clinic, so quantities may change. " +
    "This quote is valid until the date shown above."
};
