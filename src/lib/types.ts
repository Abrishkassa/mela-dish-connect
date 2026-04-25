export interface MultiLang {
  en: string;
  am: string;
  sid: string;
}

export interface MenuItem {
  id: string;
  name: MultiLang;
  description: MultiLang | Record<string, string>;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_drink: boolean;
  recommended_item_id: string | null;
  sort_order: number;
}

export const CATEGORY_KEYS = ["starters", "mains", "drinks", "desserts"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function categoryLabelKey(c: string): string {
  switch (c) {
    case "starters": return "cat_starters";
    case "mains": return "cat_mains";
    case "drinks": return "cat_drinks";
    case "desserts": return "cat_desserts";
    default: return "menu";
  }
}
