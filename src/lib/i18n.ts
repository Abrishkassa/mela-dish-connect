export type Lang = "en" | "am" | "sid";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "sid", label: "Sidaamu Afoo", native: "Sidaamu Afoo" },
];

type Dict = Record<string, { en: string; am: string; sid: string }>;

const dict: Dict = {
  brand_tagline: {
    en: "Hawassa's finest, at your table",
    am: "የሐዋሳ ምርጥ ጣዕም በጠረጴዛዎ ላይ",
    sid: "Hawaasi danchu, qarsho gobbaxaho",
  },
  scan_to_order: {
    en: "Scan. Sip. Savor.",
    am: "ይቃኙ። ይጠጡ። ይቅመሱ።",
    sid: "Skani. Aguri. Bunichi.",
  },
  hero_sub: {
    en: "A digital menu crafted for the resorts of Lake Hawassa — order from your table in three languages.",
    am: "ለሐዋሳ ሐይቅ ሪዞርቶች የተዘጋጀ ዲጂታል ሜኑ — በሦስት ቋንቋዎች ከጠረጴዛዎ ይዘዙ።",
    sid: "Hawaasi haaro resoortete digitaale meenu — sasu afii ledo qarsho gobbaxaho ajaji.",
  },
  view_demo: { en: "View Demo Menu", am: "ሜኑ ይመልከቱ", sid: "Meenu Lai" },
  staff_login: { en: "Staff Login", am: "የሰራተኛ መግቢያ", sid: "Soqansancho Eo" },

  menu: { en: "Menu", am: "ሜኑ", sid: "Meenu" },
  table: { en: "Table", am: "ጠረጴዛ", sid: "Gobbaxaho" },
  cart: { en: "Cart", am: "ጋሪ", sid: "Cart" },
  add_to_cart: { en: "Add to Order", am: "ወደ ትዕዛዝ ጨምር", sid: "Ajajira Ledi" },
  send_order: { en: "Send Order", am: "ትዕዛዝ ላክ", sid: "Ajaja Soyi" },
  total: { en: "Total", am: "ጠቅላላ", sid: "Cuumu" },
  empty_cart: { en: "Your order is empty", am: "ትዕዛዝዎ ባዶ ነው", sid: "Ajajiki maaccino" },
  call_waiter: { en: "Call Waiter", am: "አስተናጋጅ ጥራ", sid: "Soqansancho Wai" },
  request_bill: { en: "Request Bill", am: "ሂሳብ ጠይቅ", sid: "Hisaabo Qoli" },
  out_of_stock: { en: "Out of Stock", am: "የለም", sid: "Diino" },

  chefs_pairing: { en: "Chef's Recommended Pairing", am: "የሼፍ የተመከረ ጥንድ", sid: "Sheef Maganshi" },
  pairing_intro: {
    en: "Our chef pairs this dish beautifully with:",
    am: "ሼፋችን ይህን ምግብ በሚገባ ያጣምራል ከ:",
    sid: "Sheefu kuni qarshora dancho assino:",
  },
  add_pairing: { en: "Add Pairing", am: "ጥንዱን ጨምር", sid: "Ledi" },
  no_thanks: { en: "No, thanks", am: "አያስፈልገኝም", sid: "Diʼee galateemma" },

  order_sent: { en: "Order sent to the kitchen", am: "ትዕዛዝ ወደ ኩሽና ተልኳል", sid: "Ajaji muddinora soyime" },
  waiter_called: { en: "A waiter is on the way", am: "አስተናጋጅ ወደ እርስዎ እየመጣ ነው", sid: "Soqansanchu daannohe" },
  bill_requested: { en: "Bill request sent", am: "የሂሳብ ጥያቄ ተልኳል", sid: "Hisaabu qoli soyime" },

  // categories
  cat_starters: { en: "Starters", am: "የመጀመሪያዎች", sid: "Hannaffinya" },
  cat_mains: { en: "Mains", am: "ዋና ምግቦች", sid: "Cuumu Sagale" },
  cat_drinks: { en: "Drinks", am: "መጠጦች", sid: "Aguro" },
  cat_desserts: { en: "Desserts", am: "ጣፋጭ", sid: "Cocoo" },

  // staff
  email: { en: "Email", am: "ኢሜይል", sid: "Iimeyli" },
  password: { en: "Password", am: "የይለፍ ቃል", sid: "Pasworde" },
  full_name: { en: "Full name", am: "ሙሉ ስም", sid: "Cuumu Suʼma" },
  invite_code: { en: "Invite Code", am: "የግብዣ ኮድ", sid: "Khoode" },
  role: { en: "Role", am: "ሚና", sid: "Roole" },
  sign_in: { en: "Sign In", am: "ግባ", sid: "Eo" },
  sign_up: { en: "Sign Up", am: "ተመዝግብ", sid: "Galmamie" },
  kitchen: { en: "Kitchen", am: "ኩሽና", sid: "Muddino" },
  admin: { en: "Admin", am: "አስተዳዳሪ", sid: "Bushshu" },
  pending: { en: "Pending", am: "በመጠበቅ ላይ", sid: "Agarinanni" },
  cooking: { en: "Cooking", am: "በማብሰል ላይ", sid: "Bushshanni" },
  served: { en: "Served", am: "ተደርጓል", sid: "Soyime" },
  mark_cooking: { en: "Start Cooking", am: "ማብሰል ጀምር", sid: "Bushshanno Hanaffi" },
  mark_served: { en: "Mark Served", am: "ተደርጓል አድርግ", sid: "Soyime Assi" },
  log_out: { en: "Log Out", am: "ውጣ", sid: "Fuli" },
  available: { en: "Available", am: "ይገኛል", sid: "Heeʼrino" },

  // owner admin
  add_item: { en: "Add Item", am: "እቃ ጨምር", sid: "Ledi" },
  edit_item: { en: "Edit Item", am: "እቃ አርትዕ", sid: "Soroori" },
  name_en: { en: "Name (English)", am: "ስም (እንግሊዝኛ)", sid: "Suʼma (Inglizu)" },
  name_am: { en: "Name (Amharic)", am: "ስም (አማርኛ)", sid: "Suʼma (Amaaru)" },
  name_sid: { en: "Name (Sidaamu Afoo)", am: "ስም (ሲዳሙ አፎ)", sid: "Suʼma (Sidaamu)" },
  price: { en: "Price (ETB)", am: "ዋጋ (ብር)", sid: "Gatto (Birri)" },
  category: { en: "Category", am: "ምድብ", sid: "Gosa" },
  recommended: { en: "Recommended Pairing", am: "የተመከረ ጥንድ", sid: "Maganshi" },
  none: { en: "None", am: "የለም", sid: "Diino" },
  save: { en: "Save", am: "አስቀምጥ", sid: "Suuqi" },
  cancel: { en: "Cancel", am: "ሰርዝ", sid: "Agure" },
  delete: { en: "Delete", am: "ሰርዝ", sid: "Hunqi" },
  image_url: { en: "Image URL", am: "የምስል URL", sid: "Misile URL" },
  no_orders: { en: "No active orders", am: "ምንም ትዕዛዞች የሉም", sid: "Ajaja diino" },

  // tracking
  order_status: { en: "Order Status", am: "የትዕዛዝ ሁኔታ", sid: "Ajaji Akata" },
  your_order: { en: "Your Order", am: "የእርስዎ ትዕዛዝ", sid: "Kiyye Ajaja" },
  add_more_items: { en: "Add more items", am: "ተጨማሪ እቃዎች ጨምር", sid: "Wole sagale ledi" },
  add_more_prompt: {
    en: "Would you like to add more items to your order?",
    am: "ወደ ትዕዛዝዎ ተጨማሪ እቃዎች መጨመር ይፈልጋሉ?",
    sid: "Ajajikkira wole sagale ledara hasiratto?",
  },
  yes_add_more: { en: "Yes, add more", am: "አዎ፣ ጨምር", sid: "Ee, ledi" },
  back_to_tracking: { en: "Back to my order", am: "ወደ ትዕዛዜ ተመለስ", sid: "Ajajira higi" },
  status_pending: { en: "Received — awaiting kitchen", am: "ተቀብሏል — ኩሽና በመጠበቅ", sid: "Adhoonni — muddinora agaranni" },
  status_cooking: { en: "Your meal is being prepared", am: "ምግብዎ እየተዘጋጀ ነው", sid: "Sagaleki bushshanni no" },
  status_served: { en: "Enjoy your meal!", am: "ምግብዎን ይደሰቱ!", sid: "Sagale baxxe!" },
  placed_at: { en: "Placed at", am: "የተደረገው", sid: "Aji" },
  active_order_exists: {
    en: "You have an active order at this table",
    am: "በዚህ ጠረጴዛ ላይ የነቃ ትዕዛዝ አለዎት",
    sid: "Kuni gobbaxa aana giddidi ajaja noohe",
  },
  view_order: { en: "View Order", am: "ትዕዛዝ ይመልከቱ", sid: "Ajaja lai" },
  overdue: { en: "Overdue", am: "ዘግይቷል", sid: "Goofi" },
};

export function t(key: keyof typeof dict, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.en ?? String(key);
}

export function pickLang<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  lang: Lang,
  fallback = "",
): string {
  if (!obj) return fallback;
  const o = obj as Record<string, string>;
  return (o[lang] || o.en || o.am || o.sid || fallback) as string;
}
