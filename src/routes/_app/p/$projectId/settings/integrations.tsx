// FORK: the installed AI plugin owns its settings surface.
import { AiProviderSettings } from "@/plugins/ai/client/views";
import { queryClient } from "@/client/tanstack-db/queryClient";
import { googleConnectionOptions } from "@/plugins/google-oauth/client/googleProviders";
import { createFileRoute } from "@tanstack/react-router";
import { GoogleConnectionCard } from "@/plugins/google-oauth/client/views";
import { CrawlerAccessSettings } from "@/client/features/settings/CrawlerAccessSettings";

export const Route = createFileRoute(
  "/_app/p/$projectId/settings/integrations",
)({
  loader: ({ params }) => {
    void queryClient.prefetchQuery(
      googleConnectionOptions("google_ads", params.projectId),
    );
    // Start the database checks on link intent without holding up navigation.
    void queryClient.prefetchQuery(
      googleConnectionOptions("gsc", params.projectId),
    );
    void queryClient.prefetchQuery(
      googleConnectionOptions("ga4", params.projectId),
    );
  },
  component: ProjectIntegrationsRoute,
});

function ProjectIntegrationsRoute() {
  const { projectId } = Route.useParams();

  return (
    <div className="space-y-8">
      {/* The ids are the targets old #search-console / #google-analytics deep
          links are redirected to from the settings index. Each card's title
          names its integration, so the sections carry no heading. */}
      <section id="search-console" className="scroll-mt-6">
        <GoogleConnectionCard provider="gsc" projectId={projectId} />
      </section>

      <section id="google-analytics" className="scroll-mt-6">
        <GoogleConnectionCard provider="ga4" projectId={projectId} />
      </section>

      <section id="google-ads" className="scroll-mt-6">
        <GoogleConnectionCard provider="google_ads" projectId={projectId} />
      </section>

      <section id="ai-providers" className="scroll-mt-6">
        <AiProviderSettings projectId={projectId} />
      </section>

      <CrawlerAccessSettings projectId={projectId} />
    </div>
  );
}
