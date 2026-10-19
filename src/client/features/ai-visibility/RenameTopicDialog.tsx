// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useId, useState } from "react";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";

/** Renames a topic. A saved topic's name moves its prompts into that topic. */
export function RenameTopicDialog({
  topic,
  onClose,
  onRename,
}: {
  topic: string;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const { t } = useLocale();

  const formId = useId();
  const inputId = useId();
  const [name, setName] = useState(topic);
  const next = name.trim();
  return (
    <FormDialog
      title={t("Rename topic")}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!next || next === topic}
          >
            {t("Rename")}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onRename(next);
        }}
      >
        <Field>
          <FieldLabel htmlFor={inputId}>{t("Topic name")}</FieldLabel>
          <Input
            id={inputId}
            autoFocus
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </form>
    </FormDialog>
  );
}
