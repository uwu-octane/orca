import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import { QueryError } from "@/client/components/QueryState";
import { RecentSearches } from "@/client/components/RecentSearches";
import { ErrorState } from "@/client/components/ErrorState";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { googleConnectionOptions } from "@/client/features/integrations/googleProviders";
import { getGoogleAdsConnection } from "@/serverFunctions/googleAds";
import { Link } from "@tanstack/react-router";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  getGoogleKeywordTargetingOptions,
  researchGoogleKeywords,
} from "@/serverFunctions/googleKeywords";
import type { GoogleKeywordLocation } from "@/types/schemas/google-keyword-targeting";
import {
  googleKeywordIdeasSchema,
  type GoogleKeywordIdeasInput,
  type GoogleKeywordResult,
} from "@/types/schemas/google-keywords";
import { KeywordResearchLayout } from "../page/KeywordResearchLayout";
import { KeywordSearchInput } from "../page/KeywordSearchInput";
import { useGoogleKeywordHistory } from "./useGoogleKeywordHistory";
import { GoogleKeywordResults } from "./GoogleKeywordResults";
import { GoogleLocationSelect } from "./GoogleLocationSelect";
import { GoogleLanguageSelect } from "./GoogleLanguageSelect";
import { GoogleKeywordHistoryLabel } from "./GoogleKeywordHistoryLabel";

export function GoogleKeywordResearchPage({
  projectId,
}: {
  projectId: string;
}) {
  const connection = useQuery(googleConnectionOptions("google_ads", projectId));
  return (
    <GoogleKeywordResearchWorkspace
      key={connection.data?.connectionKey ?? "disconnected"}
      projectId={projectId}
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
}: {
  projectId: string;
  connected: boolean;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const history = useGoogleKeywordHistory(projectId);
  const historyLocationIds = [
    ...new Set(history.history.flatMap((item) => item.input.geoTargetIds)),
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
  const [current, setCurrent] = useState<{
    input: GoogleKeywordIdeasInput;
    result: GoogleKeywordResult;
  } | null>(null);
  const research = useMutation({
    mutationFn: async (input: GoogleKeywordIdeasInput) => {
      // Re-check the binding before selecting a browser cache entry.
      const connection = await getGoogleAdsConnection({ data: { projectId } });
      const result = await queryClient.fetchQuery({
        queryKey: [
          "googleKeywordIdeas",
          projectId,
          connection.connectionKey,
          input,
        ],
        queryFn: () => researchGoogleKeywords({ data: input }),
        // Every explicit search rechecks server config and the scoped R2 cache.
        staleTime: 0,
        retry: false,
      });
      return { input, result };
    },
    retry: false,
    onSuccess: (data) => {
      setCurrent(data);
      if (!data.input.pageToken) history.addItem(data.input);
    },
  });
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
      setCurrent(null);
      research.mutate(parsed.data);
    },
  });
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
    setCurrent(null);
    research.mutate(input);
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
      {current || research.isPending ? (
        <GoogleKeywordResults
          result={current?.result ?? null}
          pending={research.isPending}
          onNext={() => {
            if (!current?.result.nextPageToken) return;
            research.mutate({
              ...current.input,
              pageToken: current.result.nextPageToken,
            });
          }}
        />
      ) : configured && !research.isPending && !research.isError ? (
        <RecentSearches
          items={history.history}
          loaded={history.isLoaded}
          onRemove={history.removeItem}
          emptyIcon={Search}
          emptyTitle={t("Enter a keyword to get started")}
          getTitle={(item) => item.input.keywords.join(", ")}
          getSubtitle={(item) => (
            <GoogleKeywordHistoryLabel
              input={item.input}
              options={targeting.data}
              failed={targeting.isError}
            />
          )}
          renderLink={(item, props) => (
            <button
              {...props}
              type="button"
              disabled={!configured || !targeting.data || targeting.isError}
              onClick={() => repeatSearch(item.input)}
            />
          )}
        />
      ) : null}
    </KeywordResearchLayout>
  );
}
