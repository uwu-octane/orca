import { useId } from "react";
import {
  keywordDimensionFieldSchema,
  type KeywordDimensionField,
} from "@/types/schemas/keyword-dimensions";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";

export function KeywordFieldDialog({
  title,
  pending,
  error,
  initialField,
  siblings,
  onSave,
  onDelete,
  onClose,
}: {
  title: string;
  pending: boolean;
  error?: string;
  initialField: KeywordDimensionField;
  siblings: KeywordDimensionField[];
  onSave: (field: KeywordDimensionField) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const formId = useId();
  const form = useAppForm({
    defaultValues: initialField,
    validators: {
      onSubmit: keywordDimensionFieldSchema.superRefine((value, ctx) => {
        for (const key of ["name", "labelZh"] as const) {
          if (
            siblings.some(
              (field) =>
                field[key].normalize("NFKC").toLocaleLowerCase() ===
                value[key].normalize("NFKC").toLocaleLowerCase(),
            )
          )
            ctx.addIssue({
              code: "custom",
              path: [key],
              message: t("This name already exists."),
            });
        }
      }),
    },
    onSubmit: ({ value }) => onSave(keywordDimensionFieldSchema.parse(value)),
  });
  return (
    <FormDialog
      title={title}
      onClose={onClose}
      actions={
        <>
          {onDelete ? (
            <Button
              disabled={pending}
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
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            pending={pending}
          >
            {t("Save")}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <form.AppForm>
        <form.Form id={formId}>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={t("English name")}
                disabled={pending}
                autoFocus
                maxLength={80}
              />
            )}
          </form.AppField>
          <form.AppField name="labelZh">
            {(field) => (
              <field.TextField
                label={t("Chinese name")}
                disabled={pending}
                maxLength={80}
              />
            )}
          </form.AppField>
        </form.Form>
      </form.AppForm>
    </FormDialog>
  );
}
