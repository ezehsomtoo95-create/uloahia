import type { LocaleCode } from "@/lib/i18n/locale";

export type MessageKey =
  | "nav.home"
  | "nav.browse"
  | "nav.sell"
  | "nav.messages"
  | "nav.saved"
  | "nav.profile"
  | "nav.notifications"
  | "nav.search"
  | "nav.location"
  | "nav.language"
  | "nav.themeLight"
  | "nav.themeDark"
  | "home.shopByCategory"
  | "home.shopByCategorySub"
  | "home.featured"
  | "home.featuredSub"
  | "home.explore"
  | "home.exploreSub"
  | "home.seeAll"
  | "home.browse"
  | "home.seeMore"
  | "home.everything"
  | "search.placeholder"
  | "search.recent"
  | "search.popular"
  | "search.trending"
  | "search.categories"
  | "search.clear"
  | "card.verified"
  | "card.seller"
  | "browse.results"
  | "browse.filters";

type Dictionary = Record<MessageKey, string>;

const en: Dictionary = {
  "nav.home": "Home",
  "nav.browse": "Browse",
  "nav.sell": "Sell",
  "nav.messages": "Messages",
  "nav.saved": "Saved",
  "nav.profile": "Profile",
  "nav.notifications": "Notifications",
  "nav.search": "Search",
  "nav.location": "Location",
  "nav.language": "Language",
  "nav.themeLight": "Light mode",
  "nav.themeDark": "Dark mode",
  "home.shopByCategory": "Shop by category",
  "home.shopByCategorySub": "Find what you need fast",
  "home.featured": "Featured Spotlights",
  "home.featuredSub": "Premium placements near you",
  "home.explore": "Explore Marketplace Items",
  "home.exploreSub": "Fresh finds from sellers near you",
  "home.seeAll": "See all",
  "home.browse": "Browse",
  "home.seeMore": "See more",
  "home.everything": "Everything",
  "search.placeholder": "Search phones, cars, houses, jobs…",
  "search.recent": "Recent searches",
  "search.popular": "Popular searches",
  "search.trending": "Trending searches",
  "search.categories": "Categories",
  "search.clear": "Clear",
  "card.verified": "Verified",
  "card.seller": "Seller",
  "browse.results": "results",
  "browse.filters": "Filters",
};

const ig: Dictionary = {
  "nav.home": "Ụlọ",
  "nav.browse": "Chọọ",
  "nav.sell": "Ree",
  "nav.messages": "Ozi",
  "nav.saved": "Echedoro",
  "nav.profile": "Profaịlụ",
  "nav.notifications": "Ọkwa",
  "nav.search": "Chọọ",
  "nav.location": "Ebe",
  "nav.language": "Asụsụ",
  "nav.themeLight": "Ìhè",
  "nav.themeDark": "Ọchịchịrị",
  "home.shopByCategory": "Zụta site na udi",
  "home.shopByCategorySub": "Chọta ihe ị chọrọ ngwa ngwa",
  "home.featured": "Ihe pụrụ iche",
  "home.featuredSub": "Ebe dị elu n'ahịa",
  "home.explore": "Chọgharịa ihe ndị dị n'ahịa",
  "home.exploreSub": "Ihe ọhụrụ sitere n'aka ndị na-ere",
  "home.seeAll": "Lee ha niile",
  "home.browse": "Chọọ",
  "home.seeMore": "Lee ọzọ",
  "home.everything": "Ihe niile",
  "search.placeholder": "Chọọ ekwentị, ụgbọala, ụlọ, ọrụ…",
  "search.recent": "Ọchụchọ nso nso a",
  "search.popular": "Ọchụchọ a ma ama",
  "search.trending": "Ọchụchọ na-ewu ewu",
  "search.categories": "Udi",
  "search.clear": "Hichapụ",
  "card.verified": "Ekwenyere",
  "card.seller": "Onye na-ere",
  "browse.results": "nsonaazụ",
  "browse.filters": "Nzacha",
};

const dictionaries: Record<LocaleCode, Dictionary> = { en, ig };

export function translate(locale: LocaleCode, key: MessageKey): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}

export function getDictionary(locale: LocaleCode): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
