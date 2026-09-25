/**
 * Imaginary brands for the animated sticker reels: category presets, a seeded
 * random-brand generator, and Instagram captions.
 */

export type Product = "box" | "jar" | "cup" | "pouch" | "bottle" | "bag";
export type Shape = "circle" | "oval" | "roundrect" | "arch";

export interface Palette {
  bg: string; // sticker background
  ink: string; // text + outlines
  accent: string; // icon fill
  light: string; // icon highlights
  backdrop: string; // scene background behind the product
}

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  category: string;
  product: Product;
  productColor?: string;
  capColor?: string;
  contents?: "pickle" | "honey" | "cream" | "wax";
  shape: Shape;
  layout?: "classic" | "badge";
  icon: string;
  font: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  upper?: boolean;
  ls?: number;
  subFont?: string;
  palette: Palette;
  audience?: string;
  noun?: string;
  productNoun?: string;
  hook?: [string, string];
  reveal?: [string, string];
  /** false = a real customer: the reel says "Made for <name>" instead of "Concept". */
  concept?: boolean;
}

interface FontPick {
  font: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  upper?: boolean;
  ls?: number;
  badge?: boolean; // looks good curved around a circle badge
}

export const PALETTES: Record<string, Palette> = {
  blush: { bg: "#fbd9df", ink: "#5b2c35", accent: "#e2708b", light: "#fff7f1", backdrop: "#f5d9de" },
  chai: { bg: "#f4e3cc", ink: "#4a2618", accent: "#c8553d", light: "#fff8ec", backdrop: "#efd8bd" },
  chili: { bg: "#fff1d6", ink: "#7a1f1a", accent: "#e0492f", light: "#fffaf0", backdrop: "#f6dcae" },
  sage: { bg: "#dfe8dc", ink: "#2f3a33", accent: "#7f9c7a", light: "#fbfaf4", backdrop: "#dfe8db" },
  forest: { bg: "#1f4a3a", ink: "#f3e6c4", accent: "#d4a94c", light: "#f7eed6", backdrop: "#d7e4d5" },
  navy: { bg: "#1d2d50", ink: "#fbe9d7", accent: "#ff7f66", light: "#fff4ea", backdrop: "#d9e1ef" },
  lemon: { bg: "#ffd84d", ink: "#1c1c1c", accent: "#e63946", light: "#fff9e0", backdrop: "#fbeaa6" },
  lavender: { bg: "#e6dcf5", ink: "#3b2a5a", accent: "#9b7bd4", light: "#fbf8ff", backdrop: "#e4dcf2" },
  noir: { bg: "#161616", ink: "#e9d8a6", accent: "#caa45d", light: "#f6eedc", backdrop: "#e6e0d4" },
  mint: { bg: "#cfeee3", ink: "#3b2a22", accent: "#2f9e7e", light: "#f7fffb", backdrop: "#d3ece2" },
  saffron: { bg: "#f7c873", ink: "#4a2545", accent: "#c2410c", light: "#fff6e5", backdrop: "#f7deb0" },
  sky: { bg: "#d6ecff", ink: "#12325a", accent: "#2f80ed", light: "#f7fbff", backdrop: "#d8e8f7" },
};

const FONTS: Record<string, FontPick> = {
  pacifico: { font: "Pacifico" },
  lobster: { font: "Lobster" },
  abril: { font: "Abril Fatface" },
  yeseva: { font: "Yeseva One" },
  playfair: { font: "Playfair Display", fontWeight: 700, fontStyle: "italic" },
  dmserif: { font: "DM Serif Display" },
  cinzel: { font: "Cinzel", fontWeight: 700, upper: true, ls: 2, badge: true },
  righteous: { font: "Righteous", upper: true, ls: 2, badge: true },
  bebas: { font: "Bebas Neue", upper: true, ls: 3, badge: true },
  fredoka: { font: "Fredoka", fontWeight: 600 },
  baloo: { font: "Baloo 2", fontWeight: 800 },
  caveat: { font: "Caveat", fontWeight: 700 },
};

