// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";

/** The Cancel and submit buttons at the end of a form. */
export function FormActions({
  pending,
  disabled = false,
  onCancel,
  size = "default",
}: {
  pending: boolean;
  disabled?: boolean;
  onCancel: () => void;
  size?: "xs" | "sm" | "default";
}) {
  const { t } = useLocale();

  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={onCancel}
        disabled={pending}
      >
        {t("Cancel")}
      </Button>
      <Button type="submit" size={size} disabled={disabled} pending={pending}>
        {t("Save")}
      </Button>
    </div>
  );
}
