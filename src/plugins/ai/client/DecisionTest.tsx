import { AI_PROVIDERS, type AiProvider } from "@/types/schemas/ai-provider";
import { useMutation } from "@tanstack/react-query";
import { revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Skeleton } from "@/client/components/ui/skeleton";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { runDecision } from "@/serverFunctions/decision";
import { useId } from "react";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { GatewayModelPicker } from "./GatewayModelPicker";

export function DecisionTest({
  projectId,
  provider,
}: {
  projectId: string;
  provider: AiProvider;
}) {
  const { t } = useLocale();
  const modelId = useId();
  const test = useMutation({
    mutationFn: (value: { state: string; question: string; model: string }) =>
      runDecision({
        data: {
          projectId,
          selection: { provider, model: value.model },
          input: {
            state: value.state,
            questions: { test: { type: "noul", instructions: value.question } },
          },
        },
      }),
    retry: false,
  });
  const form = useAppForm({
    defaultValues: {
      state: "",
      question: "",
      model: AI_PROVIDERS[provider].decisionModel as string,
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: z.object({
        model: z.string().trim().min(1).max(200),
        state: z.string().min(1).max(32_000),
        question: z.string().min(1).max(8_000),
      }),
    },
    onSubmit: async ({ value }) => {
      await test.mutateAsync(value);
    },
  });
  const answer = test.data?.answers.test;
  return (
    <section className="space-y-4">
      <form.AppForm>
        <form.Form className="space-y-4">
          <fieldset disabled={test.isPending} className="space-y-4">
            <form.AppField
              name="model"
              listeners={{ onChange: () => test.reset() }}
            >
              {(field) =>
                provider === "vercel_gateway" ? (
                  <Field>
                    <FieldLabel htmlFor={modelId}>{t("Model name")}</FieldLabel>
                    <GatewayModelPicker
                      id={modelId}
                      projectId={projectId}
                      kind="evaluation"
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      disabled={test.isPending}
                    />
                  </Field>
                ) : (
                  <field.TextField label={t("Model name")} required />
                )
              }
            </form.AppField>
            <form.AppField
              name="state"
              listeners={{ onChange: () => test.reset() }}
            >
              {(field) => (
                <field.TextareaField
                  label={t("Content to evaluate")}
                  rows={3}
                  required
                  data-ph-mask
                />
              )}
            </form.AppField>
            <form.AppField
              name="question"
              listeners={{ onChange: () => test.reset() }}
            >
              {(field) => (
                <field.TextField
                  label={t("Yes / no question")}
                  required
                  data-ph-mask
                />
              )}
            </form.AppField>
            <form.SubmitButton>{t("Run test")}</form.SubmitButton>
          </fieldset>
        </form.Form>
      </form.AppForm>
      <div aria-live="polite" aria-busy={test.isPending} className="min-h-16">
        {test.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : test.error ? (
          <p role="alert" className="text-sm text-destructive">
            {getStandardErrorMessage(test.error, undefined, t)}
          </p>
        ) : answer?.type === "noul" && test.data ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t("Yes probability")}</dt>
              <dd>{(answer.noul * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("Model name")}</dt>
              <dd>{test.data.model}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("Duration")}</dt>
              <dd>{test.data.durationMs} ms</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
