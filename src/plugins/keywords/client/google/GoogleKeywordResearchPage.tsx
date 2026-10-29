import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import { QueryError } from "@/client/components/QueryState";
import { ErrorState } from "@/client/components/ErrorState";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { GoogleConnectionCard } from "@/plugins/google-oauth/client/views";
import { googleConnectionOptions } from "@/plugins/google-oauth/client/googleProviders";
import { Link } from "@tanstack/react-router";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { getGoogleKeywordTargetingOptions } from "@/serverFunctions/googleKeywords";
import type { GoogleKeywordLocation } from "@/types/schemas/google-keyword-targeting";
import {
  googleKeywordIdeasSchema,
  type GoogleKeywordIdeasInput,
} from "@/types/schemas/google-keywords";
import { KeywordResearchLayout } from "../page/KeywordResearchLayout";
import { KeywordSearchInput } from "../page/KeywordSearchInput";
import { useGoogleKeywordSearch } from "./useGoogleKeywordSearch";
import { GoogleKeywordResults } from "./GoogleKeywordResults";
import { GoogleLocationSelect } from "./GoogleLocationSelect";
import { GoogleLanguageSelect } from "./GoogleLanguageSelect";
import { GoogleKeywordHistory } from "./GoogleKeywordHistory";

export function GoogleKeywordResearchPage({
  projectId,
  searchId,
}: {
  projectId: string;
  searchId?: string;
}) {
  const connection = useQuery(googleConnectionOptions("google_ads", projectId));
  return (
    <GoogleKeywordResearchWorkspace
      key={connection.data?.connectionKey ?? "disconnected"}
      projectId={projectId}
      searchId={searchId}
      customerId={connection.data?.propertyDetail ?? undefined}
      connected={
        connection.data?.connected === true &&
        connection.data.googleOAuthConfigured
      }
    />
  );
}

