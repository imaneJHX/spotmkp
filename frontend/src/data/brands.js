// Local overrides:
// - Put optional logo files in frontend/public/brands/ using the brand `id`
//   (example: public/brands/olaplex.svg or public/brands/olaplex.png).
// - Brandfetch support is prepared via `domain` + `logoSource: 'brandfetch'`.
//   Brandfetch's public Logo API is intended for hotlinking, so local caching
//   should only be used with logos you are allowed to store locally.
const brands = [
  {
    id: "armani-beauty",
    name: "Armani Beauty",
    domain: "armanibeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "armani beauty",
      "armani",
      "giorgio armani beauty"
    ]
  },
  {
    id: "anastasia-beverly-hills",
    name: "Anastasia Beverly Hills",
    domain: "anastasiabeverlyhills.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "anastasia beverly hills",
      "anastasia"
    ]
  },
  {
    id: "benefit-cosmetics",
    name: "Benefit Cosmetics",
    domain: "benefitcosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "benefit cosmetics",
      "benefit"
    ]
  },
  {
    id: "chanel",
    name: "Chanel",
    domain: "chanel.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "chanel"
    ]
  },
  {
    id: "charlotte-tilbury",
    name: "Charlotte Tilbury",
    domain: "charlottetilbury.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "charlotte tilbury"
    ]
  },
  {
    id: "dior",
    name: "Dior",
    domain: "dior.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "dior"
    ]
  },
  {
    id: "elf-cosmetics",
    name: "e.l.f. Cosmetics",
    domain: "elfcosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "e.l.f. cosmetics",
      "e.l.f.",
      "elf cosmetics"
    ]
  },
  {
    id: "clinique",
    name: "Clinique",
    domain: "clinique.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "clinique"
    ]
  },
  {
    id: "essence",
    name: "Essence",
    domain: "essence.eu",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: false,
    aliases: [
      "essence"
    ]
  },
  {
    id: "fenty-beauty",
    name: "Fenty Beauty",
    domain: "fentybeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "fenty beauty",
      "fenty"
    ]
  },
  {
    id: "huda-beauty",
    name: "Huda Beauty",
    domain: "hudabeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "huda beauty"
    ]
  },
  {
    id: "lancome",
    name: "Lancome",
    domain: "lancome.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "lancome",
      "lancome paris"
    ]
  },
  {
    id: "loreal-paris",
    name: "L'Oreal Paris",
    domain: "lorealparisusa.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "l'oreal paris",
      "loreal paris",
      "loreal"
    ]
  },
  {
    id: "mac",
    name: "MAC",
    domain: "maccosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "mac",
      "mac cosmetics"
    ]
  },
  {
    id: "maybelline",
    name: "Maybelline",
    domain: "maybelline.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "maybelline"
    ]
  },
  {
    id: "nars",
    name: "NARS",
    domain: "narscosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "nars",
      "nars cosmetics",
      "narscosmetics"
    ]
  },
  {
    id: "nyx",
    name: "NYX",
    domain: "nyxcosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "nyx",
      "nyx professional makeup",
      "nyx cosmetics"
    ]
  },
  {
    id: "rare-beauty",
    name: "Rare Beauty",
    domain: "rarebeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "rare beauty"
    ]
  },
  {
    id: "tarte",
    name: "Tarte",
    domain: "tartecosmetics.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "tarte",
      "tarte cosmetics"
    ]
  },
  {
    id: "too-faced",
    name: "Too Faced",
    domain: "toofaced.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "too faced"
    ]
  },
  {
    id: "urban-decay",
    name: "Urban Decay",
    domain: "urbandecay.com",
    logo: null,
    logoSource: "brandfetch",
    category: "makeup",
    featured: true,
    aliases: [
      "urban decay"
    ]
  },
  {
    id: "acure",
    name: "Acure",
    domain: "acure.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: false,
    aliases: [
      "acure"
    ]
  },
  {
    id: "anua",
    name: "Anua",
    domain: "anua.kr",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "anua"
    ]
  },
  {
    id: "bioderma",
    name: "Bioderma",
    domain: "bioderma.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "bioderma"
    ]
  },
  {
    id: "cerave",
    name: "CeraVe",
    domain: "cerave.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "cerave",
      "cera ve"
    ]
  },
  {
    id: "drunk-elephant",
    name: "Drunk Elephant",
    domain: "drunkelephant.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "drunk elephant"
    ]
  },
  {
    id: "facelab",
    name: "FaceLab",
    domain: null,
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: false,
    aliases: [
      "facelab",
      "face lab"
    ]
  },
  {
    id: "garnier",
    name: "Garnier",
    domain: "garnier.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: false,
    aliases: [
      "garnier"
    ]
  },
  {
    id: "la-roche-posay",
    name: "La Roche-Posay",
    domain: "laroche-posay.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "la roche-posay",
      "la roche posay"
    ]
  },
  {
    id: "medicube",
    name: "Medicube",
    domain: "medicube.us",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "medicube"
    ]
  },
  {
    id: "paulas-choice",
    name: "Paula's Choice",
    domain: "paulaschoice.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "paula's choice",
      "paulas choice"
    ]
  },
  {
    id: "skin1004",
    name: "Skin1004",
    domain: "skin1004.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "skin1004",
      "skin 1004"
    ]
  },
  {
    id: "some-by-mi",
    name: "Some By Mi",
    domain: "somebymi.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "some by mi",
      "somebymi"
    ]
  },
  {
    id: "the-ordinary",
    name: "The Ordinary",
    domain: "theordinary.com",
    logo: null,
    logoSource: "brandfetch",
    category: "skincare",
    featured: true,
    aliases: [
      "the ordinary",
      "ordinary"
    ]
  },
  {
    id: "bjorn-axen",
    name: "Bjorn Axen",
    domain: "bjornaxen.com",
    logo: null,
    logoSource: "brandfetch",
    category: "haircare",
    featured: false,
    aliases: [
      "bjorn axen"
    ]
  },
  {
    id: "hairburst",
    name: "Hairburst",
    domain: "hairburst.com",
    logo: null,
    logoSource: "brandfetch",
    category: "haircare",
    featured: false,
    aliases: [
      "hairburst"
    ]
  },
  {
    id: "olaplex",
    name: "Olaplex",
    domain: "olaplex.com",
    logo: null,
    logoSource: "brandfetch",
    category: "haircare",
    featured: true,
    aliases: [
      "olaplex"
    ]
  },
  {
    id: "bath-body-works",
    name: "Bath & Body Works",
    domain: "bathandbodyworks.com",
    logo: null,
    logoSource: "brandfetch",
    category: "bodycare",
    featured: true,
    aliases: [
      "bath and body works",
      "bath & body works"
    ]
  },
  {
    id: "le-petit-olivier",
    name: "Le Petit Olivier",
    domain: "lepetitolivier.com",
    logo: null,
    logoSource: "brandfetch",
    category: "bodycare",
    featured: false,
    aliases: [
      "le petit olivier"
    ]
  },
  {
    id: "sol-de-janeiro",
    name: "Sol de Janeiro",
    domain: "soldejaneiro.com",
    logo: null,
    logoSource: "brandfetch",
    category: "bodycare",
    featured: true,
    aliases: [
      "sol de janeiro"
    ]
  },
  {
    id: "victorias-secret",
    name: "Victoria's Secret",
    domain: "victoriassecret.com",
    logo: null,
    logoSource: "brandfetch",
    category: "bodycare",
    featured: true,
    aliases: [
      "victoria's secret",
      "victorias secret"
    ]
  },
  {
    id: "burberry",
    name: "Burberry",
    domain: "burberry.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "burberry"
    ]
  },
  {
    id: "calvin-klein",
    name: "Calvin Klein",
    domain: "calvinklein.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "calvin klein",
      "ck"
    ]
  },
  {
    id: "carolina-herrera",
    name: "Carolina Herrera",
    domain: "carolinaherrera.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "carolina herrera"
    ]
  },
  {
    id: "chopard",
    name: "Chopard",
    domain: "chopard.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: false,
    aliases: [
      "chopard"
    ]
  },
  {
    id: "dolce-gabbana",
    name: "Dolce & Gabbana",
    domain: "dolcegabbana.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "dolce and gabbana",
      "dolce & gabbana",
      "dg"
    ]
  },
  {
    id: "elie-saab",
    name: "Elie Saab",
    domain: "eliesaab.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: false,
    aliases: [
      "elie saab"
    ]
  },
  {
    id: "givenchy",
    name: "Givenchy",
    domain: "givenchybeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "givenchy",
      "l'interdit",
      "linterdit"
    ]
  },
  {
    id: "gucci",
    name: "Gucci",
    domain: "gucci.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "gucci"
    ]
  },
  {
    id: "hugo-boss",
    name: "Hugo Boss",
    domain: "hugoboss.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "hugo boss",
      "boss"
    ]
  },
  {
    id: "jean-paul-gaultier",
    name: "Jean Paul Gaultier",
    domain: "jeanpaulgaultier.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "jean paul gaultier"
    ]
  },
  {
    id: "juliette-has-a-gun",
    name: "Juliette Has A Gun",
    domain: "juliettehasagun.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "juliette has a gun"
    ]
  },
  {
    id: "kayali",
    name: "Kayali",
    domain: null,
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "kayali"
    ]
  },
  {
    id: "lattafa",
    name: "Lattafa",
    domain: "lattafa.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "lattafa"
    ]
  },
  {
    id: "mancera",
    name: "Mancera",
    domain: "mancera.fr",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "mancera"
    ]
  },
  {
    id: "maison-margiela",
    name: "Maison Margiela",
    domain: "maisonmargiela.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "maison margiela"
    ]
  },
  {
    id: "marc-jacobs",
    name: "Marc Jacobs",
    domain: "marcjacobs.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "marc jacobs"
    ]
  },
  {
    id: "montale",
    name: "Montale",
    domain: "montaleparfums.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "montale"
    ]
  },
  {
    id: "mugler",
    name: "Mugler",
    domain: "mugler.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "mugler",
      "thierry mugler"
    ]
  },
  {
    id: "narciso-rodriguez",
    name: "Narciso Rodriguez",
    domain: "narcisorodriguez.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "narciso rodriguez"
    ]
  },
  {
    id: "paco-rabanne",
    name: "Paco Rabanne",
    domain: null,
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "paco rabanne",
      "rabanne"
    ]
  },
  {
    id: "prada",
    name: "Prada",
    domain: "prada.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "prada"
    ]
  },
  {
    id: "rochas",
    name: "Rochas",
    domain: "rochas.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: false,
    aliases: [
      "rochas"
    ]
  },
  {
    id: "tom-ford",
    name: "Tom Ford",
    domain: "tomford.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "tom ford"
    ]
  },
  {
    id: "valentino",
    name: "Valentino",
    domain: "valentino.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "valentino"
    ]
  },
  {
    id: "versace",
    name: "Versace",
    domain: "versace.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "versace"
    ]
  },
  {
    id: "yves-saint-laurent",
    name: "Yves Saint Laurent",
    domain: "yslbeauty.com",
    logo: null,
    logoSource: "brandfetch",
    category: "perfumes",
    featured: true,
    aliases: [
      "yves saint laurent",
      "saint laurent",
      "ysl",
      "ysl beauty"
    ]
  }
];

export default brands;