interface Category {
  audience: string;
  noun: string;
  products: { product: Product; productColor?: string[]; capColor?: string[]; contents?: Brand["contents"] }[];
  icons: string[];
  shapes: Shape[];
  palettes: string[];
  fonts: string[];
  first: string[];
  second: string[];
  taglines: string[];
  hooks: [string, string][];
  reveals: [string, string][];
  hashtags: string[];
}

export const CATEGORIES: Record<string, Category> = {
  bakery: {
    audience: "home bakers", noun: "home bakery",
    products: [{ product: "box", productColor: ["#f7f4ee", "#c9a36d"] }],
    icons: ["cupcake"], shapes: ["circle", "arch"], palettes: ["blush", "mint", "lavender", "chai"],
    fonts: ["pacifico", "lobster", "fredoka", "playfair"],
    first: ["Moonflour", "Sugarleaf", "Crumbwell", "Butterkin", "Honeyloaf", "Little Oven", "Cocoa Nest"],
    second: ["Bakes", "Bakehouse", "Patisserie", "Cakery"],
    taglines: ["Home baked · Small batch", "Baked fresh daily", "Cakes · Cookies · Love"],
    hooks: [["Plain cake box?", "Let's brand it."], ["Home bakers,", "your box needs this."]],
    reveals: [["Same box.", "New brand."], ["Same cake.", "Better unboxing."]],
    hashtags: ["#homebakersofindia", "#cakebox"],
  },
  cafe: {
    audience: "cafés & chai stalls", noun: "chai café",
    products: [{ product: "cup", productColor: ["#f6f4ef", "#c8a06a"], capColor: ["#2b2320", "#3b2418", "#f2f0ea"] }],
    icons: ["kulhad", "coffee"], shapes: ["circle"], palettes: ["chai", "noir", "forest", "saffron"],
    fonts: ["righteous", "bebas", "abril", "dmserif"],
    first: ["Kulhad", "Brew", "Steam", "Adda", "Cutting", "Monsoon"],
    second: ["Kahani", "Corner", "House", "Co.", "Club"],
    taglines: ["Chai · Coffee · Stories", "Brewed fresh", "Sip slow"],
    hooks: [["Selling chai & coffee?", "Brand every cup."], ["Plain cups?", "Make them yours."]],
    reveals: [["Same cup.", "Now it's a brand."], ["Every cup.", "Your logo."]],
    hashtags: ["#cafeowner", "#chailovers"],
  },
  pickles: {
    audience: "home chefs", noun: "pickle brand",
    products: [{ product: "jar", contents: "pickle", capColor: ["#d9a21b", "#b3261e", "#2f5d3a"] }],
    icons: ["chili"], shapes: ["roundrect", "oval", "circle"], palettes: ["chili", "saffron", "lemon"],
    fonts: ["yeseva", "abril", "baloo", "dmserif"],
    first: ["Aita's", "Nani's", "Pahari", "Masala", "Jolokia"],
    second: ["Pickles", "Achaar", "Kitchen", "Jar Co."],
    taglines: ["Homemade achaar", "Small batch · Sun cured", "Grandma's recipe"],
    hooks: [["Selling achaar on Insta?", "Give your jar a face."], ["Homemade pickles?", "Label them right."]],
    reveals: [["Same jar.", "Looks premium now."], ["Same recipe.", "New look."]],
    hashtags: ["#homemadepickles", "#homechef"],
  },
  candles: {
    audience: "candle makers", noun: "candle studio",
    products: [{ product: "jar", contents: "wax", productColor: ["#f3ece0", "#f4e1e1", "#e9efe4"] }],
    icons: ["candle"], shapes: ["arch", "circle"], palettes: ["sage", "lavender", "noir", "blush"],
    fonts: ["playfair", "dmserif", "cinzel", "caveat"],
    first: ["Mellow Wick", "Slow Flame", "Hush", "Ember", "Soft Glow"],
    second: ["Co.", "Studio", "Candles"],
    taglines: ["Hand-poured soy", "Small batch candles", "Light something good"],
    hooks: [["Plain candle jar?", "Make it giftable."], ["Candle makers,", "labels sell candles."]],
    reveals: [["Same candle.", "Gift-ready."], ["Same jar.", "New brand."]],
    hashtags: ["#candlemaker", "#soycandles"],
  },
  tea: {
    audience: "tea sellers", noun: "tea brand",
    products: [{ product: "pouch", productColor: ["#c49a64", "#1f3d33", "#f4efe6"] }],
    icons: ["tealeaves"], shapes: ["oval", "roundrect", "circle"], palettes: ["forest", "noir", "chai", "sage"],
    fonts: ["cinzel", "dmserif", "playfair", "abril"],
    first: ["Kopili", "Brahma", "Dikhow", "Misty Hill", "Garden Leaf"],
    second: ["Tea Co.", "Teas", "Estate"],
    taglines: ["Single estate Assam", "Two leaves & a bud", "Orthodox · Hand plucked"],
    hooks: [["Selling Assam tea?", "Pack it like a brand."], ["Plain tea pouch?", "Let's fix that."]],
    reveals: [["Same pouch.", "Premium look."], ["Same tea.", "New brand."]],
    hashtags: ["#assamtea", "#teabrand"],
  },
  skincare: {
    audience: "skincare brands", noun: "skincare label",
    products: [{ product: "bottle", productColor: ["#9a5a1c", "#2d4a3e", "#6d6875"], capColor: ["#c9a24a", "#1d1d1f", "#e8e2d6"] }],
    icons: ["drop"], shapes: ["arch", "roundrect"], palettes: ["sage", "blush", "noir", "sky"],
    fonts: ["playfair", "cinzel", "dmserif"],
    first: ["Haldi", "Kesar", "Dew", "Botanica", "Glow"],
    second: ["Botanics", "Skin", "Labs", "Naturals"],
    taglines: ["Handmade skincare", "Clean · Small batch", "Serum · Oil · Care"],
    hooks: [["Handmade skincare?", "Label it like a pro."], ["Plain bottles?", "Look premium."]],
    reveals: [["Same serum.", "Premium label."], ["Same bottle.", "New brand."]],
    hashtags: ["#handmadeskincare", "#skincarebrand"],
  },
  cloudkitchen: {
    audience: "cloud kitchens", noun: "cloud kitchen",
    products: [{ product: "bag", productColor: ["#c9a06a", "#f4efe6"] }, { product: "box", productColor: ["#c9a36d", "#f7f4ee"] }],
    icons: ["dumpling", "bowl"], shapes: ["circle"], palettes: ["lemon", "chili", "navy", "saffron"],
    fonts: ["bebas", "righteous", "baloo", "fredoka"],
    first: ["Momo", "Steam", "Wok", "Tiffin", "Dumpling"],
    second: ["Mausi", "Street", "Box", "Express", "Bros"],
    taglines: ["Fresh & hot to your door", "Momos · Noodles · More", "Order online"],
    hooks: [["Cloud kitchen?", "Seal every order."], ["Plain delivery bags?", "Brand them."]],
    reveals: [["Every order.", "Your brand."], ["Same bag.", "Remembered brand."]],
    hashtags: ["#cloudkitchen", "#foodbusiness"],
  },
  boutique: {
    audience: "boutiques", noun: "boutique",
    products: [{ product: "bag", productColor: ["#f4efe6", "#161616", "#e8d7c8"], capColor: ["#caa45d", "#1d1d1f"] }],
    icons: ["hanger"], shapes: ["circle", "arch"], palettes: ["noir", "blush", "lavender", "navy"],
    fonts: ["playfair", "cinzel", "dmserif", "caveat"],
    first: ["Silk Lane", "Mekhela", "Threadline", "Ivory", "Loom"],
    second: ["Studio", "Boutique", "House", "Label"],
    taglines: ["Handpicked fashion", "Ethnic · Handloom", "Made to be worn"],
    hooks: [["Running a boutique?", "Brand your bags."], ["Plain shopping bags?", "Upgrade them."]],
    reveals: [["Same bag.", "Boutique feel."], ["Every bag.", "Your label."]],
    hashtags: ["#boutiqueowner", "#smallfashionbrand"],
  },
  honey: {
    audience: "honey sellers", noun: "honey brand",
    products: [{ product: "jar", contents: "honey", capColor: ["#1d1d1f", "#caa45d", "#f2f0ea"] }],
    icons: ["honey"], shapes: ["circle", "oval"], palettes: ["noir", "lemon", "forest", "saffron"],
    fonts: ["dmserif", "abril", "cinzel", "yeseva"],
    first: ["Golden Hive", "Wild Bloom", "Hill Bloom", "Forest", "Bee Kind"],
    second: ["Honey", "Honey Co.", "Apiary"],
    taglines: ["Raw · Unprocessed", "Wild forest honey", "Straight from the hive"],
    hooks: [["Selling raw honey?", "Make the jar shine."], ["Plain honey jar?", "Let's brand it."]],
    reveals: [["Same honey.", "Premium jar."], ["Same jar.", "New brand."]],
    hashtags: ["#rawhoney", "#honeybrand"],
  },
};

