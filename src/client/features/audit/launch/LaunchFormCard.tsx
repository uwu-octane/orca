// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Switch } from "@/client/components/ui/switch";
import {
  clampMaxPagesInput,
  MIN_PAGES,
} from "@/client/features/audit/launch/types";
import type { useLaunchController } from "@/client/features/audit/launch/useLaunchController";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { RENDERED_MAX_AUDIT_PAGES } from "@/shared/audit-limits";
import { renderingEstimateText } from "@/shared/audit-rendering";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

type Props = {
  launchForm: ReturnType<typeof useLaunchController>["launchForm"];
  commitMaxPagesInput: () => number;
  maxPagesLimit: number;
  paidMaxPagesLimit: number;
  canRenderJavaScript?: boolean;
};

export function LaunchFormCard({
  commitMaxPagesInput,
  launchForm,
  maxPagesLimit,
  paidMaxPagesLimit,
  canRenderJavaScript,
}: Props) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("Start New Audit")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void launchForm.handleSubmit();
          }}
        >
          <launchForm.Field name="url">
            {(field) => {
              const urlError = getFieldError(field.state.meta.errors);

              return (
                <Input
                  className="lg:col-span-9"
                  aria-label={t("Site URL")}
                  aria-invalid={urlError ? true : undefined}
                  placeholder="https://example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    if (launchForm.state.errorMap.onSubmit) {
                      launchForm.setErrorMap({ onSubmit: undefined });
                    }
                  }}
                />
              );
            }}
          </launchForm.Field>

          <launchForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                className="w-full lg:col-span-3"
                pending={isSubmitting}
              >
                {isSubmitting ? t("Starting...") : t("Start Audit")}
              </Button>
            )}
          </launchForm.Subscribe>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-12 lg:items-start">
            <LaunchOptions
              launchForm={launchForm}
              commitMaxPagesInput={commitMaxPagesInput}
              maxPagesLimit={maxPagesLimit}
              paidMaxPagesLimit={paidMaxPagesLimit}
            />
            <div className="space-y-4">
              <LighthouseOptions launchForm={launchForm} />
              <RenderingOptions
                launchForm={launchForm}
                maxPagesLimit={maxPagesLimit}
                canRenderJavaScript={canRenderJavaScript}
              />
            </div>
          </div>
        </form>

        <LaunchErrors launchForm={launchForm} />
      </CardContent>
    </Card>
  );
}

function LaunchOptions({
  launchForm,
  commitMaxPagesInput,
  maxPagesLimit,
  paidMaxPagesLimit,
}: Props) {
  const { t } = useLocale();

  return (
    <Field className="rounded-lg border border-border p-3">
      <FieldLabel htmlFor="audit-max-pages">{t("Max pages")}</FieldLabel>
      <launchForm.Field name="maxPagesInput">
        {(field) => (
          <Input
            id="audit-max-pages"
            type="number"
            min={MIN_PAGES}
            max={maxPagesLimit}
            className="w-28"
            value={field.state.value}
            onChange={(event) => {
              const next = event.target.value;
              if (!/^\d*$/.test(next)) return;
              field.handleChange(next);
              if (launchForm.state.errorMap.onSubmit) {
                launchForm.setErrorMap({ onSubmit: undefined });
              }
            }}
            onBlur={commitMaxPagesInput}
          />
        )}
      </launchForm.Field>
      <FieldDescription>
        {t("Enter any value from {min} to {max}", {
          min: MIN_PAGES,
          max: maxPagesLimit.toLocaleString(),
        })}
        {t(".")}
        {maxPagesLimit === RENDERED_MAX_AUDIT_PAGES
          ? t(" Audits that render JavaScript are limited to this many pages.")
          : null}
        {maxPagesLimit < paidMaxPagesLimit ? (
          <>
            {" "}
            <Link to={SUBSCRIBE_ROUTE} search={{ upgrade: true }}>
              {t("Upgrade")}
            </Link>{" "}
            {t("to crawl up to {count} pages.", {
              count: paidMaxPagesLimit.toLocaleString(),
            })}
          </>
        ) : null}
      </FieldDescription>
    </Field>
  );
}

function LighthouseOptions({ launchForm }: Pick<Props, "launchForm">) {
  const { t } = useLocale();

  return (
    <Field className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <launchForm.Field name="runLighthouse">
          {(field) => (
            <Switch
              id="audit-run-lighthouse"
              checked={Boolean(field.state.value)}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </launchForm.Field>
        <FieldLabel
          htmlFor="audit-run-lighthouse"
          title={t(
            "Lighthouse measures the performance of your pages and identifies issues.",
          )}
        >
          {t("Include Lighthouse")}
        </FieldLabel>
      </div>

      <launchForm.Subscribe
        selector={(snapshot) => snapshot.values.runLighthouse}
      >
        {(runLighthouse) =>
          runLighthouse ? (
            <FieldDescription>
              {t(
                "We choose a sample of 20 pages to audit, removing pages from duplicate templates.",
              )}
            </FieldDescription>
          ) : null
        }
      </launchForm.Subscribe>
    </Field>
  );
}

function RenderingOptions({
  launchForm,
  maxPagesLimit,
  canRenderJavaScript,
}: Pick<Props, "launchForm" | "maxPagesLimit" | "canRenderJavaScript">) {
  const { t } = useLocale();

  return (
    <Field className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <launchForm.Field name="renderJavaScript">
          {(field) => (
            <Switch
              id="audit-render-javascript"
              checked={field.state.value}
              disabled={canRenderJavaScript !== true}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          )}
        </launchForm.Field>
        <FieldLabel
          htmlFor="audit-render-javascript"
          title={t("Loads each page in a browser before auditing it. Slower.")}
        >
          {t("Render JavaScript")}
        </FieldLabel>
      </div>

      {isHostedClientAuthMode() && (
        <launchForm.Subscribe
          selector={(state) => ({
            renderJavaScript: state.values.renderJavaScript,
            maxPagesInput: state.values.maxPagesInput,
          })}
        >
          {({ renderJavaScript, maxPagesInput }) =>
            renderJavaScript ? (
              <FieldDescription>
                {renderingEstimateText(
                  clampMaxPagesInput(maxPagesInput, maxPagesLimit),
                  t,
                )}
              </FieldDescription>
            ) : null
          }
        </launchForm.Subscribe>
      )}
      {canRenderJavaScript === false && (
        <FieldDescription>
          {t(
            "This deployment has no browser, so rendering needs a Context.dev API key. Set",
          )}{" "}
          <code>CONTEXT_API_KEY</code>
          {t(", restart Orca, then reload this page.")}{" "}
          <a
            href="https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE_OPERATIONS.md#render-javascript-in-site-audits"
            target="_blank"
            rel="noreferrer"
          >
            {t("Setup guide")}
          </a>
        </FieldDescription>
      )}
    </Field>
  );
}

function LaunchErrors({ launchForm }: Pick<Props, "launchForm">) {
  const { t } = useLocale();

  return (
    <div className="space-y-2">
      <launchForm.Field name="url">
        {(field) => {
          const urlError = getFieldError(field.state.meta.errors);

          return urlError ? <FieldError>{t(urlError)}</FieldError> : null;
        }}
      </launchForm.Field>

      <launchForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(submitError) => {
          const errorMessage = getFormError(submitError);

          return errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{t(errorMessage)}</AlertTitle>
            </Alert>
          ) : null;
        }}
      </launchForm.Subscribe>
    </div>
  );
}
