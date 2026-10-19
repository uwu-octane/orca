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

  const plural = selectedCount !== 1 ? "s" : "";
  return (
    <ConfirmDialog
      title={t("Delete keywords?")}
      confirmLabel={`Delete ${selectedCount} keyword${plural}`}
      destructive
      pending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      This will permanently delete {selectedCount} saved keyword{plural}
      {t(".")}
    </ConfirmDialog>
  );
}
