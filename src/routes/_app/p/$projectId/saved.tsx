// FORK: the Keywords plugin owns the complete saved-keyword surface.
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { savedKeywordsSearchSchema } from "@/types/schemas/keywords";
import { SavedKeywordsPage } from "@/plugins/keywords/client/views";

export const Route = createFileRoute("/_app/p/$projectId/saved")({
  validateSearch: savedKeywordsSearchSchema,
  // The project switcher keeps this page; filter drafts must not follow.
  remountDeps: ({ params }) => params.projectId,
  search: {
    middlewares: [
      stripSearchParams({
        sort: "fetchedAt",
        order: "desc",
        page: 1,
        size: 50,
      }),
    ],
  },
  component: SavedKeywordsRoute,
});

function SavedKeywordsRoute() {
  const { projectId } = Route.useParams();
  return <SavedKeywordsPage projectId={projectId} search={Route.useSearch()} />;
}
