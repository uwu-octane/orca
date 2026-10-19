// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

/**
 * Marks a number that covers the whole domain under a URL scope, so a
 * page-scoped lookup never reads as if the number belonged to that page.
 */
export function DomainLevelBadge({ tooltip }: { tooltip: string }) {
  const { t } = useLocale();

  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        render={
          <Badge
            variant="outline"
            size="sm"
            className="font-normal tracking-normal normal-case"
          />
        }
      >
        {t("Domain-level")}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
