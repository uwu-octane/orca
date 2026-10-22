// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Button } from "@/client/components/ui/button";

export function GoogleConnectedState({
  accountSelection = false,
  property,
  detail,
  email,
  onChange,
  onDisconnect,
  disconnecting,
  canManage,
  canManageAccounts,
  disabled,
}: {
  accountSelection?: boolean;
  property: string;
  detail?: string | null;
  email?: string | null;
  onChange: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  canManage: boolean;
  canManageAccounts: boolean;
  disabled: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">
          {property || detail}
        </p>
        {detail ? (
          <p className="mt-1 text-xs text-muted-foreground">
            ID {detail.replace(/^properties\//, "")}
          </p>
        ) : null}
        {email ? (
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {email}
          </p>
        ) : null}
      </div>
      {canManage || canManageAccounts ? (
        <fieldset
          disabled={disconnecting || disabled}
          className="flex flex-wrap items-center gap-1"
        >
          <Button variant="outline" size="sm" onClick={onChange}>
            {canManage
              ? accountSelection
                ? t("Change advertising account")
                : t("Change property or account")
              : t("Manage Google accounts")}
          </Button>
          {canManage ? (
            <Button variant="destructive" size="sm" onClick={onDisconnect}>
              {disconnecting ? t("Disconnecting…") : t("Disconnect project")}
            </Button>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
