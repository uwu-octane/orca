import { useLocale } from "@/plugins/client/context";
import { createFileRoute } from "@tanstack/react-router";
import { Link2, ListPlus, MessagesSquare } from "lucide-react";
import { z } from "zod";
import { PromptResearchPage } from "@/client/features/ai-visibility/PromptResearchPage";
import { PromptTrackingWithoutUpgradeButton } from "@/client/features/ai-visibility/shared";
import { PaidPlanGate } from "@/client/features/billing/PaidPlanGate";

export const Route = createFileRoute(
  "/_app/p/$projectId/ai-visibility/research",
)({
  validateSearch: z.object({ q: z.string().trim().max(100).optional() }),
  component: AiResearchRoute,
});

function AiResearchRoute() {
  const { t } = useLocale();
  const PROMPT_RESEARCH_FEATURES = [
    {
      icon: MessagesSquare,
      title: t("Questions about your market"),
      body: t(
        "See the questions people ask about a keyword, most common first, with ChatGPT's answer to each.",
      ),
    },
    {
      icon: Link2,
      title: t("Who gets cited"),
      body: t(
        "See which sites ChatGPT cited when it answered, and whether yours is one of them.",
      ),
    },
    {
      icon: ListPlus,
      title: t("Track the ones that matter"),
      body: t(
        "Pick the questions worth watching and add them to Prompt Tracking in one step.",
      ),
    },
  ];

  const { projectId } = Route.useParams();
  const { q } = Route.useSearch();
  return (
    <PaidPlanGate
      feature={t("Prompt Research")}
      description={t(
        "Find questions people ask about your market, see how ChatGPT answers them, and check which sites the answers cite.",
      )}
      features={PROMPT_RESEARCH_FEATURES}
      alternative={<PromptTrackingWithoutUpgradeButton projectId={projectId} />}
    >
      <PromptResearchPage key={projectId} projectId={projectId} keyword={q} />
    </PaidPlanGate>
  );
}
