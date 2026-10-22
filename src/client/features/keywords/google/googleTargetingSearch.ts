import fuzzysort from "fuzzysort";
import type {
  GoogleKeywordLanguage,
  GoogleKeywordLocation,
} from "@/types/schemas/google-keyword-targeting";

const languageAliases: Record<string, string[]> = {
  en: ["英语", "英文"],
  zh_CN: ["中文", "简体中文", "简体汉语", "简体"],
  zh_TW: ["中文", "繁体中文", "繁體中文", "繁体", "繁體"],
  ja: ["日语", "日文", "日本语"],
  ko: ["韩语", "韩文", "韩国语"],
  de: ["德语", "德文"],
  fr: ["法语", "法文"],
  es: ["西班牙语", "西班牙文", "西语", "西文"],
  pt: ["葡萄牙语", "葡萄牙文", "葡语"],
  ru: ["俄语", "俄文"],
  ar: ["阿拉伯语", "阿拉伯文"],
};

const countryAliases: Record<string, string[]> = {
  US: ["USA", "U.S.", "U.S.A.", "美国", "美國", "美利坚"],
  GB: ["UK", "U.K.", "Britain", "英国", "英國"],
  CN: ["中国", "中國", "中国大陆", "大陆"],
  HK: ["香港"],
  TW: ["台湾", "台灣"],
  KR: ["Korea", "韩国", "韓國", "南韩"],
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function rankTargets<T extends { id: string }>(
  items: T[],
  query: string,
  labels: (item: T) => string[],
): T[] {
  if (!query.trim()) return items;
  // Score each alias separately so exact names/codes outrank long partial
  // matches. Return the original API objects, never substitute target IDs.
  const targets = items.flatMap((item) =>
    labels(item).map((label) => ({ item, label: normalize(label) })),
  );
  const matches = fuzzysort.go(normalize(query), targets, {
    key: "label",
    threshold: 0.35,
  });
  const seen = new Set<string>();
  return matches.flatMap(({ obj: { item } }) => {
    if (seen.has(item.id)) return [];
    seen.add(item.id);
    return [item];
  });
}

export function searchGoogleLanguages(
  items: GoogleKeywordLanguage[],
  query: string,
  translate: (name: string) => string,
) {
  return rankTargets(
    items.filter((item) => item.targetable),
    query,
    (item) => [
      translate(item.name),
      item.name,
      item.code,
      item.id,
      ...(languageAliases[item.code] ?? []),
    ],
  );
}

export function searchGoogleLocations(
  items: GoogleKeywordLocation[],
  query: string,
  translate: (name: string) => string,
) {
  return rankTargets(
    items.filter((item) => item.status === "ENABLED"),
    query,
    (item) => [
      translate(item.name),
      item.name,
      item.canonicalName,
      item.id,
      ...(item.targetType === "Country"
        ? [item.countryCode, ...(countryAliases[item.countryCode] ?? [])]
        : []),
    ],
  );
}
