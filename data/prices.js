/*
 * Lara Smile — varsayılan fiyat listesi
 * ------------------------------------------------------------
 * Tüm cihazlardaki fiyatları güncellemek için bu dosyayı düzenleyin
 * ve "version" değerini değiştirin (örn. bugünün tarihi).
 * Cihazlar açılışta yeni listeyi fark edip güncellemeyi önerir.
 *
 * cat: crowns | implants | surgery | general
 */
window.PRICE_LIST = {
  version: "2026-09-28",
  items: [
    { id: "temp-crown",        cat: "crowns",   name: "Plastic Temporary Crowns or Dentures",                 gbp: 50,  eur: 70 },
    { id: "whitening",         cat: "general",  name: "Teeth Whitening & Bleaching with Laser",               gbp: 250, eur: 295 },
    { id: "zirconia-german",   cat: "crowns",   name: "Zirconium Crown (German Brand)",                       gbp: 170, eur: 200 },
    { id: "zirconia-standard", cat: "crowns",   name: "Zirconium Crown (Standard)",                           gbp: 140, eur: 180 },
    { id: "emax-veneer",       cat: "crowns",   name: "E-Max Laminate Veneer",                                gbp: 250, eur: 300 },
    { id: "emax-crown",        cat: "crowns",   name: "E-Max Crown",                                          gbp: 250, eur: 300 },
    { id: "root-canal",        cat: "general",  name: "Root Canal (Per Root)",                                gbp: 80,  eur: 95 },
    { id: "post-core",         cat: "crowns",   name: "Post / Core Build-Up",                                 gbp: 95,  eur: 110 },
    { id: "nucleoss",          cat: "implants", name: "Nucleoss Dental Implant (Local) + Abutment",           gbp: 350, eur: 400 },
    { id: "osstem",            cat: "implants", name: "Osstem Dental Implant (South Korea) + Abutment",       gbp: 380, eur: 440 },
    { id: "neodent",           cat: "implants", name: "Neodent Dental Implant + Abutment",                    gbp: 420, eur: 500 },
    { id: "megagen",           cat: "implants", name: "Megagen Dental Implant (South Korea) + Abutment",      gbp: 585, eur: 695 },
    { id: "medentika",         cat: "implants", name: "Medentika Dental Implant (German) + Abutment",         gbp: 600, eur: 710 },
    { id: "straumann",         cat: "implants", name: "Straumann SLActive Implant (Switzerland) + Abutment",  gbp: 900, eur: 1050 },
    { id: "nobel",             cat: "implants", name: "Nobel Implant (Switzerland) + Abutment",               gbp: 595, eur: 700 },
    { id: "sinus-lift",        cat: "surgery",  name: "Sinus Lift (One Quadrant)",                            gbp: 250, eur: 295 },
    { id: "surgical-graft",    cat: "surgery",  name: "Surgical Graft (One Quadrant)",                        gbp: 250, eur: 295 },
    { id: "autogenous-graft",  cat: "surgery",  name: "Autogenous Bone Graft (per CC)",                       gbp: 150, eur: 175 },
    { id: "membrane",          cat: "surgery",  name: "Surgical Membrane",                                    gbp: 100, eur: 115 },
    { id: "gum-contouring",    cat: "surgery",  name: "Gum Contouring (Per Tooth)",                           gbp: 30,  eur: 35 },
    { id: "extraction-simple", cat: "surgery",  name: "Extraction (Simple)",                                  gbp: 50,  eur: 60 },
    { id: "extraction-surg",   cat: "surgery",  name: "Extraction (Surgical)",                                gbp: 145, eur: 170 },
    { id: "cleaning",          cat: "general",  name: "Professional Teeth Cleaning",                          gbp: 50,  eur: 60 },
    { id: "cleaning-airflow",  cat: "general",  name: "Professional Teeth Cleaning (Air Flow)",               gbp: 150, eur: 170 },
    { id: "white-filling",     cat: "general",  name: "White Filling",                                        gbp: 50,  eur: 60 },
    { id: "composite-bonding", cat: "crowns",   name: "Composite Bonding",                                    gbp: 130, eur: 150 },
    { id: "inlay-onlay",       cat: "crowns",   name: "Inlay / Onlay (Ceramic or Porcelain)",                 gbp: 200, eur: 230 },
    { id: "night-guard",       cat: "general",  name: "Night Guard (Mouth Guard)",                            gbp: 50,  eur: 60 },
    { id: "implant-removal",   cat: "implants", name: "Implant Extraction",                                   gbp: 200, eur: 250 }
  ]
};
