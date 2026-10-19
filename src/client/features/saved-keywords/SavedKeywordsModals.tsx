// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RemoveSavedKeywordsError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function DeleteSavedKeywordsModal({
  selectedCount,
  isPending,
  onClose,
  onConfirm,
}: {
  selectedCount: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();

  return (
    <ConfirmDialog
      title={t("Delete keywords?")}
      confirmLabel={
        selectedCount === 1
          ? t("Delete {count} keyword", { count: selectedCount })
          : t("Delete {count} keywords", { count: selectedCount })
      }
      destructive
      pending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {selectedCount === 1
        ? t("This will permanently delete {count} saved keyword.", {
            count: selectedCount,
          })
        : t("This will permanently delete {count} saved keywords.", {
            count: selectedCount,
          })}
    </ConfirmDialog>
  );
}
