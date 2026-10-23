import type { ComponentProps } from "react";
import { useClientService, useLocale } from "@/plugins/client/context";
import { QueryError } from "@/client/components/QueryState";
import { StatusScreen } from "@/client/components/StatusScreen";
import { SamChatListSkeleton } from "./SamSidebarPanel";
import type { SamViews } from "./index";

export { SamChatListSkeleton };

/** Static TanStack/sidebar mounts. Feature state and views belong to the plugin. */
export function SamChat(props: ComponentProps<SamViews["Chat"]>) {
  const { service, pending } = useClientService("samUi");
  const { t } = useLocale();
  if (pending) return <StatusScreen pending />;
  if (!service)
    return (
      <StatusScreen>
        <QueryError fallback={t("Could not load AI agent setup status.")} />
      </StatusScreen>
    );
  return <service.Chat {...props} />;
}

export function SamSidebarPanel(props: ComponentProps<SamViews["Sidebar"]>) {
  const { service, pending } = useClientService("samUi");
  const { t } = useLocale();
  if (pending) return <SamChatListSkeleton />;
  if (!service)
    return <QueryError fallback={t("Failed to load your chats.")} />;
  return <service.Sidebar {...props} />;
}
