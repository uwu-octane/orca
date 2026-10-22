import { useLocale } from "@/plugins/client/context";
import type { GoogleKeywordIdeasInput } from "@/types/schemas/google-keywords";
import type {
  GoogleKeywordLocation,
  GoogleKeywordLanguage,
} from "@/types/schemas/google-keyword-targeting";

export function GoogleKeywordHistoryLabel({
  input,
  options,
  failed,
}: {
  input: GoogleKeywordIdeasInput;
  options:
    | { locations: GoogleKeywordLocation[]; languages: GoogleKeywordLanguage[] }
    | undefined;
  failed: boolean;
}) {
  const { t } = useLocale();
  if (!options)
    return failed
      ? t("Unable to load locations and languages.")
      : t("Loading locations…");
  const locations = input.geoTargetIds.map((id) => {
    const location = options.locations.find((option) => option.id === id);
    if (!location) return t("Location unavailable");
    return location.targetType === "Country"
      ? t(location.name)
      : location.canonicalName;
  });
  const language = options.languages.find(
    (option) => option.id === input.languageId,
  );
  return `${locations.join(", ")} · ${language ? t(language.name) : t("Language unavailable")}`;
}
