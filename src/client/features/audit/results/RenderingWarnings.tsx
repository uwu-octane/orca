// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import type { AuditResultsData } from "@/client/features/audit/results/types";

/** Report notices about JavaScript: app shells, and pages a render missed. */
export function RenderingWarnings({ data }: { data: AuditResultsData }) {
  const { t } = useLocale();

  const rendered = data.audit.config.renderJavaScript;
  const hasShells = data.issues.some(
    (issue) => issue.issueType === "javascript-rendering-suspected",
  );
  const unreadCount = data.pages.filter(
    (page) => page.fetchClass === "error",
  ).length;

  return (
    <>
      {hasShells && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            {t("Some pages may need JavaScript to show their content.")}
          </AlertTitle>
          <AlertDescription>
            {rendered
              ? t(
                  "They were still loading after rendering, so we couldn't check them.",
                )
              : t(
                  "Turn on Render JavaScript and run the audit again to check them.",
                )}
          </AlertDescription>
        </Alert>
      )}

      {rendered && unreadCount > 0 && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>
            {unreadCount === 1
              ? t("We couldn't read {count} page.", { count: unreadCount })
              : t("We couldn't read {count} pages.", { count: unreadCount })}
          </AlertTitle>
          <AlertDescription>
            {t("To see them, open Pages and filter Crawl result by Failed.")}
          </AlertDescription>
        </Alert>
      )}

      {rendered && (
        <p className="text-sm text-muted-foreground">
          {t("JavaScript rendering was enabled for this audit.")}
        </p>
      )}
    </>
  );
}
