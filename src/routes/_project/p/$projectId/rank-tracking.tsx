import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useLocale } from "@/plugins/client/context";

export const Route = createFileRoute("/_project/p/$projectId/rank-tracking")({
  component: RankTrackingLayout,
});

function RankTrackingLayout() {
  const { t } = useLocale();

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("Rank Tracking")}</h1>
          <p className="text-sm text-base-content/70">
            {t("Track keyword positions across domains")}
          </p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
