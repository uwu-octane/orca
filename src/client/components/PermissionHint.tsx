// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { cn } from "cn";

/** Shown where a missing permission would otherwise leave a card or step empty. */
export function PermissionHint({
  action,
  className,
}: {
  action: string;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {t("Ask an organization owner or admin to {action}.", {
        action: t(action),
      })}
    </p>
  );
}
