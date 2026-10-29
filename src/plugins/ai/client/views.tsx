import { useClientService, useLocale } from "@/plugins/client/context";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { QueryError } from "@/client/components/QueryState";
import { Skeleton } from "@/client/components/ui/skeleton";
import type { GatewayModelPickerProps } from "../contracts";

/** Framework mount; the installed plugin owns settings components and state. */
export function AiProviderSettings(props: { projectId: string }) {
  const { service, pending } = useClientService("aiSettings");
  const { t } = useLocale();
  if (pending) return <SkeletonCard />;
  if (!service)
    return <QueryError fallback={t("Couldn't load AI provider settings.")} />;
  return <service.ProviderSettings {...props} />;
}

/** Public mount for other domains; ownership stays with the installed AI UI. */
export function AiModelPicker(props: GatewayModelPickerProps) {
  const { service, pending } = useClientService("aiSettings");
  const { t } = useLocale();
  if (pending) return <Skeleton className="h-10 w-72" />;
  if (!service)
    return (
      <QueryError fallback={t("Couldn’t load the model list. Try again.")} />
    );
  return <service.ModelPicker {...props} />;
}
