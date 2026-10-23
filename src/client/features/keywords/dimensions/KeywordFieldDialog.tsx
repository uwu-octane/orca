import { useId } from "react";
import { z } from "zod";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";

export function KeywordFieldDialog({
  title,
  initialName,
  names,
  onSave,
  onDelete,
  onClose,
}: {
  title: string;
  initialName: string;
  names: string[];
  onSave: (name: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const formId = useId();
  const form = useAppForm({
    defaultValues: { name: initialName },
    validators: {
      onSubmit: z.object({
        name: z
          .string()
          .trim()
          .min(1, t("Enter a name."))
          .max(80)
          .refine(
            (name) =>
              !names.some(
                (existing) =>
                  existing.normalize("NFKC").toLocaleLowerCase() ===
                  name.normalize("NFKC").toLocaleLowerCase(),
              ),
            t("This name already exists."),
          ),
      }),
    },
    onSubmit: ({ value }) => onSave(value.name.trim()),
  });
  return (
    <FormDialog
      title={title}
      onClose={onClose}
      actions={
        <>
          {onDelete ? (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="mr-auto"
            >
              {t("Delete")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form={formId}>
            {t("Save")}
          </Button>
        </>
      }
    >
      <form.AppForm>
        <form.Form id={formId}>
          <form.AppField name="name">
            {(field) => (
              <field.TextField label={t("Name")} autoFocus maxLength={80} />
            )}
          </form.AppField>
        </form.Form>
      </form.AppForm>
    </FormDialog>
  );
}
