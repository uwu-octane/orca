import type { ComponentProps } from "react";
import { useClientService, useLocale } from "@/plugins/client/context";
import { SkeletonCard } from "@/client/components/SkeletonPresets";
import { QueryError } from "@/client/components/QueryState";
import type { GoogleConnectionViews } from "./index";

/** Framework mount points. The installed plugin owns each rendered feature. */
export function GoogleConnectionCard(
  props: ComponentProps<GoogleConnectionViews["ConnectionCard"]>,
) {
  const { service, pending } = useClientService("googleConnections");
  const { t } = useLocale();
  if (pending) return <SkeletonCard />;
  if (!service)
    return (
      <QueryError fallback={t("Couldn't check your Google connection.")} />
    );
  return <service.ConnectionCard {...props} />;
}

export function SearchConsoleOnboardingStep(
  props: ComponentProps<GoogleConnectionViews["OnboardingStep"]>,
) {
  const { service, pending } = useClientService("googleConnections");
  const { t } = useLocale();
  if (pending) return <SkeletonCard />;
  if (!service)
    return (
      <QueryError fallback={t("Couldn't check your Google connection.")} />
    );
  return <service.OnboardingStep {...props} />;
}
