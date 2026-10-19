import { useLocale } from "@/plugins/client/context";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";

export function FreePlanAlert({ visible }: { visible: boolean }) {
  const { t } = useLocale();

  if (!visible) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle />
      <AlertDescription className="text-foreground">
        <p>
          {t("We only start to track keyword positions once you")}{" "}
          <Link
            to={SUBSCRIBE_ROUTE}
            search={{ upgrade: true }}
            className="font-medium underline underline-offset-3"
          >
            {t("upgrade to the paid plan")}
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}