const NOUNS: Record<Product, string> = { box: "box", jar: "jar", cup: "cup", pouch: "pouch", bottle: "bottle", bag: "bag" };

export function productNoun(b: Pick<Brand, "product" | "contents">): string {
  return b.product === "jar" && b.contents === "wax" ? "candle" : NOUNS[b.product];
}

/** Fill category defaults (hook lines, audience, nouns) into a brand. */
export function complete(b: Brand): Brand {
  const cat = CATEGORIES[b.category];
  const noun = productNoun(b);
  return {
    subFont: "Montserrat",
    ...b,
    audience: b.audience ?? cat?.audience ?? "small brands",
    noun: b.noun ?? cat?.noun ?? "brand",
    productNoun: b.productNoun ?? noun,
    hook: b.hook ?? cat?.hooks[0] ?? [`Plain ${noun}?`, "Let's brand it."],
    reveal: b.reveal ?? cat?.reveals[0] ?? [`Same ${noun}.`, "New brand."],
  };
}

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Invent a brand. Same seed → same brand, so a good one can be re-rendered. */
export function randomBrand(seed: number, category?: string): Brand {
  const r = prng(seed);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  const keys = Object.keys(CATEGORIES);
  const catKey = category && CATEGORIES[category] ? category : pick(keys);
  const cat = CATEGORIES[catKey];
  const prod = pick(cat.products);
  const shape = pick(cat.shapes);
  const fontKey = pick(cat.fonts);
  const f = FONTS[fontKey];
  const first = pick(cat.first);
  const second = pick(cat.second);
  const name = `${first} ${second}`;
  const b: Brand = {
    id: `${slug(name)}-${seed}`,
    name,
    tagline: pick(cat.taglines),
    category: catKey,
    product: prod.product,
    productColor: prod.productColor ? pick(prod.productColor) : undefined,
    capColor: prod.capColor ? pick(prod.capColor) : undefined,
    contents: prod.contents,
    shape,
    layout: shape === "circle" && f.badge ? "badge" : "classic",
    icon: pick(cat.icons),
    font: f.font,
    fontWeight: f.fontWeight,
    fontStyle: f.fontStyle,
    upper: f.upper,
    ls: f.ls,
    subFont: pick(["Montserrat", "Poppins"]),
    palette: PALETTES[pick(cat.palettes)],
    hook: pick(cat.hooks),
    reveal: pick(cat.reveals),
  };
  return complete(b);
}

export function captionFor(b: Brand): string {
  const cat = CATEGORIES[b.category];
  const noun = productNoun(b);
  const hook = b.hook ?? cat?.hooks[0] ?? [`Plain ${noun}?`, "Let's brand it."];
  const tags = ["#customstickers", "#productlabels", ...(cat?.hashtags ?? ["#brandpackaging"]), "#smallbusinessindia"];
  return [
    `${hook[0]} ${hook[1]} ✨`,
    "",
    b.concept === false
      ? `Stickers we made for ${b.name}: designed, printed, cut and stuck on the ${noun}. 🎨✂️`
      : `We imagined a ${b.noun ?? cat?.noun ?? "brand"} called "${b.name}" and made its stickers: designed, printed, cut and stuck on the ${noun}. 🎨✂️`,
    "",
    b.concept === false ? "Your brand could be next 👀" : "Now imagine YOUR logo here 👀",
    "",
    "✅ Custom business stickers & product labels",
    "✅ Round, oval, arch or any custom shape",
    "✅ Designed, printed & cut in-house",
    "",
    `📩 DM us "STICKER" to get yours.`,
    "",
    tags.join(" "),
  ].join("\n");
}
