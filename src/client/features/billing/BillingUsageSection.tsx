// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import type { ReactNode } from "react";

/** A section of the billing Usage tab: a title with "Last 30 days" on the
 *  right. */
export function BillingUsageSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {t("Last 30 days")}
        </span>
      </div>
      {children}
    </section>
  );
}
