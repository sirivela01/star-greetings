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
    { id: "prabhas", name: "Prabhas", industry: "Tollywood", imagePath: "assets/stars/prabhas.png", movie: "Salaar" },
    { id: "mahesh_babu", name: "Mahesh Babu", industry: "Tollywood", imagePath: "assets/stars/mahesh_babu.png", movie: "Sarileru Neekevvaru" },
    { id: "allu_arjun", name: "Allu Arjun", industry: "Tollywood", imagePath: "assets/stars/allu_arjun.png", movie: "Pushpa" },
    { id: "jr_ntr", name: "Jr NTR", industry: "Tollywood", imagePath: "assets/stars/jr_ntr.png", movie: "Devara" },
    { id: "ram_charan", name: "Ram Charan", industry: "Tollywood", imagePath: "assets/stars/ram_charan.png", movie: "Peddi" },
    { id: "samantha", name: "Samantha", industry: "Tollywood", imagePath: "assets/stars/samantha.png", movie: "Eega" },
    { id: "rashmika", name: "Dear Comrade", industry: "Tollywood", imagePath: "assets/stars/rashmika.png", movie: "Dear Comrade" },
    { id: "pooja_hegde", name: "Ala Vaikuntapurramulo", industry: "Tollywood", imagePath: "assets/stars/pooja_hegde.png", movie: "Ala Vaikunthapurramuloo" },
    { id: "nani", name: "Nani", industry: "Tollywood", imagePath: "assets/stars/nani.png", movie: "HIT: The Third Case" },
    { id: "vijay_deverakonda", name: "Vijay Deverakonda", industry: "Tollywood", imagePath: "assets/stars/vijay_deverakonda.png", movie: "Arjun Reddy" },
    { id: "keerthy_suresh", name: "Keerthy Suresh", industry: "Tollywood", imagePath: "assets/stars/keerthy_suresh.png", movie: "Dasara" },
    { id: "anushka_shetty", name: "Anushka", industry: "Tollywood", imagePath: "assets/stars/anushka_shetty.png", movie: "Mirchi" },
    { id: "kajal_aggarwal", name: "Kajal Agharwal", industry: "Tollywood", imagePath: "assets/stars/kajal_aggarwal.png", movie: "Kajal Agharwal" },
    { id: "sai_pallavi", name: "Maari 2", industry: "Tollywood", imagePath: "assets/stars/sai_pallavi.png", movie: "Maari 2" },
    { id: "shruti_haasan", name: "Shruti Haasan", industry: "Tollywood", imagePath: "assets/stars/shruti_haasan.png", movie: "Srimanthudu" },
    { id: "pawan_kalyan", name: "Pawan Kalyan", industry: "Tollywood", imagePath: "assets/stars/pawan_kalyan.png", movie: "OG" },
    { id: "chiranjeevi", name: "Chiranjeevi", industry: "Tollywood", imagePath: "assets/stars/chiranjeevi.png", movie: "Indra" },
    { id: "nagarjuna", name: "Nagarjuna", industry: "Tollywood", imagePath: "assets/stars/nagarjuna.png", movie: "Don" },
    { id: "balakrishna", name: "Nandamuri Balakrishna", industry: "Tollywood", imagePath: "assets/stars/balakrishna.png", movie: "Legend" },
    { id: "manchu_manoj", name: "Manchu Manoj", industry: "Tollywood", imagePath: "assets/stars/manchu_manoj.png", movie: "Current Theega" },
    { id: "gopichand", name: "Gopichand", industry: "Tollywood", imagePath: "assets/stars/gopichand.png", movie: "Andhrudu" },
    { id: "baahubali", name: "Baahubali", industry: "Tollywood", imagePath: "assets/stars/baahubali.png", movie: "Baahubali 2" },
    { id: "venkatesh", name: "Venkatesh", industry: "Tollywood", imagePath: "assets/stars/venkatesh.png", movie: "Tulasi" },
    { id: "rangasthalam", name: "Chitti Babu (Rangasthalam)", industry: "Tollywood", imagePath: "assets/stars/rangasthalam.png", movie: "Rangasthalam" },
    { id: "gabbar_singh", name: "Gabbar Singh", industry: "Tollywood", imagePath: "assets/stars/gabbar_singh.png", movie: "Gabbar Singh" },
    { id: "shambo_siva_shamboo", name: "Shambo Siva Shamboo", industry: "Tollywood", imagePath: "assets/stars/shambo_siva_shamboo.png", movie: "Shambo Siva Shambo" },
    { id: "julyi", name: "Julyi", industry: "Tollywood", imagePath: "assets/stars/julyi.png", movie: "Julyi" },
    { id: "brahmanandam", name: "Brahmanandam", industry: "Tollywood", imagePath: "assets/stars/brahmanandam.png", movie: "Comedy King" },
    { id: "sunil", name: "Sunil", industry: "Tollywood", imagePath: "assets/stars/sunil.png", movie: "Comedy Legend" },
    { id: "venu_madhav", name: "Venu Madhav", industry: "Tollywood", imagePath: "assets/stars/venu_madhav.png", movie: "Comedy Legend" },

    // --- BOLLYWOOD (15 Stars) ---
    { id: "ranbir_kapoor", name: "Ranbir Kapoor", industry: "Bollywood", imagePath: "assets/stars/ranbir_kapoor.png", movie: "Ae Dil Hai Mushkil" },
    { id: "ranveer_singh", name: "Ranveer Singh", industry: "Bollywood", imagePath: "assets/stars/ranveer_singh.png", movie: "Bajirao Mastani" },
    { id: "alia_bhatt", name: "Alia Bhatt", industry: "Bollywood", imagePath: "assets/stars/alia_bhatt.png", movie: "Brahmastra" },
    { id: "deepika_padukone", name: "Deepika Padukone", industry: "Bollywood", imagePath: "assets/stars/deepika_padukone.png", movie: "Ram-Leela" },
    { id: "vicky_kaushal", name: "Vicky Kaushal", industry: "Bollywood", imagePath: "assets/stars/vicky_kaushal.png", movie: "Bad Newz" },
    { id: "kiara_advani", name: "Kiara Advani", industry: "Bollywood", imagePath: "assets/stars/kiara_advani.png", movie: "Shershaah" },
    { id: "shah_rukh_khan", name: "Shah Rukh Khan", industry: "Bollywood", imagePath: "assets/stars/shah_rukh_khan.png", movie: "Dil Se" },
    { id: "katrina_kaif", name: "Katrina Kaif", industry: "Bollywood", imagePath: "assets/stars/katrina_kaif.png", movie: "Baar Baar Decho" },
    { id: "hrithik_roshan", name: "Hrithik Roshan", industry: "Bollywood", imagePath: "assets/stars/hrithik_roshan.png", movie: "War" },
    { id: "priyanka_chopra", name: "Priyanka Chopra", industry: "Bollywood", imagePath: "assets/stars/priyanka_chopra.png", movie: "Dostana" },
    { id: "kareena_kapoor", name: "Kareena Kapoor", industry: "Bollywood", imagePath: "assets/stars/kareena_kapoor.png", movie: "Ra.One" },
    { id: "ayushmann_khurrana", name: "Ayushmann Khurrana", industry: "Bollywood", imagePath: "assets/stars/ayushmann_khurrana.png", movie: "Bala" },
    { id: "shraddha_kapoor", name: "Shraddha Kapoor", industry: "Bollywood", imagePath: "assets/stars/shraddha_kapoor.png", movie: "Ek Villain" },
    { id: "rajkummar_rao", name: "Rajkummar Rao", industry: "Bollywood", imagePath: "assets/stars/rajkummar_rao.png", movie: "Stree" },
    { id: "kriti_sanon", name: "Kriti Sanon", industry: "Bollywood", imagePath: "assets/stars/kriti_sanon.png", movie: "Mimi" }
  ]
};

// Export config if using module system, otherwise attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = STAR_CONFIG;
} else {
  window.STAR_CONFIG = STAR_CONFIG;
}
