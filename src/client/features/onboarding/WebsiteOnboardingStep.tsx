// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { ArrowRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { QueryError } from "@/client/components/QueryState";
import { Spinner } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { WizardFooter } from "@/client/features/onboarding/WizardFooter";
import { toastInitialAudit } from "@/client/features/projects/initialAuditToast";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import type { ProjectSummary } from "@/client/features/projects/types";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { updateProject } from "@/serverFunctions/projects";

/**
 * First onboarding step: save the website and country on the user's first
 * project. Saving a new website starts its first site audit server-side, so
 * the dashboard has results by the time the user reaches it.
 */
export function WebsiteOnboardingStep({
  onNext,
  onSkip,
  suggestedDomain,
}: {
  onNext: () => void;
  onSkip: () => void;
  suggestedDomain?: string;
}) {
  const { t } = useLocale();

  const projectsQuery = useQuery(projectsQueryOptions());
  const project = projectsQuery.data?.[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("What’s your website?")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("We’ll start a site audit for you.")}
        </p>
      </div>
      {project ? (
        <WebsiteForm
          key={project.id}
          project={project}
          suggestedDomain={suggestedDomain}
          onNext={onNext}
          onSkip={onSkip}
        />
      ) : projectsQuery.isError ? (
        <QueryError
          error={projectsQuery.error}
          fallback={t("Couldn't load your project.")}
          onRetry={() => void projectsQuery.refetch()}
          isRetrying={projectsQuery.isFetching}
        />
      ) : (
        <Spinner size="sm" label={t("Checking…")} />
      )}
    </div>
  );
}

const websiteSchema = z.object({
  domain: z.string().trim().min(1, "Enter your website."),
  market: z.object({ locationCode: z.number(), languageCode: z.string() }),
});

function WebsiteForm({
  project,
  suggestedDomain,
  onNext,
  onSkip,
}: {
  project: ProjectSummary;
  suggestedDomain?: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useLocale();

  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: (values: z.infer<typeof websiteSchema>) =>
      updateProject({
        data: {
          projectId: project.id,
          // Name the auto-created project after the site it now tracks.
          name:
            project.name === "Default" ? values.domain.trim() : project.name,
          domain: values.domain.trim(),
          ...values.market,
        },
      }),
    // The form shows the domain error inline and toasts the rest itself.
    meta: { errorToast: false },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      });
      captureClientEvent("onboarding:website_saved", {
        audit_status: saved.initialAudit?.status ?? "existing",
      });
      toastInitialAudit(saved.initialAudit);
      onNext();
    },
  });

  const form = useAppForm({
    defaultValues: {
      domain: project.domain ?? suggestedDomain ?? "",
      // New projects default to the United States.
      market: {
        locationCode: project.locationCode,
        languageCode: project.languageCode,
      },
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: websiteSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await saveMutation.mutateAsync(value);
      } catch (error) {
        if (getErrorCode(error) === "VALIDATION_ERROR")
          formApi.setErrorMap({
            onSubmit: {
              fields: { domain: "Enter a valid domain, like acme.com." },
            },
          });
        else toast.error(getStandardErrorMessage(error, undefined, t));
      }
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex flex-col gap-4">
        <form.AppField name="domain">
          {(field) => (
            <field.TextField
              label={t("Website")}
              placeholder="example.com"
              maxLength={255}
            />
          )}
        </form.AppField>
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-4 transition-transform group-data-panel-open:rotate-180" />
            {t("Choose default country & language")}
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted className="pt-4">
            <form.Field name="market">
              {(field) => (
                <ProjectMarketFields
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          </CollapsibleContent>
        </Collapsible>
        <WizardFooter
          className="mt-4"
          onSkip={onSkip}
          skipLabel={t("Skip for now")}
          continueAction={
            <form.Subscribe
              selector={(state) => ({
                empty: !state.values.domain.trim(),
                submitting: state.isSubmitting,
              })}
            >
              {({ empty, submitting }) => (
                <Button
                  type="submit"
                  className="font-semibold disabled:bg-foreground/10 disabled:text-foreground/20 disabled:opacity-100"
                  disabled={empty || submitting}
                >
                  {t("Save and continue")}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </form.Subscribe>
          }
        />
      </form.Form>
    </form.AppForm>
  );
}
