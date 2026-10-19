import { translate } from "@/plugins/locale";
// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { revalidateLogic } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { captureClientEvent } from "@/client/lib/posthog";
import { saveReportTemplate } from "@/serverFunctions/reportTemplates";
import type { ReportTemplate } from "@/types/schemas/report-templates";

// One form for create and edit. Shape only, as at every other boundary: the
// caps come back from the service with their copy and show in a toast.
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => translate("Give the template a name.") }),
  description: z
    .string()
    .trim()
    .min(1, {
      error: () => translate("Say in one line when to use this template."),
    }),
  instructions: z
    .string()
    .trim()
    .min(1, {
      error: () =>
        translate("Say who the report is for and which sections it has."),
    }),
});

const INSTRUCTIONS_PLACEHOLDER = `Audience: the client's marketing lead, not technical.
Sections, in order: Where we are / What we did this month / What moved / What to expect next.
Tone: plain and confident. Gloss every SEO term. No exclamation points.
Sign off as: Acme SEO
Accent: #1C4ED8`;

export function ReportTemplateForm({
  projectId,
  template,
  onClose,
  onSaved,
}: {
  projectId: string;
  /** The template being edited, or undefined when creating one. */
  template?: ReportTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLocale();

  const saveMutation = useMutation({
    // A refusal (duplicate name, the cap) comes back as `{ ok: false }` rather
    // than an error, because thrown errors reach the client stripped to their
    // code. Rethrowing it here lets the mutation cache toast its message.
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const result = await saveReportTemplate({
        data: { projectId, templateId: template?.id, ...values },
      });
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      captureClientEvent("report_template:saved", {
        project_id: projectId,
        is_update: !result.created,
        source: "app",
      });
      toast.success(
        result.created ? t("Template created") : t("Template saved"),
      );
      onSaved();
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      instructions: template?.instructions ?? "",
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: ({ value }) => saveMutation.mutateAsync(value),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <form.AppForm>
          <form.Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {template ? t("Edit template") : t("New template")}
              </DialogTitle>
            </DialogHeader>

            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("Name")}
                  placeholder={t("Monthly client check-in")}
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextField
                  label={t("Description")}
                  description={t(
                    "One line saying when to use it. This is what an agent reads to decide.",
                  )}
                  placeholder={t(
                    "The monthly update we send retainer clients.",
                  )}
                  required
                />
              )}
            </form.AppField>

            <form.AppField name="instructions">
              {(field) => (
                <field.TextareaField
                  label={t("Instructions")}
                  description={t(
                    "Brand voice for the whole project lives in Context › Writing preferences.",
                  )}
                  className="h-56 font-mono leading-relaxed md:text-xs"
                  placeholder={t(INSTRUCTIONS_PLACEHOLDER)}
                  required
                />
              )}
            </form.AppField>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saveMutation.isPending}
              >
                {t("Cancel")}
              </Button>
              <form.SubmitButton>
                {template ? t("Save changes") : t("Create template")}
              </form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
