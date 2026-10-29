import { useId } from "react";
import { z } from "zod";
import { useLocale } from "@/plugins/client/context";
import { useAppForm } from "@/client/components/form/useAppForm";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import {
  keywordMembershipQuestionSchema,
  type KeywordMembershipQuestion,
} from "@/types/schemas/keyword-dimensions";

const editorSchema = z
  .object({
    instructions: keywordMembershipQuestionSchema.shape.instructions,
    trueCriterion: z.string().trim().max(8_000),
    falseCriterion: z.string().trim().max(8_000),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.trueCriterion) === Boolean(value.falseCriterion)) return;
    ctx.addIssue({
      code: "custom",
      path: [value.trueCriterion ? "falseCriterion" : "trueCriterion"],
      message: "Enter both criteria or leave both empty.",
    });
  });

export function KeywordQuestionDialog({
  name,
  question,
  disabled,
  error,
  onSave,
  onClose,
}: {
  name: string;
  question?: KeywordMembershipQuestion;
  disabled: boolean;
  error?: string;
  onSave: (question: KeywordMembershipQuestion | undefined) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const formId = useId();
  const form = useAppForm({
    defaultValues: {
      instructions: question?.instructions ?? "",
      trueCriterion: question?.criteria?.true ?? "",
      falseCriterion: question?.criteria?.false ?? "",
    },
    validators: { onSubmit: editorSchema },
    onSubmit: async ({ value }) => {
      const parsed = editorSchema.parse(value);
      await onSave(
        keywordMembershipQuestionSchema.parse({
          instructions: parsed.instructions,
          ...(parsed.trueCriterion && parsed.falseCriterion
            ? {
                criteria: {
                  true: parsed.trueCriterion,
                  false: parsed.falseCriterion,
                },
              }
            : {}),
        }),
      );
    },
  });
  return (
    <FormDialog
      title={t("Question for {name}", { name })}
      onClose={onClose}
      actions={
        <>
          {question ? (
            <Button
              variant="destructive"
              className="mr-auto"
              disabled={disabled}
              onClick={() => onSave(undefined)}
            >
              {t("Remove question")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={disabled}>
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
        <form.Form id={formId} className="space-y-4">
          <form.AppField name="instructions">
            {(field) => (
              <field.TextareaField
                label={t("Membership question")}
                rows={4}
                maxLength={8_000}
                disabled={disabled}
                autoFocus
                required
                data-ph-mask
              />
            )}
          </form.AppField>
          <form.AppField name="trueCriterion">
            {(field) => (
              <field.TextareaField
                label={t("Yes criterion (optional)")}
                rows={2}
                maxLength={8_000}
                disabled={disabled}
                data-ph-mask
              />
            )}
          </form.AppField>
          <form.AppField name="falseCriterion">
            {(field) => (
              <field.TextareaField
                label={t("No criterion (optional)")}
                rows={2}
                maxLength={8_000}
                disabled={disabled}
                data-ph-mask
              />
            )}
          </form.AppField>
        </form.Form>
      </form.AppForm>
    </FormDialog>
  );
}
