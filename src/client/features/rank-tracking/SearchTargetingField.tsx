// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useId } from "react";
import { SerpLocationCombobox } from "@/client/components/SerpLocationCombobox";
import { usePrewarmSerpLocations } from "@/client/components/usePrewarmSerpLocations";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/client/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";

type TargetingMode = "national" | "local";

export function SearchTargetingField({
  mode,
  onModeChange,
  locationName,
  onLocationNameChange,
  countryCode,
  error,
}: {
  mode: TargetingMode;
  onModeChange: (mode: TargetingMode) => void;
  locationName: string | undefined;
  onLocationNameChange: (locationName: string | undefined) => void;
  countryCode: string;
  /** The error for the city, shown under the city search. */
  error?: string;
}) {
  const { t } = useLocale();

  const id = useId();
  // Warm the moment Local targeting is in play.
  usePrewarmSerpLocations(countryCode, mode === "local");
  return (
    <FieldSet className="gap-2" data-invalid={error ? true : undefined}>
      <FieldLegend variant="label" className="mb-0">
        {t("Search Targeting")}
      </FieldLegend>
      <RadioGroup
        value={mode}
        onValueChange={(value) => {
          if (value === "local") onModeChange("local");
          if (value === "national") {
            onModeChange("national");
            onLocationNameChange(undefined);
          }
        }}
        className="flex gap-4"
      >
        <Field orientation="horizontal" className="w-auto">
          <RadioGroupItem value="national" id={`${id}-national`} />
          <FieldLabel htmlFor={`${id}-national`} className="font-normal">
            {t("National")}
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" className="w-auto">
          <RadioGroupItem value="local" id={`${id}-local`} />
          <FieldLabel htmlFor={`${id}-local`} className="font-normal">
            {t("Local")}
          </FieldLabel>
        </Field>
      </RadioGroup>
      <FieldDescription>
        {mode === "local" ? (
          <>
            <span className="font-medium text-success">{t("Best for:")}</span>{" "}
            {t('"near me" queries, city/county keywords, service-area pages.')}
          </>
        ) : (
          <>
            {t(
              "Local targeting can understate rankings for non-geo-modified terms.",
            )}
          </>
        )}
      </FieldDescription>
      {mode === "local" && (
        <>
          <FieldLabel htmlFor={`${id}-city`} className="sr-only">
            {t("City or region")}
          </FieldLabel>
          <SerpLocationCombobox
            id={`${id}-city`}
            value={locationName}
            onChange={onLocationNameChange}
            countryCode={countryCode}
            placeholder={t("Search cities...")}
            invalid={Boolean(error)}
          />
        </>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldSet>
  );
}
