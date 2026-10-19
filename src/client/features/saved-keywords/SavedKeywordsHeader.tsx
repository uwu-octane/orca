// FORK: retain locale subscriptions across upstream component changes.
import { useLocale } from "@/plugins/client/context";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";

export function SavedKeywordsHeader({
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
}: {
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
}) {
  const { t } = useLocale();

  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title={t("Saved Keywords")}
        description={t(
          "Save keyword ideas from research, organize them with tags, and revisit when you're ready to act.",
        )}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              title={t("Fetch new volume, difficulty, and CPC")}
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? t("Updating...") : t("Update keyword stats")}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />
          </>
        }
      />

      {confirmingRefresh ? (
        <ConfirmDialog
          title={t("Update keyword stats?")}
          confirmLabel={t("Update stats")}
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          {t(
            "This fetches new volume, difficulty, and CPC for every saved keyword in this project. Each keyword uses credits.",
          )}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
