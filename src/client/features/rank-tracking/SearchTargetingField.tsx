import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/plugins/client/context";
import { SerpLocationCombobox } from "@/client/components/SerpLocationCombobox";
import { prewarmSerpLocations } from "@/serverFunctions/serp-locations";

type TargetingMode = "national" | "local";

export function SearchTargetingField({
  mode,
  onModeChange,
  locationName,
  onLocationNameChange,
  countryCode,
}: {
  mode: TargetingMode;
  onModeChange: (mode: TargetingMode) => void;
  locationName: string | undefined;
  onLocationNameChange: (locationName: string | undefined) => void;
  countryCode: string;
}) {
  const { t } = useLocale();
  // Warm the server-side location cache the moment Local targeting is in
  // play, so the country list is hot before the first keystroke. Best-effort:
  // a failed warm just means the first search is slower, so no retries, and
  // staleTime keeps one warm per country per session.
  useQuery({
    queryKey: ["serp-locations-prewarm", countryCode],
    queryFn: () => prewarmSerpLocations({ data: { countryCode } }),
    enabled: mode === "local",
    staleTime: Infinity,
    retry: false,
  });
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">{t("Search Targeting")}</span>
      </label>
      <div className="flex gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            className="radio radio-sm"
            checked={mode === "national"}
            onChange={() => {
              onModeChange("national");
              onLocationNameChange(undefined);
            }}
          />
          <span className="text-sm">{t("National")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            className="radio radio-sm"
            checked={mode === "local"}
            onChange={() => onModeChange("local")}
          />
          <span className="text-sm">{t("Local")}</span>
        </label>
      </div>
      <p className="text-xs text-base-content/50 mt-1.5">
        {mode === "local" ? (
          <>
            <>
              <span className="text-success font-medium">{t("Best for:")}</span>{" "}
              {t(
                '"near me" queries, city/county keywords, service-area pages.',
              )}
            </>
          </>
        ) : (
          <>
            {t(
              "Local targeting can understate rankings for non-geo-modified terms.",
            )}
          </>
        )}
      </p>
      {mode === "local" && (
        <div className="mt-2">
          <SerpLocationCombobox
            value={locationName}
            onChange={onLocationNameChange}
            countryCode={countryCode}
            placeholder={t("Search cities...")}
          />
        </div>
      )}
    </div>
  );
}
