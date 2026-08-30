import type { FormEvent } from "react";
import { AlertCircle, Search } from "lucide-react";
import { getFieldError, getFormError } from "@/client/lib/forms";
import type { DomainOverviewControlsForm } from "@/client/features/domain/DomainOverviewPage";
import { toSortMode } from "@/client/features/domain/utils";
import type { DomainSortMode } from "@/client/features/domain/types";
import { LABS_LOCATION_OPTIONS } from "@/client/features/keywords/locations";
import { LocationSelect } from "@/client/components/LocationSelect";
import { ResearchScopeSelect } from "@/client/components/ResearchScopeSelect";
import type { ResearchScope } from "@/shared/researchScope";
import { useLocale } from "@/plugins/client/context";

type Props = {
  controlsForm: DomainOverviewControlsForm;
  isLoading: boolean;
  onSubmit: (event: FormEvent) => void;
  onDomainChange: (domain: string) => void;
  onScopeChange: (scope: ResearchScope) => void;
  onSortChange: (sort: DomainSortMode) => void;
  onLocationChange: (locationCode: number) => void;
};

export function DomainSearchCard({
  controlsForm,
  isLoading,
  onSubmit,
  onDomainChange,
  onScopeChange,
  onSortChange,
  onLocationChange,
}: Props) {
  const { t } = useLocale();
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={onSubmit}
        >
          <controlsForm.Field name="domain">
            {(field) => {
              const domainError = getFieldError(field.state.meta.errors);

              return (
                <label
                  className={`input input-bordered flex items-center gap-2 w-full lg:flex-1 lg:min-w-0 lg:max-w-md ${domainError ? "input-error" : ""}`}
                >
                  <Search className="size-4 text-base-content/60" />
                  <input
                    className="grow min-w-0"
                    placeholder={t("Enter a domain or URL")}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      onDomainChange(event.target.value);
                    }}
                    aria-invalid={domainError ? true : undefined}
                    aria-describedby={
                      domainError ? "domain-input-error" : undefined
                    }
                  />
                </label>
              );
            }}
          </controlsForm.Field>

          <controlsForm.Field name="scope">
            {(field) => (
              <ResearchScopeSelect
                value={field.state.value}
                className="w-full lg:w-40"
                onChange={(scope) => {
                  field.handleChange(scope);
                  onScopeChange(scope);
                }}
              />
            )}
          </controlsForm.Field>

          <controlsForm.Field name="locationCode">
            {(field) => (
              <LocationSelect
                value={field.state.value}
                options={LABS_LOCATION_OPTIONS}
                className="w-full lg:w-44 lg:shrink-0"
                onChange={(code) => {
                  field.handleChange(code);
                  onLocationChange(code);
                }}
              />
            )}
          </controlsForm.Field>

          <controlsForm.Field name="sort">
            {(field) => (
              <select
                className="select select-bordered shrink-0"
                value={field.state.value}
                onChange={(event) => {
                  const next = toSortMode(event.target.value) ?? "traffic";
                  field.handleChange(next);
                  onSortChange(next);
                }}
              >
                <option value="rank">{t("By Rank")}</option>
                <option value="traffic">{t("By Traffic")}</option>
                <option value="volume">{t("By Volume")}</option>
                <option value="score">{t("By Score")}</option>
                <option value="cpc">{t("By CPC")}</option>
              </select>
            )}
          </controlsForm.Field>

          <controlsForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                className="btn btn-primary shrink-0 px-6"
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? t("Loading...") : t("Search")}
              </button>
            )}
          </controlsForm.Subscribe>
        </form>

        <controlsForm.Field name="domain">
          {(field) => {
            const domainError = getFieldError(field.state.meta.errors);

            return domainError ? (
              <p id="domain-input-error" className="text-sm text-error">
                {t(domainError)}
              </p>
            ) : null;
          }}
        </controlsForm.Field>

        <controlsForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(submitError) => {
            const errorMessage = getFormError(submitError);

            return errorMessage ? (
              <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{t(errorMessage)}</span>
              </div>
            ) : null;
          }}
        </controlsForm.Subscribe>
      </div>
    </div>
  );
}
