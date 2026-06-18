// Game configuration and star database
const STAR_CONFIG = {
  // Mode selection:
  // - false: Player can choose any card from their hand (strategic/bluffing)
  // - true: Forced top-card draw (random draw from their stack)
  FORCED_TOP_DRAW: false,
  
  // Placement of played cards:
  // - "middle": Tossed in the center of the table (pot pile)
  // - "near": Placed in front of the seated player (personal played pile)
  CARD_PLACEMENT_MODE: "middle",

  // Database of 45 stars active between 2009 and 2026
  roster: [
    // --- TOLLYWOOD (15 Stars) ---
    { id: "prabhas", name: "Prabhas", industry: "Tollywood", imagePath: "assets/stars/prabhas.jpg" },
    { id: "mahesh_babu", name: "Mahesh Babu", industry: "Tollywood", imagePath: "assets/stars/mahesh_babu.jpg" },
    { id: "allu_arjun", name: "Allu Arjun", industry: "Tollywood", imagePath: "assets/stars/allu_arjun.jpg" },
    { id: "jr_ntr", name: "Jr NTR", industry: "Tollywood", imagePath: "assets/stars/jr_ntr.jpg" },
    { id: "ram_charan", name: "Ram Charan", industry: "Tollywood", imagePath: "assets/stars/ram_charan.jpg" },
    { id: "samantha", name: "Samantha Ruth Prabhu", industry: "Tollywood", imagePath: "assets/stars/samantha.jpg" },
    { id: "rashmika", name: "Rashmika Mandanna", industry: "Tollywood", imagePath: "assets/stars/rashmika.jpg" },
    { id: "pooja_hegde", name: "Pooja Hegde", industry: "Tollywood", imagePath: "assets/stars/pooja_hegde.jpg" },
    { id: "nani", name: "Nani", industry: "Tollywood", imagePath: "assets/stars/nani.jpg" },
    { id: "vijay_deverakonda", name: "Vijay Deverakonda", industry: "Tollywood", imagePath: "assets/stars/vijay_deverakonda.jpg" },
    { id: "keerthy_suresh", name: "Keerthy Suresh", industry: "Tollywood", imagePath: "assets/stars/keerthy_suresh.jpg" },
    { id: "anushka_shetty", name: "Anushka Shetty", industry: "Tollywood", imagePath: "assets/stars/anushka_shetty.jpg" },
    { id: "kajal_aggarwal", name: "Kajal Aggarwal", industry: "Tollywood", imagePath: "assets/stars/kajal_aggarwal.jpg" },
    { id: "sai_pallavi", name: "Sai Pallavi", industry: "Tollywood", imagePath: "assets/stars/sai_pallavi.jpg" },
    { id: "shruti_haasan", name: "Shruti Haasan", industry: "Tollywood", imagePath: "assets/stars/shruti_haasan.jpg" },

    // --- BOLLYWOOD (15 Stars) ---
    { id: "ranbir_kapoor", name: "Ranbir Kapoor", industry: "Bollywood", imagePath: "assets/stars/ranbir_kapoor.jpg" },
    { id: "ranveer_singh", name: "Ranveer Singh", industry: "Bollywood", imagePath: "assets/stars/ranveer_singh.jpg" },
    { id: "alia_bhatt", name: "Alia Bhatt", industry: "Bollywood", imagePath: "assets/stars/alia_bhatt.jpg" },
    { id: "deepika_padukone", name: "Deepika Padukone", industry: "Bollywood", imagePath: "assets/stars/deepika_padukone.jpg" },
    { id: "vicky_kaushal", name: "Vicky Kaushal", industry: "Bollywood", imagePath: "assets/stars/vicky_kaushal.jpg" },
    { id: "kiara_advani", name: "Kiara Advani", industry: "Bollywood", imagePath: "assets/stars/kiara_advani.jpg" },
    { id: "shah_rukh_khan", name: "Shah Rukh Khan", industry: "Bollywood", imagePath: "assets/stars/shah_rukh_khan.jpg" },
    { id: "katrina_kaif", name: "Katrina Kaif", industry: "Bollywood", imagePath: "assets/stars/katrina_kaif.jpg" },
    { id: "hrithik_roshan", name: "Hrithik Roshan", industry: "Bollywood", imagePath: "assets/stars/hrithik_roshan.jpg" },
    { id: "priyanka_chopra", name: "Priyanka Chopra", industry: "Bollywood", imagePath: "assets/stars/priyanka_chopra.jpg" },
    { id: "kareena_kapoor", name: "Kareena Kapoor", industry: "Bollywood", imagePath: "assets/stars/kareena_kapoor.jpg" },
    { id: "ayushmann_khurrana", name: "Ayushmann Khurrana", industry: "Bollywood", imagePath: "assets/stars/ayushmann_khurrana.jpg" },
    { id: "shraddha_kapoor", name: "Shraddha Kapoor", industry: "Bollywood", imagePath: "assets/stars/shraddha_kapoor.jpg" },
    { id: "rajkummar_rao", name: "Rajkummar Rao", industry: "Bollywood", imagePath: "assets/stars/rajkummar_rao.jpg" },
    { id: "kriti_sanon", name: "Kriti Sanon", industry: "Bollywood", imagePath: "assets/stars/kriti_sanon.jpg" },

    // --- HOLLYWOOD (15 Stars) ---
    { id: "tom_holland", name: "Tom Holland", industry: "Hollywood", imagePath: "assets/stars/tom_holland.jpg" },
    { id: "zendaya", name: "Zendaya", industry: "Hollywood", imagePath: "assets/stars/zendaya.jpg" },
    { id: "timothee_chalamet", name: "Timothée Chalamet", industry: "Hollywood", imagePath: "assets/stars/timothee_chalamet.jpg" },
    { id: "margot_robbie", name: "Margot Robbie", industry: "Hollywood", imagePath: "assets/stars/margot_robbie.jpg" },
    { id: "florence_pugh", name: "Florence Pugh", industry: "Hollywood", imagePath: "assets/stars/florence_pugh.jpg" },
    { id: "robert_downey_jr", name: "Robert Downey Jr.", industry: "Hollywood", imagePath: "assets/stars/robert_downey_jr.jpg" },
    { id: "scarlett_johansson", name: "Scarlett Johansson", industry: "Hollywood", imagePath: "assets/stars/scarlett_johansson.jpg" },
    { id: "chris_hemsworth", name: "Chris Hemsworth", industry: "Hollywood", imagePath: "assets/stars/chris_hemsworth.jpg" },
    { id: "emma_stone", name: "Emma Stone", industry: "Hollywood", imagePath: "assets/stars/emma_stone.jpg" },
    { id: "cillian_murphy", name: "Cillian Murphy", industry: "Hollywood", imagePath: "assets/stars/cillian_murphy.jpg" },
    { id: "austin_butler", name: "Austin Butler", industry: "Hollywood", imagePath: "assets/stars/austin_butler.jpg" },
    { id: "jenna_ortega", name: "Jenna Ortega", industry: "Hollywood", imagePath: "assets/stars/jenna_ortega.jpg" },
    { id: "pedro_pascal", name: "Pedro Pascal", industry: "Hollywood", imagePath: "assets/stars/pedro_pascal.jpg" },
    { id: "sydney_sweeney", name: "Sydney Sweeney", industry: "Hollywood", imagePath: "assets/stars/sydney_sweeney.jpg" },
    { id: "anya_taylor_joy", name: "Anya Taylor-Joy", industry: "Hollywood", imagePath: "assets/stars/anya_taylor_joy.jpg" }
  ]
};

// Export config if using module system, otherwise attach to window
if (typeof module !== "undefined" && module.exports) {
  module.exports = STAR_CONFIG;
} else {
  window.STAR_CONFIG = STAR_CONFIG;
}
