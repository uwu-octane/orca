import { useClientService, useLocale } from "@/plugins/client/context";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { QueryError } from "@/client/components/QueryState";

/** Framework mount; the installed plugin owns settings components and state. */
export function AiProviderSettings(props: { projectId: string }) {
  const { service, pending } = useClientService("aiSettings");
  const { t } = useLocale();
  if (pending) return <SkeletonCard />;
  if (!service)
    return <QueryError fallback={t("Couldn't load AI provider settings.")} />;
  return <service.ProviderSettings {...props} />;
}
