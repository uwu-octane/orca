import { useState } from "react";
import { revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/client/components/ui/dialog";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { saveAiProviderConfig } from "@/serverFunctions/aiProviders";
import {
  AI_PROVIDERS,
  type AiProvider,
  type AiProviderConfigSummary,
} from "@/types/schemas/ai-provider";

export function AiProviderConfigDialog({
  projectId,
  provider,
  config,
  mode,
  onClose,
  onSaved,
}: {
  projectId: string;
  provider: AiProvider;
  config: AiProviderConfigSummary | null;
  mode: "key" | "rename" | "connection";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const endpoint = config?.endpoint ?? AI_PROVIDERS[provider].endpoint;
  const needsKey = (address: string) =>
    mode === "key" ||
    (mode === "connection" && !!config?.hasApiKey && address !== endpoint);
  const form = useAppForm({
    defaultValues: {
      name: config?.keyName ?? AI_PROVIDERS[provider].label,
      apiKey: "",
      endpoint,
      timeout: String((config?.timeoutMs ?? 60000) / 1000),
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: z
        .object({
          name: z.string().trim().min(1).max(64),
          apiKey: z.string().max(4096),
          endpoint: z.url().max(2048),
          timeout: z
            .string()
            .refine(
              (value) =>
                Number.isInteger(Number(value)) &&
                Number(value) >= 1 &&
                Number(value) <= 120,
              "Choose a timeout between 1 and 120 seconds.",
            ),
        })
        .refine(
          (value) =>
            !needsKey(value.endpoint) || value.apiKey.trim().length > 0,
          { path: ["apiKey"], message: "Enter an API key." },
        ),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        // Secrets stay in this short-lived form, never in Query's mutation cache.
        // Only a sanitized message is retained if saving fails.
        await saveAiProviderConfig({
          data: {
            projectId,
            provider,
            endpoint: value.endpoint,
            timeoutMs: Number(value.timeout) * 1000,
            revision: config?.revision ?? null,
            credential: needsKey(value.endpoint)
              ? { action: "replace", name: value.name, value: value.apiKey }
              : mode === "rename"
                ? { action: "keep", name: value.name }
                : config
                  ? { action: "keep" }
                  : { action: "clear" },
          },
        });
        form.setFieldValue("apiKey", "");
        await onSaved();
        toast.success(t("Provider saved"));
        onClose();
      } catch (cause) {
        setError(getStandardErrorMessage(cause, undefined, t));
      } finally {
        form.setFieldValue("apiKey", "");
      }
    },
  });
  const title =
    mode === "connection"
      ? t("Connection settings")
      : mode === "rename"
        ? t("Rename key")
        : t(config?.hasApiKey ? "Replace key" : "Add API key");
  return (
    <form.AppForm>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open && !pending) onClose();
            }}
          >
            <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <form.Form className="space-y-4" autoComplete="off">
                <fieldset disabled={pending} className="space-y-4">
                  {mode !== "connection" && (
                    <form.AppField name="name">
                      {(field) => (
                        <field.TextField
                          label={t("Name")}
                          maxLength={64}
                          required
                          autoFocus
                        />
                      )}
                    </form.AppField>
                  )}
                  {provider === "systemone" && mode !== "rename" && (
                    <form.AppField name="endpoint">
                      {(field) => (
                        <field.TextField
                          label={t("Service URL")}
                          type="url"
                          required
                        />
                      )}
                    </form.AppField>
                  )}
                  {mode === "connection" && (
                    <form.AppField name="timeout">
                      {(field) => (
                        <field.TextField
                          label={t("Timeout (seconds)")}
                          type="number"
                          min={1}
                          max={120}
                          required
                        />
                      )}
                    </form.AppField>
                  )}
                  <form.Subscribe selector={(state) => state.values.endpoint}>
                    {(address) =>
                      needsKey(address) && (
                        <form.AppField name="apiKey">
                          {(field) => (
                            <field.TextField
                              label={t("API key")}
                              type="password"
                              autoComplete="new-password"
                              spellCheck={false}
                              autoCapitalize="none"
                              data-ph-mask
                              required
                            />
                          )}
                        </form.AppField>
                      )
                    }
                  </form.Subscribe>
                </fieldset>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={onClose}
                  >
                    {t("Cancel")}
                  </Button>
                  <form.SubmitButton>{t("Save")}</form.SubmitButton>
                </DialogFooter>
              </form.Form>
            </DialogContent>
          </Dialog>
        )}
      </form.Subscribe>
    </form.AppForm>
  );
}