function GoogleKeywordResearchWorkspace({
  projectId,
  connected,
  customerId,
  searchId,
}: {
  projectId: string;
  connected: boolean;
  customerId?: string;
  searchId?: string;
}) {
  const { t } = useLocale();
  const { savedSearch, current, research, runSearch, openSearch, history } =
    useGoogleKeywordSearch(projectId, searchId);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const historyLocationIds = [
    ...new Set([
      ...history.history.flatMap((item) => item.input.geoTargetIds),
      ...(current?.input.geoTargetIds ?? []),
    ]),
  ];
  const targeting = useQuery({
    queryKey: ["googleKeywordTargeting", projectId, historyLocationIds],
    queryFn: () =>
      getGoogleKeywordTargetingOptions({
        data: { projectId, locationIds: historyLocationIds },
      }),
    enabled: connected && history.isLoaded,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const form = useAppForm({
    defaultValues: {
      keywords: "",
      locations: [] as GoogleKeywordLocation[],
      languageId: "",
      network: "GOOGLE_SEARCH" as GoogleKeywordIdeasInput["network"],
      includeAdultKeywords: false,
      pageSize: 150,
    },
    onSubmit: ({ value: { locations, ...value } }) => {
      const parsed = googleKeywordIdeasSchema.safeParse({
        ...value,
        projectId,
        keywords: value.keywords
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        geoTargetIds: locations.map((location) => location.id),
      });
      if (!parsed.success) {
        setValidationError(
          t("Enter 1–20 keywords and select 1–10 locations and a language."),
        );
        return;
      }
      setValidationError(null);
      runSearch(parsed.data);
    },
  });
  useEffect(() => {
    if (!current || !targeting.data) return;
    const input = current.input;
    const locations = input.geoTargetIds
      .map((id) =>
        targeting.data.locations.find((location) => location.id === id),
      )
      .filter((location) => location !== undefined);
    form.reset({
      keywords: input.keywords.join("\n"),
      locations,
      languageId: input.languageId,
      network: input.network,
      includeAdultKeywords: input.includeAdultKeywords,
      pageSize: input.pageSize,
    });
  }, [current, targeting.data, form]);
  const configured = connected;

  function repeatSearch(input: GoogleKeywordIdeasInput) {
    const locations = input.geoTargetIds.map((id) =>
      targeting.data?.locations.find((location) => location.id === id),
    );
    if (locations.some((location) => !location)) {
      setValidationError(
        t(
          "Some saved locations are unavailable. Select locations to search again.",
        ),
      );
      return;
    }
    form.reset({
      keywords: input.keywords.join("\n"),
      locations: locations.filter((location) => location !== undefined),
      languageId: input.languageId,
      network: input.network,
      includeAdultKeywords: input.includeAdultKeywords,
      pageSize: input.pageSize,
    });
    setValidationError(null);
    runSearch(input);
  }

  return (
    <KeywordResearchLayout
      provider="google_ads"
      actions={
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
              hash="google-ads"
            />
          }
        >
          {t("Connection settings")}
        </Button>
      }
    >
      <Card className="overflow-visible">
        <CardContent className="space-y-2">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (configured && !research.isPending) void form.handleSubmit();
            }}
          >
            <fieldset
              disabled={!configured || research.isPending}
              className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start"
            >
              <form.Field name="keywords">
                {(field) => (
                  <KeywordSearchInput
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    invalid={Boolean(validationError)}
                    disabled={!configured || research.isPending}
                    onSubmit={() => void form.handleSubmit()}
                  />
                )}
              </form.Field>
              <div className="grid grid-cols-2 gap-2 lg:contents">
                <form.Field name="locations">
                  {(field) => (
                    <GoogleLocationSelect
                      projectId={projectId}
                      options={targeting.data?.locations ?? []}
                      value={field.state.value}
                      onChange={field.handleChange}
                      loading={configured && targeting.isPending}
                      disabled={
                        !configured ||
                        research.isPending ||
                        !targeting.data ||
                        targeting.isError
                      }
                    />
                  )}
                </form.Field>
                <form.Field name="languageId">
                  {(field) => (
                    <GoogleLanguageSelect
                      options={targeting.data?.languages ?? []}
                      value={field.state.value}
                      onChange={field.handleChange}
                      loading={configured && targeting.isPending}
                      disabled={
                        !configured ||
                        research.isPending ||
                        !targeting.data ||
                        targeting.isError
                      }
                    />
                  )}
                </form.Field>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-normal lg:w-auto lg:shrink-0"
                  aria-haspopup="dialog"
                  disabled={!configured || research.isPending}
                  onClick={() => setOptionsOpen(true)}
                >
                  <SlidersHorizontal data-icon="inline-start" />
                  {t("Options")}
                </Button>
                <Button
                  type="submit"
                  className="w-full px-6 lg:w-auto lg:shrink-0"
                  disabled={!configured || research.isPending}
                  pending={research.isPending}
                >
                  {t("Search")}
                </Button>
              </div>
            </fieldset>
          </form>
          {validationError ? (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          ) : null}
        </CardContent>
      </Card>
      {configured && targeting.isError ? (
        <QueryError
          error={targeting.error}
          fallback={t("Unable to load locations and languages.")}
          onRetry={() => void targeting.refetch()}
          isRetrying={targeting.isFetching}
        />
      ) : null}
      {optionsOpen ? (
        <FormDialog
          title={t("Search options")}
          onClose={() => setOptionsOpen(false)}
          actions={
            <Button onClick={() => setOptionsOpen(false)}>{t("Done")}</Button>
          }
        >
          <form.AppField name="network">
            {(field) => (
              <field.SelectField
                label={t("Search network")}
                disabled={!configured || research.isPending}
                items={[
                  { value: "GOOGLE_SEARCH", label: t("Google Search") },
                  {
                    value: "GOOGLE_SEARCH_AND_PARTNERS",
                    label: t("Google Search and partners"),
                  },
                ]}
              />
            )}
          </form.AppField>
          <form.AppField name="pageSize">
            {(field) => (
              <field.SelectField
                label={t("Results per page")}
                disabled={!configured || research.isPending}
                items={[150, 300, 500].map((value) => ({
                  value,
                  label: String(value),
                }))}
              />
            )}
          </form.AppField>
          <form.AppField name="includeAdultKeywords">
            {(field) => (
              <field.CheckboxField
                label={t("Include adult keywords")}
                disabled={!configured || research.isPending}
              />
            )}
          </form.AppField>
        </FormDialog>
      ) : null}
      {!configured ? (
        <GoogleConnectionCard provider="google_ads" projectId={projectId} />
      ) : null}
      {research.isError ? (
        <ErrorState
          message={getStandardErrorMessage(research.error, undefined, t)}
        />
      ) : null}
      {savedSearch.isError ? (
        <QueryError
          fallback={t("Failed to load keywords.")}
          error={savedSearch.error}
          onRetry={() => void savedSearch.refetch()}
          isRetrying={savedSearch.isFetching}
        />
      ) : null}
      {current || research.isPending || (searchId && savedSearch.isPending) ? (
        <GoogleKeywordResults
          projectId={projectId}
          key={current?.result.searchId ?? "loading"}
          result={current?.result ?? null}
          pending={research.isPending || savedSearch.isFetching}
          canRequestNext={
            connected && current?.result.customerId === customerId
          }
          onNext={() => {
            if (
              !connected ||
              !current?.result.nextPageToken ||
              current.result.customerId !== customerId
            )
              return;
            runSearch({
              ...current.input,
              pageToken: current.result.nextPageToken,
            });
          }}
        />
      ) : !searchId && !research.isPending && !research.isError ? (
        <GoogleKeywordHistory
          history={history}
          options={targeting.data}
          failed={targeting.isError}
          configured={configured}
          openSearch={openSearch}
          repeatSearch={repeatSearch}
        />
      ) : null}
    </KeywordResearchLayout>
  );
}
