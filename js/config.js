// Game configuration and star database
const STAR_CONFIG = {
  // Mode selection:
  // - false: Player can choose any card from their hand (strategic/bluffing)
  // - true: Forced top-card draw (random draw from their stack)
  FORCED_TOP_DRAW: true,
  
  // Placement of played cards:
  // - "middle": Tossed in the center of the table (pot pile)
  // - "near": Placed in front of the seated player (personal played pile)
  CARD_PLACEMENT_MODE: "middle",

  // Database of 45 stars active between 2009 and 2026
  roster: [
    // --- TOLLYWOOD (15 Stars) ---
    { id: "prabhas", name: "Prabhas", industry: "Tollywood", imagePath: "assets/stars/prabhas.png" },
    { id: "mahesh_babu", name: "Mahesh Babu", industry: "Tollywood", imagePath: "assets/stars/mahesh_babu.png" },
    { id: "allu_arjun", name: "Allu Arjun", industry: "Tollywood", imagePath: "assets/stars/allu_arjun.png" },
    { id: "jr_ntr", name: "Jr NTR", industry: "Tollywood", imagePath: "assets/stars/jr_ntr.png" },
    { id: "ram_charan", name: "Ram Charan", industry: "Tollywood", imagePath: "assets/stars/ram_charan.png" },
    { id: "samantha", name: "Samantha Ruth Prabhu", industry: "Tollywood", imagePath: "assets/stars/samantha.png" },
    { id: "rashmika", name: "Rashmika Mandanna", industry: "Tollywood", imagePath: "assets/stars/rashmika.png" },
    { id: "pooja_hegde", name: "Pooja Hegde", industry: "Tollywood", imagePath: "assets/stars/pooja_hegde.png" },
    { id: "nani", name: "Nani", industry: "Tollywood", imagePath: "assets/stars/nani.png" },
    { id: "vijay_deverakonda", name: "Vijay Deverakonda", industry: "Tollywood", imagePath: "assets/stars/vijay_deverakonda.png" },
    { id: "keerthy_suresh", name: "Keerthy Suresh", industry: "Tollywood", imagePath: "assets/stars/keerthy_suresh.png" },
    { id: "anushka_shetty", name: "Anushka Shetty", industry: "Tollywood", imagePath: "assets/stars/anushka_shetty.png" },
    { id: "kajal_aggarwal", name: "Kajal Aggarwal", industry: "Tollywood", imagePath: "assets/stars/kajal_aggarwal.png" },
    { id: "sai_pallavi", name: "Sai Pallavi", industry: "Tollywood", imagePath: "assets/stars/sai_pallavi.png" },
    { id: "shruti_haasan", name: "Shruti Haasan", industry: "Tollywood", imagePath: "assets/stars/shruti_haasan.png" },
    { id: "pawan_kalyan", name: "Pawan Kalyan", industry: "Tollywood", imagePath: "assets/stars/pawan_kalyan.png" },
    { id: "chiranjeevi", name: "Chiranjeevi", industry: "Tollywood", imagePath: "assets/stars/chiranjeevi.png" },
    { id: "nagarjuna", name: "Nagarjuna", industry: "Tollywood", imagePath: "assets/stars/nagarjuna.png" },
    { id: "balakrishna", name: "Nandamuri Balakrishna", industry: "Tollywood", imagePath: "assets/stars/balakrishna.png" },
    { id: "manchu_manoj", name: "Manchu Manoj", industry: "Tollywood", imagePath: "assets/stars/manchu_manoj.png" },

    // --- BOLLYWOOD (15 Stars) ---
    { id: "ranbir_kapoor", name: "Ranbir Kapoor", industry: "Bollywood", imagePath: "assets/stars/ranbir_kapoor.png" },
    { id: "ranveer_singh", name: "Ranveer Singh", industry: "Bollywood", imagePath: "assets/stars/ranveer_singh.png" },
    { id: "alia_bhatt", name: "Alia Bhatt", industry: "Bollywood", imagePath: "assets/stars/alia_bhatt.png" },
    { id: "deepika_padukone", name: "Deepika Padukone", industry: "Bollywood", imagePath: "assets/stars/deepika_padukone.png" },
    { id: "vicky_kaushal", name: "Vicky Kaushal", industry: "Bollywood", imagePath: "assets/stars/vicky_kaushal.png" },
    { id: "kiara_advani", name: "Kiara Advani", industry: "Bollywood", imagePath: "assets/stars/kiara_advani.png" },
    { id: "shah_rukh_khan", name: "Shah Rukh Khan", industry: "Bollywood", imagePath: "assets/stars/shah_rukh_khan.png" },
    { id: "katrina_kaif", name: "Katrina Kaif", industry: "Bollywood", imagePath: "assets/stars/katrina_kaif.png" },
    { id: "hrithik_roshan", name: "Hrithik Roshan", industry: "Bollywood", imagePath: "assets/stars/hrithik_roshan.png" },
    { id: "priyanka_chopra", name: "Priyanka Chopra", industry: "Bollywood", imagePath: "assets/stars/priyanka_chopra.png" },
    { id: "kareena_kapoor", name: "Kareena Kapoor", industry: "Bollywood", imagePath: "assets/stars/kareena_kapoor.png" },
    { id: "ayushmann_khurrana", name: "Ayushmann Khurrana", industry: "Bollywood", imagePath: "assets/stars/ayushmann_khurrana.png" },
    { id: "shraddha_kapoor", name: "Shraddha Kapoor", industry: "Bollywood", imagePath: "assets/stars/shraddha_kapoor.png" },
    { id: "rajkummar_rao", name: "Rajkummar Rao", industry: "Bollywood", imagePath: "assets/stars/rajkummar_rao.png" },
    { id: "kriti_sanon", name: "Kriti Sanon", industry: "Bollywood", imagePath: "assets/stars/kriti_sanon.png" }
  ]
};

// Export config if using module system, otherwise attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = STAR_CONFIG;
} else {
  window.STAR_CONFIG = STAR_CONFIG;
}
