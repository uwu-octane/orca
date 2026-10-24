import type { ComponentProps, ReactNode } from "react";
import { useClientService, useLocale } from "@/plugins/client/context";
import { QueryError } from "@/client/components/QueryState";
import { StatusScreen } from "@/client/components/StatusScreen";
import type { KeywordViews } from ".";

function KeywordView({
  children,
}: {
  children: (views: KeywordViews) => ReactNode;
}) {
  const { service, pending } = useClientService("keywordUi");
  const { t } = useLocale();
  if (pending) return <StatusScreen pending />;
  if (!service)
    return (
      <StatusScreen>
        <QueryError fallback={t("Failed to load keywords.")} />
      </StatusScreen>
    );
  return children(service);
}

/** Static file-router mounts; business components and state belong to the plugin. */
export function KeywordResearchPage(
  props: ComponentProps<KeywordViews["Research"]>,
) {
  return <KeywordView>{(views) => <views.Research {...props} />}</KeywordView>;
}
export function GoogleKeywordResearchPage(
  props: ComponentProps<KeywordViews["GoogleResearch"]>,
) {
  return (
    <KeywordView>{(views) => <views.GoogleResearch {...props} />}</KeywordView>
  );
}
export function SavedKeywordsPage(
  props: ComponentProps<KeywordViews["Saved"]>,
) {
  return <KeywordView>{(views) => <views.Saved {...props} />}</KeywordView>;
}
