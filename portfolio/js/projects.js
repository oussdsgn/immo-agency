// Project content, taken from the portfolio PDF (in its order).
// Each entry has a board image (assets/work/<slug>.webp), a card thumbnail
// (<slug>-thumb.webp) and the client logo cropped from the PDF header (assets/logos/<slug>.webp).
window.PROJECTS = [
  {
    slug: "rivano",
    name: "Rivano",
    client: "Rivano — Colors & Décoration",
    category: "Label Design",
    discipline: "Packaging Design · Label Design",
    summary:
      "A bilingual French / Arabic label system for Rivano's paint and coatings range: seven 18 kg products, from Fix Primer and the Elegance satin acrylic to Viny Max, High Gloss lacquer, Enduit Finish, Enduit Gros and M25. Each product has its own colour, and a shared grid (brand shield, central technical panel, usage pictograms, benefit icons) keeps the range easy to recognise on the shelf.",
    deliverables: ["7 product labels", "Bilingual FR / AR layout", "Pictogram & benefit icon set"],
  },
  {
    slug: "ibhan",
    name: "Ibhan",
    client: "Ibhan",
    category: "Label Design",
    discipline: "Packaging Design · Label Design",
    summary:
      "Labels for three 250 ml vinegar hair tonics: lemon, raspberry and hibiscus. A soft wave-cut header holds the Ibhan monogram. Each scent gets a full-bleed colour and an ingredient photo, with French and Arabic composition, directions and precautions on either side.",
    deliverables: ["3 wrap-around labels", "Bilingual FR / AR copy", "Print-ready artwork"],
  },
  {
    slug: "lela-elte",
    name: "Lela Elte",
    client: "Lela Elte skincare",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging",
    summary:
      "Tuck-end folding cartons for three 30 ml serums: Acide Kojique, Serum Anti-Acné and Serum Hyalurofit. A typographic monogram anchors every face, each active ingredient has its own colour (orchid, violet, indigo), and copy in French, English, Russian and Arabic is set directly on the dieline.",
    deliverables: ["3 folding cartons", "Custom dieline", "Multilingual copy layout"],
  },
  {
    slug: "bsat",
    name: "B-SAT Plus",
    client: "Sarl Bisat Electronic",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging",
    summary:
      "Retail box for the Super Plus-05 Ku-band universal quattro LNB. A black carton with gold diagonal lines, a product render, feature badges (4K, 3D Full HD, LTE protected, high gain) and a 'New Version' seal, built on a custom tuck-end dieline.",
    deliverables: ["Retail carton", "Dieline & pre-press", "Feature badge system"],
  },
  {
    slug: "owya",
    name: "The Owya Lab",
    client: "owya skin care",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging",
    summary:
      "Cartons for the owya O² foam range: La Mousse Pure+, La Mousse Hydra and Le Masque Éclat (150 ml). One structural template comes in three colourways (plum, sky blue, sunshine yellow), and a pictogram panel walks through the 30-second glow ritual.",
    deliverables: ["3 cartons", "Shared structural template", "Ritual pictograms"],
  },
  {
    slug: "matiou",
    name: "Matiou Mushroom",
    client: "Matiou Mushroom",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging",
    summary:
      "A carry-handle box for an oyster-mushroom growing kit, 100% Algerian. A pre-perforated front window opens onto the growing medium. The box carries a line-drawn mushroom illustration, cut → spray → grow → harvest steps, trilingual EN / FR / AR instructions and a nutrition table.",
    deliverables: ["Handle box with die-cut window", "Illustration", "Logo & trilingual copy"],
  },
  {
    slug: "avissoin",
    name: "Avissoin",
    client: "Avissoin — Soins & Beauté",
    category: "Structural Packaging",
    discipline: "Packaging Design · 3D Visualization",
    summary:
      "Promotional gift-pack boxes: Pack Réglisse (licorice) and Pack Figue de Barbarie (prickly pear), each holding a gel, mask, cream and soap. Shown here as 3D product renders.",
    deliverables: ["2 gift-pack boxes", "3D product renders"],
  },
  {
    slug: "tali",
    name: "Tali Skincare",
    client: "Tali Skincare",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging",
    summary:
      "Charbon Box, an activated-charcoal routine set: a mailer box plus individual cartons for the cleansing gel and purifying mask. Matte black with white type, mint-and-charcoal photography and an 'open your cure' reveal.",
    deliverables: ["Mailer box", "Product cartons", "Unboxing copy"],
  },
  {
    slug: "bee-power",
    name: "Bee Power",
    client: "Bee Power",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging · Label",
    summary:
      "Packaging for a natural honey, ginseng and nut energy blend (250 g): a mascot-led carton and matching jar label in honey yellow and black, with halftone textures, honeycomb motifs and Arabic copy.",
    deliverables: ["Carton", "Jar label", "Mascot application"],
  },
  {
    slug: "dr-samy",
    name: "Docteur Samy",
    client: "Dr Samy",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging · Label",
    summary:
      "Cartons and labels for a body-care line: an exfoliating anti-odour gel with salicylic acid (mango-hibiscus and lemon versions), a relipidant body cream and a kojic-acid anti-spot cream. Warm taupe and white, minimal type and a signature mark.",
    deliverables: ["Carton", "Tube & jar labels", "Lid sticker"],
  },
  {
    slug: "dromea",
    name: "Dromea",
    client: "Dromea — The essence of the desert in every drop",
    category: "Structural Packaging",
    discipline: "Packaging Design · Structural Packaging · Branding",
    summary:
      "Seven artisanal creams made with camel-hump fat and plant oils: prickly-pear seed, coffee, artemisia, wintergreen, rose, saffron and rosemary. A golden camel line drawing and the DRO|MEA wordmark tie the cartons together, and each variant changes its accent colour and ingredient image.",
    deliverables: ["Wordmark", "7 carton variants", "Dieline & pre-press"],
  },
  {
    slug: "branding",
    name: "Logo collection",
    client: "Various clients",
    category: "Branding",
    discipline: "Graphic Design · Branding",
    summary:
      "Selected identity work in Latin and Arabic scripts: Arcanecos, Crystal Pool, Dolcie, Dromea, Alpivex and Matiou Mushroom, alongside custom Arabic calligraphic marks.",
    deliverables: ["Logotypes", "Arabic calligraphic marks", "Bilingual lock-ups"],
  },
  {
    slug: "bio-ness",
    name: "Bio-ness",
    client: "Bioness Cosmetics",
    category: "Proposition",
    discipline: "Packaging Design · Proposition",
    summary:
      "A packaging proposal for two 45 g deodorant creams: Coco des Îles, with coconut photography and earthy browns, and Hawaii 'The Tropical Paradise', with a flat illustrated beach scene.",
    deliverables: ["2 carton concepts", "Illustration"],
  },
  {
    slug: "other",
    name: "Other projects",
    client: "Various clients",
    category: "Label Design",
    discipline: "Label Design · Structural Packaging",
    summary:
      "More label and carton work: a shampoo range (hyaluronic acid, collagen, anti-hair-loss, nourishing), Dermo, Lumina+ and Capilux cartons, and a series of body-mist labels.",
    deliverables: ["Labels", "Cartons"],
    noLogo: true,
  },
];
